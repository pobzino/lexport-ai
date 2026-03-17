"use client";

import { useState } from "react";
import { Rocket, Loader2, Plus, X } from "lucide-react";

interface GrowthSetupProps {
  onComplete: () => void;
}

export function GrowthSetup({ onComplete }: GrowthSetupProps) {
  const [brandName, setBrandName] = useState("Lexport");
  const [domain, setDomain] = useState("lexportai.com");
  const [aliasInput, setAliasInput] = useState("Lexport AI");
  const [keywordInputs, setKeywordInputs] = useState([
    "best contract generator",
    "AI legal tools",
    "NDA generator",
    "freelance contract maker",
    "e-signature platform",
  ]);
  const [competitorInputs, setCompetitorInputs] = useState([
    "DocuSign",
    "PandaDoc",
    "HelloSign",
  ]);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const addKeyword = () => setKeywordInputs([...keywordInputs, ""]);
  const removeKeyword = (i: number) =>
    setKeywordInputs(keywordInputs.filter((_, idx) => idx !== i));
  const updateKeyword = (i: number, val: string) => {
    const next = [...keywordInputs];
    next[i] = val;
    setKeywordInputs(next);
  };

  const addCompetitor = () => setCompetitorInputs([...competitorInputs, ""]);
  const removeCompetitor = (i: number) =>
    setCompetitorInputs(competitorInputs.filter((_, idx) => idx !== i));
  const updateCompetitor = (i: number, val: string) => {
    const next = [...competitorInputs];
    next[i] = val;
    setCompetitorInputs(next);
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setLoading(true);
    setError(null);

    try {
      // Create brand
      const brandRes = await fetch("/api/growth/brands", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          name: brandName.trim(),
          domain: domain.trim(),
          aliases: aliasInput
            .split(",")
            .map((a) => a.trim())
            .filter(Boolean),
        }),
      });
      const brandData = await brandRes.json();
      if (!brandRes.ok) throw new Error(brandData.error);

      const brandId = brandData.brand.id;

      // Create keywords
      const validKeywords = keywordInputs
        .map((k) => k.trim())
        .filter(Boolean);
      for (const keyword of validKeywords) {
        await fetch("/api/growth/keywords", {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({ brand_id: brandId, keyword }),
        });
      }

      // Create competitors
      const validCompetitors = competitorInputs
        .map((c) => c.trim())
        .filter(Boolean);
      for (const name of validCompetitors) {
        await fetch("/api/growth/competitors", {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({ brand_id: brandId, name }),
        });
      }

      onComplete();
    } catch (err) {
      setError(err instanceof Error ? err.message : "Setup failed");
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="max-w-2xl mx-auto">
      <div className="text-center mb-8">
        <div className="w-16 h-16 bg-[#529ec6]/10 rounded-2xl flex items-center justify-center mx-auto mb-4">
          <Rocket className="w-8 h-8 text-[#529ec6]" />
        </div>
        <h2 className="text-2xl font-bold text-slate-900 mb-2">
          Set Up AI Visibility Tracking
        </h2>
        <p className="text-slate-600">
          Track how often your brand appears in AI-generated responses across
          ChatGPT, Claude, and Perplexity.
        </p>
      </div>

      {error && (
        <div className="mb-6 bg-red-50 border border-red-200 rounded-lg p-4 text-sm text-red-800">
          {error}
        </div>
      )}

      <form onSubmit={handleSubmit} className="space-y-6">
        {/* Brand Info */}
        <div className="bg-white border border-slate-200 rounded-xl p-6 space-y-4">
          <h3 className="font-semibold text-slate-900">Your Brand</h3>
          <div className="grid grid-cols-2 gap-4">
            <div>
              <label className="block text-sm font-medium text-slate-700 mb-1">
                Brand Name
              </label>
              <input
                type="text"
                value={brandName}
                onChange={(e) => setBrandName(e.target.value)}
                required
                className="w-full px-3 py-2 border border-slate-200 rounded-lg focus:ring-2 focus:ring-[#529ec6] focus:border-transparent"
              />
            </div>
            <div>
              <label className="block text-sm font-medium text-slate-700 mb-1">
                Domain
              </label>
              <input
                type="text"
                value={domain}
                onChange={(e) => setDomain(e.target.value)}
                className="w-full px-3 py-2 border border-slate-200 rounded-lg focus:ring-2 focus:ring-[#529ec6] focus:border-transparent"
              />
            </div>
          </div>
          <div>
            <label className="block text-sm font-medium text-slate-700 mb-1">
              Aliases (comma-separated)
            </label>
            <input
              type="text"
              value={aliasInput}
              onChange={(e) => setAliasInput(e.target.value)}
              placeholder="Brand AI, brand.io"
              className="w-full px-3 py-2 border border-slate-200 rounded-lg focus:ring-2 focus:ring-[#529ec6] focus:border-transparent"
            />
          </div>
        </div>

        {/* Keywords */}
        <div className="bg-white border border-slate-200 rounded-xl p-6 space-y-3">
          <div className="flex items-center justify-between">
            <h3 className="font-semibold text-slate-900">
              Keywords to Track
            </h3>
            <button
              type="button"
              onClick={addKeyword}
              className="text-sm text-[#529ec6] hover:underline flex items-center gap-1"
            >
              <Plus className="w-3 h-3" /> Add
            </button>
          </div>
          {keywordInputs.map((kw, i) => (
            <div key={i} className="flex gap-2">
              <input
                type="text"
                value={kw}
                onChange={(e) => updateKeyword(i, e.target.value)}
                placeholder="e.g. best contract generator"
                className="flex-1 px-3 py-2 border border-slate-200 rounded-lg focus:ring-2 focus:ring-[#529ec6] focus:border-transparent text-sm"
              />
              {keywordInputs.length > 1 && (
                <button
                  type="button"
                  onClick={() => removeKeyword(i)}
                  className="p-2 text-slate-400 hover:text-red-500"
                >
                  <X className="w-4 h-4" />
                </button>
              )}
            </div>
          ))}
        </div>

        {/* Competitors */}
        <div className="bg-white border border-slate-200 rounded-xl p-6 space-y-3">
          <div className="flex items-center justify-between">
            <h3 className="font-semibold text-slate-900">Competitors</h3>
            <button
              type="button"
              onClick={addCompetitor}
              className="text-sm text-[#529ec6] hover:underline flex items-center gap-1"
            >
              <Plus className="w-3 h-3" /> Add
            </button>
          </div>
          {competitorInputs.map((comp, i) => (
            <div key={i} className="flex gap-2">
              <input
                type="text"
                value={comp}
                onChange={(e) => updateCompetitor(i, e.target.value)}
                placeholder="e.g. DocuSign"
                className="flex-1 px-3 py-2 border border-slate-200 rounded-lg focus:ring-2 focus:ring-[#529ec6] focus:border-transparent text-sm"
              />
              {competitorInputs.length > 1 && (
                <button
                  type="button"
                  onClick={() => removeCompetitor(i)}
                  className="p-2 text-slate-400 hover:text-red-500"
                >
                  <X className="w-4 h-4" />
                </button>
              )}
            </div>
          ))}
        </div>

        <button
          type="submit"
          disabled={loading || !brandName.trim()}
          className="w-full flex items-center justify-center gap-2 bg-[#202e46] text-white px-6 py-3 rounded-xl font-semibold hover:bg-[#1a2539] transition-colors disabled:opacity-50"
        >
          {loading ? (
            <>
              <Loader2 className="w-4 h-4 animate-spin" />
              Setting up...
            </>
          ) : (
            <>
              <Rocket className="w-4 h-4" />
              Start Tracking
            </>
          )}
        </button>
      </form>
    </div>
  );
}
