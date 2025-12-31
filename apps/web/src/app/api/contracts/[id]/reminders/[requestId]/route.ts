import { NextRequest, NextResponse } from "next/server";
import { createClient } from "@/lib/supabase/server";
import { sendSigningReminder } from "@/lib/email";

/**
 * GET - Get reminder history for a specific signer
 */
export async function GET(
  request: NextRequest,
  { params }: { params: Promise<{ id: string; requestId: string }> }
) {
  try {
    const { id, requestId } = await params;
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
      .select("id, title, user_id")
      .eq("id", id)
      .eq("user_id", user.id)
      .single();

    if (contractError || !contract) {
      return NextResponse.json({ error: "Contract not found" }, { status: 404 });
    }

    // Get the signature request
    const { data: signatureRequest, error: sigError } = await supabase
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
      .eq("id", requestId)
      .eq("contract_id", id)
      .single();

    if (sigError || !signatureRequest) {
      return NextResponse.json(
        { error: "Signature request not found" },
        { status: 404 }
      );
    }

    // Get reminder history for this specific signer
    const { data: reminderHistory, error: historyError } = await supabase
      .from("signature_reminder_history")
      .select(`
        id,
        sent_at,
        sent_by,
        email_id,
        status,
        reminder_type
      `)
      .eq("signature_request_id", requestId)
      .order("sent_at", { ascending: false });

    if (historyError) {
      console.error("Error fetching reminder history:", historyError);
      return NextResponse.json(
        { error: "Failed to fetch reminder history" },
        { status: 500 }
      );
    }

    return NextResponse.json({
      signatureRequest: {
        id: signatureRequest.id,
        signerEmail: signatureRequest.signer_email,
        signerName: signatureRequest.signer_name,
        signerRole: signatureRequest.signer_role,
        status: signatureRequest.status,
        reminderEnabled: signatureRequest.reminder_enabled,
        nextReminderAt: signatureRequest.next_reminder_at,
        reminderCount: signatureRequest.reminder_count,
        maxReminders: signatureRequest.max_reminders,
        lastReminderSentAt: signatureRequest.last_reminder_sent_at,
        expiresAt: signatureRequest.expires_at,
      },
      reminderHistory: reminderHistory?.map(rh => ({
        id: rh.id,
        sentAt: rh.sent_at,
        sentBy: rh.sent_by,
        emailId: rh.email_id,
        status: rh.status,
        reminderType: rh.reminder_type,
      })) || [],
      summary: {
        totalRemindersSent: reminderHistory?.length || 0,
        remainingReminders: Math.max(
          0,
          (signatureRequest.max_reminders || 5) - (signatureRequest.reminder_count || 0)
        ),
      },
    });
  } catch (error) {
    console.error("Error getting signer reminder history:", error);
    return NextResponse.json(
      { error: "Failed to get reminder history" },
      { status: 500 }
    );
  }
}

/**
 * POST - Send reminder to a specific signer
 */
