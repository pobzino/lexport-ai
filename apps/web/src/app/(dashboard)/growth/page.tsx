"use client";

import { useState, useEffect, useCallback } from "react";
import Link from "next/link";
import {
  TrendingUp,
  Eye,
  Award,
  Hash,
  Quote,
  Loader2,
  Play,
  Trophy,
  ArrowRight,
  Settings,
} from "lucide-react";
import {
  LineChart,
  Line,
  XAxis,
  YAxis,
  CartesianGrid,
  Tooltip,
  ResponsiveContainer,
  BarChart,
  Bar,
  Cell,
} from "recharts";
import { GrowthSetup } from "@/components/growth/growth-setup";
import { VisibilityScore } from "@/components/growth/visibility-score";
import type {
  GrowthBrand,
  GrowthDashboardMetrics,
} from "@/types/growth";

const PROVIDER_COLORS: Record<string, string> = {
  openai: "#10a37f",
  anthropic: "#d97706",
  perplexity: "#6366f1",
  google: "#4285f4",
};

const PROVIDER_LABELS: Record<string, string> = {
  openai: "ChatGPT",
  anthropic: "Claude",
  perplexity: "Perplexity",
  google: "Gemini",
};

const WIN_TYPE_LABELS: Record<string, string> = {
  top_1: "#1 Ranked",
  top_3: "Top 3",
  cited: "Cited",
  mentioned: "Mentioned",
};

