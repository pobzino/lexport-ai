import { NextRequest, NextResponse } from "next/server";
import { createAdminClient } from "@/lib/supabase/admin";
import { z } from "zod";
import { randomInt } from "crypto";
import { sendVerificationCodeEmail } from "@/lib/email";
import { auditLogger, getRequestContextFromRequest } from "@/lib/audit";

const CODE_EXPIRY_MINUTES = 10;
const MAX_ATTEMPTS = 5;

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
    .eq("code", code)
    .single();

  if (codeError || !verificationCode) {
    // Increment attempts on wrong code
    await supabase
      .from("signer_verification_codes")
      .update({ attempts: (verificationCode?.attempts || 0) + 1 })
      .eq("signature_request_id", signatureRequest.id);

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
  await auditLogger.log({
    contractId: signatureRequest.contract_id,
    signatureRequestId: signatureRequest.id,
    eventType: "signature_request_viewed",
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
