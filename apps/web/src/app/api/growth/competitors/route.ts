import { NextRequest, NextResponse } from "next/server";
import { createClient } from "@/lib/supabase/server";

export async function GET(request: NextRequest) {
  try {
    const supabase = await createClient();
    const {
      data: { user },
      error: authError,
    } = await supabase.auth.getUser();
    if (authError || !user) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    }

    const brandId = request.nextUrl.searchParams.get("brand_id");
    if (!brandId) {
      return NextResponse.json(
        { error: "brand_id is required" },
        { status: 400 }
      );
    }

    const { data: competitors, error } = await supabase
      .from("growth_competitors")
      .select("*")
      .eq("brand_id", brandId)
      .order("created_at", { ascending: false });

    if (error) throw error;

    return NextResponse.json({ competitors: competitors || [] });
  } catch (error) {
    console.error("[growth/competitors] GET error:", error);
    return NextResponse.json(
      { error: "Failed to fetch competitors" },
      { status: 500 }
    );
  }
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

    const { brand_id, name, domain, aliases } = await request.json();

    if (!brand_id || !name) {
      return NextResponse.json(
        { error: "brand_id and name are required" },
        { status: 400 }
      );
    }

    const { data, error } = await supabase
      .from("growth_competitors")
      .insert({
        brand_id,
        name: name.trim(),
        domain: domain?.trim() || null,
        aliases: Array.isArray(aliases)
          ? aliases.map((a: string) => a.trim()).filter(Boolean)
          : [],
      })
      .select()
      .single();

    if (error) throw error;

    return NextResponse.json({ competitor: data }, { status: 201 });
  } catch (error) {
    console.error("[growth/competitors] POST error:", error);
    return NextResponse.json(
      { error: "Failed to create competitor" },
      { status: 500 }
    );
  }
}

export async function DELETE(request: NextRequest) {
  try {
    const supabase = await createClient();
    const {
      data: { user },
      error: authError,
    } = await supabase.auth.getUser();
    if (authError || !user) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    }

    const { id } = await request.json();
    if (!id) {
      return NextResponse.json({ error: "id is required" }, { status: 400 });
    }

    const { error } = await supabase
      .from("growth_competitors")
      .delete()
      .eq("id", id);

    if (error) throw error;

    return NextResponse.json({ success: true });
  } catch (error) {
    console.error("[growth/competitors] DELETE error:", error);
    return NextResponse.json(
      { error: "Failed to delete competitor" },
      { status: 500 }
    );
  }
}
