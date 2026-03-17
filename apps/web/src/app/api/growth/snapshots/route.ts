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

    const params = request.nextUrl.searchParams;
    const brandId = params.get("brand_id");
    const keywordId = params.get("keyword_id");
    const provider = params.get("provider");
    const page = parseInt(params.get("page") || "1", 10);
    const limit = Math.min(parseInt(params.get("limit") || "20", 10), 50);
    const offset = (page - 1) * limit;

    if (!brandId) {
      return NextResponse.json(
        { error: "brand_id is required" },
        { status: 400 }
      );
    }

    let query = supabase
      .from("growth_snapshots")
      .select("*, keyword:growth_keywords(keyword, category)", {
        count: "exact",
      })
      .eq("brand_id", brandId)
      .order("checked_at", { ascending: false })
      .range(offset, offset + limit - 1);

    if (keywordId) query = query.eq("keyword_id", keywordId);
    if (provider) query = query.eq("llm_provider", provider);

    const { data: snapshots, error, count } = await query;
    if (error) throw error;

    return NextResponse.json({
      snapshots: snapshots || [],
      total: count || 0,
      page,
      limit,
    });
  } catch (error) {
    console.error("[growth/snapshots] error:", error);
    return NextResponse.json(
      { error: "Failed to fetch snapshots" },
      { status: 500 }
    );
  }
}
