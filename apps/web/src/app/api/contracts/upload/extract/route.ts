import { createClient } from "@/lib/supabase/server";
import { NextResponse } from "next/server";
import { extractPdfText, normalizeExtractedText } from "@/lib/upload/extract-pdf";
import { extractDocxText } from "@/lib/upload/extract-docx";
import { isOwnedUploadPath, type UploadFileType } from "@/lib/upload/file-validation";

export const maxDuration = 26;

const UPLOAD_FILE_TYPES = new Set<UploadFileType>(["pdf", "docx", "jpg", "png"]);

export async function POST(request: Request) {
  try {
    const supabase = await createClient();
    const {
      data: { user },
    } = await supabase.auth.getUser();

    if (!user) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    }

    const { filePath, fileType } = await request.json();

    if (
      typeof filePath !== "string" ||
      !isOwnedUploadPath(filePath, user.id) ||
      !UPLOAD_FILE_TYPES.has(fileType)
    ) {
      return NextResponse.json(
        { error: "Invalid file path or type" },
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

    return NextResponse.json({
      success: true,
      needsOCR: false,
      text: normalizedText,
      pageCount,
      wordCount: normalizedText.split(/\s+/).length,
      characterCount: normalizedText.length,
      textQuality: normalizedText.length >= 500 ? "good" : "limited",
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
