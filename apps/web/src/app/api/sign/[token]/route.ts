import { NextRequest, NextResponse } from "next/server";
import { createAdminClient } from "@/lib/supabase/admin";
import { z } from "zod";
import { generateContentHash, generateIdentityConfirmationText } from "@/lib/document-integrity";
import { auditLogger, getRequestContextFromRequest } from "@/lib/audit";
import { lookupGeoLocation } from "@/lib/geolocation";
import { requestTimestamp, hashSignatureData } from "@/lib/rfc3161-timestamp";
import { sendCompletedContractWithCertificate, sendInvoiceEmail } from "@/lib/email";
import { insertInvoiceWithRetry } from "@/lib/invoices/create-invoice";
import { PDFDocument, rgb, StandardFonts } from "pdf-lib";
import { randomBytes } from "crypto";

// GET - Fetch signature request details
export async function GET(
  request: NextRequest,
  { params }: { params: Promise<{ token: string }> }
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

      // Log signature request viewed event
      const context = getRequestContextFromRequest(request);
      await auditLogger.signatureRequestViewed(
        contract.id,
        signatureRequest.id,
        signatureRequest.signer_email,
        signatureRequest.signer_name,
        context
      );
    }

    // Fetch signature fields for this contract
    const { data: signatureFields } = await supabase
      .from("signature_fields")
      .select("*")
      .eq("contract_id", contract.id)
      .order("order", { ascending: true });

    // For sign_only contracts, generate signed URL for the source file
    let sourceFileSignedUrl = null;
    if (contract.processing_mode === "sign_only" && contract.source_file_url) {
      const isFullUrl = contract.source_file_url.startsWith("http");
      if (!isFullUrl) {
        const { data: signedUrlData, error: signedUrlError } = await supabase.storage
          .from("contract-uploads")
          .createSignedUrl(contract.source_file_url, 3600); // 1 hour

        if (signedUrlError) {
          console.error("[Sign API] Failed to create signed URL for source file:", {
            error: signedUrlError,
            path: contract.source_file_url,
            contractId: contract.id,
          });
        }
        sourceFileSignedUrl = signedUrlData?.signedUrl || null;
        console.log("[Sign API] Source file signed URL:", sourceFileSignedUrl ? "Generated successfully" : "FAILED - returning raw path");
      } else {
        sourceFileSignedUrl = contract.source_file_url;
      }
    }

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
        depositPercentage: contract.deposit_percentage,
        depositPaid,
        paymentSufficientForSigning,
        // Sign-only contract fields
        processingMode: contract.processing_mode,
        sourceFileUrl: sourceFileSignedUrl || contract.source_file_url,
      },
      signatureFields: signatureFields || [],
      signingProgress,
      identityConfirmationText,
    });
  } catch (error) {
    console.error("[sign GET] Error:", error instanceof Error ? error.message : error);
    return NextResponse.json(
      { error: "Failed to fetch signature request", detail: error instanceof Error ? error.message : "Unknown error" },
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
    const supabase = createAdminClient();

    // Parse request body
    const body = await request.json();
    const parseResult = SignatureSchema.safeParse(body);

    if (!parseResult.success) {
      return NextResponse.json(
        { error: "Invalid request", details: parseResult.error.flatten() },
        { status: 400 }
      );
    }

    const { signatureData, signatureType, ipAddress, userAgent, identityConfirmed, identityConfirmationText, documentHash, fieldValues } = parseResult.data;

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

    // Get geolocation and timestamp in parallel for the signature
    const signatureId = result.signatureId;

    // Fetch geolocation (non-blocking)
    const geoLocationPromise = lookupGeoLocation(clientIp);

    // Request RFC 3161 timestamp
    const signatureHash = hashSignatureData(
      signatureData,
      documentHash || "",
      "", // signer email will be fetched below
      clientIp
    );
    const timestampPromise = requestTimestamp(signatureHash);

    // Wait for both
    const [geoLocation, timestampResult] = await Promise.all([
      geoLocationPromise,
      timestampPromise,
    ]);

    // Update signature with geolocation and timestamp
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

    // Log signature completed event
    // First fetch the signature request to get contract info
    const { data: sigRequest } = await supabase
      .from("signature_requests")
      .select("id, contract_id, signer_email, signer_name, signer_role")
      .eq("token", token)
      .single();

    // Save field values if provided
    if (fieldValues && fieldValues.length > 0 && sigRequest && signatureId) {
      const fieldValueInserts = fieldValues.map((fv) => ({
        field_id: fv.fieldId,
        signature_request_id: sigRequest.id,
        value: fv.value || null,
        signature_id: fv.signatureData ? signatureId : null,
        completed_at: new Date().toISOString(),
      }));

      const { error: fieldValueError } = await supabase
        .from("field_values")
        .insert(fieldValueInserts);

      if (fieldValueError) {
        console.error("Error saving field values:", fieldValueError);
        // Don't fail the signature - field values are secondary
      }
    }

    if (sigRequest) {
      const context = getRequestContextFromRequest(request);
      await auditLogger.signatureCompleted(
        sigRequest.contract_id,
        sigRequest.id,
        sigRequest.signer_email,
        sigRequest.signer_name,
        context
      );

      // If all parties have signed, log contract completed and send certificate
      if (result.allSigned) {
        await auditLogger.contractCompleted(
          sigRequest.contract_id,
          null, // No user ID for signer
          context
        );

        // Generate and send certificate to all parties
        try {
          await generateAndSendCertificate(sigRequest.contract_id);
        } catch (certError) {
          console.error("Error sending certificate emails:", certError);
          // Don't fail the signature - certificate email is non-critical
        }
      }
    }

    // Auto-generate invoice for paying party
    let invoiceId = null;
    let invoiceNumber = null;

    if (sigRequest) {
      // Check if payment is required and this is a paying party
      const { data: contractData } = await supabase
        .from("contracts")
        .select("*, users!contracts_user_id_fkey(id, email, name)")
        .eq("id", sigRequest.contract_id)
        .single();

      if (contractData?.payment_required && contractData.payment_amount > 0) {
        const signerRole = sigRequest.signer_role?.toLowerCase() || "";
        // These roles are typically the paying party
        const payingRoles = ["client", "company", "hiring party", "disclosing party", "investor"];
        const nonPayingRoles = ["freelancer", "contractor", "consultant", "receiving party"];

        const isPayingRole = payingRoles.some(role => signerRole.includes(role));
        const isNonPayingRole = nonPayingRoles.some(role => signerRole.includes(role));

        // Only generate invoice for paying roles
        if (isPayingRole && !isNonPayingRole) {
          try {
            // Calculate amount based on payment structure
            let amount = Math.round((contractData.payment_amount || 0) * 100);
            let paymentType = "full";

            if (contractData.payment_structure === "deposit_balance") {
              // Check if deposit already paid
              const { data: existingPayments } = await supabase
                .from("payments")
                .select("payment_type, status")
                .eq("contract_id", sigRequest.contract_id)
                .eq("status", "succeeded");

              const hasDeposit = existingPayments?.some(p => p.payment_type === "deposit");

              if (!hasDeposit) {
                // First payment is deposit
                const depositPercentage = contractData.deposit_percentage || 50;
                amount = Math.round(amount * (depositPercentage / 100));
                paymentType = "deposit";
              } else {
                // Balance payment
                const depositPercentage = contractData.deposit_percentage || 50;
                amount = Math.round(amount * ((100 - depositPercentage) / 100));
                paymentType = "balance";
              }
            }

            const dueDate = new Date(Date.now() + 30 * 24 * 60 * 60 * 1000).toISOString();

            // Create line items
            const lineItems = [
              {
                description: `${paymentType === "deposit" ? "Deposit" : paymentType === "balance" ? "Balance" : "Full"} Payment - ${contractData.title}`,
                quantity: 1,
                unit_price: amount,
                amount: amount,
              },
            ];

            // Create invoice
            const owner = contractData.users as { id: string; email: string; name: string } | null;

            const { data: invoice, error: invoiceError } = await insertInvoiceWithRetry<{
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
                sender_email: owner?.email || null,
              });

            if (!invoiceError && invoice) {
              invoiceId = invoice.id;
              invoiceNumber = invoice.invoice_number;

              // Send invoice email
              const baseUrl = process.env.NEXT_PUBLIC_APP_URL || "https://lexportai.com";
              const paymentUrl = `${baseUrl}/pay/${sigRequest.contract_id}?invoice=${invoice.id}`;

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
                  lineItems: lineItems.map(item => ({
                    description: item.description,
                    quantity: item.quantity,
                    amount: item.amount,
                  })),
                  senderName: owner?.name,
                  senderEmail: owner?.email,
                });
                console.log(`Invoice email sent to ${sigRequest.signer_email}`);
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
            console.error("Error auto-generating invoice:", invoiceGenError);
            // Don't fail the signature - invoice generation is non-critical
          }
        }
      }
    }

    return NextResponse.json({
      success: true,
      message: result.message,
      allSigned: result.allSigned,
      signatureId: result.signatureId,
      invoiceId,
      invoiceNumber,
    });
  } catch (error) {
    console.error("Error submitting signature:", error);
    return NextResponse.json(
      { error: "Failed to submit signature" },
      { status: 500 }
    );
  }
}

