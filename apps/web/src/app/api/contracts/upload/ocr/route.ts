import { createClient } from "@/lib/supabase/server";
import { NextResponse } from "next/server";
import { performOCR, performPdfOCR } from "@/lib/upload/ocr";
import { normalizeExtractedText } from "@/lib/upload/extract-pdf";
import { isOwnedUploadPath, type UploadFileType } from "@/lib/upload/file-validation";

export const maxDuration = 26;

const OCR_FILE_TYPES = new Set<UploadFileType>(["pdf", "jpg", "png"]);

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
      !OCR_FILE_TYPES.has(fileType)
    ) {
      return NextResponse.json(
        { error: "Invalid file path or type for OCR" },
        { status: 400 }
      );
    }

    const { data: signedUrlData, error: signedUrlError } = await supabase.storage
      .from("contract-uploads")
      .createSignedUrl(filePath, 600);

    if (signedUrlError || !signedUrlData?.signedUrl) {
      console.error("OCR signed URL error:", signedUrlError);
      return NextResponse.json(
        { error: "Failed to access the uploaded file" },
        { status: 500 }
      );
    }

    const result = fileType === "pdf"
      ? await performPdfOCR(signedUrlData.signedUrl, {
          preserveFormatting: true,
          extractTables: true,
        })
      : await performOCR(signedUrlData.signedUrl, {
          preserveFormatting: true,
          extractTables: true,
        });

    // Normalize the extracted text
    const normalizedText = normalizeExtractedText(result.text);

    return NextResponse.json({
      success: true,
      text: normalizedText,
      confidence: result.confidence,
      wordCount: normalizedText.split(/\s+/).length,
      characterCount: normalizedText.length,
    });
  } catch (error) {
    console.error("OCR error:", error);
    const isTimeout = error instanceof Error && /timeout|timed out/i.test(error.message);
    return NextResponse.json(
      {
        error: isTimeout
          ? "We could not read this scan in time. Retry, or keep the original document for signing."
          : "We could not recover complete text from this scan. Retry, or keep the original document for signing.",
        retryable: true,
      },
      { status: isTimeout ? 504 : 422 }
    );
  }
}
