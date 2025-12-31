import { NextRequest, NextResponse } from "next/server";
import { createClient } from "@/lib/supabase/server";
import { z } from "zod";
import { sendBalanceReminderEmail } from "@/lib/email";

// Schema for PATCH - update reminder settings
const UpdateReminderSettingsSchema = z.object({
  reminderEnabled: z.boolean().optional(),
  reminderIntervalDays: z.number().min(1).max(14).optional(),
  maxReminders: z.number().min(1).max(20).optional(),
});

// Schema for POST - send manual reminder
const SendReminderSchema = z.object({
  reminderType: z.enum(["first", "second", "final"]).optional(),
});

/**
 * GET - Get reminder status and history for an invoice
 */
export async function GET(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const { id } = await params;
    const supabase = await createClient();
    const {
      data: { user },
      error: authError,
    } = await supabase.auth.getUser();

    if (authError || !user) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    }

    // Fetch invoice with reminder status
    const { data: invoice, error: invoiceError } = await supabase
      .from("invoices")
      .select(`
        id,
        invoice_number,
        recipient_name,
        recipient_email,
        amount,
        total,
        currency,
        status,
        due_date,
        reminder_enabled,
        reminder_interval_days,
        next_reminder_at,
        reminder_count,
        max_reminders,
        last_reminder_sent_at,
        contract_id
      `)
      .eq("id", id)
      .eq("user_id", user.id)
      .single();

    if (invoiceError || !invoice) {
      return NextResponse.json({ error: "Invoice not found" }, { status: 404 });
    }

    // Get payment reminder history for this invoice
    const { data: reminderHistory, error: historyError } = await supabase
      .from("payment_reminders")
      .select(`
        id,
        recipient_email,
        recipient_name,
        reminder_type,
        amount,
        currency,
        sent_at,
        email_id
      `)
      .eq("contract_id", invoice.contract_id || id)
      .order("sent_at", { ascending: false })
      .limit(50);

    if (historyError) {
      console.error("Error fetching reminder history:", historyError);
    }

    // Calculate status info
    const isOverdue = invoice.due_date && new Date(invoice.due_date) < new Date() && invoice.status !== "paid";
    const canSendReminder = invoice.status === "sent" || (invoice.status === "draft" && false);

    return NextResponse.json({
      invoice: {
        id: invoice.id,
        invoiceNumber: invoice.invoice_number,
        recipientName: invoice.recipient_name,
        recipientEmail: invoice.recipient_email,
        amount: invoice.total || invoice.amount,
        currency: invoice.currency,
        status: invoice.status,
        dueDate: invoice.due_date,
        reminderEnabled: invoice.reminder_enabled,
        reminderIntervalDays: invoice.reminder_interval_days,
        nextReminderAt: invoice.next_reminder_at,
        reminderCount: invoice.reminder_count,
        maxReminders: invoice.max_reminders,
        lastReminderSentAt: invoice.last_reminder_sent_at,
        isOverdue,
        canSendReminder,
      },
      reminderHistory: reminderHistory?.map(rh => ({
        id: rh.id,
        recipientEmail: rh.recipient_email,
        recipientName: rh.recipient_name,
        reminderType: rh.reminder_type,
        amount: rh.amount,
        currency: rh.currency,
        sentAt: rh.sent_at,
        emailId: rh.email_id,
      })) || [],
      summary: {
        totalRemindersSent: invoice.reminder_count || 0,
        lastReminderSentAt: invoice.last_reminder_sent_at,
        nextReminderAt: invoice.next_reminder_at,
        isOverdue,
      },
    });
  } catch (error) {
    console.error("Error getting invoice reminder status:", error);
    return NextResponse.json(
      { error: "Failed to get reminder status" },
      { status: 500 }
    );
  }
}

/**
 * POST - Send a manual payment reminder
 */
