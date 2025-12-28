import { NextRequest, NextResponse } from "next/server";
import { createClient } from "@/lib/supabase/server";
import { z } from "zod";
import { generateContentHash, generateIdentityConfirmationText } from "@/lib/document-integrity";

// GET - Fetch signature request details
export async function GET(
  request: NextRequest,
  { params }: { params: Promise<{ token: string }> }
) {
  try {
    const { token } = await params;
    const supabase = await createClient();

    // Find the signature request with contract
    const { data: signatureRequest, error } = await supabase
      .from("signature_requests")
      .select("*, contracts(*)")
      .eq("token", token)
      .single();

    if (error || !signatureRequest) {
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

    const contract = signatureRequest.contracts;

    // Check if already signed
    if (signatureRequest.status === "signed") {
      // Check if payment is still required - if so, include contract info for redirect
      let paymentPending = false;
      if (contract.payment_required && contract.payment_status !== "succeeded") {
        // Check if there are any successful payments
        const { data: successfulPayments } = await supabase
          .from("payments")
          .select("payment_type, status")
          .eq("contract_id", contract.id)
          .eq("status", "succeeded");

        const hasFullPayment = successfulPayments?.some(p => p.payment_type === "full");
        const hasDepositPayment = successfulPayments?.some(p => p.payment_type === "deposit");
        const hasBalancePayment = successfulPayments?.some(p => p.payment_type === "balance");

        // Payment is pending if no full payment and (no deposit or balance depending on structure)
        if (!hasFullPayment) {
          if (contract.payment_structure === "deposit_balance") {
            // For deposit_balance, payment is pending if balance not paid
            paymentPending = !hasBalancePayment;
          } else {
            // For full payment structure
            paymentPending = true;
          }
        }
      }

      return NextResponse.json(
        {
          error: "Contract has already been signed",
          alreadySigned: true,
          paymentPending,
          contractId: contract.id,
          paymentAmount: contract.payment_amount,
          paymentCurrency: contract.payment_currency,
        },
        { status: 400 }
      );
    }

    // Check sequential signing order
    if (contract.require_sequential_signing) {
      // Get all signature requests for this contract ordered by signing order
      const { data: allRequests } = await supabase
        .from("signature_requests")
        .select("id, order, status")
        .eq("contract_id", contract.id)
        .order("order", { ascending: true });

      if (allRequests) {
        // Find previous signers who haven't signed yet
        const previousUnsigned = allRequests.filter(
          (r) => r.order < signatureRequest.order && r.status !== "signed"
        );

        if (previousUnsigned.length > 0) {
          return NextResponse.json(
            {
              error: "Waiting for previous signers",
              waitingFor: previousUnsigned.length,
              message: `This contract requires signatures in order. ${previousUnsigned.length} signer(s) before you still need to sign.`,
              notYourTurn: true,
            },
            { status: 403 }
          );
        }
      }
    }

    // Update viewed_at if not already viewed
    if (!signatureRequest.viewed_at) {
      await supabase
        .from("signature_requests")
        .update({ viewed_at: new Date().toISOString() })
        .eq("id", signatureRequest.id);
    }

    // Fetch signature fields for this contract
    const { data: signatureFields } = await supabase
      .from("signature_fields")
      .select("*")
      .eq("contract_id", contract.id)
      .order("order", { ascending: true });

    // Check payment status for deposit/balance structures
    let depositPaid = false;
    let paymentSufficientForSigning = false;

    if (contract.payment_required) {
      // Check if any payments have succeeded
      const { data: successfulPayments } = await supabase
        .from("payments")
        .select("payment_type, status, amount")
        .eq("contract_id", contract.id)
        .eq("status", "succeeded");

      const hasDepositPayment = successfulPayments?.some(p => p.payment_type === "deposit");
      const hasFullPayment = successfulPayments?.some(p => p.payment_type === "full");
      const hasBalancePayment = successfulPayments?.some(p => p.payment_type === "balance");

      depositPaid = hasDepositPayment || false;

      // Payment is sufficient for signing if:
      // 1. Full payment completed, OR
      // 2. For deposit_balance structure: deposit is paid (balance can be collected later)
      if (hasFullPayment || (hasDepositPayment && hasBalancePayment)) {
        paymentSufficientForSigning = true;
      } else if (contract.payment_structure === "deposit_balance" && hasDepositPayment) {
        // Deposit paid is sufficient to sign for deposit_balance contracts
        paymentSufficientForSigning = true;
      } else if (contract.payment_status === "succeeded") {
        paymentSufficientForSigning = true;
      }
    } else {
      // No payment required
      paymentSufficientForSigning = true;
    }

    // Get signing progress info
    let signingProgress = null;
    if (contract.require_sequential_signing) {
      const { data: allRequests } = await supabase
        .from("signature_requests")
        .select("id, signer_name, order, status")
        .eq("contract_id", contract.id)
        .order("order", { ascending: true });

      if (allRequests) {
        signingProgress = {
          isSequential: true,
          currentSignerOrder: signatureRequest.order,
          totalSigners: allRequests.length,
          signers: allRequests.map((r) => ({
            name: r.signer_name,
            order: r.order,
            status: r.status,
            isCurrent: r.id === signatureRequest.id,
          })),
        };
      }
    }

    // Generate identity confirmation text for this signer
    const identityConfirmationText = generateIdentityConfirmationText(
      signatureRequest.signer_name,
      signatureRequest.signer_role
    );

    // Return contract details for signing
    return NextResponse.json({
      signatureRequest: {
        id: signatureRequest.id,
        signerName: signatureRequest.signer_name,
        signerEmail: signatureRequest.signer_email,
        signerRole: signatureRequest.signer_role,
        status: signatureRequest.status,
        expiresAt: signatureRequest.expires_at,
        message: signatureRequest.message,
        order: signatureRequest.order,
      },
      contract: {
        id: contract.id,
        title: contract.title,
        type: contract.type,
        content: contract.content,
        contentHash: contract.content_hash,
        contentHashAlgorithm: contract.content_hash_algorithm || "SHA-256",
        requireSequentialSigning: contract.require_sequential_signing,
        paymentRequired: contract.payment_required,
        paymentAmount: contract.payment_amount,
        paymentCurrency: contract.payment_currency,
        paymentStatus: contract.payment_status,
        paymentStructure: contract.payment_structure,
        depositPercentage: contract.deposit_percentage,
        depositPaid,
        paymentSufficientForSigning,
      },
      signatureFields: signatureFields || [],
      signingProgress,
      identityConfirmationText,
    });
  } catch (error) {
    console.error("Error fetching signature request:", error);
    return NextResponse.json(
      { error: "Failed to fetch signature request" },
      { status: 500 }
    );
  }
}

// Field value schema
const FieldValueSchema = z.object({
  fieldId: z.string().uuid(),
  value: z.string().optional(),
  signatureData: z.string().optional(),
});

// POST - Submit signature
const SignatureSchema = z.object({
  signatureData: z.string().min(1, "Signature required"), // Base64 signature image
  signatureType: z.enum(["draw", "type", "upload"]).default("draw"),
  agreedToTerms: z.boolean().refine((v) => v === true, "Must agree to terms"),
  identityConfirmed: z.boolean().refine((v) => v === true, "Must confirm identity"),
  identityConfirmationText: z.string().min(1, "Identity confirmation text required"),
  documentHash: z.string().optional(), // For tamper verification
  ipAddress: z.string().optional(),
  userAgent: z.string().optional(),
  fieldValues: z.array(FieldValueSchema).optional(),
});

export async function POST(
  request: NextRequest,
  { params }: { params: Promise<{ token: string }> }
) {
  try {
    const { token } = await params;
    const supabase = await createClient();

    // Parse request body
    const body = await request.json();
    const parseResult = SignatureSchema.safeParse(body);

    if (!parseResult.success) {
      return NextResponse.json(
        { error: "Invalid request", details: parseResult.error.flatten() },
        { status: 400 }
      );
    }

    const { signatureData, signatureType, ipAddress, userAgent, identityConfirmed, identityConfirmationText, documentHash } = parseResult.data;

    // Get IP and user agent from headers if not provided
    const clientIp = ipAddress || request.headers.get("x-forwarded-for") || "unknown";
    const clientUserAgent = userAgent || request.headers.get("user-agent") || "unknown";

    // Call the database function to submit the signature
    // This bypasses RLS using SECURITY DEFINER
    const { data: result, error: rpcError } = await supabase.rpc("submit_signature", {
      p_token: token,
      p_signature_data: signatureData,
      p_signature_type: signatureType,
      p_ip_address: clientIp,
      p_user_agent: clientUserAgent,
      p_identity_confirmed: identityConfirmed,
      p_identity_confirmation_text: identityConfirmationText,
      p_document_hash: documentHash || null,
    });

    if (rpcError) {
      console.error("Error calling submit_signature:", rpcError);
      return NextResponse.json(
        { error: "Failed to submit signature" },
        { status: 500 }
      );
    }

    // Check the result from the database function
    if (!result.success) {
      const statusCode = result.error === "Signature request not found" ? 404
        : result.error === "Signature request has expired" ? 410
        : result.error === "Contract has already been signed" ? 400
        : 500;

      return NextResponse.json(
        { error: result.error },
        { status: statusCode }
      );
    }

    return NextResponse.json({
      success: true,
      message: result.message,
      allSigned: result.allSigned,
      signatureId: result.signatureId,
    });
  } catch (error) {
    console.error("Error submitting signature:", error);
    return NextResponse.json(
      { error: "Failed to submit signature" },
      { status: 500 }
    );
  }
}
