import { createClient } from "@/lib/supabase/server";
import { redirect } from "next/navigation";
import Link from "next/link";
import {
  ArrowLeft,
  Check,
  X,
  ExternalLink,
} from "lucide-react";

const PROVIDER_LABELS: Record<string, string> = {
  openai: "ChatGPT",
  anthropic: "Claude",
  perplexity: "Perplexity",
  google: "Gemini",
};

export default async function SnapshotDetailPage({
  params,
}: {
  params: Promise<{ id: string }>;
}) {
  const { id } = await params;
  const supabase = await createClient();

  const {
    data: { user },
  } = await supabase.auth.getUser();
  if (!user) redirect("/login");

  const { data: snapshot, error } = await supabase
    .from("growth_snapshots")
    .select("*, keyword:growth_keywords(keyword, category)")
    .eq("id", id)
    .single();

  if (error || !snapshot) {
    return (
      <div className="p-8 text-center">
        <p className="text-slate-500">Snapshot not found.</p>
        <Link href="/growth" className="text-[#529ec6] hover:underline mt-2 inline-block">
          Back to dashboard
        </Link>
      </div>
    );
  }

  const keyword = snapshot.keyword as { keyword: string; category: string | null } | null;
  const competitorMentions = (snapshot.competitor_mentions || {}) as Record<
    string,
    { mentioned: boolean; rank: number | null; cited: boolean }
  >;

  return (
    <div className="p-6 lg:p-8 space-y-6 max-w-4xl">
      {/* Header */}
      <div className="flex items-center gap-3">
        <Link
          href="/growth"
          className="p-2 hover:bg-slate-100 rounded-lg transition-colors"
        >
          <ArrowLeft className="w-5 h-5 text-slate-500" />
        </Link>
        <div>
          <h1 className="text-xl font-bold text-slate-900">Snapshot Detail</h1>
          <p className="text-sm text-slate-500">
            {new Date(snapshot.checked_at).toLocaleString()}
          </p>
        </div>
      </div>

      {/* Overview */}
      <div className="bg-white border border-slate-200 rounded-xl p-6">
        <div className="grid grid-cols-2 lg:grid-cols-4 gap-4">
          <div>
            <p className="text-xs text-slate-500 mb-1">Keyword</p>
            <p className="text-sm font-medium text-slate-900">
              {keyword?.keyword || "Unknown"}
            </p>
          </div>
          <div>
            <p className="text-xs text-slate-500 mb-1">Provider</p>
            <p className="text-sm font-medium text-slate-900">
              {PROVIDER_LABELS[snapshot.llm_provider] || snapshot.llm_provider}
            </p>
          </div>
          <div>
            <p className="text-xs text-slate-500 mb-1">Model</p>
            <p className="text-sm font-medium text-slate-900">
              {snapshot.llm_model || "—"}
            </p>
          </div>
          <div>
            <p className="text-xs text-slate-500 mb-1">Tokens</p>
            <p className="text-sm font-medium text-slate-900">
              {snapshot.response_tokens || "—"}
            </p>
          </div>
        </div>
      </div>

      {/* Results */}
      <div className="bg-white border border-slate-200 rounded-xl p-6">
        <h3 className="font-semibold text-slate-900 mb-4">Results</h3>
        <div className="grid grid-cols-3 gap-4">
          <div className="flex items-center gap-3 p-3 rounded-lg bg-slate-50">
            {snapshot.mentioned ? (
              <div className="w-8 h-8 rounded-full bg-emerald-100 flex items-center justify-center">
                <Check className="w-4 h-4 text-emerald-600" />
              </div>
            ) : (
              <div className="w-8 h-8 rounded-full bg-red-100 flex items-center justify-center">
                <X className="w-4 h-4 text-red-500" />
              </div>
            )}
            <div>
              <p className="text-sm font-medium text-slate-900">Mentioned</p>
              <p className="text-xs text-slate-500">
                {snapshot.mentioned ? "Yes" : "No"}
              </p>
            </div>
          </div>
          <div className="flex items-center gap-3 p-3 rounded-lg bg-slate-50">
            <div className="w-8 h-8 rounded-full bg-blue-100 flex items-center justify-center">
              <span className="text-xs font-bold text-blue-600">
                {snapshot.rank_position || "—"}
              </span>
            </div>
            <div>
              <p className="text-sm font-medium text-slate-900">Rank</p>
              <p className="text-xs text-slate-500">
                {snapshot.rank_position ? `#${snapshot.rank_position}` : "Not ranked"}
              </p>
            </div>
          </div>
          <div className="flex items-center gap-3 p-3 rounded-lg bg-slate-50">
            {snapshot.cited_as_source ? (
              <div className="w-8 h-8 rounded-full bg-emerald-100 flex items-center justify-center">
                <ExternalLink className="w-4 h-4 text-emerald-600" />
              </div>
            ) : (
              <div className="w-8 h-8 rounded-full bg-slate-200 flex items-center justify-center">
                <ExternalLink className="w-4 h-4 text-slate-400" />
              </div>
            )}
            <div>
              <p className="text-sm font-medium text-slate-900">Cited</p>
              <p className="text-xs text-slate-500">
                {snapshot.cited_as_source ? "Yes" : "No"}
              </p>
            </div>
          </div>
        </div>
      </div>

      {/* Competitor mentions */}
      {Object.keys(competitorMentions).length > 0 && (
        <div className="bg-white border border-slate-200 rounded-xl p-6">
          <h3 className="font-semibold text-slate-900 mb-4">
            Competitor Mentions
          </h3>
          <div className="divide-y divide-slate-100">
            {Object.entries(competitorMentions).map(([name, data]) => (
              <div
                key={name}
                className="flex items-center justify-between py-3"
              >
                <span className="text-sm font-medium text-slate-900">
                  {name}
                </span>
                <div className="flex items-center gap-4 text-sm">
                  <span
                    className={
                      data.mentioned ? "text-emerald-600" : "text-slate-400"
                    }
                  >
                    {data.mentioned ? "Mentioned" : "Not mentioned"}
                  </span>
                  {data.rank && (
                    <span className="text-blue-600">#{data.rank}</span>
                  )}
                </div>
              </div>
            ))}
          </div>
        </div>
      )}

      {/* Prompt */}
      <div className="bg-white border border-slate-200 rounded-xl p-6">
        <h3 className="font-semibold text-slate-900 mb-3">Prompt Used</h3>
        <p className="text-sm text-slate-600 bg-slate-50 rounded-lg p-4">
          {snapshot.prompt_used}
        </p>
      </div>

      {/* Raw Response */}
      <div className="bg-white border border-slate-200 rounded-xl p-6">
        <h3 className="font-semibold text-slate-900 mb-3">Raw Response</h3>
        <pre className="text-sm text-slate-600 bg-slate-50 rounded-lg p-4 whitespace-pre-wrap max-h-[500px] overflow-y-auto font-mono">
          {snapshot.raw_response || "No response stored"}
        </pre>
      </div>
    </div>
  );
}
