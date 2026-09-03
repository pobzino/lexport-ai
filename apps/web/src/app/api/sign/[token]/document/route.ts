import { NextResponse } from "next/server";
import { createAdminClient } from "@/lib/supabase/admin";
import {
  generateUploadedContractPdf,
  type UploadedSourceFileType,
} from "@/lib/pdf/uploaded-contract";
import {
  documentHashesEqual,
  SIGNING_HASH_ALGORITHM,
} from "@/lib/document-integrity";
import { fingerprintSigningDocument } from "@/lib/signing-document";
import {
  preservesUploadedOriginal,
  supportsOriginalSigning,
} from "@/lib/contracts/uploaded-document";

export const dynamic = "force-dynamic";

export async function GET(
  _request: Request,
  { params }: { params: Promise<{ token: string }> },
) {
  try {
    const { token } = await params;
    const supabase = createAdminClient();
    const { data: signatureRequest, error } = await supabase
      .from("signature_requests")
      .select("id, expires_at, contracts(*)")
      .eq("token", token)
      .single();

    if (error || !signatureRequest) {
      return NextResponse.json({ error: "Signature request not found" }, { status: 404 });
    }
    if (
      signatureRequest.expires_at &&
      new Date(signatureRequest.expires_at) < new Date()
    ) {
      return NextResponse.json({ error: "Signature request has expired" }, { status: 410 });
    }

    const contract = Array.isArray(signatureRequest.contracts)
      ? signatureRequest.contracts[0]
      : signatureRequest.contracts;
    if (
      !contract ||
      contract.source_type !== "uploaded" ||
      !preservesUploadedOriginal(contract.processing_mode) ||
      !supportsOriginalSigning(contract.source_file_type) ||
      !contract.source_file_url
    ) {
      return NextResponse.json({ error: "Uploaded document not found" }, { status: 404 });
    }
    if (!["pdf", "jpg", "png"].includes(String(contract.source_file_type))) {
      return NextResponse.json(
        { error: "This file must be converted before signing" },
        { status: 415 },
      );
    }

    const [fieldsResult, signaturesResult] = await Promise.all([
      supabase.from("signature_fields").select("*").eq("contract_id", contract.id),
      supabase.from("signatures").select("*").eq("contract_id", contract.id),
    ]);
    if (fieldsResult.error) throw fieldsResult.error;
    if (signaturesResult.error) throw signaturesResult.error;
    const signatureFields = fieldsResult.data || [];
    const fingerprint = await fingerprintSigningDocument(
      supabase,
      contract,
      signatureFields,
    );
    if (
      contract.content_hash_algorithm === SIGNING_HASH_ALGORITHM &&
      !documentHashesEqual(contract.content_hash, fingerprint.hash)
    ) {
      return NextResponse.json(
        {
          error:
            "This document changed after it was sent. Ask the sender to issue a new signing request.",
        },
        { status: 409 },
      );
    }
    if (!fingerprint.sourceBytes) {
      throw new Error("Uploaded source document is unavailable");
    }
    const fieldIds = signatureFields.map((field) => field.id);
    const fieldValuesResult = fieldIds.length
      ? await supabase.from("field_values").select("*").in("field_id", fieldIds)
      : { data: [], error: null };
    if (fieldValuesResult.error) throw fieldValuesResult.error;

    const pdfBytes = await generateUploadedContractPdf({
      sourceBytes: fingerprint.sourceBytes,
      sourceFileType: contract.source_file_type as UploadedSourceFileType,
      signatureFields,
      fieldValues: fieldValuesResult.data || [],
      signatures: signaturesResult.data || [],
    });

    return new NextResponse(Buffer.from(pdfBytes), {
      headers: {
        "Content-Type": "application/pdf",
        "Content-Disposition": `inline; filename="${sanitizeFilename(contract.title)}.pdf"`,
        "Cache-Control": "private, no-store, max-age=0",
        "X-Content-Type-Options": "nosniff",
      },
    });
  } catch (error) {
    console.error("Failed to prepare uploaded document for signing:", error);
    return NextResponse.json(
      { error: "Failed to prepare the uploaded document" },
      { status: 500 },
    );
  }
}

function sanitizeFilename(value: string): string {
  return value.replace(/[^a-zA-Z0-9-_\s]/g, "").replace(/\s+/g, "_") || "contract";
}