export async function POST(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const { id } = await params;
    const supabase = await createClient();
    const {
      data: { user },
      error: authError,
    } = await supabase.auth.getUser();

    if (authError || !user) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    }

    // Parse request body
    const body = await request.json().catch(() => ({}));
    const parseResult = SendReminderSchema.safeParse(body);

    if (!parseResult.success) {
      return NextResponse.json(
        { error: "Invalid request", details: parseResult.error.flatten() },
        { status: 400 }
      );
    }

    const { reminderType = "first" } = parseResult.data;

    // Fetch invoice
    const { data: invoice, error: invoiceError } = await supabase
      .from("invoices")
      .select("*, contract:contracts(title)")
      .eq("id", id)
      .eq("user_id", user.id)
      .single();

    if (invoiceError || !invoice) {
      return NextResponse.json({ error: "Invoice not found" }, { status: 404 });
    }

    // Check if invoice can receive reminders
    if (invoice.status === "paid") {
      return NextResponse.json(
        { error: "Cannot send reminder for paid invoice" },
        { status: 400 }
      );
    }

    if (invoice.status === "void" || invoice.status === "cancelled") {
      return NextResponse.json(
        { error: "Cannot send reminder for voided or cancelled invoice" },
        { status: 400 }
      );
    }

    // Build payment URL
    const baseUrl = process.env.NEXT_PUBLIC_APP_URL || "http://localhost:3000";
    const paymentUrl = invoice.contract_id
      ? `${baseUrl}/portal/contracts/${invoice.contract_id}?action=pay`
      : `${baseUrl}/pay/invoice/${invoice.id}`;

    // Get contract title if available
    const contractTitle = invoice.contract?.title || `Invoice ${invoice.invoice_number}`;

    // Calculate reminder type based on count
    let effectiveReminderType = reminderType;
    const reminderCount = invoice.reminder_count || 0;
    if (reminderCount === 0) {
      effectiveReminderType = "first";
    } else if (reminderCount >= (invoice.max_reminders || 5) - 1) {
      effectiveReminderType = "final";
    } else {
      effectiveReminderType = "second";
    }

    const now = new Date();
    let emailSent = false;
    let emailId: string | undefined;

    try {
      const result = await sendBalanceReminderEmail({
        to: invoice.recipient_email,
        recipientName: invoice.recipient_name || "Customer",
        contractTitle,
        balanceAmount: invoice.total || invoice.amount,
        currency: invoice.currency || "usd",
        dueDate: invoice.due_date,
        paymentUrl,
        reminderType: effectiveReminderType,
      });
      emailSent = true;
      emailId = result.id;
    } catch (error) {
      console.error(`Failed to send payment reminder to ${invoice.recipient_email}:`, error);
      return NextResponse.json(
        { error: "Failed to send reminder email" },
        { status: 500 }
      );
    }

    // Update invoice reminder fields
    const intervalDays = invoice.reminder_interval_days || 3;
    const nextReminderAt = new Date(Date.now() + intervalDays * 24 * 60 * 60 * 1000);
    const newReminderCount = (invoice.reminder_count || 0) + 1;

    await supabase
      .from("invoices")
      .update({
        last_reminder_sent_at: now.toISOString(),
        reminder_count: newReminderCount,
        next_reminder_at: newReminderCount < (invoice.max_reminders || 5)
          ? nextReminderAt.toISOString()
          : null,
        updated_at: now.toISOString(),
      })
      .eq("id", id);

    // Record in payment_reminders table
    await supabase
      .from("payment_reminders")
      .insert({
        contract_id: invoice.contract_id || null,
        payment_id: invoice.payment_id || null,
        recipient_email: invoice.recipient_email,
        recipient_name: invoice.recipient_name,
        reminder_type: effectiveReminderType,
        amount: invoice.total || invoice.amount,
        currency: invoice.currency || "usd",
        sent_at: now.toISOString(),
        email_id: emailId || null,
      });

    // Create notification for the invoice owner
    await supabase
      .from("notifications")
      .insert({
        user_id: user.id,
        type: "invoice_reminder_sent",
        title: "Payment Reminder Sent",
        message: `A payment reminder was sent to ${invoice.recipient_email} for ${invoice.invoice_number}`,
        contract_id: invoice.contract_id || null,
        data: {
          invoiceId: invoice.id,
          invoiceNumber: invoice.invoice_number,
          recipientEmail: invoice.recipient_email,
          reminderType: effectiveReminderType,
          reminderCount: newReminderCount,
        },
      });

    return NextResponse.json({
      success: true,
      message: `Payment reminder sent to ${invoice.recipient_email}`,
      emailSent,
      emailId,
      reminderType: effectiveReminderType,
      reminderCount: newReminderCount,
    });
  } catch (error) {
    console.error("Error sending payment reminder:", error);
    return NextResponse.json(
      { error: "Failed to send payment reminder" },
      { status: 500 }
    );
  }
}

