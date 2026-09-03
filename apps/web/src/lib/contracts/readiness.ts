import type { ContractContent } from "@/db/types";

export interface UnresolvedContractPlaceholder {
  path: string;
  text: string;
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
  processing_mode?: string | null;
}): boolean {
  return !(
    contract.source_type === "uploaded" &&
    contract.processing_mode === "sign_only"
  );
}
