import type { ContractContent } from "@/db/types";
import {
  preservesUploadedOriginal,
  supportsOriginalSigning,
} from "@/lib/contracts/uploaded-document";

export interface UnresolvedContractPlaceholder {
  path: string;
  text: string;
}

interface SigningRecipient {
  name?: string | null;
  role?: string | null;
}

interface SigningFieldAssignment {
  type: string;
  signer_role?: string | null;
  required?: boolean | null;
}

const PLACEHOLDER_PATTERNS = [
  // Generated agreements commonly wrap an instruction in square brackets,
  // sometimes with underscores on either side.
  /_{2,}\s*\[[^\]\r\n]{1,160}\]\s*_{2,}/g,
  /(?<!_)\[(?:X|[A-Z][A-Za-z0-9 &'’(),./:%-]{1,159})\](?!_)/g,
  // Also recognise common template syntaxes and completely blank lines.
  /\{\{[^{}\r\n]{1,160}\}\}/g,
  /<<[^<>\r\n]{1,160}>>/g,
  /_{5,}/g,
  /\b(?:TBC|TBD|TO BE COMPLETED|TO BE AGREED|INSERT HERE)\b/gi,
];

/**
 * Locate template blanks that would leave a generated or editable agreement
 * materially incomplete. Uploaded sign-only files are intentionally checked
 * elsewhere because their blanks may be fields the sender placed visually.
 */
export function findUnresolvedContractPlaceholders(
  content: ContractContent | null | undefined,
): UnresolvedContractPlaceholder[] {
  if (!content) return [];

  const textEntries: Array<[string, unknown]> = [
    ["preamble", content.preamble],
    ["recitals", content.recitals],
  ];

  // The signature block deliberately contains blank signature/date lines.
  // Those are completed by the e-sign fields and must never block sending.

  for (const [index, clause] of (content.clauses || []).entries()) {
    textEntries.push([`clauses.${index}.title`, clause?.title]);
    textEntries.push([`clauses.${index}.content`, clause?.content]);
  }

  const matches: UnresolvedContractPlaceholder[] = [];
  const seen = new Set<string>();

  for (const [path, rawValue] of textEntries) {
    if (typeof rawValue !== "string") continue;
    const occupiedRanges: Array<[number, number]> = [];

    for (const pattern of PLACEHOLDER_PATTERNS) {
      pattern.lastIndex = 0;
      for (const match of rawValue.matchAll(pattern)) {
        const start = match.index ?? 0;
        const end = start + match[0].length;
        if (occupiedRanges.some(([from, to]) => start < to && end > from)) {
          continue;
        }
        const text = match[0].trim();
        const key = `${path}:${text.toLowerCase()}`;
        if (!text || seen.has(key)) continue;
        seen.add(key);
        occupiedRanges.push([start, end]);
        matches.push({ path, text });
      }
    }
  }

  return matches;
}

export function shouldCheckContractPlaceholders(contract: {
  source_type?: string | null;
  source_file_type?: string | null;
  processing_mode?: string | null;
}): boolean {
  return !(
    contract.source_type === "uploaded" &&
    preservesUploadedOriginal(contract.processing_mode) &&
    supportsOriginalSigning(contract.source_file_type)
  );
}

/**
 * Every recipient of a fixed-layout document needs an explicit required
 * signature field. Role matching is case-insensitive because the role is the
 * stable link between the preparation workspace and the signing invitation.
 */
export function findRecipientsMissingRequiredSignatures(
  recipients: SigningRecipient[],
  fields: SigningFieldAssignment[],
): string[] {
  const rolesWithRequiredSignatures = new Set(
    fields
      .filter(
        (field) => field.type === "signature" && field.required !== false,
      )
      .map((field) => normalizeRole(field.signer_role))
      .filter(Boolean),
  );

  return recipients.flatMap((recipient, index) => {
    const role = String(recipient.role || "").trim();
    if (role && rolesWithRequiredSignatures.has(normalizeRole(role))) {
      return [];
    }

    return [role || String(recipient.name || "").trim() || `Recipient ${index + 1}`];
  });
}

/** Find prepared signature roles that do not have a corresponding recipient. */
export function findRequiredSignatureRolesWithoutRecipients(
  recipients: SigningRecipient[],
  fields: SigningFieldAssignment[],
): string[] {
  const recipientRoles = new Set(
    recipients.map((recipient) => normalizeRole(recipient.role)).filter(Boolean),
  );
  const requiredRoles = new Map<string, string>();

  for (const field of fields) {
    if (field.type !== "signature" || field.required === false) continue;
    const displayRole = String(field.signer_role || "").trim();
    const normalizedRole = normalizeRole(displayRole);
    if (normalizedRole) requiredRoles.set(normalizedRole, displayRole);
  }

  return Array.from(requiredRoles.entries())
    .filter(([normalizedRole]) => !recipientRoles.has(normalizedRole))
    .map(([, displayRole]) => displayRole);
}

/** Duplicate roles cannot be distinguished by the current role-scoped fields. */
export function findDuplicateRecipientRoles(
  recipients: SigningRecipient[],
): string[] {
  const seen = new Set<string>();
  const duplicates = new Map<string, string>();

  for (const recipient of recipients) {
    const displayRole = String(recipient.role || "").trim();
    const normalizedRole = normalizeRole(displayRole);
    if (!normalizedRole) continue;
    if (seen.has(normalizedRole)) duplicates.set(normalizedRole, displayRole);
    seen.add(normalizedRole);
  }

  return Array.from(duplicates.values());
}

function normalizeRole(value: string | null | undefined): string {
  return String(value || "").trim().toLocaleLowerCase();
}
