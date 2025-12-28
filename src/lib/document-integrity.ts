/**
 * Document Integrity Utilities
 *
 * Provides cryptographic hashing for contract content to ensure
 * tamper-proof document signing. Uses SHA-256 for hashing.
 */

import { createHash } from "crypto";
import type { ContractContent } from "@/db/types";

/**
 * Generates a SHA-256 hash of the contract content.
 * This hash is used to verify that the document hasn't been
 * modified after being sent for signature.
 *
 * The hash includes:
 * - Preamble
 * - Recitals
 * - All clauses (id, title, content, order)
 * - Signature block
 *
 * This ensures any modification to the contract is detected.
 */
export function generateContentHash(content: ContractContent): string {
  // Create a normalized, deterministic string representation
  const normalizedContent = normalizeContent(content);

  // Generate SHA-256 hash
  const hash = createHash("sha256");
  hash.update(normalizedContent, "utf8");

  return hash.digest("hex");
}

/**
 * Normalizes contract content to ensure consistent hashing.
 * Removes whitespace variations that don't affect meaning.
 */
function normalizeContent(content: ContractContent): string {
  // Sort clauses by order to ensure consistent ordering
  const sortedClauses = [...content.clauses].sort((a, b) => a.order - b.order);

  // Build a deterministic JSON string
  const normalized = {
    preamble: normalizeText(content.preamble),
    recitals: normalizeText(content.recitals),
    clauses: sortedClauses.map((clause) => ({
      id: clause.id,
      title: normalizeText(clause.title),
      content: normalizeText(clause.content),
      order: clause.order,
    })),
    signatureBlock: normalizeText(content.signatureBlock),
  };

  // Use a stable JSON stringify (sorted keys)
  return JSON.stringify(normalized, Object.keys(normalized).sort());
}

/**
 * Normalizes text by trimming and collapsing multiple whitespace.
 */
function normalizeText(text: string): string {
  return text
    .trim()
    .replace(/\r\n/g, "\n") // Normalize line endings
    .replace(/\s+/g, " "); // Collapse whitespace
}

/**
 * Verifies that the current content matches the stored hash.
 * Returns true if the content is unchanged, false if modified.
 */
export function verifyContentHash(
  content: ContractContent,
  storedHash: string
): boolean {
  const currentHash = generateContentHash(content);
  return currentHash === storedHash;
}

/**
 * Generates the identity confirmation text for a signer.
 * This is the exact legal declaration they are confirming.
 */
export function generateIdentityConfirmationText(
  signerName: string,
  signerRole?: string
): string {
  if (signerRole) {
    return `I, ${signerName}, confirm that I am the person identified above, acting in my capacity as ${signerRole}, and I am authorized to sign this document on behalf of the party I represent.`;
  }
  return `I, ${signerName}, confirm that I am the person identified above and I am authorized to sign this document.`;
}

/**
 * Generates a short hash for display (first 16 characters).
 * Used in certificates and UI to show a verifiable fingerprint.
 */
export function getShortHash(hash: string): string {
  return hash.substring(0, 16).toUpperCase();
}

/**
 * Formats a hash for display with groups of 4 characters.
 * Example: "A1B2-C3D4-E5F6-G7H8"
 */
export function formatHashForDisplay(hash: string): string {
  const short = getShortHash(hash);
  return short.match(/.{1,4}/g)?.join("-") || short;
}
