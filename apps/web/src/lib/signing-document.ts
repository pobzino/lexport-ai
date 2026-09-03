import type { SupabaseClient } from "@supabase/supabase-js";
import type { ContractContent } from "@/db/types";
import {
  generateContentHash,
  generateUploadedDocumentHash,
  type SigningFieldFingerprint,
} from "@/lib/document-integrity";
import {
  preservesUploadedOriginal,
  supportsOriginalSigning,
} from "@/lib/contracts/uploaded-document";

export interface SigningContractRecord {
  id: string;
  content: ContractContent;
  source_type?: string | null;
  source_file_url?: string | null;
  source_file_type?: string | null;
  processing_mode?: string | null;
}

export interface SigningDocumentFingerprint {
  hash: string;
  fields: SigningFieldFingerprint[];
  sourceBytes?: Uint8Array;
}

/**
 * Rebuild the canonical hash from the document currently held by Lexport.
 * Callers compare this value with the immutable hash saved when invitations
 * were created before accepting a signature or serving an uploaded document.
 */
export async function fingerprintSigningDocument(
  supabase: SupabaseClient,
  contract: SigningContractRecord,
  existingFields?: SigningFieldFingerprint[],
): Promise<SigningDocumentFingerprint> {
  if (!isUploadedOriginalContract(contract)) {
    return {
      hash: generateContentHash(contract.content),
      fields: existingFields || [],
    };
  }

  const sourceFileType = String(contract.source_file_type || "").toLowerCase();
  if (!isSupportedUploadedFileType(sourceFileType)) {
    throw new Error("This uploaded file must be converted before signing");
  }

  const [sourceBytes, fields] = await Promise.all([
    downloadSigningSource(supabase, contract.source_file_url as string),
    existingFields
      ? Promise.resolve(existingFields)
      : loadSigningFields(supabase, contract.id),
  ]);

  return {
    hash: generateUploadedDocumentHash(sourceBytes, sourceFileType, fields),
    fields,
    sourceBytes,
  };
}

export function isUploadedOriginalContract(
  contract: SigningContractRecord,
): boolean {
  return Boolean(
    contract.source_type === "uploaded" &&
      preservesUploadedOriginal(contract.processing_mode) &&
      supportsOriginalSigning(contract.source_file_type) &&
      contract.source_file_url,
  );
}

/** @deprecated Use isUploadedOriginalContract. */
export const isUploadedSignOnlyContract = isUploadedOriginalContract;

export async function loadSigningFields(
  supabase: SupabaseClient,
  contractId: string,
): Promise<SigningFieldFingerprint[]> {
  const { data, error } = await supabase
    .from("signature_fields")
    .select(
      "id, type, label, signer_role, required, position_x, position_y, width, height, page, order, options, placeholder, validation",
    )
    .eq("contract_id", contractId)
    .order("order", { ascending: true });

  if (error) throw error;
  return (data || []) as SigningFieldFingerprint[];
}

export async function downloadSigningSource(
  supabase: SupabaseClient,
  sourceFileUrl: string,
): Promise<Uint8Array> {
  if (sourceFileUrl.startsWith("http")) {
    const response = await fetch(sourceFileUrl, { cache: "no-store" });
    if (!response.ok) {
      throw new Error(`Source download failed (${response.status})`);
    }
    return new Uint8Array(await response.arrayBuffer());
  }

  const { data, error } = await supabase.storage
    .from("contract-uploads")
    .download(sourceFileUrl);
  if (error || !data) {
    throw new Error(error?.message || "Source download failed");
  }
  return new Uint8Array(await data.arrayBuffer());
}

function isSupportedUploadedFileType(
  value: string,
): value is "pdf" | "jpg" | "png" {
  return value === "pdf" || value === "jpg" || value === "png";
}
