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

    // Extract text with pages merged
    const { totalPages, text } = await extractText(pdf, { mergePages: true });

    const extractedText = (text as string || "").trim();
    const pageCount = totalPages || 1;

    // Detect if PDF is scanned (very little text relative to page count)
    // Note: We don't support OCR for PDFs (GPT Vision doesn't accept PDFs)
    // So we always return isScanned: false to use whatever text was extracted
    const isScanned = false;

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
 * Note: Currently we don't support OCR for PDFs (would need pdf-to-image conversion)
 * So we always return false to use whatever text was extracted
 */
export function detectScannedPdf(text: string, pageCount: number): boolean {
  // PDF OCR is not currently supported (GPT Vision doesn't accept PDFs)
  // Always use extracted text, even if minimal
  // To enable OCR in future: uncomment the detection logic and add pdf-to-image conversion

  // const cleanText = text.replace(/\s+/g, " ").trim();
  // const avgCharsPerPage = cleanText.length / Math.max(pageCount, 1);
  // return avgCharsPerPage < 100;

  return false;
}

/**
 * Clean and normalize extracted text
 */
export function normalizeExtractedText(text: string): string {
  return text
    // Normalize whitespace
    .replace(/\s+/g, " ")
    // Fix common OCR artifacts
    .replace(/\s+([.,;:!?])/g, "$1")
    // Remove excessive line breaks
    .replace(/\n{3,}/g, "\n\n")
    // Trim
    .trim();
}
