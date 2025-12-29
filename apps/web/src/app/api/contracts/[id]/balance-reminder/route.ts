import { NextRequest, NextResponse } from "next/server";
import { createClient } from "@/lib/supabase/server";
import { sendBalanceReminderEmail } from "@/lib/email";

// Send a balance payment reminder for a contract
export async function POST(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const { id } = await params;
    const supabase = await createClient();

    // Check authentication
    const {
      data: { user },
    } = await supabase.auth.getUser();

    if (!user) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    }

    // Parse request body for reminder options
    let reminderType: "first" | "second" | "final" = "first";
    let recipientEmail: string | null = null;
    let recipientName: string | null = null;

    try {
      const body = await request.json();
      if (body.reminderType && ["first", "second", "final"].includes(body.reminderType)) {
        reminderType = body.reminderType;
      }
      if (body.recipientEmail) {
        recipientEmail = body.recipientEmail;
      }
      if (body.recipientName) {
        recipientName = body.recipientName;
      }
    } catch {
      // No body or invalid JSON, use defaults
    }

    // Fetch contract with owner check
    const { data: contract, error: contractError } = await supabase
      .from("contracts")
      .select(`
        id, title, user_id,
        payment_required, payment_amount, payment_currency,
        payment_status, payment_structure, deposit_percentage,
        balance_due_date, last_reminder_sent
      `)
      .eq("id", id)
      .eq("user_id", user.id)
      .single();

    if (contractError || !contract) {
      return NextResponse.json({ error: "Contract not found" }, { status: 404 });
    }

    // Check if this contract requires payment and has a deposit/balance structure
    if (!contract.payment_required) {
      return NextResponse.json(
        { error: "This contract does not require payment" },
        { status: 400 }
      );
    }

    if (contract.payment_structure !== "deposit_balance") {
      return NextResponse.json(
        { error: "Balance reminders only apply to deposit/balance payment structures" },
        { status: 400 }
      );
    }

    // Check payment status - need deposit paid but not balance
    const { data: payments } = await supabase
      .from("payments")
      .select("id, payment_type, status, amount, payer_email, payer_name")
      .eq("contract_id", id)
      .eq("status", "succeeded");

    const depositPayment = payments?.find(p => p.payment_type === "deposit");
    const balancePayment = payments?.find(p => p.payment_type === "balance");

    if (!depositPayment) {
      return NextResponse.json(
        { error: "Deposit has not been paid yet" },
        { status: 400 }
      );
    }

    if (balancePayment) {
      return NextResponse.json(
        { error: "Balance has already been paid" },
        { status: 400 }
      );
    }

    // Get recipient email - from request, deposit payment, or contract signers
    const finalRecipientEmail = recipientEmail || depositPayment.payer_email;
    const finalRecipientName = recipientName || depositPayment.payer_name;

    if (!finalRecipientEmail) {
      return NextResponse.json(
        { error: "No recipient email available. Please provide a recipient email." },
        { status: 400 }
      );
    }

    // Calculate balance amount
    const totalAmount = Math.round((contract.payment_amount || 0) * 100);
    const depositPercentage = contract.deposit_percentage || 30;
    const depositAmount = Math.round(totalAmount * (depositPercentage / 100));
    const balanceAmount = totalAmount - depositAmount;

    // Get sender info
    const { data: userData } = await supabase
      .from("users")
      .select("name, email")
      .eq("id", user.id)
      .single();

    // Check for recent reminders (avoid spam - don't send more than once per 24 hours)
    const twentyFourHoursAgo = new Date(Date.now() - 24 * 60 * 60 * 1000).toISOString();
    const { data: recentReminders } = await supabase
      .from("payment_reminders")
      .select("id, sent_at, reminder_type")
      .eq("contract_id", id)
      .gte("sent_at", twentyFourHoursAgo)
      .order("sent_at", { ascending: false })
      .limit(1);

    if (recentReminders && recentReminders.length > 0) {
      const lastReminder = recentReminders[0];
      const hoursAgo = Math.round(
        (Date.now() - new Date(lastReminder.sent_at).getTime()) / (1000 * 60 * 60)
      );
      return NextResponse.json(
        {
          error: `A reminder was sent ${hoursAgo} hours ago. Please wait 24 hours between reminders.`,
          lastSent: lastReminder.sent_at,
          lastType: lastReminder.reminder_type,
        },
        { status: 429 }
      );
    }

    // Build payment URL
    const baseUrl = process.env.NEXT_PUBLIC_APP_URL || "https://lexportai.com";
    const paymentUrl = `${baseUrl}/portal/contracts/${id}?action=pay`;

    // Send the reminder email
    const emailResult = await sendBalanceReminderEmail({
      to: finalRecipientEmail,
      recipientName: finalRecipientName || "Valued Customer",
      contractTitle: contract.title,
      balanceAmount,
      currency: contract.payment_currency || "usd",
      dueDate: contract.balance_due_date || undefined,
      paymentUrl,
      depositPaidAmount: depositAmount,
      senderName: userData?.name || undefined,
      reminderType,
    });

    // Record the reminder
    const { data: reminder, error: reminderError } = await supabase
      .from("payment_reminders")
      .insert({
        contract_id: id,
        payment_id: depositPayment.id,
        recipient_email: finalRecipientEmail,
        recipient_name: finalRecipientName,
        reminder_type: reminderType,
        amount: balanceAmount,
        currency: contract.payment_currency || "usd",
        email_id: emailResult.id || null,
      })
      .select()
      .single();

    if (reminderError) {
      console.error("Failed to record reminder:", reminderError);
      // Don't fail the request, email was sent
    }

    // Update contract's last_reminder_sent
    await supabase
      .from("contracts")
      .update({
        last_reminder_sent: new Date().toISOString(),
        updated_at: new Date().toISOString(),
      })
      .eq("id", id);

    // Log audit event
    await supabase.from("audit_logs").insert({
      contract_id: id,
      user_id: user.id,
      event_type: "balance_reminder_sent",
      ip_address: request.headers.get("x-forwarded-for") || "unknown",
      user_agent: request.headers.get("user-agent") || "unknown",
      metadata: {
        reminder_id: reminder?.id,
        reminder_type: reminderType,
        recipient_email: finalRecipientEmail,
        balance_amount: balanceAmount,
        email_id: emailResult.id,
      },
    });

    return NextResponse.json({
      success: true,
      reminder: {
        id: reminder?.id,
        type: reminderType,
        sentTo: finalRecipientEmail,
        balanceAmount,
        currency: contract.payment_currency || "usd",
        sentAt: new Date().toISOString(),
      },
    });
  } catch (error) {
    console.error("Error sending balance reminder:", error);
    return NextResponse.json(
      { error: "Failed to send reminder" },
      { status: 500 }
    );
  }
}

// Get reminder history for a contract
export async function GET(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const { id } = await params;
    const supabase = await createClient();

    // Check authentication
    const {
      data: { user },
    } = await supabase.auth.getUser();

    if (!user) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    }

    // Verify contract ownership
    const { data: contract, error: contractError } = await supabase
      .from("contracts")
      .select("id, user_id, last_reminder_sent")
      .eq("id", id)
      .eq("user_id", user.id)
      .single();

    if (contractError || !contract) {
      return NextResponse.json({ error: "Contract not found" }, { status: 404 });
    }

    // Get reminder history
    const { data: reminders, error: remindersError } = await supabase
      .from("payment_reminders")
      .select("*")
      .eq("contract_id", id)
      .order("sent_at", { ascending: false });

    if (remindersError) {
      console.error("Error fetching reminders:", remindersError);
      return NextResponse.json(
        { error: "Failed to fetch reminders" },
        { status: 500 }
      );
    }

    return NextResponse.json({
      reminders: reminders || [],
      lastReminderSent: contract.last_reminder_sent,
    });
  } catch (error) {
    console.error("Error fetching reminder history:", error);
    return NextResponse.json(
      { error: "Failed to fetch reminders" },
      { status: 500 }
    );
  }
}
