/**
 * Document integrity utilities.
 *
 * Signing hashes are generated on the server from a canonical representation of
 * the document. Uploaded sign-only documents include the exact source-file bytes
 * and the complete field manifest, so moving or changing a signing field also
 * invalidates the signing hash.
 */

import { createHash, timingSafeEqual } from "crypto";
import type { ContractContent } from "@/db/types";

export const SIGNING_HASH_ALGORITHM = "SHA-256-LEXPORT-V2";
const SIGNING_HASH_VERSION = "lexport-signing-document-v2";

export interface SigningFieldFingerprint {
  id: string;
  type: string;
  label?: string | null;
  signer_role?: string | null;
  required?: boolean | null;
  position_x: number;
  position_y: number;
  width: number;
  height: number;
  page?: number | null;
  order?: number | null;
  options?: unknown;
  placeholder?: string | null;
  validation?: unknown;
}

/** Generate a SHA-256 hash for the complete canonical contract content. */
export function generateContentHash(content: ContractContent): string {
  return hashUtf8(
    stableStringify({
      version: SIGNING_HASH_VERSION,
      kind: "generated-contract",
      content: normalizeContent(content),
    }),
  );
}

/**
 * Generate the canonical signing hash for an uploaded sign-only document.
 *
 * The source file is hashed byte-for-byte. The field manifest is included
 * separately because the visible fields are rendered as an overlay in the
 * signing application rather than changing the original uploaded PDF.
 */
export function generateUploadedDocumentHash(
  sourceBytes: Uint8Array,
  sourceFileType: string,
  fields: SigningFieldFingerprint[],
): string {
  return hashUtf8(
    stableStringify({
      version: SIGNING_HASH_VERSION,
      kind: "uploaded-sign-only",
      sourceFileType: sourceFileType.toLowerCase(),
      sourceFileHash: hashBytes(sourceBytes),
      fields: normalizeSigningFields(fields),
    }),
  );
}

export function hashBytes(bytes: Uint8Array): string {
  return createHash("sha256").update(bytes).digest("hex");
}

/** Constant-time comparison for SHA-256 hex digests. */
export function documentHashesEqual(
  expected: string | null | undefined,
  actual: string | null | undefined,
): boolean {
  if (
    !expected ||
    !actual ||
    !/^[a-f0-9]{64}$/i.test(expected) ||
    !/^[a-f0-9]{64}$/i.test(actual)
  ) {
    return false;
  }

  return timingSafeEqual(
    Buffer.from(expected.toLowerCase(), "hex"),
    Buffer.from(actual.toLowerCase(), "hex"),
  );
}

/** Verify canonical generated-contract content against its stored signing hash. */
export function verifyContentHash(
  content: ContractContent,
  storedHash: string,
): boolean {
  return documentHashesEqual(storedHash, generateContentHash(content));
}

function normalizeContent(content: ContractContent) {
  const clauses = Array.isArray(content?.clauses) ? content.clauses : [];

  return {
    preamble: normalizeText(content?.preamble),
    recitals: normalizeText(content?.recitals),
    clauses: [...clauses]
      .sort((a, b) => {
        const orderDifference = Number(a.order || 0) - Number(b.order || 0);
        return orderDifference || String(a.id || "").localeCompare(String(b.id || ""));
      })
      .map((clause) => ({
        id: String(clause.id || ""),
        title: normalizeText(clause.title),
        content: normalizeText(clause.content),
        order: Number(clause.order || 0),
      })),
    signatureBlock: normalizeText(content?.signatureBlock),
  };
}

function normalizeSigningFields(fields: SigningFieldFingerprint[]) {
  return [...fields]
    .sort((a, b) => {
      const orderDifference = Number(a.order || 0) - Number(b.order || 0);
      return orderDifference || a.id.localeCompare(b.id);
    })
    .map((field) => ({
      id: field.id,
      type: field.type,
      label: normalizeText(field.label),
      signerRole: normalizeText(field.signer_role),
      required: field.required !== false,
      positionX: Number(field.position_x),
      positionY: Number(field.position_y),
      width: Number(field.width),
      height: Number(field.height),
      page: Number(field.page || 1),
      order: Number(field.order || 0),
      options: field.options ?? null,
      placeholder: normalizeText(field.placeholder),
      validation: field.validation ?? null,
    }));
}

/**
 * Deterministic JSON which sorts keys at every nesting level. The previous
 * implementation supplied only top-level keys as JSON.stringify's replacer;
 * that unintentionally removed id/title/content/order from every clause.
 */
function stableStringify(value: unknown): string {
  if (value === null || typeof value !== "object") {
    return JSON.stringify(value) ?? "null";
  }

  if (Array.isArray(value)) {
    return `[${value.map((entry) => stableStringify(entry)).join(",")}]`;
  }

  const record = value as Record<string, unknown>;
  const entries = Object.keys(record)
    .sort()
    .filter((key) => record[key] !== undefined)
    .map((key) => `${JSON.stringify(key)}:${stableStringify(record[key])}`);
  return `{${entries.join(",")}}`;
}

function normalizeText(value: unknown): string {
  return typeof value === "string"
    ? value.trim().replace(/\r\n/g, "\n").replace(/\s+/g, " ")
    : "";
}

function hashUtf8(value: string): string {
  return createHash("sha256").update(value, "utf8").digest("hex");
}

/** Generate the exact identity declaration shown to a signer. */
export function generateIdentityConfirmationText(
  signerName: string,
  signerRole?: string,
): string {
  if (signerRole) {
    return `I, ${signerName}, confirm that I am the person identified above, acting in my capacity as ${signerRole}, and I am authorized to sign this document on behalf of the party I represent.`;
  }
  return `I, ${signerName}, confirm that I am the person identified above and I am authorized to sign this document.`;
}

export function getShortHash(hash: string): string {
  return hash.substring(0, 16).toUpperCase();
}

export function formatHashForDisplay(hash: string): string {
  const short = getShortHash(hash);
  return short.match(/.{1,4}/g)?.join("-") || short;
}
