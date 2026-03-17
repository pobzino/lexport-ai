import { NextRequest, NextResponse } from "next/server";
import { createAdminClient } from "@/lib/supabase/admin";
import { analyzeKeyword } from "@/lib/growth/analyze";
import type { GrowthWinType } from "@/types/growth";

export async function POST(request: NextRequest) {
  try {
    // Auth via CRON_SECRET
    const cronSecret = process.env.CRON_SECRET;
    if (cronSecret) {
      const auth = request.headers.get("Authorization");
      if (auth !== `Bearer ${cronSecret}`) {
        return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
      }
    }

    const supabase = createAdminClient();

    // Load all active brands with their keywords and competitors
    const { data: brands, error: brandError } = await supabase
      .from("growth_brands")
      .select("*, growth_keywords(*), growth_competitors(*)")
      .eq("is_active", true);

    if (brandError) throw brandError;
    if (!brands || brands.length === 0) {
      return NextResponse.json({ message: "No active brands", processed: 0 });
    }

    let totalSnapshots = 0;
    let totalWins = 0;

    for (const brand of brands) {
      const activeKeywords = (brand.growth_keywords || []).filter(
        (k: { is_active: boolean }) => k.is_active
      );
      const competitors = brand.growth_competitors || [];

      for (const kw of activeKeywords) {
        try {
          const results = await analyzeKeyword({
            keyword: kw.keyword,
            brandName: brand.name,
            brandAliases: brand.aliases || [],
            competitors: competitors.map(
              (c: { name: string; aliases: string[] }) => ({
                name: c.name,
                aliases: c.aliases || [],
              })
            ),
          });

          for (const result of results) {
            const { data: snapshot } = await supabase
              .from("growth_snapshots")
              .insert({
                brand_id: brand.id,
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

            totalSnapshots++;

            if (result.mentioned && snapshot) {
              let winType: GrowthWinType = "mentioned";
              if (result.rankPosition === 1) winType = "top_1";
              else if (result.rankPosition && result.rankPosition <= 3)
                winType = "top_3";
              else if (result.citedAsSource) winType = "cited";

              await supabase.from("growth_wins").insert({
                snapshot_id: snapshot.id,
                brand_id: brand.id,
                keyword_id: kw.id,
                win_type: winType,
                llm_provider: result.provider,
                rank_position: result.rankPosition,
              });
              totalWins++;
            }
          }
        } catch (kwError) {
          console.error(
            `[growth/process] Error analyzing "${kw.keyword}":`,
            kwError
          );
        }

        // Small delay between keywords to avoid rate limits
        await new Promise((resolve) => setTimeout(resolve, 1000));
      }
    }

    return NextResponse.json({
      success: true,
      processed: totalSnapshots,
      wins: totalWins,
    });
  } catch (error) {
    console.error("[growth/process] error:", error);
    return NextResponse.json(
      { error: "Processing failed" },
      { status: 500 }
    );
  }
}
