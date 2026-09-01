import { extractText, getDocumentProxy } from "unpdf";

export interface PDFExtractionResult {
  text: string;
  pageCount: number;
  isScanned: boolean;
  metadata?: {
    title?: string;
    author?: string;
    creationDate?: Date;
  };
}

/**
 * Extract text from a PDF buffer using unpdf
 * Also detects if the PDF appears to be a scanned document (needs OCR)
 */
export async function extractPdfText(
  buffer: Buffer | ArrayBuffer
): Promise<PDFExtractionResult> {
  try {
    // Convert to Uint8Array for unpdf
    const uint8Array = buffer instanceof ArrayBuffer
      ? new Uint8Array(buffer)
      : new Uint8Array(buffer.buffer, buffer.byteOffset, buffer.byteLength);

    // Get document proxy
    const pdf = await getDocumentProxy(uint8Array);

    // Keep page and line boundaries. unpdf's merged mode collapses every
    // whitespace run, which makes legal headings impossible to recover.
    const { totalPages, text } = await extractText(pdf);

    const extractedText = text.join("\n\n").trim();
    const pageCount = totalPages || 1;

    const isScanned = detectScannedPdf(extractedText, pageCount);

    return {
      text: extractedText,
      pageCount,
      isScanned,
      metadata: {},
    };
  } catch (error) {
    // If unpdf fails (malformed PDF), return empty result
    console.error("PDF parse error:", error);
    return {
      text: "",
      pageCount: 1,
      isScanned: false,
      metadata: {},
    };
  }
}

/**
 * Detect if a PDF is likely a scanned document
 * A text-layer PDF normally contains hundreds of characters per page. Keep the
 * threshold conservative so short agreements are not unnecessarily sent to OCR.
 */
export function detectScannedPdf(text: string, pageCount: number): boolean {
  const cleanText = text.replace(/\s+/g, " ").trim();
  const safePageCount = Math.max(pageCount, 1);
  const averageCharactersPerPage = cleanText.length / safePageCount;

  return cleanText.length < 80 || averageCharactersPerPage < 60;
}

/**
 * Clean and normalize extracted text
 */
export function normalizeExtractedText(text: string): string {
  return text
    .replace(/\r\n?/g, "\n")
    // Normalize horizontal whitespace without destroying paragraph structure.
    .replace(/[^\S\n]+/g, " ")
    // Fix common OCR artifacts
    .replace(/\s+([.,;:!?])/g, "$1")
    .replace(/[ \t]+\n/g, "\n")
    .replace(/\n[ \t]+/g, "\n")
    // Remove excessive line breaks
    .replace(/\n{3,}/g, "\n\n")
    // Trim
    .trim();
}
