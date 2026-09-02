import { NextResponse } from "next/server";
import { createAdminClient } from "@/lib/supabase/admin";
import {
  generateUploadedContractPdf,
  type UploadedSourceFileType,
} from "@/lib/pdf/uploaded-contract";

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
      contract.processing_mode !== "sign_only" ||
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

    const [sourceBytes, fieldsResult, signaturesResult, requestsResult] = await Promise.all([
      downloadSource(supabase, contract.source_file_url),
      supabase.from("signature_fields").select("*").eq("contract_id", contract.id),
      supabase.from("signatures").select("*").eq("contract_id", contract.id),
      supabase.from("signature_requests").select("*").eq("contract_id", contract.id),
    ]);
    if (fieldsResult.error) throw fieldsResult.error;
    if (signaturesResult.error) throw signaturesResult.error;
    if (requestsResult.error) throw requestsResult.error;
    const signatureFields = fieldsResult.data || [];
    const fieldIds = signatureFields.map((field) => field.id);
    const fieldValuesResult = fieldIds.length
      ? await supabase.from("field_values").select("*").in("field_id", fieldIds)
      : { data: [], error: null };
    if (fieldValuesResult.error) throw fieldValuesResult.error;

    const pdfBytes = await generateUploadedContractPdf({
      sourceBytes,
      sourceFileType: contract.source_file_type as UploadedSourceFileType,
      contract: {
        id: contract.id,
        title: contract.title,
        status: contract.status,
        contentHash: contract.content_hash,
        completedAt: contract.completed_at || contract.signed_at,
      },
      signatureFields,
      fieldValues: fieldValuesResult.data || [],
      signatures: signaturesResult.data || [],
      signatureRequests: requestsResult.data || [],
      appendCompletionPage: false,
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

type AdminClient = ReturnType<typeof createAdminClient>;

async function downloadSource(
  supabase: AdminClient,
  sourceFileUrl: string,
): Promise<Uint8Array> {
  if (sourceFileUrl.startsWith("http")) {
    const response = await fetch(sourceFileUrl, { cache: "no-store" });
    if (!response.ok) throw new Error(`Source download failed (${response.status})`);
    return new Uint8Array(await response.arrayBuffer());
  }

  const { data, error } = await supabase.storage
    .from("contract-uploads")
    .download(sourceFileUrl);
  if (error || !data) throw new Error(error?.message || "Source download failed");
  return new Uint8Array(await data.arrayBuffer());
}

function sanitizeFilename(value: string): string {
  return value.replace(/[^a-zA-Z0-9-_\s]/g, "").replace(/\s+/g, "_") || "contract";
}
