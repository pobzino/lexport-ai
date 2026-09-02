import type { SupabaseClient } from "@supabase/supabase-js";
import type { ContractContent, GeoLocation } from "@/db/types";
import {
  documentHashesEqual,
  hashBytes,
  SIGNING_HASH_ALGORITHM,
} from "@/lib/document-integrity";
import {
  fingerprintSigningDocument,
  isUploadedSignOnlyContract,
} from "@/lib/signing-document";
import {
  generateUploadedContractPdf,
  type UploadedSourceFileType,
} from "@/lib/pdf/uploaded-contract";
import {
  renderLegalContractPdf,
  type LegalDocumentIdentity,
} from "@/lib/pdf/legal-contract";
import { isMissingColumnError } from "@/lib/supabase/schema-compat";

interface SignatureRequestRecord {
  id: string;
  signer_name: string;
  signer_email: string;
  signer_role: string;
  status: string;
  signed_at: string | null;
  email_verified_at: string | null;
}

interface SignatureRecord {
  id: string;
  signature_request_id: string;
  signature_data: string;
  document_hash?: string | null;
  ip_address: string;
  user_agent: string;
  signed_at: string;
  image_hash: string;
  identity_confirmed: boolean;
  identity_confirmation_text: string | null;
  geo_location: GeoLocation | null;
  rfc3161_timestamp_token: string | null;
  rfc3161_timestamp_authority: string | null;
}

interface ContractRecord {
  id: string;
  title: string;
  user_id: string;
  status: string;
  jurisdiction?: string | null;
  content: ContractContent;
  content_hash?: string | null;
  content_hash_algorithm?: string | null;
  completed_at?: string | null;
  signed_at?: string | null;
  sealed_at?: string | null;
  sealed_pdf_url?: string | null;
  sealed_pdf_path?: string | null;
  sealed_document_hash?: string | null;
  source_type?: string | null;
  source_file_url?: string | null;
  source_file_type?: string | null;
  processing_mode?: string | null;
  signature_requests: SignatureRequestRecord[];
  signatures: SignatureRecord[];
}

export interface SealedContractResult {
  sealedAt: string;
  sealedPdfUrl: string | null;
  sealedPdfPath: string;
  documentHash: string;
  pdfBytes: Uint8Array;
  alreadySealed: boolean;
}

