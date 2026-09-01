import { createClient } from "@/lib/supabase/server";
import { NextResponse } from "next/server";
import { randomUUID } from "node:crypto";
import {
  getUploadFileType,
  isOwnedUploadPath,
  sanitizeUploadFileName,
  validateUploadFileMetadata,
} from "@/lib/upload/file-validation";

export async function POST(request: Request) {
  try {
    const supabase = await createClient();
    const {
      data: { user },
    } = await supabase.auth.getUser();

    if (!user) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    }

    const { fileName, fileSize, mimeType } = await request.json();
    const validationError = validateUploadFileMetadata({
      fileName: typeof fileName === "string" ? fileName : "",
      fileSize: typeof fileSize === "number" ? fileSize : Number.NaN,
      mimeType: typeof mimeType === "string" ? mimeType : "",
    });

    if (validationError) {
      return NextResponse.json({ error: validationError }, { status: 400 });
    }

    const fileType = getUploadFileType(fileName, mimeType);
    if (!fileType) {
      return NextResponse.json({ error: "Unsupported file type" }, { status: 400 });
    }

    const safeName = sanitizeUploadFileName(fileName);
    const filePath = `${user.id}/${Date.now()}-${randomUUID()}-${safeName}`;
    const { data: uploadData, error: uploadError } = await supabase.storage
      .from("contract-uploads")
      .createSignedUploadUrl(filePath, { upsert: false });

    if (uploadError || !uploadData) {
      console.error("Signed upload URL error:", uploadError);
      return NextResponse.json(
        { error: "Failed to prepare secure upload" },
        { status: 500 }
      );
    }

    return NextResponse.json(
      {
        success: true,
        filePath,
        fileType,
        token: uploadData.token,
      },
      { headers: { "Cache-Control": "private, no-store" } }
    );
  } catch (error) {
    console.error("Upload error:", error);
    return NextResponse.json(
      { error: "Failed to process upload" },
      { status: 500 }
    );
  }
}

export async function DELETE(request: Request) {
  try {
    const supabase = await createClient();
    const {
      data: { user },
    } = await supabase.auth.getUser();

    if (!user) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    }

    const { filePath } = await request.json();
    if (typeof filePath !== "string" || !isOwnedUploadPath(filePath, user.id)) {
      return NextResponse.json({ error: "Invalid upload path" }, { status: 400 });
    }

    const { error } = await supabase.storage
      .from("contract-uploads")
      .remove([filePath]);

    if (error) {
      console.error("Discard upload error:", error);
      return NextResponse.json({ error: "Failed to discard upload" }, { status: 500 });
    }

    return NextResponse.json({ success: true });
  } catch (error) {
    console.error("Discard upload error:", error);
    return NextResponse.json({ error: "Failed to discard upload" }, { status: 500 });
  }
}
