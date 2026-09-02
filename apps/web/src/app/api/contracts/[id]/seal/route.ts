import { NextRequest, NextResponse } from "next/server";
import { createClient } from "@/lib/supabase/server";
import { createAdminClient } from "@/lib/supabase/admin";
import { PDFDocument, rgb, StandardFonts } from "pdf-lib";
import type { ContractContent, GeoLocation } from "@/db/types";
import { documentHashesEqual, hashBytes } from "@/lib/document-integrity";
import {
  generateUploadedContractPdf,
  type UploadedSourceFileType,
} from "@/lib/pdf/uploaded-contract";
import {
  renderLegalContractPdf,
  type LegalDocumentIdentity,
} from "@/lib/pdf/legal-contract";
import { sealCompletedContract } from "@/lib/sealed-contract";

export const dynamic = "force-dynamic";

// POST - Seal a completed contract with tamper-evident PDF
export async function POST(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const { id: contractId } = await params;
    const supabase = await createClient();

    const {
      data: { user },
      error: authError,
    } = await supabase.auth.getUser();

    if (authError || !user) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    }

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
          email_verified_at
        ),
        signatures (
          id,
          signature_request_id,
          signature_data,
          ip_address,
          user_agent,
          signed_at,
          image_hash,
          identity_confirmed,
          identity_confirmation_text,
          geo_location,
          rfc3161_timestamp_token,
          rfc3161_timestamp_authority
        )
      `)
      .eq("id", contractId)
      .eq("user_id", user.id)
      .single();

    if (contractError || !contract) {
      return NextResponse.json({ error: "Contract not found" }, { status: 404 });
    }

    // Check if already sealed
    if (contract.sealed_at) {
      return NextResponse.json({
        success: true,
        message: "Contract already sealed",
        sealedAt: contract.sealed_at,
        sealedPdfUrl: contract.sealed_pdf_url,
      });
    }

    const signatureRequests = contract.signature_requests as Array<{
      status: string;
    }>;
    if (
      !signatureRequests.length ||
      signatureRequests.some((signatureRequest) => signatureRequest.status !== "signed")
    ) {
      return NextResponse.json(
        { error: "Contract must be fully signed before sealing" },
        { status: 400 },
      );
    }

    const sealed = await sealCompletedContract(supabase, contractId);

    return NextResponse.json({
      success: true,
      message: "Contract sealed successfully",
      sealedAt: sealed.sealedAt,
      sealedPdfUrl: sealed.sealedPdfUrl,
      documentHash: sealed.documentHash,
    });
  } catch (error) {
    console.error("Error sealing contract:", error);
    return NextResponse.json(
      { error: "Failed to seal contract" },
      { status: 500 }
    );
  }
}

// GET - Download sealed PDF
export async function GET(
  _request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const { id: contractId } = await params;
    const supabase = await createClient();
    const {
      data: { user },
      error: authError,
    } = await supabase.auth.getUser();
    if (authError || !user) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    }

    const { data: contract, error: contractError } = await supabase
      .from("contracts")
      .select(`
        *,
        signature_requests (
          id, signer_name, signer_email, signer_role, status, signed_at, email_verified_at
        ),
        signatures (
          id, signature_request_id, signature_data, ip_address, signed_at, image_hash,
          identity_confirmed, identity_confirmation_text, geo_location,
          rfc3161_timestamp_token, rfc3161_timestamp_authority
        )
      `)
      .eq("id", contractId)
      .eq("user_id", user.id)
      .single();

    if (contractError || !contract) {
      return NextResponse.json({ error: "Contract not found" }, { status: 404 });
    }

    // Check if sealed
    if (!contract.sealed_at) {
      return NextResponse.json(
        { error: "Contract has not been sealed yet" },
        { status: 400 }
      );
    }

    const pdfBytes = await loadStoredSealedPdf(
      supabase,
      contract.sealed_pdf_path,
      contract.sealed_pdf_url,
    );
    const actualHash = hashBytes(pdfBytes);
    if (!documentHashesEqual(contract.sealed_document_hash, actualHash)) {
      console.error("Stored sealed PDF failed integrity verification", {
        contractId,
        expected: contract.sealed_document_hash,
        actual: actualHash,
      });
      return NextResponse.json(
        { error: "The stored signed PDF failed its integrity check" },
        { status: 409 },
      );
    }

    const safeTitle = contract.title.replace(/[^a-z0-9]/gi, "-").toLowerCase();

    return new NextResponse(Buffer.from(pdfBytes), {
      headers: {
        "Content-Type": "application/pdf",
        "Content-Disposition": `attachment; filename="sealed-${safeTitle}.pdf"`,
        "Cache-Control": "private, no-store, max-age=0",
        "X-Document-SHA256": actualHash,
        "X-Content-Type-Options": "nosniff",
      },
    });
  } catch (error) {
    console.error("Error downloading sealed PDF:", error);
    return NextResponse.json(
      { error: "Failed to download sealed PDF" },
      { status: 500 }
    );
  }
}

async function loadStoredSealedPdf(
  supabase: Awaited<ReturnType<typeof createClient>>,
  storagePath: string | null,
  publicUrl: string | null,
): Promise<Uint8Array> {
  if (storagePath) {
    const { data, error } = await supabase.storage
      .from("sealed-documents")
      .download(storagePath);
    if (!error && data) {
      return new Uint8Array(await data.arrayBuffer());
    }
    console.error("Failed to download sealed PDF by storage path:", error);
  }

  // Compatibility path for documents sealed before sealed_pdf_path existed.
  if (publicUrl) {
    const response = await fetch(publicUrl, { cache: "no-store" });
    if (response.ok) {
      return new Uint8Array(await response.arrayBuffer());
    }
  }

  throw new Error("The stored sealed PDF is unavailable");
}

type SupabaseServerClient = Awaited<ReturnType<typeof createClient>>;

async function generateArtifactPdf(
  supabase: SupabaseServerClient,
  contract: {
    id: string;
    title: string;
    user_id: string;
    status?: string | null;
    jurisdiction?: string | null;
    source_type?: string | null;
    source_file_url?: string | null;
    source_file_type?: string | null;
    processing_mode?: string | null;
    content_hash?: string | null;
    completed_at?: string | null;
    signed_at?: string | null;
    sealed_at?: string | null;
  },
  content: ContractContent,
  signatureRequests: {
    id: string;
    signer_name: string;
    signer_email: string;
    signer_role: string;
    status: string;
    signed_at: string | null;
    email_verified_at: string | null;
  }[],
  signatures: {
    id: string;
    signature_request_id: string;
    signature_data: string;
    ip_address: string;
    signed_at: string;
    image_hash: string;
    identity_confirmed: boolean;
    identity_confirmation_text: string | null;
    geo_location: GeoLocation | null;
    rfc3161_timestamp_token: string | null;
    rfc3161_timestamp_authority: string | null;
  }[],
): Promise<Uint8Array> {
  const sourceFileUrl = contract.source_file_url;
  const preserveUploadedOriginal =
    contract.source_type === "uploaded" &&
    contract.processing_mode === "sign_only" &&
    sourceFileUrl;

  if (!preserveUploadedOriginal) {
    const documentIdentity = await loadDocumentIdentity(contract.user_id);
    return generateSealedPdf(
      contract,
      content,
      signatureRequests,
      signatures,
      documentIdentity,
    );
  }
  if (!["pdf", "jpg", "png"].includes(String(contract.source_file_type))) {
    throw new Error("This uploaded file must be converted before it can be sealed");
  }

  let sourceBytes: Uint8Array;
  if (sourceFileUrl.startsWith("http")) {
    const response = await fetch(sourceFileUrl, { cache: "no-store" });
    if (!response.ok) {
      throw new Error(`Failed to download uploaded source (${response.status})`);
    }
    sourceBytes = new Uint8Array(await response.arrayBuffer());
  } else {
    const { data: sourceBlob, error: sourceError } = await supabase.storage
      .from("contract-uploads")
      .download(sourceFileUrl);
    if (sourceError || !sourceBlob) {
      throw new Error(sourceError?.message || "Failed to download uploaded source");
    }
    sourceBytes = new Uint8Array(await sourceBlob.arrayBuffer());
  }

  const { data: signatureFields, error: fieldsError } = await supabase
    .from("signature_fields")
    .select("*")
    .eq("contract_id", contract.id);
  if (fieldsError) throw fieldsError;
  const fieldIds = (signatureFields || []).map((field) => field.id);
  const fieldValuesResult = fieldIds.length
    ? await supabase.from("field_values").select("*").in("field_id", fieldIds)
    : { data: [], error: null };
  if (fieldValuesResult.error) throw fieldValuesResult.error;

  return generateUploadedContractPdf({
    sourceBytes,
    sourceFileType: contract.source_file_type as UploadedSourceFileType,
    contract: {
      id: contract.id,
      title: contract.title,
      status: "sealed",
      contentHash: contract.content_hash,
      completedAt:
        contract.completed_at || contract.signed_at || contract.sealed_at,
    },
    signatureFields: signatureFields || [],
    fieldValues: fieldValuesResult.data || [],
    signatures,
    signatureRequests,
  });
}

async function loadDocumentIdentity(
  userId: string,
): Promise<LegalDocumentIdentity> {
  const admin = createAdminClient();
  const [{ data: invoiceSettings }, { data: profile }] = await Promise.all([
    admin
      .from("invoice_settings")
      .select("company_name, company_address, company_logo_url")
      .eq("user_id", userId)
      .maybeSingle(),
    admin
      .from("users")
      .select("name, company_name, address")
      .eq("id", userId)
      .maybeSingle(),
  ]);
  return {
    companyName:
      invoiceSettings?.company_name || profile?.company_name || profile?.name,
    companyAddress: invoiceSettings?.company_address || profile?.address,
    companyLogoUrl: invoiceSettings?.company_logo_url,
  };
}

async function generateSealedPdf(
  contract: {
    id: string;
    title: string;
    jurisdiction?: string | null;
    content_hash?: string | null;
    sealed_at?: string | null;
  },
  content: ContractContent,
  signatureRequests: {
    id: string;
    signer_name: string;
    signer_email: string;
    signer_role: string;
    status: string;
    signed_at: string | null;
    email_verified_at: string | null;
  }[],
  signatures: {
    id: string;
    signature_request_id: string;
    signature_data: string;
    ip_address: string;
    signed_at: string;
    image_hash: string;
    identity_confirmed: boolean;
    identity_confirmation_text: string | null;
    geo_location: GeoLocation | null;
    rfc3161_timestamp_token: string | null;
    rfc3161_timestamp_authority: string | null;
  }[],
  documentIdentity: LegalDocumentIdentity = {},
): Promise<Uint8Array> {
  try {
    return await renderLegalContractPdf({
      title: contract.title,
      jurisdiction: contract.jurisdiction,
      content,
      identity: documentIdentity,
      signatureRequests,
      signatures: signatures.map((signature) => {
        const request = signatureRequests.find(
          (candidate) => candidate.id === signature.signature_request_id,
        );
        return {
          signatureRequestId: signature.signature_request_id,
          signerName: request?.signer_name || "Signer",
          signerEmail: request?.signer_email || "",
          signerRole: request?.signer_role || "Signer",
          signatureData: signature.signature_data,
          signedAt: signature.signed_at,
        };
      }),
      isSigned: true,
    });
  } catch (error) {
    console.error("Falling back to the legacy sealed PDF renderer:", error);
  }

  const pdfDoc = await PDFDocument.create();
  const timesRoman = await pdfDoc.embedFont(StandardFonts.TimesRoman);
  const timesRomanBold = await pdfDoc.embedFont(StandardFonts.TimesRomanBold);
  const helvetica = await pdfDoc.embedFont(StandardFonts.Helvetica);
  const helveticaBold = await pdfDoc.embedFont(StandardFonts.HelveticaBold);

  const pageWidth = 612;
  const pageHeight = 792;
  const margin = 72;
  const lineHeight = 14;
  const contentWidth = pageWidth - 2 * margin;

  let currentPage = pdfDoc.addPage([pageWidth, pageHeight]);
  let y = pageHeight - margin;

  // Helper to add a new page
  const addPage = () => {
    currentPage = pdfDoc.addPage([pageWidth, pageHeight]);
    y = pageHeight - margin;
    return currentPage;
  };

  // Helper to check if we need a new page
  const checkPageBreak = (requiredSpace: number) => {
    if (y - requiredSpace < margin) {
      addPage();
    }
  };

  // Draw watermark/seal indicator on every page
  const addSealWatermark = (page: typeof currentPage) => {
    // Draw "SEALED" watermark
    page.drawText("SEALED DOCUMENT", {
      x: pageWidth - 150,
      y: pageHeight - 30,
      size: 8,
      font: helveticaBold,
      color: rgb(0.4, 0.7, 0.4),
    });

    // Draw seal indicator in corner
    page.drawCircle({
      x: pageWidth - 40,
      y: pageHeight - 40,
      size: 25,
      borderColor: rgb(0.2, 0.5, 0.2),
      borderWidth: 2,
    });
    page.drawText("✓", {
      x: pageWidth - 47,
      y: pageHeight - 47,
      size: 16,
      font: helveticaBold,
      color: rgb(0.2, 0.5, 0.2),
    });
  };

  addSealWatermark(currentPage);

  // Title
  currentPage.drawText(contract.title, {
    x: margin,
    y,
    size: 18,
    font: timesRomanBold,
    color: rgb(0, 0, 0),
  });
  y -= 30;

  // Document status banner
  currentPage.drawRectangle({
    x: margin,
    y: y - 20,
    width: contentWidth,
    height: 30,
    color: rgb(0.9, 0.95, 0.9),
    borderColor: rgb(0.2, 0.5, 0.2),
    borderWidth: 1,
  });
  currentPage.drawText("ELECTRONICALLY SIGNED AND SEALED", {
    x: margin + 10,
    y: y - 12,
    size: 11,
    font: helveticaBold,
    color: rgb(0.2, 0.5, 0.2),
  });
  y -= 40;

  // Preamble
  const preambleLines = wrapText(content.preamble, timesRoman, 11, contentWidth);
  for (const line of preambleLines) {
    checkPageBreak(lineHeight);
    currentPage.drawText(line, {
      x: margin,
      y,
      size: 11,
      font: timesRoman,
      color: rgb(0, 0, 0),
    });
    y -= lineHeight;
  }
  y -= 10;

  // Recitals
  if (content.recitals) {
    checkPageBreak(30);
    currentPage.drawText("RECITALS", {
      x: margin,
      y,
      size: 12,
      font: timesRomanBold,
      color: rgb(0, 0, 0),
    });
    y -= 20;

    const recitalLines = wrapText(content.recitals, timesRoman, 11, contentWidth);
    for (const line of recitalLines) {
      checkPageBreak(lineHeight);
      currentPage.drawText(line, {
        x: margin,
        y,
        size: 11,
        font: timesRoman,
        color: rgb(0, 0, 0),
      });
      y -= lineHeight;
    }
    y -= 10;
  }

  // Clauses
  for (const clause of content.clauses.sort((a, b) => a.order - b.order)) {
    checkPageBreak(40);

    // Clause title
    currentPage.drawText(`${clause.order}. ${clause.title}`, {
      x: margin,
      y,
      size: 12,
      font: timesRomanBold,
      color: rgb(0, 0, 0),
    });
    y -= 18;

    // Clause content
    const clauseLines = wrapText(clause.content, timesRoman, 11, contentWidth);
    for (const line of clauseLines) {
      checkPageBreak(lineHeight);
      currentPage.drawText(line, {
        x: margin,
        y,
        size: 11,
        font: timesRoman,
        color: rgb(0, 0, 0),
      });
      y -= lineHeight;
    }
    y -= 15;
  }

  // Signature Block
  checkPageBreak(100);
  y -= 20;
  currentPage.drawText("SIGNATURES", {
    x: margin,
    y,
    size: 14,
    font: timesRomanBold,
    color: rgb(0, 0, 0),
  });
  y -= 25;

  // Draw each signature
  for (const sr of signatureRequests) {
    const signature = signatures.find((s) => s.signature_request_id === sr.id);
    checkPageBreak(80);

    // Signer info
    currentPage.drawText(`${sr.signer_role}: ${sr.signer_name}`, {
      x: margin,
      y,
      size: 11,
      font: timesRomanBold,
      color: rgb(0, 0, 0),
    });
    y -= 15;

    currentPage.drawText(`Email: ${sr.signer_email}`, {
      x: margin,
      y,
      size: 9,
      font: timesRoman,
      color: rgb(0.3, 0.3, 0.3),
    });
    y -= 12;

    if (signature) {
      // Try to embed signature image
      try {
        if (signature.signature_data.startsWith("data:image/png")) {
          const base64Data = signature.signature_data.split(",")[1];
          const sigImage = await pdfDoc.embedPng(Buffer.from(base64Data, "base64"));
          const sigDims = sigImage.scale(0.3);
          currentPage.drawImage(sigImage, {
            x: margin,
            y: y - sigDims.height,
            width: Math.min(sigDims.width, 150),
            height: Math.min(sigDims.height, 40),
          });
          y -= Math.min(sigDims.height, 40) + 5;
        }
      } catch {
        // If image embedding fails, just show placeholder
        currentPage.drawText("[Signature on file]", {
          x: margin,
          y,
          size: 10,
          font: timesRoman,
          color: rgb(0.5, 0.5, 0.5),
        });
        y -= 15;
      }

      // Signature details
      const signedDate = new Date(signature.signed_at).toLocaleString();
      currentPage.drawText(`Signed: ${signedDate}`, {
        x: margin,
        y,
        size: 9,
        font: timesRoman,
        color: rgb(0.3, 0.3, 0.3),
      });
      y -= 12;

      if (signature.identity_confirmed) {
        currentPage.drawText("✓ Identity Verified", {
          x: margin,
          y,
          size: 9,
          font: helvetica,
          color: rgb(0.2, 0.5, 0.2),
        });
        y -= 12;
      }

      if (sr.email_verified_at) {
        currentPage.drawText("✓ Email Verified", {
          x: margin,
          y,
          size: 9,
          font: helvetica,
          color: rgb(0.2, 0.5, 0.2),
        });
        y -= 12;
      }

      if (signature.rfc3161_timestamp_authority && signature.rfc3161_timestamp_authority !== "local") {
        currentPage.drawText("✓ Trusted Timestamp (RFC 3161)", {
          x: margin,
          y,
          size: 9,
          font: helvetica,
          color: rgb(0.2, 0.5, 0.2),
        });
        y -= 12;
      }

      // Show location if available
      if (signature.geo_location?.city) {
        const location = [
          signature.geo_location.city,
          signature.geo_location.region,
          signature.geo_location.countryCode,
        ]
          .filter(Boolean)
          .join(", ");
        currentPage.drawText(`Location: ${location}`, {
          x: margin,
          y,
          size: 8,
          font: timesRoman,
          color: rgb(0.4, 0.4, 0.4),
        });
        y -= 10;
      }
    }

    y -= 20;
  }

  // Document integrity section
  checkPageBreak(80);
  y -= 20;

  currentPage.drawRectangle({
    x: margin,
    y: y - 60,
    width: contentWidth,
    height: 70,
    color: rgb(0.95, 0.95, 0.98),
    borderColor: rgb(0.7, 0.7, 0.8),
    borderWidth: 1,
  });

  y -= 10;
  currentPage.drawText("DOCUMENT INTEGRITY", {
    x: margin + 10,
    y,
    size: 10,
    font: helveticaBold,
    color: rgb(0.2, 0.2, 0.4),
  });
  y -= 15;

  if (contract.content_hash) {
    currentPage.drawText(`Document Hash (SHA-256): ${contract.content_hash.substring(0, 32)}...`, {
      x: margin + 10,
      y,
      size: 8,
      font: helvetica,
      color: rgb(0.3, 0.3, 0.3),
    });
    y -= 12;
  }

  currentPage.drawText(`Sealed: ${new Date().toISOString()}`, {
    x: margin + 10,
    y,
    size: 8,
    font: helvetica,
    color: rgb(0.3, 0.3, 0.3),
  });
  y -= 12;

  currentPage.drawText("This document has been electronically signed and sealed. Any modification will invalidate the seal.", {
    x: margin + 10,
    y,
    size: 7,
    font: helvetica,
    color: rgb(0.4, 0.4, 0.4),
  });

  // Footer on all pages
  const pages = pdfDoc.getPages();
  for (let i = 0; i < pages.length; i++) {
    const page = pages[i];
    addSealWatermark(page);

    page.drawText(`Page ${i + 1} of ${pages.length}`, {
      x: pageWidth / 2 - 30,
      y: 30,
      size: 8,
      font: helvetica,
      color: rgb(0.5, 0.5, 0.5),
    });

    page.drawText("Generated by Lexport - Legally Binding Electronic Document", {
      x: margin,
      y: 30,
      size: 7,
      font: helvetica,
      color: rgb(0.6, 0.6, 0.6),
    });
  }

  return pdfDoc.save();
}

// Helper function to wrap text
function wrapText(
  text: string,
  // eslint-disable-next-line @typescript-eslint/no-unused-vars
  _font: unknown,
  fontSize: number,
  maxWidth: number
): string[] {
  const words = text.split(/\s+/);
  const lines: string[] = [];
  let currentLine = "";

  for (const word of words) {
    const testLine = currentLine ? `${currentLine} ${word}` : word;
    // Approximate width calculation (average char width * length)
    const approxWidth = testLine.length * fontSize * 0.5;

    if (approxWidth > maxWidth && currentLine) {
      lines.push(currentLine);
      currentLine = word;
    } else {
      currentLine = testLine;
    }
  }

  if (currentLine) {
    lines.push(currentLine);
  }

  return lines;
}