/** Generate, store and hash the single authoritative executed PDF. */
export async function sealCompletedContract(
  supabase: SupabaseClient,
  contractId: string,
): Promise<SealedContractResult> {
  const { data, error } = await supabase
    .from("contracts")
    .select(
      `
        *,
        signature_requests (
          id, signer_name, signer_email, signer_role, status, signed_at,
          email_verified_at
        ),
        signatures (
          *
        )
      `,
    )
    .eq("id", contractId)
    .single();

  if (error || !data) throw new Error("Contract not found");
  const contract = data as ContractRecord;
  const requests = contract.signature_requests || [];
  if (!requests.length || requests.some((request) => request.status !== "signed")) {
    throw new Error("Contract must be fully signed before sealing");
  }

  if (
    contract.sealed_at &&
    contract.sealed_document_hash &&
    (contract.sealed_pdf_path || contract.sealed_pdf_url)
  ) {
    const pdfBytes = await loadSealedArtifact(
      supabase,
      contract.sealed_pdf_path || null,
      contract.sealed_pdf_url || null,
    );
    const actualHash = hashBytes(pdfBytes);
    if (!documentHashesEqual(contract.sealed_document_hash, actualHash)) {
      throw new Error("The stored sealed PDF failed its integrity check");
    }
    return {
      sealedAt: contract.sealed_at,
      sealedPdfUrl: contract.sealed_pdf_url || null,
      sealedPdfPath:
        contract.sealed_pdf_path ||
        storagePathFromPublicUrl(contract.sealed_pdf_url) ||
        "",
      documentHash: actualHash,
      pdfBytes,
      alreadySealed: true,
    };
  }

  const { data: fields, error: fieldsError } = await supabase
    .from("signature_fields")
    .select("*")
    .eq("contract_id", contract.id)
    .order("order", { ascending: true });
  if (fieldsError) throw fieldsError;

  const fingerprint = await fingerprintSigningDocument(
    supabase,
    contract,
    fields || [],
  );
  if (
    contract.content_hash_algorithm === SIGNING_HASH_ALGORITHM &&
    (!documentHashesEqual(contract.content_hash, fingerprint.hash) ||
      contract.signatures.some(
        (signature) =>
          !documentHashesEqual(
            signature.document_hash || contract.content_hash,
            contract.content_hash,
          ),
      ))
  ) {
    throw new Error("The completed signatures do not match the signing document");
  }

  let pdfBytes: Uint8Array;
  if (isUploadedSignOnlyContract(contract)) {
    if (!fingerprint.sourceBytes) {
      throw new Error("Uploaded source document is unavailable");
    }
    const fieldIds = (fields || []).map((field) => field.id);
    const fieldValuesResult = fieldIds.length
      ? await supabase.from("field_values").select("*").in("field_id", fieldIds)
      : { data: [], error: null };
    if (fieldValuesResult.error) throw fieldValuesResult.error;

    pdfBytes = await generateUploadedContractPdf({
      sourceBytes: fingerprint.sourceBytes,
      sourceFileType: contract.source_file_type as UploadedSourceFileType,
      contract: {
        id: contract.id,
        title: contract.title,
        status: "sealed",
        contentHash: contract.content_hash,
        completedAt: contract.completed_at || contract.signed_at,
      },
      signatureFields: fields || [],
      fieldValues: fieldValuesResult.data || [],
      signatures: contract.signatures,
      signatureRequests: requests,
      appendCompletionPage: false,
    });
  } else {
    const identity = await loadDocumentIdentity(supabase, contract.user_id);
    pdfBytes = await renderLegalContractPdf({
      title: contract.title,
      jurisdiction: contract.jurisdiction,
      content: contract.content,
      identity,
      signatureRequests: requests,
      signatures: contract.signatures.map((signature) => {
        const request = requests.find(
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
  }

  const documentHash = hashBytes(pdfBytes);
  const sealedAt = new Date().toISOString();
  const storagePath = `${contract.user_id}/${contract.id}/sealed-${Date.now()}.pdf`;
  const { data: upload, error: uploadError } = await supabase.storage
    .from("sealed-documents")
    .upload(storagePath, pdfBytes, {
      contentType: "application/pdf",
      upsert: false,
    });
  if (uploadError || !upload) {
    throw new Error("The signed PDF could not be stored, so it was not sealed");
  }

  const { data: publicUrlData } = supabase.storage
    .from("sealed-documents")
    .getPublicUrl(upload.path);
  const sealedPdfUrl = publicUrlData.publicUrl || null;
  let { error: updateError } = await supabase
    .from("contracts")
    .update({
      sealed_at: sealedAt,
      sealed_pdf_url: sealedPdfUrl,
      sealed_pdf_path: upload.path,
      sealed_document_hash: documentHash,
    })
    .eq("id", contract.id)
    .is("sealed_at", null);

  if (isMissingColumnError(updateError, "sealed_pdf_path")) {
    ({ error: updateError } = await supabase
      .from("contracts")
      .update({
        sealed_at: sealedAt,
        sealed_pdf_url: sealedPdfUrl,
        sealed_document_hash: documentHash,
      })
      .eq("id", contract.id)
      .is("sealed_at", null));
  }

  if (updateError) {
    await supabase.storage.from("sealed-documents").remove([upload.path]);
    throw new Error("Failed to save the sealed document record");
  }

  return {
    sealedAt,
    sealedPdfUrl,
    sealedPdfPath: upload.path,
    documentHash,
    pdfBytes,
    alreadySealed: false,
  };
}

async function loadDocumentIdentity(
  supabase: SupabaseClient,
  userId: string,
): Promise<LegalDocumentIdentity> {
  const [{ data: invoiceSettings }, { data: profile }] = await Promise.all([
    supabase
      .from("invoice_settings")
      .select("company_name, company_address, company_logo_url")
      .eq("user_id", userId)
      .maybeSingle(),
    supabase
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

async function downloadSealedArtifact(
  supabase: SupabaseClient,
  storagePath: string,
): Promise<Uint8Array> {
  const { data, error } = await supabase.storage
    .from("sealed-documents")
    .download(storagePath);
  if (error || !data) throw new Error("The stored sealed PDF is unavailable");
  return new Uint8Array(await data.arrayBuffer());
}

async function loadSealedArtifact(
  supabase: SupabaseClient,
  storagePath: string | null,
  publicUrl: string | null,
): Promise<Uint8Array> {
  if (storagePath) {
    try {
      return await downloadSealedArtifact(supabase, storagePath);
    } catch (error) {
      console.error("Failed to load sealed artifact by storage path:", error);
    }
  }
  if (publicUrl) {
    const response = await fetch(publicUrl, { cache: "no-store" });
    if (response.ok) return new Uint8Array(await response.arrayBuffer());
  }
  throw new Error("The stored sealed PDF is unavailable");
}

function storagePathFromPublicUrl(publicUrl: string | null | undefined): string | null {
  if (!publicUrl) return null;
  const marker = "/storage/v1/object/public/sealed-documents/";
  const markerIndex = publicUrl.indexOf(marker);
  if (markerIndex < 0) return null;
  return decodeURIComponent(publicUrl.slice(markerIndex + marker.length));
}
