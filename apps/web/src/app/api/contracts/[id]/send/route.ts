import { NextRequest, NextResponse } from "next/server";
import { createClient } from "@/lib/supabase/server";
import { z } from "zod";
import { randomBytes } from "crypto";
import { sendSigningInvitation } from "@/lib/email";
import { generateContentHash } from "@/lib/document-integrity";
import { auditLogger, getRequestContextFromRequest } from "@/lib/audit";

// Request schema
const SendRequestSchema = z.object({
  signers: z.array(
    z.object({
      name: z.string().min(1, "Name required"),
      email: z.string().email("Valid email required"),
      role: z.string().optional(),
    })
  ).min(1, "At least one signer required"),
  message: z.string().optional(),
  expiresInDays: z.number().min(1).max(90).default(14),
  requireSequentialSigning: z.boolean().default(false),
  reminderEnabled: z.boolean().default(true),
  reminderIntervalDays: z.number().min(1).max(14).default(3),
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

    // Check subscription limits for signatures
    const { data: userData } = await supabase
      .from("users")
      .select("subscription_tier, signatures_used, signatures_limit")
      .eq("id", user.id)
      .single();

    const tier = userData?.subscription_tier || "free";
    const signaturesUsed = userData?.signatures_used || 0;
    const signaturesLimit = userData?.signatures_limit || 3;

    // Parse request
    const body = await request.json();
    const parseResult = SendRequestSchema.safeParse(body);

    if (!parseResult.success) {
      return NextResponse.json(
        { error: "Invalid request", details: parseResult.error.flatten() },
        { status: 400 }
      );
    }

    const {
      signers,
      message,
      expiresInDays,
      requireSequentialSigning,
      reminderEnabled,
      reminderIntervalDays,
    } = parseResult.data;

    // Check if user has enough signatures remaining (free tier only)
    if (tier === "free" && signaturesLimit !== -1) {
      const signaturesNeeded = signers.length;
      const signaturesRemaining = signaturesLimit - signaturesUsed;

      if (signaturesNeeded > signaturesRemaining) {
        return NextResponse.json(
          {
            error: "Signature limit reached",
            message: `You have ${signaturesRemaining} signature${signaturesRemaining !== 1 ? "s" : ""} remaining on the free plan. Upgrade to Pro for unlimited signatures.`,
            upgradeUrl: "/settings/billing",
            signaturesRemaining,
            signaturesNeeded,
          },
          { status: 403 }
        );
      }
    }

    // Fetch and verify contract ownership
    const { data: contract, error: contractError } = await supabase
      .from("contracts")
      .select("*")
      .eq("id", id)
      .eq("user_id", user.id)
      .single();

    if (contractError || !contract) {
      return NextResponse.json({ error: "Contract not found" }, { status: 404 });
    }

    // Calculate expiration date
    const expiresAt = new Date();
    expiresAt.setDate(expiresAt.getDate() + expiresInDays);

    // Calculate first reminder time (24h after sending)
    const firstReminderAt = reminderEnabled
      ? new Date(Date.now() + 24 * 60 * 60 * 1000) // 24 hours from now
      : null;

    // Create signature requests for each signer
    const signatureRequestsData = signers.map((signer, index) => ({
      contract_id: id,
      signer_email: signer.email,
      signer_name: signer.name,
      signer_role: signer.role,
      token: randomBytes(32).toString("hex"),
      status: "pending",
      order: index + 1,
      expires_at: expiresAt.toISOString(),
      message,
      reminder_enabled: reminderEnabled,
      reminder_interval_days: reminderIntervalDays,
      next_reminder_at: firstReminderAt?.toISOString(),
      reminder_count: 0,
      max_reminders: 5,
    }));

    const { data: createdRequests, error: insertError } = await supabase
      .from("signature_requests")
      .insert(signatureRequestsData)
      .select();

    if (insertError) {
      console.error("Error creating signature requests:", insertError);
      return NextResponse.json(
        { error: "Failed to create signature requests" },
        { status: 500 }
      );
    }

    // Increment signatures used counter (by the number of signers)
    for (let i = 0; i < signers.length; i++) {
      try {
        await supabase.rpc("increment_signatures_used", { user_uuid: user.id });
      } catch (err) {
        console.error("Failed to increment signature usage:", err);
      }
    }

    // Calculate next reminder time
    const nextReminderAt = reminderEnabled
      ? new Date(Date.now() + reminderIntervalDays * 24 * 60 * 60 * 1000).toISOString()
      : null;

    // Generate content hash for tamper-proof verification
    const contentHash = generateContentHash(contract.content);

    // Update contract status, settings, and content hash
    await supabase
      .from("contracts")
      .update({
        status: "pending_signature",
        require_sequential_signing: requireSequentialSigning,
        reminder_enabled: reminderEnabled,
        reminder_interval_days: reminderIntervalDays,
        next_reminder_at: nextReminderAt,
        content_hash: contentHash,
        content_hash_algorithm: "SHA-256",
        content_hash_generated_at: new Date().toISOString(),
        updated_at: new Date().toISOString(),
      })
      .eq("id", id);

    // Build signing URLs and send emails
    const baseUrl = process.env.NEXT_PUBLIC_APP_URL || "http://localhost:3000";
    const signingUrls: { email: string; name: string; url: string; expiresAt: string; emailSent: boolean }[] = [];
    const emailErrors: string[] = [];

    // Get sender name from user profile
    const { data: profile } = await supabase
      .from("profiles")
      .select("full_name")
      .eq("id", user.id)
      .single();
    const senderName = profile?.full_name || undefined;

    for (const req of createdRequests || []) {
      const signingUrl = `${baseUrl}/sign/${req.token}`;
      let emailSent = false;

      try {
        await sendSigningInvitation({
          to: req.signer_email,
          signerName: req.signer_name,
          contractTitle: contract.title,
          signingUrl,
          message,
          expiresAt: req.expires_at,
          senderName,
        });
        emailSent = true;
      } catch (error) {
        console.error(`Failed to send email to ${req.signer_email}:`, error);
        emailErrors.push(req.signer_email);
      }

      signingUrls.push({
        email: req.signer_email,
        name: req.signer_name,
        url: signingUrl,
        expiresAt: req.expires_at,
        emailSent,
      });
    }

    // Log contract sent event
    const context = getRequestContextFromRequest(request);
    await auditLogger.contractSent(
      id,
      user.id,
      user.email || "",
      user.user_metadata?.name || user.user_metadata?.full_name || null,
      signers.map(s => s.email),
      context
    );

    return NextResponse.json({
      success: true,
      message: emailErrors.length > 0
        ? `Signature requests created for ${signers.length} signer(s). ${emailErrors.length} email(s) failed to send.`
        : `Signature requests sent to ${signers.length} signer(s)`,
      signingUrls,
      emailErrors: emailErrors.length > 0 ? emailErrors : undefined,
    });
  } catch (error) {
    console.error("Error sending contract for signature:", error);
    return NextResponse.json(
      { error: "Failed to send contract for signature" },
      { status: 500 }
    );
  }
}