/**
 * PATCH - Update reminder settings for an invoice
 */
export async function PATCH(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const { id } = await params;
    const supabase = await createClient();
    const {
      data: { user },
      error: authError,
    } = await supabase.auth.getUser();

    if (authError || !user) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    }

    // Parse request body
    const body = await request.json();
    const parseResult = UpdateReminderSettingsSchema.safeParse(body);

    if (!parseResult.success) {
      return NextResponse.json(
        { error: "Invalid request", details: parseResult.error.flatten() },
        { status: 400 }
      );
    }

    const { reminderEnabled, reminderIntervalDays, maxReminders } = parseResult.data;

    // Verify invoice ownership
    const { data: invoice, error: invoiceError } = await supabase
      .from("invoices")
      .select("id, user_id, reminder_enabled, reminder_interval_days")
      .eq("id", id)
      .eq("user_id", user.id)
      .single();

    if (invoiceError || !invoice) {
      return NextResponse.json({ error: "Invoice not found" }, { status: 404 });
    }

    // Build update object
    const invoiceUpdate: Record<string, unknown> = {
      updated_at: new Date().toISOString(),
    };

    if (reminderEnabled !== undefined) {
      invoiceUpdate.reminder_enabled = reminderEnabled;
    }

    if (reminderIntervalDays !== undefined) {
      invoiceUpdate.reminder_interval_days = reminderIntervalDays;
    }

    if (maxReminders !== undefined) {
      invoiceUpdate.max_reminders = maxReminders;
    }

    // Calculate new next_reminder_at if enabling or changing interval
    if (reminderEnabled === true || reminderIntervalDays !== undefined) {
      const intervalDays = reminderIntervalDays || invoice.reminder_interval_days || 3;
      invoiceUpdate.next_reminder_at = new Date(
        Date.now() + intervalDays * 24 * 60 * 60 * 1000
      ).toISOString();
    }

    // If disabling, clear next_reminder_at
    if (reminderEnabled === false) {
      invoiceUpdate.next_reminder_at = null;
    }

    // Update invoice
    const { error: updateError } = await supabase
      .from("invoices")
      .update(invoiceUpdate)
      .eq("id", id);

    if (updateError) {
      console.error("Error updating invoice:", updateError);
      return NextResponse.json(
        { error: "Failed to update reminder settings" },
        { status: 500 }
      );
    }

    return NextResponse.json({
      success: true,
      message: "Reminder settings updated",
      settings: {
        reminderEnabled: reminderEnabled ?? invoice.reminder_enabled,
        reminderIntervalDays: reminderIntervalDays ?? invoice.reminder_interval_days,
        maxReminders,
      },
    });
  } catch (error) {
    console.error("Error updating reminder settings:", error);
    return NextResponse.json(
      { error: "Failed to update reminder settings" },
      { status: 500 }
    );
  }
}

/**
 * DELETE - Stop all reminders for an invoice
 */
export async function DELETE(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const { id } = await params;
    const supabase = await createClient();
    const {
      data: { user },
      error: authError,
    } = await supabase.auth.getUser();

    if (authError || !user) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    }

    // Verify invoice ownership
    const { data: invoice, error: invoiceError } = await supabase
      .from("invoices")
      .select("id, user_id")
      .eq("id", id)
      .eq("user_id", user.id)
      .single();

    if (invoiceError || !invoice) {
      return NextResponse.json({ error: "Invoice not found" }, { status: 404 });
    }

    // Disable reminders
    const { error: updateError } = await supabase
      .from("invoices")
      .update({
        reminder_enabled: false,
        next_reminder_at: null,
        updated_at: new Date().toISOString(),
      })
      .eq("id", id);

    if (updateError) {
      console.error("Error disabling invoice reminders:", updateError);
      return NextResponse.json(
        { error: "Failed to stop reminders" },
        { status: 500 }
      );
    }

    return NextResponse.json({
      success: true,
      message: "All reminders stopped for this invoice",
    });
  } catch (error) {
    console.error("Error stopping reminders:", error);
    return NextResponse.json(
      { error: "Failed to stop reminders" },
      { status: 500 }
    );
  }
}
