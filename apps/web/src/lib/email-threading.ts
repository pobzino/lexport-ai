/**
 * Normalize an email subject for thread grouping.
 * Strips Re:/Fwd:/FW: prefixes recursively, lowercases, and trims.
 */
export function normalizeSubject(subject: string): string {
  let normalized = (subject || "").trim();
  let prev = "";
  while (prev !== normalized) {
    prev = normalized;
    normalized = normalized.replace(/^(Re|Fwd|FW|Fw):\s*/i, "").trim();
  }
  return normalized.toLowerCase();
}
