import { NextRequest, NextResponse } from "next/server";
import { createClient } from "@/lib/supabase/server";
import type {
  GrowthDashboardMetrics,
  GrowthLLMProvider,
  ProviderBreakdown,
  TrendDataPoint,
} from "@/types/growth";

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
    const days = parseInt(
      request.nextUrl.searchParams.get("days") || "30",
      10
    );

    if (!brandId) {
      return NextResponse.json(
        { error: "brand_id is required" },
        { status: 400 }
      );
    }

    const since = new Date();
    since.setDate(since.getDate() - days);
    const sinceISO = since.toISOString();

    // Fetch snapshots for the period
    const { data: snapshots, error: snapError } = await supabase
      .from("growth_snapshots")
      .select("*")
      .eq("brand_id", brandId)
      .gte("checked_at", sinceISO)
      .order("checked_at", { ascending: true });

    if (snapError) throw snapError;

    const allSnapshots = snapshots || [];
    const totalChecks = allSnapshots.length;
    const totalMentions = allSnapshots.filter((s) => s.mentioned).length;
    const totalCitations = allSnapshots.filter(
      (s) => s.cited_as_source
    ).length;
    const visibilityScore =
      totalChecks > 0 ? Math.round((totalMentions / totalChecks) * 100) : 0;

    // Average rank (only where rank exists)
    const rankedSnapshots = allSnapshots.filter(
      (s) => s.rank_position !== null
    );
    const avgRank =
      rankedSnapshots.length > 0
        ? Math.round(
            (rankedSnapshots.reduce(
              (sum, s) => sum + (s.rank_position || 0),
              0
            ) /
              rankedSnapshots.length) *
              10
          ) / 10
        : null;

    // Trend data: group by date
    const dateMap = new Map<
      string,
      { mentions: number; checks: number }
    >();
    for (const s of allSnapshots) {
      const date = s.checked_at.split("T")[0];
      const entry = dateMap.get(date) || { mentions: 0, checks: 0 };
      entry.checks++;
      if (s.mentioned) entry.mentions++;
      dateMap.set(date, entry);
    }
    const trendData: TrendDataPoint[] = Array.from(dateMap.entries()).map(
      ([date, { mentions, checks }]) => ({
        date,
        score: checks > 0 ? Math.round((mentions / checks) * 100) : 0,
        mentions,
        checks,
      })
    );

    // Provider breakdown
    const providerMap = new Map<
      string,
      { mentions: number; checks: number }
    >();
    for (const s of allSnapshots) {
      const entry = providerMap.get(s.llm_provider) || {
        mentions: 0,
        checks: 0,
      };
      entry.checks++;
      if (s.mentioned) entry.mentions++;
      providerMap.set(s.llm_provider, entry);
    }
    const providerBreakdown: ProviderBreakdown[] = Array.from(
      providerMap.entries()
    ).map(([provider, { mentions, checks }]) => ({
      provider: provider as GrowthLLMProvider,
      score: checks > 0 ? Math.round((mentions / checks) * 100) : 0,
      mentions,
      checks,
    }));

    // Recent wins
    const { data: recentWins } = await supabase
      .from("growth_wins")
      .select("*, keyword:growth_keywords(keyword, category)")
      .eq("brand_id", brandId)
      .order("detected_at", { ascending: false })
      .limit(10);

    const metrics: GrowthDashboardMetrics = {
      visibilityScore,
      totalChecks,
      totalMentions,
      totalCitations,
      avgRank,
      recentWins: recentWins || [],
      trendData,
      providerBreakdown,
    };

    return NextResponse.json(metrics);
  } catch (error) {
    console.error("[growth/dashboard] error:", error);
    return NextResponse.json(
      { error: "Failed to load dashboard metrics" },
      { status: 500 }
    );
  }
}
