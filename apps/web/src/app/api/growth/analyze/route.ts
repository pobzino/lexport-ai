import { NextRequest, NextResponse } from "next/server";
import { createClient } from "@/lib/supabase/server";
import { analyzeKeyword } from "@/lib/growth/analyze";
import type { GrowthWinType } from "@/types/growth";

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

    const { brand_id, keyword_id } = await request.json();

    if (!brand_id) {
      return NextResponse.json(
        { error: "brand_id is required" },
        { status: 400 }
      );
    }

    // Load brand
    const { data: brand, error: brandError } = await supabase
      .from("growth_brands")
      .select("*")
      .eq("id", brand_id)
      .single();

    if (brandError || !brand) {
      return NextResponse.json({ error: "Brand not found" }, { status: 404 });
    }

    // Rate limit: check last analysis time
    const { data: recentSnapshot } = await supabase
      .from("growth_snapshots")
      .select("checked_at")
      .eq("brand_id", brand_id)
      .order("checked_at", { ascending: false })
      .limit(1)
      .single();

    if (recentSnapshot) {
      const lastCheck = new Date(recentSnapshot.checked_at);
      const minInterval = keyword_id ? 5 * 60 * 1000 : 60 * 60 * 1000; // 5 min single, 1 hr full
      if (Date.now() - lastCheck.getTime() < minInterval) {
        return NextResponse.json(
          {
            error: keyword_id
              ? "Please wait at least 5 minutes between single keyword checks"
              : "Please wait at least 1 hour between full analyses",
          },
          { status: 429 }
        );
      }
    }

    // Load keywords
    let keywordsQuery = supabase
      .from("growth_keywords")
      .select("*")
      .eq("brand_id", brand_id)
      .eq("is_active", true);

    if (keyword_id) {
      keywordsQuery = keywordsQuery.eq("id", keyword_id);
    }

    const { data: keywords, error: kwError } = await keywordsQuery;
    if (kwError) throw kwError;

    if (!keywords || keywords.length === 0) {
      return NextResponse.json(
        { error: "No active keywords to analyze" },
        { status: 400 }
      );
    }

    // Load competitors
    const { data: competitors } = await supabase
      .from("growth_competitors")
      .select("name, aliases")
      .eq("brand_id", brand_id);

    // Run analysis for each keyword
    const allSnapshots = [];
    const allWins = [];

    for (const kw of keywords) {
      const results = await analyzeKeyword({
        keyword: kw.keyword,
        brandName: brand.name,
        brandAliases: brand.aliases || [],
        competitors: competitors || [],
      });

      for (const result of results) {
        // Insert snapshot
        const { data: snapshot, error: snapError } = await supabase
          .from("growth_snapshots")
          .insert({
            brand_id,
            keyword_id: kw.id,
            llm_provider: result.provider,
            llm_model: result.model,
            prompt_used: result.promptUsed,
            mentioned: result.mentioned,
            rank_position: result.rankPosition,
            cited_as_source: result.citedAsSource,
            competitor_mentions: result.competitorMentions,
            raw_response: result.rawResponse?.slice(0, 4000),
            response_tokens: result.responseTokens,
          })
          .select()
          .single();

        if (snapError) {
          console.error("[growth/analyze] snapshot insert error:", snapError);
          continue;
        }

        allSnapshots.push(snapshot);

        // Auto-create wins
        if (result.mentioned && snapshot) {
          let winType: GrowthWinType = "mentioned";
          if (result.rankPosition === 1) winType = "top_1";
          else if (result.rankPosition && result.rankPosition <= 3)
            winType = "top_3";
          else if (result.citedAsSource) winType = "cited";

          const { data: win } = await supabase
            .from("growth_wins")
            .insert({
              snapshot_id: snapshot.id,
              brand_id,
              keyword_id: kw.id,
              win_type: winType,
              llm_provider: result.provider,
              rank_position: result.rankPosition,
            })
            .select()
            .single();

          if (win) allWins.push(win);
        }
      }
    }

    return NextResponse.json({
      snapshots: allSnapshots.length,
      wins: allWins.length,
      results: allSnapshots,
    });
  } catch (error) {
    console.error("[growth/analyze] error:", error);
    return NextResponse.json(
      { error: "Analysis failed" },
      { status: 500 }
    );
  }
}
