import { NextRequest, NextResponse } from "next/server";
import { createClient } from "@/lib/supabase/server";
import { z } from "zod";
import { sendSigningReminder } from "@/lib/email";

// Request schema
const RemindRequestSchema = z.object({
  signatureRequestId: z.string().uuid().optional(), // If omitted, remind all pending signers
});

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

    // Parse request
    const body = await request.json().catch(() => ({}));
    const parseResult = RemindRequestSchema.safeParse(body);

    if (!parseResult.success) {
      return NextResponse.json(
        { error: "Invalid request", details: parseResult.error.flatten() },
        { status: 400 }
      );
    }

    const { signatureRequestId } = parseResult.data;

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

    // Get signature requests to remind
    let query = supabase
      .from("signature_requests")
      .select("*")
      .eq("contract_id", id)
      .eq("status", "pending");

    if (signatureRequestId) {
      query = query.eq("id", signatureRequestId);
    }

    const { data: signatureRequests, error: fetchError } = await query;

    if (fetchError) {
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
    const remindedSigners: { email: string; name: string; emailSent: boolean }[] = [];
    const emailErrors: string[] = [];

    for (const sigRequest of signatureRequests) {
      const signingUrl = `${baseUrl}/sign/${sigRequest.token}`;
      let emailSent = false;

      try {
        await sendSigningReminder({
          to: sigRequest.signer_email,
          signerName: sigRequest.signer_name,
          contractTitle: contract.title,
          signingUrl,
          expiresAt: sigRequest.expires_at,
        });
        emailSent = true;
      } catch (error) {
        console.error(`Failed to send reminder to ${sigRequest.signer_email}:`, error);
        emailErrors.push(sigRequest.signer_email);
      }

      // Update last_reminder_sent_at regardless of email success
      await supabase
        .from("signature_requests")
        .update({
          last_reminder_sent_at: now.toISOString(),
          updated_at: now.toISOString(),
        })
        .eq("id", sigRequest.id);

      remindedSigners.push({
        email: sigRequest.signer_email,
        name: sigRequest.signer_name,
        emailSent,
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
    console.error("Error sending reminder:", error);
    return NextResponse.json(
      { error: "Failed to send reminder" },
      { status: 500 }
    );
  }
}