export default function GrowthPage() {
  const [brands, setBrands] = useState<GrowthBrand[]>([]);
  const [activeBrand, setActiveBrand] = useState<GrowthBrand | null>(null);
  const [metrics, setMetrics] = useState<GrowthDashboardMetrics | null>(null);
  const [loading, setLoading] = useState(true);
  const [analyzing, setAnalyzing] = useState(false);
  const [needsSetup, setNeedsSetup] = useState(false);

  const fetchBrands = useCallback(async () => {
    const res = await fetch("/api/growth/brands");
    const data = await res.json();
    if (data.brands && data.brands.length > 0) {
      setBrands(data.brands);
      setActiveBrand(data.brands[0]);
      setNeedsSetup(false);
    } else {
      setNeedsSetup(true);
    }
    setLoading(false);
  }, []);

  const fetchMetrics = useCallback(async (brandId: string) => {
    const res = await fetch(`/api/growth/dashboard?brand_id=${brandId}`);
    const data = await res.json();
    setMetrics(data);
  }, []);

  useEffect(() => {
    fetchBrands();
  }, [fetchBrands]);

  useEffect(() => {
    if (activeBrand) {
      fetchMetrics(activeBrand.id);
    }
  }, [activeBrand, fetchMetrics]);

  const runAnalysis = async () => {
    if (!activeBrand || analyzing) return;
    setAnalyzing(true);
    try {
      const res = await fetch("/api/growth/analyze", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ brand_id: activeBrand.id }),
      });
      const data = await res.json();
      if (!res.ok) {
        alert(data.error || "Analysis failed");
      } else {
        // Refresh metrics
        await fetchMetrics(activeBrand.id);
      }
    } catch {
      alert("Analysis failed");
    } finally {
      setAnalyzing(false);
    }
  };

  if (loading) {
    return (
      <div className="flex items-center justify-center min-h-[60vh]">
        <Loader2 className="w-8 h-8 animate-spin text-slate-400" />
      </div>
    );
  }

  if (needsSetup) {
    return (
      <div className="p-6 lg:p-8">
        <GrowthSetup onComplete={fetchBrands} />
      </div>
    );
  }

  return (
    <div className="p-6 lg:p-8 space-y-6">
      {/* Header */}
      <div className="flex items-center justify-between">
        <div className="flex items-center gap-3">
          <div className="w-10 h-10 rounded-xl bg-[#529ec6]/10 flex items-center justify-center">
            <TrendingUp className="w-5 h-5 text-[#529ec6]" />
          </div>
          <div>
            <h1 className="text-xl font-bold text-slate-900">
              AI Visibility Dashboard
            </h1>
            <p className="text-sm text-slate-500">
              Tracking &ldquo;{activeBrand?.name}&rdquo; across AI platforms
            </p>
          </div>
        </div>
        <div className="flex items-center gap-3">
          <Link
            href="/growth/keywords"
            className="flex items-center gap-2 px-4 py-2 border border-slate-200 rounded-lg text-sm font-medium text-slate-700 hover:bg-slate-50 transition-colors"
          >
            <Settings className="w-4 h-4" />
            Keywords
          </Link>
          <button
            onClick={runAnalysis}
            disabled={analyzing}
            className="flex items-center gap-2 px-4 py-2 bg-[#202e46] text-white rounded-lg text-sm font-semibold hover:bg-[#1a2539] transition-colors disabled:opacity-50"
          >
            {analyzing ? (
              <>
                <Loader2 className="w-4 h-4 animate-spin" />
                Analyzing...
              </>
            ) : (
              <>
                <Play className="w-4 h-4" />
                Run Check
              </>
            )}
          </button>
        </div>
      </div>

      {!metrics || metrics.totalChecks === 0 ? (
        <div className="bg-white border border-slate-200 rounded-xl p-12 text-center">
          <Eye className="w-12 h-12 text-slate-300 mx-auto mb-4" />
          <h3 className="text-lg font-semibold text-slate-900 mb-2">
            No data yet
          </h3>
          <p className="text-slate-500 mb-6">
            Click &ldquo;Run Check&rdquo; to analyze your brand&apos;s visibility across AI
            platforms.
          </p>
          <button
            onClick={runAnalysis}
            disabled={analyzing}
            className="inline-flex items-center gap-2 px-6 py-3 bg-[#202e46] text-white rounded-xl font-semibold hover:bg-[#1a2539] transition-colors disabled:opacity-50"
          >
            {analyzing ? (
              <>
                <Loader2 className="w-4 h-4 animate-spin" />
                Analyzing...
              </>
            ) : (
              <>
                <Play className="w-4 h-4" />
                Run First Check
              </>
            )}
          </button>
        </div>
      ) : (
        <>
          {/* Stats Cards */}
          <div className="grid grid-cols-2 lg:grid-cols-4 gap-4">
            <div className="bg-white border border-slate-200 rounded-xl p-5">
              <div className="flex items-center gap-2 text-slate-500 text-sm mb-2">
                <Eye className="w-4 h-4" />
                Visibility Score
              </div>
              <div className="text-3xl font-bold text-slate-900">
                {metrics.visibilityScore}%
              </div>
            </div>
            <div className="bg-white border border-slate-200 rounded-xl p-5">
              <div className="flex items-center gap-2 text-slate-500 text-sm mb-2">
                <Hash className="w-4 h-4" />
                Mentions
              </div>
              <div className="text-3xl font-bold text-slate-900">
                {metrics.totalMentions}
                <span className="text-lg text-slate-400 font-normal">
                  /{metrics.totalChecks}
                </span>
              </div>
            </div>
            <div className="bg-white border border-slate-200 rounded-xl p-5">
              <div className="flex items-center gap-2 text-slate-500 text-sm mb-2">
                <Award className="w-4 h-4" />
                Avg Rank
              </div>
              <div className="text-3xl font-bold text-slate-900">
                {metrics.avgRank !== null ? `#${metrics.avgRank}` : "—"}
              </div>
            </div>
            <div className="bg-white border border-slate-200 rounded-xl p-5">
              <div className="flex items-center gap-2 text-slate-500 text-sm mb-2">
                <Quote className="w-4 h-4" />
                Citations
              </div>
              <div className="text-3xl font-bold text-slate-900">
                {metrics.totalCitations}
              </div>
            </div>
          </div>

          {/* Trend + Score */}
          <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
            {/* Trend chart */}
            <div className="lg:col-span-2 bg-white border border-slate-200 rounded-xl p-6">
              <h3 className="font-semibold text-slate-900 mb-4">
                Visibility Trend (30 days)
              </h3>
              {metrics.trendData.length > 1 ? (
                <ResponsiveContainer width="100%" height={250}>
                  <LineChart data={metrics.trendData}>
                    <CartesianGrid strokeDasharray="3 3" stroke="#e2e8f0" />
                    <XAxis
                      dataKey="date"
                      tick={{ fontSize: 12 }}
                      tickFormatter={(d) => {
                        const date = new Date(d);
                        return `${date.getMonth() + 1}/${date.getDate()}`;
                      }}
                    />
                    <YAxis
                      domain={[0, 100]}
                      tick={{ fontSize: 12 }}
                      tickFormatter={(v) => `${v}%`}
                    />
                    <Tooltip
                      formatter={(value) => [`${value}%`, "Visibility"]}
                      labelFormatter={(label) =>
                        new Date(String(label)).toLocaleDateString()
                      }
                    />
                    <Line
                      type="monotone"
                      dataKey="score"
                      stroke="#529ec6"
                      strokeWidth={2}
                      dot={{ r: 3 }}
                      activeDot={{ r: 5 }}
                    />
                  </LineChart>
                </ResponsiveContainer>
              ) : (
                <div className="h-[250px] flex items-center justify-center text-slate-400">
                  Need more data points for trend chart
                </div>
              )}
            </div>

            {/* Visibility ring */}
            <div className="bg-white border border-slate-200 rounded-xl p-6 flex flex-col items-center justify-center">
              <VisibilityScore score={metrics.visibilityScore} />
              <p className="text-sm text-slate-500 mt-4 text-center">
                Your brand appears in {metrics.visibilityScore}% of AI
                responses for tracked keywords
              </p>
            </div>
          </div>

          {/* Provider Breakdown + Recent Wins */}
          <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
            {/* Provider breakdown */}
            <div className="bg-white border border-slate-200 rounded-xl p-6">
              <h3 className="font-semibold text-slate-900 mb-4">
                By Provider
              </h3>
              {metrics.providerBreakdown.length > 0 ? (
                <ResponsiveContainer width="100%" height={200}>
                  <BarChart data={metrics.providerBreakdown} layout="vertical">
                    <CartesianGrid strokeDasharray="3 3" stroke="#e2e8f0" />
                    <XAxis
                      type="number"
                      domain={[0, 100]}
                      tickFormatter={(v) => `${v}%`}
                      tick={{ fontSize: 12 }}
                    />
                    <YAxis
                      type="category"
                      dataKey="provider"
                      width={80}
                      tick={{ fontSize: 12 }}
                      tickFormatter={(p) => PROVIDER_LABELS[p] || p}
                    />
                    <Tooltip
                      formatter={(value, _name, props) => [
                        `${value}% (${(props?.payload as Record<string, number>)?.mentions ?? 0}/${(props?.payload as Record<string, number>)?.checks ?? 0})`,
                        "Visibility",
                      ]}
                    />
                    <Bar dataKey="score" radius={[0, 4, 4, 0]}>
                      {metrics.providerBreakdown.map((entry, i) => (
                        <Cell
                          key={i}
                          fill={PROVIDER_COLORS[entry.provider] || "#94a3b8"}
                        />
                      ))}
                    </Bar>
                  </BarChart>
                </ResponsiveContainer>
              ) : (
                <div className="h-[200px] flex items-center justify-center text-slate-400">
                  No provider data yet
                </div>
              )}
            </div>

            {/* Recent wins */}
            <div className="bg-white border border-slate-200 rounded-xl p-6">
              <h3 className="font-semibold text-slate-900 mb-4 flex items-center gap-2">
                <Trophy className="w-4 h-4 text-amber-500" />
                Recent Wins
              </h3>
              {metrics.recentWins.length > 0 ? (
                <div className="space-y-3">
                  {metrics.recentWins.map((win) => (
                    <div
                      key={win.id}
                      className="flex items-center justify-between py-2 border-b border-slate-50 last:border-0"
                    >
                      <div>
                        <p className="text-sm font-medium text-slate-900">
                          {(win.keyword as unknown as { keyword: string })
                            ?.keyword || "Unknown keyword"}
                        </p>
                        <p className="text-xs text-slate-500">
                          {PROVIDER_LABELS[win.llm_provider] || win.llm_provider}{" "}
                          &middot; {WIN_TYPE_LABELS[win.win_type] || win.win_type}
                          {win.rank_position && ` (#${win.rank_position})`}
                        </p>
                      </div>
                      <span className="text-xs text-slate-400">
                        {new Date(win.detected_at).toLocaleDateString()}
                      </span>
                    </div>
                  ))}
                </div>
              ) : (
                <div className="text-center py-8 text-slate-400 text-sm">
                  No wins detected yet. Run a check to get started.
                </div>
              )}
              {metrics.recentWins.length > 0 && (
                <Link
                  href="/growth/keywords"
                  className="mt-4 flex items-center gap-1 text-sm text-[#529ec6] hover:underline"
                >
                  View all keywords
                  <ArrowRight className="w-3 h-3" />
                </Link>
              )}
            </div>
          </div>
        </>
      )}
    </div>
  );
}
