import { NextRequest, NextResponse } from "next/server";
import { createClient } from "@/lib/supabase/server";
import { createHash } from "crypto";

const LOGO_BUCKET = "company-assets";
const MAX_LOGO_BYTES = 2 * 1024 * 1024;

function validLogoBytes(type: string, bytes: Uint8Array): boolean {
  if (type === "image/png") {
    return (
      bytes.length >= 8 &&
      bytes[0] === 0x89 &&
      bytes[1] === 0x50 &&
      bytes[2] === 0x4e &&
      bytes[3] === 0x47
    );
  }

  if (type === "image/jpeg") {
    return (
      bytes.length >= 3 &&
      bytes[0] === 0xff &&
      bytes[1] === 0xd8 &&
      bytes[2] === 0xff
    );
  }

  return false;
}

export async function POST(request: NextRequest) {
  try {
    const supabase = await createClient();
    const {
      data: { user },
      error: authError,
    } = await supabase.auth.getUser();

    if (authError || !user) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    }

    const formData = await request.formData();
    const file = formData.get("logo");
    if (!(file instanceof File)) {
      return NextResponse.json({ error: "Choose a PNG or JPG logo" }, { status: 400 });
    }
    if (file.size <= 0 || file.size > MAX_LOGO_BYTES) {
      return NextResponse.json(
        { error: "Logo must be smaller than 2 MB" },
        { status: 400 },
      );
    }

    const bytes = new Uint8Array(await file.arrayBuffer());
    if (!validLogoBytes(file.type, bytes)) {
      return NextResponse.json(
        { error: "Logo must be a valid PNG or JPG image" },
        { status: 400 },
      );
    }

    // Content-addressed paths keep logos on already-issued invoices stable
    // when the user later replaces their current company logo.
    const digest = createHash("sha256").update(bytes).digest("hex");
    const objectPath = `${user.id}/logos/${digest}`;
    const { error: uploadError } = await supabase.storage
      .from(LOGO_BUCKET)
      .upload(objectPath, bytes, {
        cacheControl: "3600",
        contentType: file.type,
        upsert: true,
      });

    if (uploadError) {
      console.error("Company logo upload failed:", uploadError);
      return NextResponse.json({ error: "Failed to upload logo" }, { status: 500 });
    }

    const { data: publicUrlData } = supabase.storage
      .from(LOGO_BUCKET)
      .getPublicUrl(objectPath);
    const logoUrl = publicUrlData.publicUrl;

    const { error: settingsError } = await supabase.from("invoice_settings").upsert(
      {
        user_id: user.id,
        company_logo_url: logoUrl,
        updated_at: new Date().toISOString(),
      },
      { onConflict: "user_id" },
    );

    if (settingsError) {
      console.error("Failed to save company logo URL:", settingsError);
      return NextResponse.json({ error: "Logo uploaded but could not be saved" }, { status: 500 });
    }

    return NextResponse.json({ logoUrl });
  } catch (error) {
    console.error("Company logo upload error:", error);
    return NextResponse.json({ error: "Failed to upload logo" }, { status: 500 });
  }
}

export async function DELETE() {
  try {
    const supabase = await createClient();
    const {
      data: { user },
      error: authError,
    } = await supabase.auth.getUser();

    if (authError || !user) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    }

    // Clear the logo for future documents. Existing content-addressed assets
    // remain available to preserve already-issued invoice snapshots.
    const { error: settingsError } = await supabase
      .from("invoice_settings")
      .update({
        company_logo_url: null,
        updated_at: new Date().toISOString(),
      })
      .eq("user_id", user.id);
    if (settingsError) {
      return NextResponse.json({ error: "Failed to update logo settings" }, { status: 500 });
    }

    return NextResponse.json({ success: true });
  } catch (error) {
    console.error("Company logo removal error:", error);
    return NextResponse.json({ error: "Failed to remove logo" }, { status: 500 });
  }
}
