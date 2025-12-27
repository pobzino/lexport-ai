import { NextRequest, NextResponse } from "next/server";
import { createClient } from "@/lib/supabase/server";

// This endpoint should be called by a cron job (e.g., Netlify Scheduled Functions)
// to process and send reminders for pending signatures

export async function POST(request: NextRequest) {
  try {
    // Verify cron secret for security
    const authHeader = request.headers.get("authorization");
    const cronSecret = process.env.CRON_SECRET;

    if (cronSecret && authHeader !== `Bearer ${cronSecret}`) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    }

    const supabase = await createClient();
    const now = new Date();

    // Find contracts that need reminders
    const { data: contracts, error: fetchError } = await supabase
      .from("contracts")
      .select(`
        id,
        title,
        reminder_interval_days,
        signature_requests!inner (
          id,
          signer_email,
          signer_name,
          signer_role,
          status,
          token,
          last_reminder_sent_at
        )
      `)
      .eq("status", "pending_signature")
      .eq("reminder_enabled", true)
      .lte("next_reminder_at", now.toISOString());

    if (fetchError) {
      console.error("Error fetching contracts for reminders:", fetchError);
      return NextResponse.json(
        { error: "Failed to fetch contracts" },
        { status: 500 }
      );
    }

    if (!contracts || contracts.length === 0) {
      return NextResponse.json({
        success: true,
        message: "No reminders to send",
        processed: 0
      });
    }

    let remindersSent = 0;
    const errors: string[] = [];

    for (const contract of contracts) {
      // Get pending signature requests
      const pendingRequests = (contract.signature_requests as {
        id: string;
        signer_email: string;
        signer_name: string;
        signer_role: string;
        status: string;
        token: string;
        last_reminder_sent_at: string | null;
      }[]).filter((r) => r.status === "pending");

      for (const sigRequest of pendingRequests) {
        try {
          // Send reminder email (placeholder - integrate with email service)
          const signingUrl = `${process.env.NEXT_PUBLIC_APP_URL || "http://localhost:3500"}/sign/${sigRequest.token}`;

          console.log(`[Reminder] Would send email to ${sigRequest.signer_email}:`);
          console.log(`  Contract: ${contract.title}`);
          console.log(`  Signing URL: ${signingUrl}`);

          // TODO: Integrate with email service (Resend, SendGrid, etc.)
          // await sendReminderEmail({
          //   to: sigRequest.signer_email,
          //   signerName: sigRequest.signer_name,
          //   contractTitle: contract.title,
          //   signingUrl,
          // });

          // Update last_reminder_sent_at on signature request
          await supabase
            .from("signature_requests")
            .update({
              last_reminder_sent_at: now.toISOString(),
              updated_at: now.toISOString(),
            })
            .eq("id", sigRequest.id);

          remindersSent++;
        } catch (err) {
          const errorMsg = `Failed to send reminder for ${sigRequest.signer_email}: ${err}`;
          console.error(errorMsg);
          errors.push(errorMsg);
        }
      }

      // Calculate next reminder time
      const nextReminderAt = new Date(
        now.getTime() + (contract.reminder_interval_days || 3) * 24 * 60 * 60 * 1000
      );

      // Update contract's last reminder and next reminder times
      await supabase
        .from("contracts")
        .update({
          last_reminder_sent_at: now.toISOString(),
          next_reminder_at: nextReminderAt.toISOString(),
          updated_at: now.toISOString(),
        })
        .eq("id", contract.id);
    }

    // Create audit logs for reminders sent
    // (optional: could add reminder_sent event type)

    return NextResponse.json({
      success: true,
      message: `Processed ${contracts.length} contracts`,
      remindersSent,
      errors: errors.length > 0 ? errors : undefined,
    });
  } catch (error) {
    console.error("Error processing reminders:", error);
    return NextResponse.json(
      { error: "Failed to process reminders" },
      { status: 500 }
    );
  }
}

// GET endpoint to check reminder status (for debugging)
export async function GET() {
  try {
    const supabase = await createClient();
    const now = new Date();

    const { data: pendingReminders, error } = await supabase
      .from("contracts")
      .select(`
        id,
        title,
        next_reminder_at,
        reminder_interval_days,
        signature_requests (
          id,
          signer_email,
          status,
          last_reminder_sent_at
        )
      `)
      .eq("status", "pending_signature")
      .eq("reminder_enabled", true)
      .order("next_reminder_at", { ascending: true })
      .limit(10);

    if (error) {
      return NextResponse.json({ error: "Failed to fetch" }, { status: 500 });
    }

    return NextResponse.json({
      currentTime: now.toISOString(),
      pendingReminders: pendingReminders?.map((c) => ({
        id: c.id,
        title: c.title,
        nextReminderAt: c.next_reminder_at,
        intervalDays: c.reminder_interval_days,
        pendingSigners: (c.signature_requests as { status: string }[])
          .filter((r) => r.status === "pending").length,
      })),
    });
  } catch (error) {
    return NextResponse.json({ error: "Failed" }, { status: 500 });
  }
}
