import { createClient } from "@/lib/supabase/server";
import { NextResponse } from "next/server";
import { extractPdfText, normalizeExtractedText } from "@/lib/upload/extract-pdf";
import { extractDocxText } from "@/lib/upload/extract-docx";
import { performOCR, toDataUrl } from "@/lib/upload/ocr";
import OpenAI from "openai";

const openai = new OpenAI({
  apiKey: process.env.OPENAI_API_KEY,
});

interface QuickClassification {
  suggestedTitle: string;
  suggestedType: string;
  suggestedJurisdiction: string;
  confidence: "high" | "medium" | "low";
}

/**
 * Quick AI classification to detect contract type, title, and jurisdiction
 * Uses GPT-4o-mini for speed and cost efficiency
 */
async function classifyContract(text: string): Promise<QuickClassification> {
  try {
    // Use first 5000 chars for classification (enough to detect type)
    const sampleText = text.slice(0, 5000);

    const response = await openai.chat.completions.create({
      model: "gpt-4o-mini",
      messages: [
        {
          role: "system",
          content: `You are a legal document classifier. Analyze the contract text and identify its type, suggest a title, and detect the jurisdiction. Output JSON only.`,
        },
        {
          role: "user",
          content: `Classify this contract:

${sampleText}

Output JSON with:
{
  "title": "Descriptive title for this contract",
  "type": "One of: nda_mutual, nda_oneway, contractor_agreement, consulting_agreement, service_agreement, employment_offer, safe_note, ip_assignment, advisor_agreement, sow, other",
  "jurisdiction": "Detected jurisdiction code: CA, TX, NY, UK, or other",
  "confidence": "high, medium, or low based on how certain you are"
}`,
        },
      ],
      response_format: { type: "json_object" },
      max_tokens: 256,
      temperature: 0.1,
    });

    const result = JSON.parse(response.choices[0]?.message?.content || "{}");

    return {
      suggestedTitle: result.title || "Uploaded Contract",
      suggestedType: result.type || "service_agreement",
      suggestedJurisdiction: result.jurisdiction || "other",
      confidence: result.confidence || "medium",
    };
  } catch (error) {
    console.error("Classification error:", error);
    // Return defaults if classification fails
    return {
      suggestedTitle: "Uploaded Contract",
      suggestedType: "service_agreement",
      suggestedJurisdiction: "other",
      confidence: "low",
    };
  }
}

export async function POST(request: Request) {
  try {
    const supabase = await createClient();
    const {
      data: { user },
    } = await supabase.auth.getUser();

    if (!user) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    }

    const { filePath, fileType, signedUrl } = await request.json();

    if (!filePath || !fileType) {
      return NextResponse.json(
        { error: "Missing file path or type" },
        { status: 400 }
      );
    }

    // Download file from storage
    const { data: fileData, error: downloadError } = await supabase.storage
      .from("contract-uploads")
      .download(filePath);

    if (downloadError || !fileData) {
      console.error("Download error:", downloadError);
      return NextResponse.json(
        { error: "Failed to download file" },
        { status: 500 }
      );
    }

    const buffer = Buffer.from(await fileData.arrayBuffer());
    let extractedText = "";
    let needsOCR = false;
    let pageCount = 1;

    // Extract text based on file type
    if (fileType === "pdf") {
      const result = await extractPdfText(buffer);
      extractedText = result.text;
      pageCount = result.pageCount;
      needsOCR = result.isScanned;

      if (needsOCR) {
        // PDF is scanned, need OCR
        return NextResponse.json({
          success: true,
          needsOCR: true,
          pageCount,
          reason: "PDF appears to be a scanned document with minimal text",
          partialText: extractedText.slice(0, 200), // Show any text found
        });
      }
    } else if (fileType === "docx") {
      const result = await extractDocxText(buffer);
      extractedText = result.text;

      if (!extractedText || extractedText.length < 50) {
        return NextResponse.json(
          { error: "Could not extract text from DOCX file" },
          { status: 400 }
        );
      }
    } else if (fileType === "jpg" || fileType === "png") {
      // Images always need OCR
      return NextResponse.json({
        success: true,
        needsOCR: true,
        pageCount: 1,
        reason: "Image files require OCR for text extraction",
      });
    }

    // Normalize the extracted text
    const normalizedText = normalizeExtractedText(extractedText);

    // Quick AI classification to detect contract type
    const classification = await classifyContract(normalizedText);

    return NextResponse.json({
      success: true,
      needsOCR: false,
      text: normalizedText,
      pageCount,
      wordCount: normalizedText.split(/\s+/).length,
      characterCount: normalizedText.length,
      // AI-detected metadata
      suggestedTitle: classification.suggestedTitle,
      suggestedType: classification.suggestedType,
      suggestedJurisdiction: classification.suggestedJurisdiction,
      confidence: classification.confidence,
    });
  } catch (error) {
    console.error("Extraction error:", error);
    console.error("Stack:", error instanceof Error ? error.stack : "No stack");
    return NextResponse.json(
      {
        error: error instanceof Error
          ? `Failed to extract text: ${error.message}`
          : "Failed to extract text from document"
      },
      { status: 500 }
    );
  }
}
