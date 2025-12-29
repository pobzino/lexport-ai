import { createClient } from "@/lib/supabase/server";
import { NextResponse } from "next/server";
import { performOCR, toDataUrl } from "@/lib/upload/ocr";
import { normalizeExtractedText } from "@/lib/upload/extract-pdf";

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
    let imageUrl: string;

    if (fileType === "pdf") {
      // For PDFs, we need to convert to images first
      // For now, we'll use the signed URL directly if GPT-4o supports it
      // Otherwise, we'd need a PDF-to-image conversion step

      // Get a fresh signed URL for the file
      const { data: signedUrlData } = await supabase.storage
        .from("contract-uploads")
        .createSignedUrl(filePath, 3600);

      if (!signedUrlData?.signedUrl) {
        return NextResponse.json(
          { error: "Failed to generate signed URL" },
          { status: 500 }
        );
      }

      imageUrl = signedUrlData.signedUrl;
    } else {
      // For images, convert to base64 data URL
      const base64 = buffer.toString("base64");
      const mimeType = fileType === "png" ? "image/png" : "image/jpeg";
      imageUrl = toDataUrl(base64, mimeType);
    }

    // Perform OCR
    const result = await performOCR(imageUrl, {
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
    return NextResponse.json(
      { error: "Failed to perform OCR on document" },
      { status: 500 }
    );
  }
}