export async function POST(
  request: NextRequest,
  { params }: { params: Promise<{ id: string; requestId: string }> }
) {
  try {
    const { id, requestId } = await params;
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
      .select("id, title, user_id, reminder_interval_days")
      .eq("id", id)
      .eq("user_id", user.id)
      .single();

    if (contractError || !contract) {
      return NextResponse.json({ error: "Contract not found" }, { status: 404 });
    }

    // Get the signature request
    const { data: signatureRequest, error: sigError } = await supabase
      .from("signature_requests")
      .select("*")
      .eq("id", requestId)
      .eq("contract_id", id)
      .single();

    if (sigError || !signatureRequest) {
      return NextResponse.json(
        { error: "Signature request not found" },
        { status: 404 }
      );
    }

    // Check if signer has already signed
    if (signatureRequest.status !== "pending") {
      return NextResponse.json(
        {
          error: "Cannot send reminder",
          message: `Signer status is "${signatureRequest.status}", not pending`
        },
        { status: 400 }
      );
    }

    // Check if request has expired
    if (new Date(signatureRequest.expires_at) < new Date()) {
      return NextResponse.json(
        { error: "Cannot send reminder", message: "Signature request has expired" },
        { status: 400 }
      );
    }

    const now = new Date();
    const baseUrl = process.env.NEXT_PUBLIC_APP_URL || "http://localhost:3000";
    const signingUrl = `${baseUrl}/sign/${signatureRequest.token}`;

    let emailSent = false;
    let emailId: string | undefined;
    let errorMessage: string | undefined;

    try {
      const result = await sendSigningReminder({
        to: signatureRequest.signer_email,
        signerName: signatureRequest.signer_name,
        contractTitle: contract.title,
        signingUrl,
        expiresAt: signatureRequest.expires_at,
      });
      emailSent = true;
      emailId = result.id;
    } catch (error) {
      console.error(`Failed to send reminder to ${signatureRequest.signer_email}:`, error);
      errorMessage = error instanceof Error ? error.message : "Unknown error";
    }

    // Calculate next reminder time
    const intervalDays = contract.reminder_interval_days || 3;
    const nextReminderAt = new Date(Date.now() + intervalDays * 24 * 60 * 60 * 1000);

    // Update signature request
    const currentCount = signatureRequest.reminder_count || 0;
    const { error: updateError } = await supabase
      .from("signature_requests")
      .update({
        last_reminder_sent_at: now.toISOString(),
        reminder_count: currentCount + 1,
        next_reminder_at: nextReminderAt.toISOString(),
        updated_at: now.toISOString(),
      })
      .eq("id", requestId);

    if (updateError) {
      console.error("Error updating signature request:", updateError);
    }

    // Record in reminder history
    const { error: historyError } = await supabase
      .from("signature_reminder_history")
      .insert({
        signature_request_id: requestId,
        contract_id: id,
        sent_at: now.toISOString(),
        sent_by: user.id,
        email_id: emailId || null,
        status: emailSent ? "sent" : "failed",
        reminder_type: "manual",
      });

    if (historyError) {
      console.error("Error recording reminder history:", historyError);
    }

    if (!emailSent) {
      return NextResponse.json(
        {
          success: false,
          error: "Failed to send reminder email",
          message: errorMessage,
          signer: {
            email: signatureRequest.signer_email,
            name: signatureRequest.signer_name,
          },
        },
        { status: 500 }
      );
    }

    return NextResponse.json({
      success: true,
      message: `Reminder sent to ${signatureRequest.signer_name}`,
      signer: {
        email: signatureRequest.signer_email,
        name: signatureRequest.signer_name,
        emailId,
      },
      reminderCount: currentCount + 1,
      nextReminderAt: nextReminderAt.toISOString(),
    });
  } catch (error) {
    console.error("Error sending reminder to signer:", error);
    return NextResponse.json(
      { error: "Failed to send reminder" },
      { status: 500 }
    );
  }
}

/**
 * PATCH - Update reminder settings for a specific signer
 */
export async function PATCH(
  request: NextRequest,
  { params }: { params: Promise<{ id: string; requestId: string }> }
) {
  try {
    const { id, requestId } = await params;
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
    const { reminderEnabled, maxReminders } = body;

    // Verify contract ownership
    const { data: contract, error: contractError } = await supabase
      .from("contracts")
      .select("id, user_id, reminder_interval_days")
      .eq("id", id)
      .eq("user_id", user.id)
      .single();

    if (contractError || !contract) {
      return NextResponse.json({ error: "Contract not found" }, { status: 404 });
    }

    // Verify signature request exists and belongs to this contract
    const { data: signatureRequest, error: sigError } = await supabase
      .from("signature_requests")
      .select("id, status, reminder_enabled, max_reminders")
      .eq("id", requestId)
      .eq("contract_id", id)
      .single();

    if (sigError || !signatureRequest) {
      return NextResponse.json(
        { error: "Signature request not found" },
        { status: 404 }
      );
    }

    // Build update object
    const updateData: Record<string, unknown> = {
      updated_at: new Date().toISOString(),
    };

    if (typeof reminderEnabled === "boolean") {
      updateData.reminder_enabled = reminderEnabled;

      if (reminderEnabled === true && signatureRequest.status === "pending") {
        const intervalDays = contract.reminder_interval_days || 3;
        updateData.next_reminder_at = new Date(
          Date.now() + intervalDays * 24 * 60 * 60 * 1000
        ).toISOString();
      } else if (reminderEnabled === false) {
        updateData.next_reminder_at = null;
      }
    }

    if (typeof maxReminders === "number" && maxReminders >= 1 && maxReminders <= 20) {
      updateData.max_reminders = maxReminders;
    }

    // Update signature request
    const { error: updateError } = await supabase
      .from("signature_requests")
      .update(updateData)
      .eq("id", requestId);

    if (updateError) {
      console.error("Error updating signature request:", updateError);
      return NextResponse.json(
        { error: "Failed to update reminder settings" },
        { status: 500 }
      );
    }

    return NextResponse.json({
      success: true,
      message: "Signer reminder settings updated",
      settings: {
        reminderEnabled: reminderEnabled ?? signatureRequest.reminder_enabled,
        maxReminders: maxReminders ?? signatureRequest.max_reminders,
      },
    });
  } catch (error) {
    console.error("Error updating signer reminder settings:", error);
    return NextResponse.json(
      { error: "Failed to update reminder settings" },
      { status: 500 }
    );
  }
}
