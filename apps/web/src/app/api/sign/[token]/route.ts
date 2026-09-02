import { after, NextRequest, NextResponse } from "next/server";
import { createAdminClient } from "@/lib/supabase/admin";
import { z } from "zod";
import {
  documentHashesEqual,
  generateContentHash,
  generateIdentityConfirmationText,
  SIGNING_HASH_ALGORITHM,
} from "@/lib/document-integrity";
import { fingerprintSigningDocument } from "@/lib/signing-document";
import {
  getRequestContextFromRequest,
  logAuditEventWithClient,
} from "@/lib/audit";
import { lookupGeoLocation } from "@/lib/geolocation";
import { requestTimestamp, hashSignatureData } from "@/lib/rfc3161-timestamp";
import {
  sendCompletedContractWithCertificate,
  sendInvoiceEmail,
} from "@/lib/email";
import { insertInvoiceWithRetry } from "@/lib/invoices/create-invoice";
import { normalizeInvoiceBankDetails } from "@/lib/invoices/bank-details";
import { getInvoicePaymentUrl } from "@/lib/invoices/payment-link";
import { PDFDocument, rgb, StandardFonts } from "pdf-lib";
import { randomBytes } from "crypto";
import {
  getMilestoneAmount,
  normalizePaymentSchedule,
} from "@/lib/payments/config";
import { isPayingSignerRole } from "@/lib/payments/payer-role";
import { sealCompletedContract } from "@/lib/sealed-contract";

