import { NextRequest, NextResponse } from "next/server";
import { createAdminClient } from "@/lib/supabase/admin";
import { z } from "zod";
import { randomInt } from "crypto";
import { sendVerificationCodeEmail } from "@/lib/email";
import {
  getRequestContextFromRequest,
  logAuditEventWithClient,
} from "@/lib/audit";

const CODE_EXPIRY_MINUTES = 10;
const MAX_ATTEMPTS = 5;
const RESEND_COOLDOWN_SECONDS = 60;

// POST - Send verification code
const SendCodeSchema = z.object({
  action: z.literal("send"),
});

// POST - Verify code
const VerifyCodeSchema = z.object({
  action: z.literal("verify"),
  code: z.string().length(6, "Code must be 6 digits"),
});

export async function POST(
  request: NextRequest,
  { params }: { params: Promise<{ token: string }> }
) {
  try {
    const { token } = await params;
    const supabase = createAdminClient();

    // Get signature request
    const { data: signatureRequest, error: srError } = await supabase
      .from("signature_requests")
      .select("*, contracts(*)")
      .eq("token", token)
      .single();

    if (srError || !signatureRequest) {
      return NextResponse.json(
        { error: "Signature request not found" },
        { status: 404 }
      );
    }

    // Check if expired
    if (signatureRequest.expires_at && new Date() > new Date(signatureRequest.expires_at)) {
      return NextResponse.json(
        { error: "Signature request has expired" },
        { status: 410 }
      );
    }

    // Check if already verified
    if (signatureRequest.email_verified_at) {
      return NextResponse.json({
        success: true,
        verified: true,
        message: "Email already verified",
      });
    }

    const body = await request.json();

    // Determine action
    if (body.action === "send") {
      const parseResult = SendCodeSchema.safeParse(body);
      if (!parseResult.success) {
        return NextResponse.json(
          { error: "Invalid request", details: parseResult.error.flatten() },
          { status: 400 }
        );
      }
      return handleSendCode(supabase, signatureRequest, request);
    } else if (body.action === "verify") {
      const parseResult = VerifyCodeSchema.safeParse(body);
      if (!parseResult.success) {
        return NextResponse.json(
          { error: "Invalid request", details: parseResult.error.flatten() },
          { status: 400 }
        );
      }
      return handleVerifyCode(supabase, signatureRequest, parseResult.data.code, request);
    } else {
      return NextResponse.json(
        { error: "Invalid action. Use 'send' or 'verify'" },
        { status: 400 }
      );
    }
  } catch (error) {
    console.error("Verification error:", error);
    return NextResponse.json(
      { error: "Verification failed" },
      { status: 500 }
    );
  }
}

async function handleSendCode(
  supabase: ReturnType<typeof createAdminClient>,
  signatureRequest: {
    id: string;
    signer_email: string;
    signer_name: string;
    contract_id: string;
    contracts: { id: string; title: string } | null;
  },
  request: NextRequest
) {
  const { data: recentCode } = await supabase
    .from("signer_verification_codes")
    .select("created_at")
    .eq("signature_request_id", signatureRequest.id)
    .order("created_at", { ascending: false })
    .limit(1)
    .maybeSingle();

  if (recentCode?.created_at) {
    const elapsedSeconds = Math.floor(
      (Date.now() - new Date(recentCode.created_at).getTime()) / 1000
    );
    const retryAfter = Math.max(0, RESEND_COOLDOWN_SECONDS - elapsedSeconds);
    if (retryAfter > 0) {
      return NextResponse.json(
        {
          error: `Please wait ${retryAfter} seconds before requesting another code`,
          retryAfterSeconds: retryAfter,
        },
        { status: 429, headers: { "Retry-After": retryAfter.toString() } }
      );
    }
  }

  // Generate 6-digit code
  const code = randomInt(100000, 999999).toString();
  const expiresAt = new Date(Date.now() + CODE_EXPIRY_MINUTES * 60 * 1000);

  // Delete any existing codes for this signature request
  await supabase
    .from("signer_verification_codes")
    .delete()
    .eq("signature_request_id", signatureRequest.id);

  // Insert new code
  const { error: insertError } = await supabase
    .from("signer_verification_codes")
    .insert({
      signature_request_id: signatureRequest.id,
      email: signatureRequest.signer_email,
      code,
      expires_at: expiresAt.toISOString(),
    });

  if (insertError) {
    console.error("Error inserting verification code:", insertError);
    return NextResponse.json(
      { error: "Failed to generate verification code" },
      { status: 500 }
    );
  }

  // Send email
  try {
    await sendVerificationCodeEmail({
      to: signatureRequest.signer_email,
      signerName: signatureRequest.signer_name,
      contractTitle: signatureRequest.contracts?.title || "Contract",
      code,
      expiresInMinutes: CODE_EXPIRY_MINUTES,
    });
  } catch (emailError) {
    console.error("Failed to send verification email:", emailError);
    await supabase
      .from("signer_verification_codes")
      .delete()
      .eq("signature_request_id", signatureRequest.id)
      .eq("code", code);
    return NextResponse.json(
      { error: "Failed to send verification email" },
      { status: 500 }
    );
  }

  return NextResponse.json({
    success: true,
    message: "Verification code sent",
    email: maskEmail(signatureRequest.signer_email),
    expiresInMinutes: CODE_EXPIRY_MINUTES,
  });
}

