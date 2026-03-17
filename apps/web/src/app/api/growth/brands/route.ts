import { NextRequest, NextResponse } from "next/server";
import { createClient } from "@/lib/supabase/server";

export async function GET() {
  try {
    const supabase = await createClient();
    const {
      data: { user },
      error: authError,
    } = await supabase.auth.getUser();
    if (authError || !user) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    }

    const { data: brands, error } = await supabase
      .from("growth_brands")
      .select("*, growth_competitors(*)")
      .eq("user_id", user.id)
      .order("created_at", { ascending: false });

    if (error) throw error;

    return NextResponse.json({ brands: brands || [] });
  } catch (error) {
    console.error("[growth/brands] GET error:", error);
    return NextResponse.json(
      { error: "Failed to fetch brands" },
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

    const { name, domain, aliases } = await request.json();

    if (!name || typeof name !== "string") {
      return NextResponse.json(
        { error: "Brand name is required" },
        { status: 400 }
      );
    }

    const { data: brand, error } = await supabase
      .from("growth_brands")
      .insert({
        user_id: user.id,
        name: name.trim(),
        domain: domain?.trim() || null,
        aliases: Array.isArray(aliases)
          ? aliases.map((a: string) => a.trim()).filter(Boolean)
          : [],
      })
      .select()
      .single();

    if (error) throw error;

    return NextResponse.json({ brand }, { status: 201 });
  } catch (error) {
    console.error("[growth/brands] POST error:", error);
    return NextResponse.json(
      { error: "Failed to create brand" },
      { status: 500 }
    );
  }
}