// GET - Fetch signature request details
export async function GET(
  request: NextRequest,
  { params }: { params: Promise<{ token: string }> },
) {
  try {
    const { token } = await params;
    const supabase = createAdminClient();

    // Find the signature request with contract
    const { data: signatureRequest, error } = await supabase
      .from("signature_requests")
      .select("*, contracts(*)")
      .eq("token", token)
      .single();

    if (error || !signatureRequest) {
      return NextResponse.json(
        { error: "Signature request not found" },
        { status: 404 },
      );
    }

    // Check if expired
    if (
      signatureRequest.expires_at &&
      new Date() > new Date(signatureRequest.expires_at)
    ) {
      return NextResponse.json(
        {
          error: "Signature request has expired",
          expired: true,
          expiresAt: signatureRequest.expires_at,
        },
        { status: 410 },
      );
    }

    const contract = signatureRequest.contracts;

    if (contract.content_hash_algorithm === SIGNING_HASH_ALGORITHM) {
      const isUploadedSignOnly =
        contract.source_type === "uploaded" &&
        contract.processing_mode === "sign_only" &&
        contract.source_file_url;
      const requestMatchesContract = documentHashesEqual(
        signatureRequest.document_hash || contract.content_hash,
        contract.content_hash,
      );
      const generatedContentMatches = isUploadedSignOnly
        ? true
        : documentHashesEqual(
            contract.content_hash,
            generateContentHash(contract.content),
          );

      if (!requestMatchesContract || !generatedContentMatches) {
        return NextResponse.json(
          {
            error:
              "This document changed after it was sent. Ask the sender to issue a new signing request.",
          },
          { status: 409 },
        );
      }
    }

    // Check if already signed
    if (signatureRequest.status === "signed") {
      // Check if payment is still required - if so, include contract info for redirect
      let paymentPending = false;
      if (
        contract.payment_required &&
        contract.payment_status !== "succeeded"
      ) {
        // Check if there are any successful payments
        const { data: successfulPayments } = await supabase
          .from("payments")
          .select("payment_type, status, metadata")
          .eq("contract_id", contract.id)
          .eq("status", "succeeded");

        const hasFullPayment = successfulPayments?.some(
          (p) => p.payment_type === "full",
        );
        const hasBalancePayment = successfulPayments?.some(
          (p) => p.payment_type === "balance",
        );

        // Payment is pending if no full payment and (no deposit or balance depending on structure)
        if (!hasFullPayment) {
          if (contract.payment_structure === "deposit_balance") {
            // For deposit_balance, payment is pending if balance not paid
            paymentPending = !hasBalancePayment;
          } else if (contract.payment_structure === "custom") {
            const schedule = normalizePaymentSchedule(
              contract.payment_schedule,
            );
            const paidMilestoneIds = new Set(
              (successfulPayments || []).map((payment) => {
                const metadata = payment.metadata as Record<
                  string,
                  unknown
                > | null;
                return typeof metadata?.payment_milestone_id === "string"
                  ? metadata.payment_milestone_id
                  : null;
              }),
            );
            paymentPending = schedule.some(
              (milestone) => !paidMilestoneIds.has(milestone.id),
            );
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
        { status: 400 },
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
          (r) => r.order < signatureRequest.order && r.status !== "signed",
        );

        if (previousUnsigned.length > 0) {
          return NextResponse.json(
            {
              error: "Waiting for previous signers",
              waitingFor: previousUnsigned.length,
              message: `This contract requires signatures in order. ${previousUnsigned.length} signer(s) before you still need to sign.`,
              notYourTurn: true,
            },
            { status: 403 },
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

      // Log signature request viewed event
      const context = getRequestContextFromRequest(request);
      await logAuditEventWithClient(supabase, {
        contractId: contract.id,
        signatureRequestId: signatureRequest.id,
        eventType: "signature_request_viewed",
        actorEmail: signatureRequest.signer_email,
        actorName: signatureRequest.signer_name,
        context,
      });
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
        .select("payment_type, status, amount, metadata")
        .eq("contract_id", contract.id)
        .eq("status", "succeeded");

      const hasDepositPayment = successfulPayments?.some(
        (p) => p.payment_type === "deposit",
      );
      const hasFullPayment = successfulPayments?.some(
        (p) => p.payment_type === "full",
      );
      const hasBalancePayment = successfulPayments?.some(
        (p) => p.payment_type === "balance",
      );
      const hasInstallmentPayment = successfulPayments?.some(
        (p) => p.payment_type === "installment",
      );

      depositPaid = hasDepositPayment || false;

      // Payment is sufficient for signing if:
      // 1. Full payment completed, OR
      // 2. For deposit_balance structure: deposit is paid (balance can be collected later)
      if (hasFullPayment || (hasDepositPayment && hasBalancePayment)) {
        paymentSufficientForSigning = true;
      } else if (
        contract.payment_structure === "deposit_balance" &&
        hasDepositPayment
      ) {
        // Deposit paid is sufficient to sign for deposit_balance contracts
        paymentSufficientForSigning = true;
      } else if (
        contract.payment_structure === "custom" &&
        hasInstallmentPayment
      ) {
        // The first stage serves as the upfront payment for a custom schedule.
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
      signatureRequest.signer_role,
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
        emailVerified: !!signatureRequest.email_verified_at,
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
        paymentSchedule: normalizePaymentSchedule(contract.payment_schedule),
        depositPercentage: contract.deposit_percentage,
        depositPaid,
        paymentSufficientForSigning,
        // Sign-only contract fields
        processingMode: contract.processing_mode,
        sourceFileUrl:
          contract.processing_mode === "sign_only" && contract.source_file_url
            ? `/api/sign/${token}/document`
            : null,
      },
      signatureFields: signatureFields || [],
      signingProgress,
      identityConfirmationText,
    });
  } catch (error) {
    console.error(
      "[sign GET] Error:",
      error instanceof Error ? error.message : error,
    );
    return NextResponse.json(
      {
        error: "Failed to fetch signature request",
        detail: error instanceof Error ? error.message : "Unknown error",
      },
      { status: 500 },
    );
  }
}

// Field value schema
const FieldValueSchema = z.object({
  fieldId: z.string().uuid(),
  value: z.string().optional(),
  signatureData: z.string().optional(),
  attachmentData: z
    .object({
      fileName: z.string().min(1).max(255),
      fileSize: z
        .number()
        .int()
        .positive()
        .max(10 * 1024 * 1024),
      fileType: z.string().min(1).max(120),
      dataUrl: z.string().min(1),
    })
    .optional(),
});

// POST - Submit signature
const SignatureSchema = z.object({
  signatureData: z.string().min(1, "Signature required"), // Base64 signature image
  signatureType: z.enum(["draw", "type", "upload"]).default("draw"),
  agreedToTerms: z.boolean().refine((v) => v === true, "Must agree to terms"),
  identityConfirmed: z
    .boolean()
    .refine((v) => v === true, "Must confirm identity"),
  identityConfirmationText: z
    .string()
    .min(1, "Identity confirmation text required"),
  ipAddress: z.string().optional(),
  userAgent: z.string().optional(),
  fieldValues: z.array(FieldValueSchema).optional(),
});

export async function POST(
  request: NextRequest,
  { params }: { params: Promise<{ token: string }> },
) {
  try {
    const { token } = await params;
    const supabase = createAdminClient();

    // Parse request body
    const body = await request.json();
    const parseResult = SignatureSchema.safeParse(body);

    if (!parseResult.success) {
      return NextResponse.json(
        { error: "Invalid request", details: parseResult.error.flatten() },
        { status: 400 },
      );
    }

    const {
      signatureData,
      signatureType,
      ipAddress,
      userAgent,
      identityConfirmed,
      identityConfirmationText,
      fieldValues,
    } = parseResult.data;

    const { data: signatureRequest, error: signatureRequestError } =
      await supabase
        .from("signature_requests")
        .select(
          "*, contracts(id, content, content_hash, content_hash_algorithm, source_type, source_file_url, source_file_type, processing_mode, require_sequential_signing)",
        )
        .eq("token", token)
        .single();

    if (signatureRequestError || !signatureRequest) {
      return NextResponse.json(
        { error: "Signature request not found" },
        { status: 404 },
      );
    }

    if (
      signatureRequest.expires_at &&
      new Date() > new Date(signatureRequest.expires_at)
    ) {
      return NextResponse.json(
        { error: "Signature request has expired", expired: true },
        { status: 410 },
      );
    }

    if (signatureRequest.status === "signed") {
      return NextResponse.json(
        { error: "Contract has already been signed" },
        { status: 400 },
      );
    }

    if (!signatureRequest.email_verified_at) {
      return NextResponse.json(
        { error: "Verify your email before signing" },
        { status: 403 },
      );
    }

    const contractRelation = Array.isArray(signatureRequest.contracts)
      ? signatureRequest.contracts[0]
      : signatureRequest.contracts;
    if (contractRelation?.require_sequential_signing) {
      const { data: previousSigner } = await supabase
        .from("signature_requests")
        .select("id")
        .eq("contract_id", signatureRequest.contract_id)
        .lt("order", signatureRequest.order)
        .neq("status", "signed")
        .limit(1)
        .maybeSingle();

      if (previousSigner) {
        return NextResponse.json(
          { error: "Waiting for previous signers", notYourTurn: true },
          { status: 409 },
        );
      }
    }

    const { data: contractFields, error: contractFieldsError } = await supabase
      .from("signature_fields")
      .select(
        "id, type, label, signer_role, required, position_x, position_y, width, height, page, order, options, placeholder, validation",
      )
      .eq("contract_id", signatureRequest.contract_id);

    if (contractFieldsError) {
      console.error(
        "Failed to validate signature fields:",
        contractFieldsError,
      );
      return NextResponse.json(
        { error: "Failed to validate signature fields" },
        { status: 500 },
      );
    }

    if (!contractRelation?.content_hash) {
      return NextResponse.json(
        { error: "This signing request has no document fingerprint" },
        { status: 409 },
      );
    }

    const serverDocumentHash = contractRelation.content_hash;
    if (contractRelation.content_hash_algorithm === SIGNING_HASH_ALGORITHM) {
      let currentDocumentHash: string;
      try {
        ({ hash: currentDocumentHash } = await fingerprintSigningDocument(
          supabase,
          contractRelation,
          contractFields || [],
        ));
      } catch (fingerprintError) {
        console.error("Failed to verify signing document:", fingerprintError);
        return NextResponse.json(
          { error: "The signing document could not be verified" },
          { status: 409 },
        );
      }

      if (
        !documentHashesEqual(serverDocumentHash, currentDocumentHash) ||
        !documentHashesEqual(
          signatureRequest.document_hash || serverDocumentHash,
          serverDocumentHash,
        )
      ) {
        return NextResponse.json(
          {
            error:
              "This document changed after it was sent. Ask the sender to issue a new signing request.",
          },
          { status: 409 },
        );
      }
    }

    const assignedFields = (contractFields || []).filter((field) =>
      signatureRequest.signer_role
        ? field.signer_role === signatureRequest.signer_role
        : !field.signer_role,
    );
    const allowedFieldIds = new Set(assignedFields.map((field) => field.id));
    const submittedValues = fieldValues || [];
    const submittedFieldIds = submittedValues.map((field) => field.fieldId);

    if (new Set(submittedFieldIds).size !== submittedFieldIds.length) {
      return NextResponse.json(
        { error: "A signature field was submitted more than once" },
        { status: 400 },
      );
    }

    if (submittedFieldIds.some((fieldId) => !allowedFieldIds.has(fieldId))) {
      return NextResponse.json(
        { error: "One or more fields are not assigned to this signer" },
        { status: 403 },
      );
    }

    const valuesByFieldId = new Map(
      submittedValues.map((field) => [field.fieldId, field]),
    );
    const missingRequiredField = assignedFields.find((field) => {
      if (!field.required) return false;
      const submitted = valuesByFieldId.get(field.id);
      if (!submitted) return true;
      return !(
        submitted.signatureData?.trim() ||
        submitted.value?.trim() ||
        submitted.attachmentData?.dataUrl
      );
    });

    if (missingRequiredField) {
      return NextResponse.json(
        { error: "Complete all required fields before signing" },
        { status: 400 },
      );
    }

    // Get IP and user agent from headers if not provided
    const clientIp =
      ipAddress || request.headers.get("x-forwarded-for") || "unknown";
    const clientUserAgent =
      userAgent || request.headers.get("user-agent") || "unknown";

    // Call the database function to submit the signature
    // This bypasses RLS using SECURITY DEFINER
    const { data: result, error: rpcError } = await supabase.rpc(
      "submit_signature",
      {
        p_token: token,
        p_signature_data: signatureData,
        p_signature_type: signatureType,
        p_ip_address: clientIp,
        p_user_agent: clientUserAgent,
        p_identity_confirmed: identityConfirmed,
        p_identity_confirmation_text: identityConfirmationText,
        p_document_hash: serverDocumentHash,
      },
    );

    if (rpcError) {
      console.error("Error calling submit_signature:", rpcError);
      return NextResponse.json(
        { error: "Failed to submit signature" },
        { status: 500 },
      );
    }

    // Check the result from the database function
    if (!result.success) {
      const statusCode =
        result.error === "Signature request not found"
          ? 404
          : result.error === "Signature request has expired"
            ? 410
            : result.error === "Contract has already been signed"
              ? 400
              : result.error === "Email verification is required"
                ? 403
                : result.error === "Waiting for previous signers"
                  ? 409
                  : 500;

      return NextResponse.json({ error: result.error }, { status: statusCode });
    }

    // The signature is legally recorded by the atomic RPC above. Persist the
    // signer-supplied fields and core audit trail before responding; these are
    // first-party database writes and part of the signing evidence.
    const signatureId = result.signatureId;
    const sigRequest = signatureRequest;
    const auditContext = getRequestContextFromRequest(request);

    if (fieldValues && fieldValues.length > 0 && sigRequest && signatureId) {
      const fieldValueInserts = fieldValues.map((fieldValue) => ({
        field_id: fieldValue.fieldId,
        signature_request_id: sigRequest.id,
        value:
          fieldValue.value ||
          (fieldValue.attachmentData
            ? JSON.stringify(fieldValue.attachmentData)
            : fieldValue.signatureData
              ? JSON.stringify({
                  kind: "signature",
                  dataUrl: fieldValue.signatureData,
                })
              : null),
        signature_id: fieldValue.signatureData ? signatureId : null,
        completed_at: new Date().toISOString(),
      }));

      const { error: fieldValueError } = await supabase
        .from("field_values")
        .insert(fieldValueInserts);

      if (fieldValueError) {
        console.error("Error saving field values:", fieldValueError);
      }
    }

    if (sigRequest) {
      await logAuditEventWithClient(supabase, {
        contractId: sigRequest.contract_id,
        signatureRequestId: sigRequest.id,
        eventType: "signature_completed",
        actorEmail: sigRequest.signer_email,
        actorName: sigRequest.signer_name,
        context: auditContext,
        metadata: {
          document_hash: serverDocumentHash,
          document_hash_algorithm:
            contractRelation?.content_hash_algorithm || "SHA-256",
        },
        includeGeoLocation: false,
      });

      if (result.allSigned) {
        await logAuditEventWithClient(supabase, {
          contractId: sigRequest.contract_id,
          eventType: "contract_completed",
          actorEmail: sigRequest.signer_email,
          actorName: sigRequest.signer_name,
          context: auditContext,
          includeGeoLocation: false,
        });
      }
    }

    // Slow enrichment and follow-up work runs after the response so TSA,
    // geolocation, certificate generation, email delivery, and invoice creation
    // cannot make a successful signature appear to fail at the Netlify timeout.
    after(async () => {
      try {
        const geoLocationPromise = lookupGeoLocation(clientIp);
        const signatureHash = hashSignatureData(
          signatureData,
          serverDocumentHash,
          "",
          clientIp,
        );
        const timestampPromise = requestTimestamp(signatureHash);
        const [geoLocation, timestampResult] = await Promise.all([
          geoLocationPromise,
          timestampPromise,
        ]);

        if (signatureId) {
          await supabase
            .from("signatures")
            .update({
              geo_location: geoLocation,
              rfc3161_timestamp_token: timestampResult.token,
              rfc3161_timestamp_authority: timestampResult.authority,
              timestamp_verified: timestampResult.success,
              legal_terms_version: "1.0",
              legal_terms_accepted_at: new Date().toISOString(),
            })
            .eq("id", signatureId);
        }

        if (sigRequest && result.allSigned) {
          try {
            const sealed = await sealCompletedContract(
              supabase,
              sigRequest.contract_id,
            );
            await generateAndSendCertificate(
              sigRequest.contract_id,
              Buffer.from(sealed.pdfBytes),
            );
          } catch (certError) {
            console.error(
              "Error sealing contract or sending completion documents:",
              certError,
            );
          }
        }

        // Auto-generate invoice for paying party
        if (sigRequest) {
          // Check if payment is required and this is a paying party
          const { data: contractData } = await supabase
            .from("contracts")
            .select("*, users!contracts_user_id_fkey(id, email, name)")
            .eq("id", sigRequest.contract_id)
            .single();

          if (
            contractData?.payment_required &&
            contractData.payment_amount > 0
          ) {
            // Only generate invoice for paying roles
            if (isPayingSignerRole(sigRequest.signer_role)) {
              try {
                // Calculate amount based on payment structure
                let amount = Math.round(
                  (contractData.payment_amount || 0) * 100,
                );
                let paymentLabel = "Full";

                if (contractData.payment_structure === "deposit_balance") {
                  // Check if deposit already paid
                  const { data: existingPayments } = await supabase
                    .from("payments")
                    .select("payment_type, status")
                    .eq("contract_id", sigRequest.contract_id)
                    .eq("status", "succeeded");

                  const hasDeposit = existingPayments?.some(
                    (p) => p.payment_type === "deposit",
                  );

                  if (!hasDeposit) {
                    // First payment is deposit
                    const depositPercentage =
                      contractData.deposit_percentage || 50;
                    amount = Math.round(amount * (depositPercentage / 100));
                    paymentLabel = "Deposit";
                  } else {
                    // Balance payment
                    const depositPercentage =
                      contractData.deposit_percentage || 50;
                    amount = Math.round(
                      amount * ((100 - depositPercentage) / 100),
                    );
                    paymentLabel = "Balance";
                  }
                } else if (contractData.payment_structure === "custom") {
                  const schedule = normalizePaymentSchedule(
                    contractData.payment_schedule,
                  );
                  const { data: existingPayments } = await supabase
                    .from("payments")
                    .select("payment_type, status, metadata")
                    .eq("contract_id", sigRequest.contract_id)
                    .eq("status", "succeeded");
                  const paidMilestoneIds = new Set(
                    (existingPayments || []).map((payment) => {
                      const metadata = payment.metadata as Record<
                        string,
                        unknown
                      > | null;
                      return typeof metadata?.payment_milestone_id === "string"
                        ? metadata.payment_milestone_id
                        : null;
                    }),
                  );
                  const nextMilestoneIndex = schedule.findIndex(
                    (milestone) => !paidMilestoneIds.has(milestone.id),
                  );
                  if (nextMilestoneIndex < 0) {
                    throw new Error("No unpaid payment milestones remain");
                  }
                  const milestone = schedule[nextMilestoneIndex];
                  amount = getMilestoneAmount(
                    amount,
                    schedule,
                    nextMilestoneIndex,
                  );
                  paymentLabel = milestone.label;
                }

                const { data: invoiceSettings } = await supabase
                  .from("invoice_settings")
                  .select(
                    "company_name, company_address, default_due_days, default_notes, bank_details",
                  )
                  .eq("user_id", contractData.user_id)
                  .maybeSingle();
                const bankDetails = normalizeInvoiceBankDetails(
                  invoiceSettings?.bank_details,
                );
                const dueDate = new Date(
                  Date.now() +
                    (invoiceSettings?.default_due_days ?? 30) *
                      24 *
                      60 *
                      60 *
                      1000,
                ).toISOString();

                // Create line items
                const lineItems = [
                  {
                    description: `${paymentLabel} Payment - ${contractData.title}`,
                    quantity: 1,
                    unit_price: amount,
                    amount: amount,
                  },
                ];

                // Create invoice
                const owner = contractData.users as {
                  id: string;
                  email: string;
                  name: string;
                } | null;

                const { data: invoice, error: invoiceError } =
                  await insertInvoiceWithRetry<{
                    id: string;
                    invoice_number: string;
                  }>(supabase, {
                    contract_id: sigRequest.contract_id,
                    user_id: contractData.user_id,
                    amount,
                    currency: contractData.payment_currency || "usd",
                    status: "sent",
                    line_items: lineItems,
                    subtotal: amount,
                    tax_amount: 0,
                    total: amount,
                    due_date: dueDate,
                    sent_at: new Date().toISOString(),
                    recipient_name: sigRequest.signer_name,
                    recipient_email: sigRequest.signer_email,
                    sender_name: owner?.name || null,
                    sender_company: invoiceSettings?.company_name || null,
                    sender_email: owner?.email || null,
                    sender_address:
                      invoiceSettings?.company_address ||
                      invoiceSettings?.company_name ||
                      bankDetails
                        ? {
                            address: invoiceSettings?.company_address || null,
                            company: invoiceSettings?.company_name || null,
                            bank_details: bankDetails,
                          }
                        : null,
                    bank_details: bankDetails,
                    notes: invoiceSettings?.default_notes || null,
                  });

                if (!invoiceError && invoice) {
                  // Send invoice email
                  const baseUrl =
                    process.env.NEXT_PUBLIC_APP_URL || "https://lexportai.com";
                  const paymentUrl = getInvoicePaymentUrl(invoice.id, baseUrl);

                  try {
                    await sendInvoiceEmail({
                      to: sigRequest.signer_email,
                      recipientName: sigRequest.signer_name,
                      contractTitle: contractData.title,
                      invoiceNumber: invoice.invoice_number,
                      amount,
                      currency: contractData.payment_currency || "usd",
                      dueDate,
                      paymentUrl,
                      lineItems: lineItems.map((item) => ({
                        description: item.description,
                        quantity: item.quantity,
                        amount: item.amount,
                      })),
                      senderName: owner?.name,
                      senderEmail: owner?.email,
                    });
                    console.log(
                      `Invoice email sent to ${sigRequest.signer_email}`,
                    );
                  } catch (emailError) {
                    console.error("Failed to send invoice email:", emailError);
                    // Don't fail the signature - invoice email is non-critical
                  }

                  // Log audit event
                  await supabase.from("audit_logs").insert({
                    contract_id: sigRequest.contract_id,
                    user_id: contractData.user_id,
                    event_type: "invoice_created",
                    actor_email: sigRequest.signer_email,
                    metadata: {
                      invoice_id: invoice.id,
                      invoice_number: invoice.invoice_number,
                      amount,
                      currency: contractData.payment_currency || "usd",
                      auto_generated: true,
                      trigger: "signature_completed",
                    },
                  });
                }
              } catch (invoiceGenError) {
                console.error(
                  "Error auto-generating invoice:",
                  invoiceGenError,
                );
                // Don't fail the signature - invoice generation is non-critical
              }
            }
          }
        }
      } catch (postSignatureError) {
        console.error("Post-signature processing failed:", postSignatureError);
      }
    });

    return NextResponse.json({
      success: true,
      message: result.message,
      allSigned: result.allSigned,
      signatureId: result.signatureId,
      followUpProcessing: true,
    });
  } catch (error) {
    console.error("Error submitting signature:", error);
    return NextResponse.json(
      { error: "Failed to submit signature" },
      { status: 500 },
    );
  }
}

/**
 * Generate certificate PDF and send to all parties (owner + signers)
 */
async function generateAndSendCertificate(
  contractId: string,
  executedContractPdf: Buffer,
) {
  const supabase = createAdminClient();

  // Fetch contract with all related data
  const { data: contract, error: contractError } = await supabase
    .from("contracts")
    .select(
      `
      *,
      signature_requests (
        id,
        signer_name,
        signer_email,
        signer_role,
        status,
        signed_at,
        viewed_at,
        email_verified_at
      ),
      signatures (
        *
      ),
      audit_logs (
        id,
        event_type,
        ip_address,
        created_at,
        metadata
      )
    `,
    )
    .eq("id", contractId)
    .single();

  if (contractError || !contract) {
    throw new Error("Contract not found");
  }

  // Fetch contract owner info
  const { data: owner } = await supabase
    .from("users")
    .select("id, email, name")
    .eq("id", contract.user_id)
    .single();

  const signatureRequests = contract.signature_requests as {
    id: string;
    signer_name: string;
    signer_email: string;
    signer_role: string;
    status: string;
    signed_at: string | null;
    viewed_at: string | null;
    email_verified_at: string | null;
  }[];

  const signatures = contract.signatures as {
    id: string;
    signature_request_id: string;
    ip_address: string;
    user_agent: string;
    signed_at: string;
    image_hash: string;
    document_hash: string | null;
  }[];

  const auditLogs = contract.audit_logs as {
    id: string;
    event_type: string;
    ip_address: string;
    created_at: string;
    metadata: Record<string, unknown> | null;
  }[];

  // Check if certificate already exists or create new one
  let certificate;
  const { data: existingCert } = await supabase
    .from("completion_certificates")
    .select("*")
    .eq("contract_id", contractId)
    .single();

  if (existingCert) {
    certificate = existingCert;
  } else {
    // Generate new certificate
    const certificateNumber = `CERT-${Date.now().toString(36).toUpperCase()}-${randomBytes(4).toString("hex").toUpperCase()}`;

    const summary = {
      contract_title: contract.title,
      contract_id: contract.id,
      completed_at:
        contract.completed_at || contract.signed_at || new Date().toISOString(),
      document_hash:
        contract.sealed_document_hash || contract.content_hash || null,
      document_hash_algorithm: "SHA-256",
      signing_document_hash: contract.content_hash || null,
      signing_document_hash_algorithm:
        contract.content_hash_algorithm || "SHA-256",
      signers: signatureRequests.map((sr) => {
        const sig = signatures.find((s) => s.signature_request_id === sr.id);
        return {
          name: sr.signer_name,
          email: sr.signer_email,
          role: sr.signer_role || "Signer",
          signed_at: sr.signed_at,
          ip_address: sig?.ip_address || "Unknown",
          signature_hash: sig?.image_hash?.substring(0, 16) || "N/A",
          document_hash: sig?.document_hash || contract.content_hash || null,
          email_verified_at: sr.email_verified_at,
          verification_method: sr.email_verified_at ? "email_code" : null,
        };
      }),
      audit_events: auditLogs
        .sort(
          (a, b) =>
            new Date(a.created_at).getTime() - new Date(b.created_at).getTime(),
        )
        .slice(0, 20)
        .map((log) => ({
          event: log.event_type
            .replace(/_/g, " ")
            .replace(/\b\w/g, (c) => c.toUpperCase()),
          timestamp: log.created_at,
          ip: log.ip_address || "N/A",
        })),
    };

    const { data: newCert, error: insertError } = await supabase
      .from("completion_certificates")
      .insert({
        contract_id: contractId,
        certificate_number: certificateNumber,
        summary,
      })
      .select()
      .single();

    if (insertError) {
      throw new Error("Failed to create certificate");
    }

    certificate = newCert;
  }

  // Generate PDF
  const pdfBytes = await generateCertificatePdf(
    contract,
    certificate,
    signatureRequests,
    signatures,
  );
  const pdfBuffer = Buffer.from(pdfBytes);

  // Build signers list for email
  const signers = signatureRequests.map((sr) => ({
    name: sr.signer_name,
    email: sr.signer_email,
    signedAt: sr.signed_at || new Date().toISOString(),
  }));

  const contractUrl = `${process.env.NEXT_PUBLIC_APP_URL || "https://lexportai.com"}/contracts/${contractId}/edit`;

  const deliveries: Array<{ email: string; send: Promise<unknown> }> = [];
  if (owner?.email) {
    deliveries.push({
      email: owner.email,
      send: sendCompletedContractWithCertificate({
        to: owner.email,
        recipientName: owner.name || "Contract Owner",
        contractTitle: contract.title,
        contractUrl,
        certificatePdf: pdfBuffer,
        executedContractPdf,
        certificateNumber: certificate.certificate_number,
        isOwner: true,
        signers,
      }),
    });
  }

  for (const signer of signers) {
    deliveries.push({
      email: signer.email,
      send: sendCompletedContractWithCertificate({
        to: signer.email,
        recipientName: signer.name,
        contractTitle: contract.title,
        contractUrl: `${process.env.NEXT_PUBLIC_APP_URL || "https://lexportai.com"}/portal`,
        certificatePdf: pdfBuffer,
        executedContractPdf,
        certificateNumber: certificate.certificate_number,
        isOwner: false,
        signers,
      }),
    });
  }

  const deliveryResults = await Promise.allSettled(
    deliveries.map((delivery) => delivery.send),
  );
  deliveryResults.forEach((deliveryResult, index) => {
    const email = deliveries[index]?.email || "unknown recipient";
    if (deliveryResult.status === "fulfilled") {
      console.log(`Certificate sent to: ${email}`);
    } else {
      console.error(
        `Certificate delivery failed for ${email}:`,
        deliveryResult.reason,
      );
    }
  });
}

/**
 * Generate certificate PDF using pdf-lib
 */
async function generateCertificatePdf(
  contract: {
    title: string;
    content_hash?: string;
    content_hash_algorithm?: string;
    sealed_document_hash?: string;
  },
  certificate: {
    certificate_number: string;
    summary: {
      completed_at?: string;
      document_hash?: string | null;
      signers: Array<{
        name: string;
        email: string;
        role: string;
        signed_at: string;
        ip_address: string;
        signature_hash: string;
      }>;
      audit_events: Array<{ event: string; timestamp: string; ip: string }>;
    };
  },
  signatureRequests: Array<{
    signer_name: string;
    signer_email: string;
    signer_role: string;
    signed_at: string | null;
  }>,
  signatures: Array<{
    signature_request_id: string;
    ip_address: string;
    image_hash: string;
  }>,
): Promise<Uint8Array> {
  const pdfDoc = await PDFDocument.create();
  const page = pdfDoc.addPage([612, 792]); // Letter size
  const { width, height } = page.getSize();

  const helveticaBold = await pdfDoc.embedFont(StandardFonts.HelveticaBold);
  const helvetica = await pdfDoc.embedFont(StandardFonts.Helvetica);

  const margin = 50;
  let y = height - margin;

  // Header - Brand color #202e46 = rgb(32, 46, 70) / 255
  page.drawRectangle({
    x: 0,
    y: height - 100,
    width,
    height: 100,
    color: rgb(0.125, 0.18, 0.275),
  });

  page.drawText("CERTIFICATE OF COMPLETION", {
    x: margin,
    y: height - 60,
    size: 24,
    font: helveticaBold,
    color: rgb(1, 1, 1),
  });

  page.drawText("Document Successfully Signed", {
    x: margin,
    y: height - 85,
    size: 12,
    font: helvetica,
    color: rgb(0.9, 0.9, 0.9),
  });

  y = height - 130;

  // Certificate Number
  page.drawText(`Certificate #: ${certificate.certificate_number}`, {
    x: margin,
    y,
    size: 10,
    font: helvetica,
    color: rgb(0.4, 0.4, 0.4),
  });
  y -= 30;

  // Contract Title
  page.drawText("Document:", {
    x: margin,
    y,
    size: 10,
    font: helvetica,
    color: rgb(0.4, 0.4, 0.4),
  });
  y -= 15;
  page.drawText(contract.title, {
    x: margin,
    y,
    size: 16,
    font: helveticaBold,
    color: rgb(0.1, 0.1, 0.1),
  });
  y -= 30;

  // Completion Date
  const completedDate = new Date(
    certificate.summary.completed_at || new Date(),
  );
  page.drawText(
    `Completed: ${completedDate.toLocaleDateString("en-US", {
      weekday: "long",
      year: "numeric",
      month: "long",
      day: "numeric",
      hour: "2-digit",
      minute: "2-digit",
    })}`,
    {
      x: margin,
      y,
      size: 11,
      font: helvetica,
      color: rgb(0.3, 0.3, 0.3),
    },
  );
  y -= 25;

  // Document Hash
  const executedDocumentHash =
    certificate.summary.document_hash ||
    contract.sealed_document_hash ||
    contract.content_hash;
  if (executedDocumentHash) {
    page.drawText("Document Fingerprint (SHA-256):", {
      x: margin,
      y,
      size: 9,
      font: helvetica,
      color: rgb(0.4, 0.4, 0.4),
    });
    y -= 12;
    const fullHash = executedDocumentHash.toUpperCase();
    page.drawText(fullHash.substring(0, 32), {
      x: margin,
      y,
      size: 9,
      font: helvetica,
      color: rgb(0.3, 0.3, 0.3),
    });
    y -= 12;
    page.drawText(fullHash.substring(32), {
      x: margin,
      y,
      size: 9,
      font: helvetica,
      color: rgb(0.3, 0.3, 0.3),
    });
    y -= 25;
  } else {
    y -= 15;
  }

  // Signers Section
  page.drawText("SIGNERS", {
    x: margin,
    y,
    size: 12,
    font: helveticaBold,
    color: rgb(0.125, 0.18, 0.275),
  });
  y -= 5;
  page.drawLine({
    start: { x: margin, y },
    end: { x: width - margin, y },
    thickness: 1,
    color: rgb(0.125, 0.18, 0.275),
  });
  y -= 20;

  for (const signer of certificate.summary.signers) {
    page.drawText(signer.name, {
      x: margin,
      y,
      size: 11,
      font: helveticaBold,
      color: rgb(0.1, 0.1, 0.1),
    });
    page.drawText(`(${signer.role})`, {
      x: margin + 150,
      y,
      size: 10,
      font: helvetica,
      color: rgb(0.4, 0.4, 0.4),
    });
    y -= 14;

    page.drawText(`Email: ${signer.email}`, {
      x: margin + 10,
      y,
      size: 9,
      font: helvetica,
      color: rgb(0.4, 0.4, 0.4),
    });
    y -= 12;

    const signedDate = new Date(signer.signed_at);
    page.drawText(
      `Signed: ${signedDate.toLocaleString()}  •  IP: ${signer.ip_address}`,
      {
        x: margin + 10,
        y,
        size: 9,
        font: helvetica,
        color: rgb(0.4, 0.4, 0.4),
      },
    );
    y -= 12;

    page.drawText(`Signature Hash: ${signer.signature_hash}...`, {
      x: margin + 10,
      y,
      size: 8,
      font: helvetica,
      color: rgb(0.5, 0.5, 0.5),
    });
    y -= 25;
  }

  // Audit Trail Section
  if (y > 200 && certificate.summary.audit_events.length > 0) {
    y -= 20;
    page.drawText("AUDIT TRAIL", {
      x: margin,
      y,
      size: 12,
      font: helveticaBold,
      color: rgb(0.125, 0.18, 0.275),
    });
    y -= 5;
    page.drawLine({
      start: { x: margin, y },
      end: { x: width - margin, y },
      thickness: 1,
      color: rgb(0.125, 0.18, 0.275),
    });
    y -= 15;

    const eventsToShow = certificate.summary.audit_events.slice(0, 8);
    for (const event of eventsToShow) {
      if (y < 100) break;

      const eventDate = new Date(event.timestamp);
      page.drawText(`${eventDate.toLocaleString()}`, {
        x: margin,
        y,
        size: 8,
        font: helvetica,
        color: rgb(0.5, 0.5, 0.5),
      });
      page.drawText(event.event, {
        x: margin + 140,
        y,
        size: 9,
        font: helvetica,
        color: rgb(0.3, 0.3, 0.3),
      });
      y -= 14;
    }
  }

  // Footer
  page.drawLine({
    start: { x: margin, y: 60 },
    end: { x: width - margin, y: 60 },
    thickness: 0.5,
    color: rgb(0.8, 0.8, 0.8),
  });

  page.drawText(
    "This certificate confirms that all parties have signed the document.",
    {
      x: margin,
      y: 45,
      size: 8,
      font: helvetica,
      color: rgb(0.5, 0.5, 0.5),
    },
  );

  page.drawText(`Generated by Lexport  •  ${new Date().toISOString()}`, {
    x: margin,
    y: 32,
    size: 8,
    font: helvetica,
    color: rgb(0.6, 0.6, 0.6),
  });

  return pdfDoc.save();
}
