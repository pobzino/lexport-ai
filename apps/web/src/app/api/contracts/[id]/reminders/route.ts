import { NextRequest, NextResponse } from "next/server";
import { createClient } from "@/lib/supabase/server";
import { z } from "zod";
import { sendSigningReminder } from "@/lib/email";

// Schema for PATCH - update reminder settings
const UpdateReminderSettingsSchema = z.object({
  reminderEnabled: z.boolean().optional(),
  reminderIntervalDays: z.number().min(1).max(14).optional(),
  maxReminders: z.number().min(1).max(20).optional(),
});

// Schema for POST - send manual reminder
const SendReminderSchema = z.object({
  signatureRequestIds: z.array(z.string().uuid()).optional(), // If omitted, remind all pending signers
});

/**
 * GET - Get reminder status and history for a contract
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

    // Verify contract ownership
    const { data: contract, error: contractError } = await supabase
      .from("contracts")
      .select("id, title, reminder_enabled, reminder_interval_days, next_reminder_at")
      .eq("id", id)
      .eq("user_id", user.id)
      .single();

    if (contractError || !contract) {
      return NextResponse.json({ error: "Contract not found" }, { status: 404 });
    }

    // Get signature requests with reminder status
    const { data: signatureRequests, error: sigError } = await supabase
      .from("signature_requests")
      .select(`
        id,
        signer_email,
        signer_name,
        signer_role,
        status,
        reminder_enabled,
        next_reminder_at,
        reminder_count,
        max_reminders,
        last_reminder_sent_at,
        expires_at
      `)
      .eq("contract_id", id)
      .order("order", { ascending: true });

    if (sigError) {
      console.error("Error fetching signature requests:", sigError);
      return NextResponse.json(
        { error: "Failed to fetch signature requests" },
        { status: 500 }
      );
    }

    // Get reminder history for this contract
    const { data: reminderHistory, error: historyError } = await supabase
      .from("signature_reminder_history")
      .select(`
        id,
        signature_request_id,
        sent_at,
        sent_by,
        email_id,
        status,
        reminder_type
      `)
      .eq("contract_id", id)
      .order("sent_at", { ascending: false })
      .limit(50);

    if (historyError) {
      console.error("Error fetching reminder history:", historyError);
      return NextResponse.json(
        { error: "Failed to fetch reminder history" },
        { status: 500 }
      );
    }

    // Calculate summary stats
    const pendingSigners = signatureRequests?.filter(sr => sr.status === "pending") || [];
    const totalReminders = reminderHistory?.length || 0;
    const remindersToday = reminderHistory?.filter(rh => {
      const sentDate = new Date(rh.sent_at);
      const today = new Date();
      return sentDate.toDateString() === today.toDateString();
    }).length || 0;

    return NextResponse.json({
      contract: {
        id: contract.id,
        title: contract.title,
        reminderEnabled: contract.reminder_enabled,
        reminderIntervalDays: contract.reminder_interval_days,
        nextReminderAt: contract.next_reminder_at,
      },
      signatureRequests: signatureRequests?.map(sr => ({
        id: sr.id,
        signerEmail: sr.signer_email,
        signerName: sr.signer_name,
        signerRole: sr.signer_role,
        status: sr.status,
        reminderEnabled: sr.reminder_enabled,
        nextReminderAt: sr.next_reminder_at,
        reminderCount: sr.reminder_count,
        maxReminders: sr.max_reminders,
        lastReminderSentAt: sr.last_reminder_sent_at,
        expiresAt: sr.expires_at,
      })) || [],
      reminderHistory: reminderHistory?.map(rh => ({
        id: rh.id,
        signatureRequestId: rh.signature_request_id,
        sentAt: rh.sent_at,
        sentBy: rh.sent_by,
        emailId: rh.email_id,
        status: rh.status,
        reminderType: rh.reminder_type,
      })) || [],
      summary: {
        pendingSigners: pendingSigners.length,
        totalRemindersSent: totalReminders,
        remindersToday: remindersToday,
      },
    });
  } catch (error) {
    console.error("Error getting reminder status:", error);
    return NextResponse.json(
      { error: "Failed to get reminder status" },
      { status: 500 }
    );
  }
}

/**
 * POST - Send a manual reminder to all or specific pending signers
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

    const { signatureRequestIds } = parseResult.data;

    // Verify contract ownership
    const { data: contract, error: contractError } = await supabase
      .from("contracts")
      .select("id, title, user_id, reminder_interval_days")
      .eq("id", id)
      .eq("user_id", user.id)
      .single();

    if (contractError || !contract) {
      return NextResponse.json({ error: "Contract not found" }, { status: 404 });
    }

    // Build query for signature requests
    let query = supabase
      .from("signature_requests")
      .select("*")
      .eq("contract_id", id)
      .eq("status", "pending");

    if (signatureRequestIds && signatureRequestIds.length > 0) {
      query = query.in("id", signatureRequestIds);
    }

    const { data: signatureRequests, error: fetchError } = await query;

    if (fetchError) {
      console.error("Error fetching signature requests:", fetchError);
      return NextResponse.json(
        { error: "Failed to fetch signature requests" },
        { status: 500 }
      );
    }

    if (!signatureRequests || signatureRequests.length === 0) {
      return NextResponse.json(
        { error: "No pending signers to remind" },
        { status: 400 }
      );
    }

    const now = new Date();
    const baseUrl = process.env.NEXT_PUBLIC_APP_URL || "http://localhost:3000";
    const remindedSigners: { email: string; name: string; emailSent: boolean; emailId?: string }[] = [];
    const emailErrors: string[] = [];

    // Calculate next reminder time based on contract settings
    const intervalDays = contract.reminder_interval_days || 3;
    const nextReminderAt = new Date(Date.now() + intervalDays * 24 * 60 * 60 * 1000);

    for (const sigRequest of signatureRequests) {
      const signingUrl = `${baseUrl}/sign/${sigRequest.token}`;
      let emailSent = false;
      let emailId: string | undefined;

      try {
        const result = await sendSigningReminder({
          to: sigRequest.signer_email,
          signerName: sigRequest.signer_name,
          contractTitle: contract.title,
          signingUrl,
          expiresAt: sigRequest.expires_at,
        });
        emailSent = true;
        emailId = result.id;
      } catch (error) {
        console.error(`Failed to send reminder to ${sigRequest.signer_email}:`, error);
        emailErrors.push(sigRequest.signer_email);
      }

      // Update signature request reminder fields
      const currentCount = sigRequest.reminder_count || 0;
      await supabase
        .from("signature_requests")
        .update({
          last_reminder_sent_at: now.toISOString(),
          reminder_count: currentCount + 1,
          next_reminder_at: nextReminderAt.toISOString(),
          updated_at: now.toISOString(),
        })
        .eq("id", sigRequest.id);

      // Record in reminder history
      await supabase
        .from("signature_reminder_history")
        .insert({
          signature_request_id: sigRequest.id,
          contract_id: id,
          sent_at: now.toISOString(),
          sent_by: user.id,
          email_id: emailId || null,
          status: emailSent ? "sent" : "failed",
          reminder_type: "manual",
        });

      remindedSigners.push({
        email: sigRequest.signer_email,
        name: sigRequest.signer_name,
        emailSent,
        emailId,
      });
    }

    return NextResponse.json({
      success: true,
      message: emailErrors.length > 0
        ? `Reminder processed for ${remindedSigners.length} signer(s). ${emailErrors.length} email(s) failed to send.`
        : `Reminder sent to ${remindedSigners.length} signer(s)`,
      remindedSigners,
      emailErrors: emailErrors.length > 0 ? emailErrors : undefined,
    });
  } catch (error) {
    console.error("Error sending reminders:", error);
    return NextResponse.json(
      { error: "Failed to send reminders" },
      { status: 500 }
    );
  }
}

/**
 * PATCH - Update reminder settings for a contract
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

    // Verify contract ownership
    const { data: contract, error: contractError } = await supabase
      .from("contracts")
      .select("id, user_id, reminder_enabled, reminder_interval_days")
      .eq("id", id)
      .eq("user_id", user.id)
      .single();

    if (contractError || !contract) {
      return NextResponse.json({ error: "Contract not found" }, { status: 404 });
    }

    // Build update object for contract
    const contractUpdate: Record<string, unknown> = {
      updated_at: new Date().toISOString(),
    };

    if (reminderEnabled !== undefined) {
      contractUpdate.reminder_enabled = reminderEnabled;
    }

    if (reminderIntervalDays !== undefined) {
      contractUpdate.reminder_interval_days = reminderIntervalDays;
    }

    // Calculate new next_reminder_at if enabling or changing interval
    if (reminderEnabled === true || reminderIntervalDays !== undefined) {
      const intervalDays = reminderIntervalDays || contract.reminder_interval_days || 3;
      contractUpdate.next_reminder_at = new Date(
        Date.now() + intervalDays * 24 * 60 * 60 * 1000
      ).toISOString();
    }

    // If disabling, clear next_reminder_at
    if (reminderEnabled === false) {
      contractUpdate.next_reminder_at = null;
    }

    // Update contract
    const { error: updateError } = await supabase
      .from("contracts")
      .update(contractUpdate)
      .eq("id", id);

    if (updateError) {
      console.error("Error updating contract:", updateError);
      return NextResponse.json(
        { error: "Failed to update reminder settings" },
        { status: 500 }
      );
    }

    // Update signature requests if max_reminders or reminder_enabled changed
    if (maxReminders !== undefined || reminderEnabled !== undefined) {
      const sigRequestUpdate: Record<string, unknown> = {
        updated_at: new Date().toISOString(),
      };

      if (maxReminders !== undefined) {
        sigRequestUpdate.max_reminders = maxReminders;
      }

      if (reminderEnabled !== undefined) {
        sigRequestUpdate.reminder_enabled = reminderEnabled;

        if (reminderEnabled === true) {
          const intervalDays = reminderIntervalDays || contract.reminder_interval_days || 3;
          sigRequestUpdate.next_reminder_at = new Date(
            Date.now() + intervalDays * 24 * 60 * 60 * 1000
          ).toISOString();
        } else {
          sigRequestUpdate.next_reminder_at = null;
        }
      }

      await supabase
        .from("signature_requests")
        .update(sigRequestUpdate)
        .eq("contract_id", id)
        .eq("status", "pending");
    }

    return NextResponse.json({
      success: true,
      message: "Reminder settings updated",
      settings: {
        reminderEnabled: reminderEnabled ?? contract.reminder_enabled,
        reminderIntervalDays: reminderIntervalDays ?? contract.reminder_interval_days,
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
 * DELETE - Pause/stop all reminders for a contract
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

    // Verify contract ownership
    const { data: contract, error: contractError } = await supabase
      .from("contracts")
      .select("id, user_id")
      .eq("id", id)
      .eq("user_id", user.id)
      .single();

    if (contractError || !contract) {
      return NextResponse.json({ error: "Contract not found" }, { status: 404 });
    }

    // Disable reminders on contract level
    const { error: contractUpdateError } = await supabase
      .from("contracts")
      .update({
        reminder_enabled: false,
        next_reminder_at: null,
        updated_at: new Date().toISOString(),
      })
      .eq("id", id);

    if (contractUpdateError) {
      console.error("Error disabling contract reminders:", contractUpdateError);
      return NextResponse.json(
        { error: "Failed to stop reminders" },
        { status: 500 }
      );
    }

    // Disable reminders on all pending signature requests
    const { error: sigRequestUpdateError } = await supabase
      .from("signature_requests")
      .update({
        reminder_enabled: false,
        next_reminder_at: null,
        updated_at: new Date().toISOString(),
      })
      .eq("contract_id", id)
      .eq("status", "pending");

    if (sigRequestUpdateError) {
      console.error("Error disabling signature request reminders:", sigRequestUpdateError);
      return NextResponse.json(
        { error: "Failed to stop reminders for signers" },
        { status: 500 }
      );
    }

    return NextResponse.json({
      success: true,
      message: "All reminders stopped for this contract",
    });
  } catch (error) {
    console.error("Error stopping reminders:", error);
    return NextResponse.json(
      { error: "Failed to stop reminders" },
      { status: 500 }
    );
  }
}