async function handleVerifyCode(
  supabase: ReturnType<typeof createAdminClient>,
  signatureRequest: {
    id: string;
    signer_email: string;
    signer_name: string;
    contract_id: string;
  },
  code: string,
  request: NextRequest
) {
  // Get the verification code
  const { data: verificationCode, error: codeError } = await supabase
    .from("signer_verification_codes")
    .select("*")
    .eq("signature_request_id", signatureRequest.id)
    .order("created_at", { ascending: false })
    .limit(1)
    .maybeSingle();

  if (codeError || !verificationCode) {
    return NextResponse.json(
      { error: "Invalid verification code" },
      { status: 400 }
    );
  }

  // Check if expired
  if (new Date() > new Date(verificationCode.expires_at)) {
    return NextResponse.json(
      { error: "Verification code has expired. Please request a new one." },
      { status: 410 }
    );
  }

  // Check attempts
  if (verificationCode.attempts >= MAX_ATTEMPTS) {
    return NextResponse.json(
      { error: "Too many attempts. Please request a new code." },
      { status: 429 }
    );
  }

  if (verificationCode.code !== code) {
    const attempts = verificationCode.attempts + 1;
    await supabase
      .from("signer_verification_codes")
      .update({ attempts })
      .eq("id", verificationCode.id);

    return NextResponse.json(
      {
        error:
          attempts >= MAX_ATTEMPTS
            ? "Too many attempts. Please request a new code."
            : "Invalid verification code",
        attemptsRemaining: Math.max(0, MAX_ATTEMPTS - attempts),
      },
      { status: attempts >= MAX_ATTEMPTS ? 429 : 400 }
    );
  }

  // Check if already verified
  if (verificationCode.verified_at) {
    return NextResponse.json({
      success: true,
      verified: true,
      message: "Already verified",
    });
  }

  // Mark as verified
  await supabase
    .from("signer_verification_codes")
    .update({ verified_at: new Date().toISOString() })
    .eq("id", verificationCode.id);

  // Update signature request
  await supabase
    .from("signature_requests")
    .update({ email_verified_at: new Date().toISOString() })
    .eq("id", signatureRequest.id);

  // Log the verification event
  const context = getRequestContextFromRequest(request);
  await logAuditEventWithClient(supabase, {
    contractId: signatureRequest.contract_id,
    signatureRequestId: signatureRequest.id,
    eventType: "signer_email_verified",
    actorEmail: signatureRequest.signer_email,
    actorName: signatureRequest.signer_name,
    metadata: {
      action: "email_verified",
      verification_method: "email_code",
    },
    context,
  });

  return NextResponse.json({
    success: true,
    verified: true,
    message: "Email verified successfully",
  });
}

/**
 * Mask email for privacy (show first char and domain)
 */
function maskEmail(email: string): string {
  const [local, domain] = email.split("@");
  if (local.length <= 2) {
    return `${local[0]}***@${domain}`;
  }
  return `${local[0]}${"*".repeat(local.length - 2)}${local[local.length - 1]}@${domain}`;
}
