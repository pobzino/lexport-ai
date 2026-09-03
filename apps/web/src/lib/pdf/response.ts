export type PdfDisposition = "attachment" | "inline";

export function sanitizePdfFilename(name: string): string {
  const sanitized = name
    .replace(/[^a-zA-Z0-9-_\s]/g, "")
    .replace(/\s+/g, "_")
    .slice(0, 120);
  return sanitized || "contract";
}

export function getPdfResponseHeaders(
  title: string,
  disposition: PdfDisposition,
): Record<string, string> {
  return {
    "Content-Type": "application/pdf",
    "Content-Disposition": `${disposition}; filename="${sanitizePdfFilename(title)}.pdf"`,
    "Cache-Control": disposition === "inline"
      ? "private, max-age=300"
      : "private, no-store",
    "X-Content-Type-Options": "nosniff",
  };
}