/**
 * Generate certificate PDF and send to all parties (owner + signers)
 */
async function generateAndSendCertificate(contractId: string) {
  const supabase = createAdminClient();

  // Fetch contract with all related data
  const { data: contract, error: contractError } = await supabase
    .from("contracts")
    .select(`
      *,
      signature_requests (
        id,
        signer_name,
        signer_email,
        signer_role,
        status,
        signed_at,
        viewed_at
      ),
      signatures (
        id,
        signature_request_id,
        ip_address,
        user_agent,
        signed_at,
        image_hash
      ),
      audit_logs (
        id,
        event_type,
        ip_address,
        created_at,
        metadata
      )
    `)
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
  }[];

  const signatures = contract.signatures as {
    id: string;
    signature_request_id: string;
    ip_address: string;
    user_agent: string;
    signed_at: string;
    image_hash: string;
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
      completed_at: contract.completed_at || contract.signed_at || new Date().toISOString(),
      document_hash: contract.content_hash || null,
      document_hash_algorithm: contract.content_hash_algorithm || "SHA-256",
      signers: signatureRequests.map((sr) => {
        const sig = signatures.find((s) => s.signature_request_id === sr.id);
        return {
          name: sr.signer_name,
          email: sr.signer_email,
          role: sr.signer_role || "Signer",
          signed_at: sr.signed_at,
          ip_address: sig?.ip_address || "Unknown",
          signature_hash: sig?.image_hash?.substring(0, 16) || "N/A",
        };
      }),
      audit_events: auditLogs
        .sort((a, b) => new Date(a.created_at).getTime() - new Date(b.created_at).getTime())
        .slice(0, 20)
        .map((log) => ({
          event: log.event_type.replace(/_/g, " ").replace(/\b\w/g, (c) => c.toUpperCase()),
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
  const pdfBytes = await generateCertificatePdf(contract, certificate, signatureRequests, signatures);
  const pdfBuffer = Buffer.from(pdfBytes);

  // Build signers list for email
  const signers = signatureRequests.map((sr) => ({
    name: sr.signer_name,
    email: sr.signer_email,
    signedAt: sr.signed_at || new Date().toISOString(),
  }));

  const contractUrl = `${process.env.NEXT_PUBLIC_APP_URL || "https://lexportai.com"}/contracts/${contractId}/edit`;

  // Send to contract owner
  if (owner?.email) {
    await sendCompletedContractWithCertificate({
      to: owner.email,
      recipientName: owner.name || "Contract Owner",
      contractTitle: contract.title,
      contractUrl,
      certificatePdf: pdfBuffer,
      certificateNumber: certificate.certificate_number,
      isOwner: true,
      signers,
    });
    console.log(`Certificate sent to owner: ${owner.email}`);
  }

  // Send to each signer
  for (const signer of signers) {
    await sendCompletedContractWithCertificate({
      to: signer.email,
      recipientName: signer.name,
      contractTitle: contract.title,
      contractUrl: `${process.env.NEXT_PUBLIC_APP_URL || "https://lexportai.com"}/portal`,
      certificatePdf: pdfBuffer,
      certificateNumber: certificate.certificate_number,
      isOwner: false,
      signers,
    });
    console.log(`Certificate sent to signer: ${signer.email}`);
  }
}

/**
 * Generate certificate PDF using pdf-lib
 */
async function generateCertificatePdf(
  contract: { title: string; content_hash?: string; content_hash_algorithm?: string },
  certificate: { certificate_number: string; summary: { completed_at?: string; signers: Array<{ name: string; email: string; role: string; signed_at: string; ip_address: string; signature_hash: string }>; audit_events: Array<{ event: string; timestamp: string; ip: string }> } },
  signatureRequests: Array<{ signer_name: string; signer_email: string; signer_role: string; signed_at: string | null }>,
  signatures: Array<{ signature_request_id: string; ip_address: string; image_hash: string }>
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
  const completedDate = new Date(certificate.summary.completed_at || new Date());
  page.drawText(`Completed: ${completedDate.toLocaleDateString("en-US", {
    weekday: "long",
    year: "numeric",
    month: "long",
    day: "numeric",
    hour: "2-digit",
    minute: "2-digit",
  })}`, {
    x: margin,
    y,
    size: 11,
    font: helvetica,
    color: rgb(0.3, 0.3, 0.3),
  });
  y -= 25;

  // Document Hash
  if (contract.content_hash) {
    page.drawText("Document Fingerprint (SHA-256):", {
      x: margin,
      y,
      size: 9,
      font: helvetica,
      color: rgb(0.4, 0.4, 0.4),
    });
    y -= 12;
    const shortHash = contract.content_hash.substring(0, 32).toUpperCase();
    page.drawText(shortHash, {
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
    page.drawText(`Signed: ${signedDate.toLocaleString()}  •  IP: ${signer.ip_address}`, {
      x: margin + 10,
      y,
      size: 9,
      font: helvetica,
      color: rgb(0.4, 0.4, 0.4),
    });
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

  page.drawText("This certificate confirms that all parties have signed the document.", {
    x: margin,
    y: 45,
    size: 8,
    font: helvetica,
    color: rgb(0.5, 0.5, 0.5),
  });

  page.drawText(`Generated by Lexport  •  ${new Date().toISOString()}`, {
    x: margin,
    y: 32,
    size: 8,
    font: helvetica,
    color: rgb(0.6, 0.6, 0.6),
  });

  return pdfDoc.save();
}
