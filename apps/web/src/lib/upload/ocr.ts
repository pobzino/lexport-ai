import OpenAI from "openai";

const OCR_TIMEOUT_MS = 20_000;

function createOpenAIClient(): OpenAI {
  if (!process.env.OPENAI_API_KEY) {
    throw new Error("OCR is not configured");
  }

  return new OpenAI({
    apiKey: process.env.OPENAI_API_KEY,
    timeout: OCR_TIMEOUT_MS,
    maxRetries: 0,
  });
}

export interface OCRResult {
  text: string;
  confidence: "high" | "medium" | "low";
  pageCount?: number;
}

/**
 * Perform OCR on an image or scanned document using GPT-4 Vision
 */
export async function performOCR(
  imageUrl: string,
  options?: {
    preserveFormatting?: boolean;
    extractTables?: boolean;
  }
): Promise<OCRResult> {
  const { preserveFormatting = true, extractTables = true } = options || {};

  const prompt = buildOCRPrompt(preserveFormatting, extractTables);

  const response = await createOpenAIClient().chat.completions.create({
    model: "gpt-4o",
    messages: [
      {
        role: "user",
        content: [
          {
            type: "text",
            text: prompt,
          },
          {
            type: "image_url",
            image_url: {
              url: imageUrl,
              detail: "high", // Use high detail for better OCR accuracy
            },
          },
        ],
      },
    ],
    max_tokens: 4096,
  });

  const extractedText = response.choices[0]?.message?.content || "";

  if (response.choices[0]?.finish_reason === "length") {
    throw new Error("OCR output was incomplete");
  }

  return {
    text: extractedText.trim(),
    confidence: determineConfidence(extractedText),
  };
}

/**
 * Extract text from scanned PDFs through Responses file input. The API reads
 * both the PDF text layer and rendered page images, so no server-side PDF to
 * image conversion is required.
 */
export async function performPdfOCR(
  fileUrl: string,
  options?: {
    preserveFormatting?: boolean;
    extractTables?: boolean;
  }
): Promise<OCRResult> {
  const { preserveFormatting = true, extractTables = true } = options || {};
  const prompt = buildOCRPrompt(preserveFormatting, extractTables);
  const response = await createOpenAIClient().responses.create({
    model: "gpt-4o",
    input: [
      {
        role: "user",
        content: [
          {
            type: "input_file",
            file_url: fileUrl,
          },
          {
            type: "input_text",
            text: prompt,
          },
        ],
      },
    ],
    max_output_tokens: 12_000,
  });

  if (response.status === "incomplete") {
    throw new Error("OCR output was incomplete");
  }

  const extractedText = response.output_text || "";
  return {
    text: extractedText.trim(),
    confidence: determineConfidence(extractedText),
  };
}

/**
 * Perform OCR on multiple pages/images
 */
export async function performMultiPageOCR(
  imageUrls: string[]
): Promise<OCRResult> {
  const results: string[] = [];

  // Process pages sequentially to maintain order
  for (let i = 0; i < imageUrls.length; i++) {
    const result = await performOCR(imageUrls[i]);
    results.push(`--- Page ${i + 1} ---\n${result.text}`);
  }

  const combinedText = results.join("\n\n");

  return {
    text: combinedText,
    confidence: "medium",
    pageCount: imageUrls.length,
  };
}

/**
 * Convert a base64 image to a data URL for GPT-4 Vision
 */
export function toDataUrl(
  base64: string,
  mimeType: "image/jpeg" | "image/png" | "image/webp"
): string {
  return `data:${mimeType};base64,${base64}`;
}

/**
 * Build the OCR prompt based on options
 */
function buildOCRPrompt(
  preserveFormatting: boolean,
  extractTables: boolean
): string {
  let prompt = `You are an expert document OCR system. Extract ALL text from this document image with perfect accuracy.

Instructions:
- Extract every word, number, and symbol visible in the document
- Maintain the reading order (top to bottom, left to right)
- Preserve paragraph breaks and section divisions`;

  if (preserveFormatting) {
    prompt += `
- Keep the original formatting structure (headings, lists, indentation)
- Use markdown formatting where appropriate (# for headings, - for lists)`;
  }

  if (extractTables) {
    prompt += `
- For tables, use markdown table format with | separators
- Ensure table alignment is preserved`;
  }

  prompt += `

Important:
- Do NOT summarize or interpret the content
- Do NOT add any commentary or explanations
- Output ONLY the extracted text
- If text is unclear or partially visible, include [unclear] marker

Begin extraction:`;

  return prompt;
}

/**
 * Estimate OCR confidence based on response characteristics
 */
function determineConfidence(text: string): "high" | "medium" | "low" {
  // Check for markers of uncertainty
  const unclearCount = (text.match(/\[unclear\]/gi) || []).length;
  const questionMarks = (text.match(/\?{2,}/g) || []).length;
  const textLength = text.length;

  if (unclearCount === 0 && questionMarks === 0 && textLength > 100) {
    return "high";
  } else if (unclearCount < 5 && textLength > 50) {
    return "medium";
  }
  return "low";
}
