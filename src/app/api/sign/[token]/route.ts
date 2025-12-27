import { NextRequest, NextResponse } from "next/server";
import { createClient } from "@/lib/supabase/server";
import { z } from "zod";

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

    // Check if already signed
    if (signatureRequest.status === "signed") {
      return NextResponse.json(
        { error: "Contract has already been signed", alreadySigned: true },
        { status: 400 }
      );
    }

    const contract = signatureRequest.contracts;

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
        requireSequentialSigning: contract.require_sequential_signing,
        paymentRequired: contract.payment_required,
        paymentAmount: contract.payment_amount,
        paymentCurrency: contract.payment_currency,
        paymentStatus: contract.payment_status,
      },
      signatureFields: signatureFields || [],
      signingProgress,
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

    const { signatureData, signatureType, ipAddress, userAgent, fieldValues } = parseResult.data;

    // Find the signature request
    const { data: signatureRequest, error: fetchError } = await supabase
      .from("signature_requests")
      .select("*")
      .eq("token", token)
      .single();

    if (fetchError || !signatureRequest) {
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

    // Check if already signed
    if (signatureRequest.status === "signed") {
      return NextResponse.json(
        { error: "Contract has already been signed" },
        { status: 400 }
      );
    }

    // Generate a simple hash from signature data for integrity
    const imageHash = await crypto.subtle.digest(
      'SHA-256',
      new TextEncoder().encode(signatureData)
    ).then(buf => Array.from(new Uint8Array(buf)).map(b => b.toString(16).padStart(2, '0')).join(''));

    // Create the signature record
    const { data: signature, error: insertError } = await supabase
      .from("signatures")
      .insert({
        signature_request_id: signatureRequest.id,
        contract_id: signatureRequest.contract_id,
        signature_data: signatureData,
        signature_type: signatureType,
        image_hash: imageHash,
        ip_address: ipAddress || request.headers.get("x-forwarded-for") || "unknown",
        user_agent: userAgent || request.headers.get("user-agent") || "unknown",
        signed_at: new Date().toISOString(),
      })
      .select()
      .single();

    if (insertError) {
      console.error("Error creating signature:", insertError);
      return NextResponse.json(
        { error: "Failed to create signature" },
        { status: 500 }
      );
    }

    // Save field values if provided
    if (fieldValues && fieldValues.length > 0) {
      const fieldValueInserts = fieldValues.map((fv) => ({
        field_id: fv.fieldId,
        signature_request_id: signatureRequest.id,
        value: fv.value || null,
        signature_id: fv.signatureData ? signature.id : null,
        completed_at: new Date().toISOString(),
      }));

      const { error: fieldValueError } = await supabase
        .from("field_values")
        .insert(fieldValueInserts);

      if (fieldValueError) {
        console.error("Error saving field values:", fieldValueError);
        // Continue even if field values fail - signature is still saved
      }
    }

    // Update signature request status
    await supabase
      .from("signature_requests")
      .update({
        status: "signed",
        signed_at: new Date().toISOString(),
        updated_at: new Date().toISOString(),
      })
      .eq("id", signatureRequest.id);

    // Check if all signers have signed
    const { data: allRequests } = await supabase
      .from("signature_requests")
      .select("id, status")
      .eq("contract_id", signatureRequest.contract_id);

    const allSigned = (allRequests || []).every((r) =>
      r.id === signatureRequest.id || r.status === "signed"
    );

    // If all signed, update contract status
    if (allSigned) {
      await supabase
        .from("contracts")
        .update({
          status: "signed",
          signed_at: new Date().toISOString(),
          updated_at: new Date().toISOString(),
        })
        .eq("id", signatureRequest.contract_id);
    }

    return NextResponse.json({
      success: true,
      message: "Contract signed successfully",
      allSigned,
      signatureId: signature.id,
    });
  } catch (error) {
    console.error("Error submitting signature:", error);
    return NextResponse.json(
      { error: "Failed to submit signature" },
      { status: 500 }
    );
  }
}
