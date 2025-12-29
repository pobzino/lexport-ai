import mammoth from "mammoth";

export interface DocxExtractionResult {
  text: string;
  html: string;
  messages: string[];
}

/**
 * Extract text from a DOCX buffer
 */
export async function extractDocxText(
  buffer: Buffer | ArrayBuffer
): Promise<DocxExtractionResult> {
  const bufferToUse = buffer instanceof ArrayBuffer ? Buffer.from(buffer) : buffer;

  // Extract as plain text
  const textResult = await mammoth.extractRawText({
    buffer: bufferToUse,
  });

  // Also extract as HTML for potential rich display
  const htmlResult = await mammoth.convertToHtml({
    buffer: bufferToUse,
  });

  // Collect any conversion messages/warnings
  const messages = [
    ...textResult.messages.map((m) => m.message),
    ...htmlResult.messages.map((m) => m.message),
  ];

  return {
    text: textResult.value.trim(),
    html: htmlResult.value,
    messages,
  };
}

/**
 * Check if DOCX has meaningful content
 */
export function hasContent(text: string): boolean {
  const cleanText = text.replace(/\s+/g, "").trim();
  return cleanText.length > 50;
}
