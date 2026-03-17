"use client";

import { useState, useEffect, useCallback } from "react";
import Link from "next/link";
import {
  ArrowLeft,
  Plus,
  Trash2,
  Play,
  Loader2,
  Search,
} from "lucide-react";
import type { GrowthBrand, GrowthKeyword, GrowthCompetitor } from "@/types/growth";

export default function GrowthKeywordsPage() {
  const [brand, setBrand] = useState<GrowthBrand | null>(null);
  const [keywords, setKeywords] = useState<GrowthKeyword[]>([]);
  const [competitors, setCompetitors] = useState<GrowthCompetitor[]>([]);
  const [loading, setLoading] = useState(true);
  const [newKeyword, setNewKeyword] = useState("");
  const [newCategory, setNewCategory] = useState("");
  const [newCompetitor, setNewCompetitor] = useState("");
  const [addingKeyword, setAddingKeyword] = useState(false);
  const [addingCompetitor, setAddingCompetitor] = useState(false);
  const [analyzingId, setAnalyzingId] = useState<string | null>(null);

  const fetchData = useCallback(async () => {
    setLoading(true);
    try {
      const brandRes = await fetch("/api/growth/brands");
      const brandData = await brandRes.json();
      if (!brandData.brands?.length) return;
      const b = brandData.brands[0];
      setBrand(b);

      const [kwRes, compRes] = await Promise.all([
        fetch(`/api/growth/keywords?brand_id=${b.id}`),
        fetch(`/api/growth/competitors?brand_id=${b.id}`),
      ]);
      const kwData = await kwRes.json();
      const compData = await compRes.json();
      setKeywords(kwData.keywords || []);
      setCompetitors(compData.competitors || []);
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => {
    fetchData();
  }, [fetchData]);

  const addKeyword = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!brand || !newKeyword.trim()) return;
    setAddingKeyword(true);
    try {
      const res = await fetch("/api/growth/keywords", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          brand_id: brand.id,
          keyword: newKeyword.trim(),
          category: newCategory.trim() || null,
        }),
      });
      const data = await res.json();
      if (res.ok) {
        setKeywords([data.keyword, ...keywords]);
        setNewKeyword("");
        setNewCategory("");
      } else {
        alert(data.error);
      }
    } finally {
      setAddingKeyword(false);
    }
  };

  const deleteKeyword = async (id: string) => {
    if (!confirm("Delete this keyword?")) return;
    await fetch("/api/growth/keywords", {
      method: "DELETE",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ id }),
    });
    setKeywords(keywords.filter((k) => k.id !== id));
  };

  const analyzeKeyword = async (keywordId: string) => {
    if (!brand) return;
    setAnalyzingId(keywordId);
    try {
      const res = await fetch("/api/growth/analyze", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ brand_id: brand.id, keyword_id: keywordId }),
      });
      const data = await res.json();
      if (!res.ok) alert(data.error);
      else alert(`Done! ${data.snapshots} checks, ${data.wins} wins`);
    } finally {
      setAnalyzingId(null);
    }
  };

  const addCompetitor = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!brand || !newCompetitor.trim()) return;
    setAddingCompetitor(true);
    try {
      const res = await fetch("/api/growth/competitors", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          brand_id: brand.id,
          name: newCompetitor.trim(),
        }),
      });
      const data = await res.json();
      if (res.ok) {
        setCompetitors([data.competitor, ...competitors]);
        setNewCompetitor("");
      } else {
        alert(data.error);
      }
    } finally {
      setAddingCompetitor(false);
    }
  };

  const deleteCompetitor = async (id: string) => {
    if (!confirm("Remove this competitor?")) return;
    await fetch("/api/growth/competitors", {
      method: "DELETE",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ id }),
    });
    setCompetitors(competitors.filter((c) => c.id !== id));
  };

  if (loading) {
    return (
      <div className="flex items-center justify-center min-h-[60vh]">
        <Loader2 className="w-8 h-8 animate-spin text-slate-400" />
      </div>
    );
  }

  return (
    <div className="p-6 lg:p-8 space-y-6">
      {/* Header */}
      <div className="flex items-center gap-3">
        <Link
          href="/growth"
          className="p-2 hover:bg-slate-100 rounded-lg transition-colors"
        >
          <ArrowLeft className="w-5 h-5 text-slate-500" />
        </Link>
        <div>
          <h1 className="text-xl font-bold text-slate-900">
            Keywords &amp; Competitors
          </h1>
          <p className="text-sm text-slate-500">
            Manage what you&apos;re tracking for &ldquo;{brand?.name}&rdquo;
          </p>
        </div>
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
        {/* Keywords (2/3) */}
        <div className="lg:col-span-2 space-y-4">
          <div className="bg-white border border-slate-200 rounded-xl p-6">
            <h3 className="font-semibold text-slate-900 mb-4 flex items-center gap-2">
              <Search className="w-4 h-4 text-slate-400" />
              Tracked Keywords ({keywords.length})
            </h3>

            {/* Add keyword form */}
            <form onSubmit={addKeyword} className="flex gap-2 mb-4">
              <input
                type="text"
                value={newKeyword}
                onChange={(e) => setNewKeyword(e.target.value)}
                placeholder="Add a keyword..."
                className="flex-1 px-3 py-2 border border-slate-200 rounded-lg text-sm focus:ring-2 focus:ring-[#529ec6] focus:border-transparent"
              />
              <input
                type="text"
                value={newCategory}
                onChange={(e) => setNewCategory(e.target.value)}
                placeholder="Category"
                className="w-32 px-3 py-2 border border-slate-200 rounded-lg text-sm focus:ring-2 focus:ring-[#529ec6] focus:border-transparent"
              />
              <button
                type="submit"
                disabled={addingKeyword || !newKeyword.trim()}
                className="flex items-center gap-1.5 px-4 py-2 bg-[#202e46] text-white rounded-lg text-sm font-medium hover:bg-[#1a2539] disabled:opacity-50"
              >
                {addingKeyword ? (
                  <Loader2 className="w-3 h-3 animate-spin" />
                ) : (
                  <Plus className="w-3 h-3" />
                )}
                Add
              </button>
            </form>

            {/* Keywords list */}
            <div className="divide-y divide-slate-100">
              {keywords.map((kw) => (
                <div
                  key={kw.id}
                  className="flex items-center justify-between py-3"
                >
                  <div>
                    <span className="text-sm font-medium text-slate-900">
                      {kw.keyword}
                    </span>
                    {kw.category && (
                      <span className="ml-2 text-xs bg-slate-100 text-slate-500 px-2 py-0.5 rounded-full">
                        {kw.category}
                      </span>
                    )}
                  </div>
                  <div className="flex items-center gap-2">
                    <span
                      className={`w-2 h-2 rounded-full ${
                        kw.is_active ? "bg-emerald-400" : "bg-slate-300"
                      }`}
                    />
                    <button
                      onClick={() => analyzeKeyword(kw.id)}
                      disabled={analyzingId === kw.id}
                      className="p-1.5 text-slate-400 hover:text-[#529ec6] hover:bg-[#529ec6]/10 rounded transition-colors disabled:opacity-50"
                      title="Run check"
                    >
                      {analyzingId === kw.id ? (
                        <Loader2 className="w-4 h-4 animate-spin" />
                      ) : (
                        <Play className="w-4 h-4" />
                      )}
                    </button>
                    <button
                      onClick={() => deleteKeyword(kw.id)}
                      className="p-1.5 text-slate-400 hover:text-red-500 hover:bg-red-50 rounded transition-colors"
                      title="Delete"
                    >
                      <Trash2 className="w-4 h-4" />
                    </button>
                  </div>
                </div>
              ))}
              {keywords.length === 0 && (
                <p className="py-8 text-center text-sm text-slate-400">
                  No keywords yet. Add one above.
                </p>
              )}
            </div>
          </div>
        </div>

        {/* Competitors (1/3) */}
        <div className="space-y-4">
          <div className="bg-white border border-slate-200 rounded-xl p-6">
            <h3 className="font-semibold text-slate-900 mb-4">
              Competitors ({competitors.length})
            </h3>

            <form onSubmit={addCompetitor} className="flex gap-2 mb-4">
              <input
                type="text"
                value={newCompetitor}
                onChange={(e) => setNewCompetitor(e.target.value)}
                placeholder="Add competitor..."
                className="flex-1 px-3 py-2 border border-slate-200 rounded-lg text-sm focus:ring-2 focus:ring-[#529ec6] focus:border-transparent"
              />
              <button
                type="submit"
                disabled={addingCompetitor || !newCompetitor.trim()}
                className="p-2 bg-[#202e46] text-white rounded-lg hover:bg-[#1a2539] disabled:opacity-50"
              >
                {addingCompetitor ? (
                  <Loader2 className="w-4 h-4 animate-spin" />
                ) : (
                  <Plus className="w-4 h-4" />
                )}
              </button>
            </form>

            <div className="space-y-2">
              {competitors.map((comp) => (
                <div
                  key={comp.id}
                  className="flex items-center justify-between py-2"
                >
                  <span className="text-sm text-slate-700">{comp.name}</span>
                  <button
                    onClick={() => deleteCompetitor(comp.id)}
                    className="p-1 text-slate-400 hover:text-red-500"
                  >
                    <Trash2 className="w-3.5 h-3.5" />
                  </button>
                </div>
              ))}
              {competitors.length === 0 && (
                <p className="py-4 text-center text-sm text-slate-400">
                  No competitors tracked.
                </p>
              )}
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}
