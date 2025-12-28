"use client";

import { useState, useEffect, useCallback } from "react";
import { useRouter } from "next/navigation";
import {
  Search,
  Filter,
  FileStack,
  Plus,
  X,
  Sparkles,
} from "lucide-react";
import { TemplateCard, TemplateCardSkeleton } from "./TemplateCard";
import type { Template } from "@/db/types";

// Contract types for filtering
const CONTRACT_TYPES = [
  { value: "", label: "All Types" },
  { value: "nda_mutual", label: "Mutual NDA" },
  { value: "nda_one_way", label: "One-Way NDA" },
  { value: "independent_contractor", label: "Contractor" },
  { value: "consulting_agreement", label: "Consulting" },
  { value: "safe_note", label: "SAFE Note" },
  { value: "freelance_service", label: "Freelance" },
];

// Jurisdictions for filtering
const JURISDICTIONS = [
  { value: "", label: "All Jurisdictions" },
  { value: "us_california", label: "California" },
  { value: "us_texas", label: "Texas" },
  { value: "us_new_york", label: "New York" },
  { value: "uk", label: "United Kingdom" },
];

interface TemplateLibraryProps {
  userId?: string;
  onSelect?: (template: Template) => void;
  showCreateButton?: boolean;
  compact?: boolean;
}

export function TemplateLibrary({
  userId,
  onSelect,
  showCreateButton = true,
  compact = false,
}: TemplateLibraryProps) {
  const router = useRouter();
  const [templates, setTemplates] = useState<Template[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  // Filters
  const [search, setSearch] = useState("");
  const [typeFilter, setTypeFilter] = useState("");
  const [jurisdictionFilter, setJurisdictionFilter] = useState("");
  const [publicFilter, setPublicFilter] = useState<"all" | "true" | "false">("all");

  // Fetch templates
  const fetchTemplates = useCallback(async () => {
    setLoading(true);
    setError(null);

    try {
      const params = new URLSearchParams();
      if (search) params.set("search", search);
      if (typeFilter) params.set("type", typeFilter);
      if (jurisdictionFilter) params.set("jurisdiction", jurisdictionFilter);
      params.set("public", publicFilter);

      const response = await fetch(`/api/templates?${params}`);
      if (!response.ok) throw new Error("Failed to fetch templates");

      const data = await response.json();
      setTemplates(data.templates || []);
    } catch (err) {
      console.error("Error fetching templates:", err);
      setError("Failed to load templates");
    } finally {
      setLoading(false);
    }
  }, [search, typeFilter, jurisdictionFilter, publicFilter]);

  useEffect(() => {
    const debounce = setTimeout(fetchTemplates, 300);
    return () => clearTimeout(debounce);
  }, [fetchTemplates]);

  // Handlers
  const handleEdit = (template: Template) => {
    router.push(`/templates/${template.id}`);
  };

  const handleDelete = async (template: Template) => {
    if (!confirm(`Delete "${template.name}"? This cannot be undone.`)) return;

    try {
      const response = await fetch(`/api/templates/${template.id}`, {
        method: "DELETE",
      });
      if (response.ok) {
        setTemplates((prev) => prev.filter((t) => t.id !== template.id));
      }
    } catch (err) {
      console.error("Error deleting template:", err);
    }
  };

  const clearFilters = () => {
    setSearch("");
    setTypeFilter("");
    setJurisdictionFilter("");
    setPublicFilter("all");
  };

  const hasFilters = search || typeFilter || jurisdictionFilter || publicFilter !== "all";

  return (
    <div className="space-y-4">
      {/* Search and Filters */}
      <div className={`flex flex-col sm:flex-row gap-3 ${compact ? "" : "mb-6"}`}>
        {/* Search */}
        <div className="relative flex-1">
          <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-slate-400" />
          <input
            type="text"
            placeholder="Search templates..."
            value={search}
            onChange={(e) => setSearch(e.target.value)}
            className="w-full pl-10 pr-4 py-2 border border-slate-200 rounded-lg text-sm focus:outline-none focus:ring-2 focus:ring-violet-500/20 focus:border-violet-500"
          />
        </div>

        {/* Filters */}
        <div className="flex gap-2">
          <select
            value={typeFilter}
            onChange={(e) => setTypeFilter(e.target.value)}
            className="px-3 py-2 border border-slate-200 rounded-lg text-sm focus:outline-none focus:ring-2 focus:ring-violet-500/20 focus:border-violet-500"
          >
            {CONTRACT_TYPES.map((type) => (
              <option key={type.value} value={type.value}>
                {type.label}
              </option>
            ))}
          </select>

          <select
            value={jurisdictionFilter}
            onChange={(e) => setJurisdictionFilter(e.target.value)}
            className="px-3 py-2 border border-slate-200 rounded-lg text-sm focus:outline-none focus:ring-2 focus:ring-violet-500/20 focus:border-violet-500"
          >
            {JURISDICTIONS.map((j) => (
              <option key={j.value} value={j.value}>
                {j.label}
              </option>
            ))}
          </select>

          {!compact && (
            <div className="flex rounded-lg border border-slate-200 overflow-hidden">
              <button
                onClick={() => setPublicFilter("all")}
                className={`px-3 py-2 text-sm font-medium transition-colors ${
                  publicFilter === "all"
                    ? "bg-violet-100 text-violet-700"
                    : "bg-white text-slate-600 hover:bg-slate-50"
                }`}
              >
                All
              </button>
              <button
                onClick={() => setPublicFilter("false")}
                className={`px-3 py-2 text-sm font-medium transition-colors border-l border-slate-200 ${
                  publicFilter === "false"
                    ? "bg-violet-100 text-violet-700"
                    : "bg-white text-slate-600 hover:bg-slate-50"
                }`}
              >
                My Templates
              </button>
              <button
                onClick={() => setPublicFilter("true")}
                className={`px-3 py-2 text-sm font-medium transition-colors border-l border-slate-200 ${
                  publicFilter === "true"
                    ? "bg-violet-100 text-violet-700"
                    : "bg-white text-slate-600 hover:bg-slate-50"
                }`}
              >
                Public
              </button>
            </div>
          )}

          {hasFilters && (
            <button
              onClick={clearFilters}
              className="flex items-center gap-1 px-3 py-2 text-sm text-slate-600 hover:bg-slate-100 rounded-lg transition-colors"
            >
              <X className="w-4 h-4" />
              Clear
            </button>
          )}
        </div>
      </div>

      {/* Loading State */}
      {loading && (
        <div className={`grid gap-4 ${compact ? "grid-cols-1" : "grid-cols-1 md:grid-cols-2 lg:grid-cols-3"}`}>
          {[...Array(6)].map((_, i) => (
            <TemplateCardSkeleton key={i} />
          ))}
        </div>
      )}

      {/* Error State */}
      {error && !loading && (
        <div className="text-center py-12">
          <p className="text-red-600 mb-4">{error}</p>
          <button
            onClick={fetchTemplates}
            className="px-4 py-2 text-sm bg-slate-100 text-slate-700 rounded-lg hover:bg-slate-200 transition-colors"
          >
            Try Again
          </button>
        </div>
      )}

      {/* Empty State */}
      {!loading && !error && templates.length === 0 && (
        <div className="text-center py-12 bg-slate-50 rounded-xl border border-slate-200">
          <div className="w-16 h-16 bg-slate-100 rounded-full flex items-center justify-center mx-auto mb-4">
            <FileStack className="w-8 h-8 text-slate-400" />
          </div>
          <h3 className="text-lg font-semibold text-slate-900 mb-2">
            {hasFilters ? "No templates match your filters" : "No templates yet"}
          </h3>
          <p className="text-slate-500 mb-4 max-w-md mx-auto">
            {hasFilters
              ? "Try adjusting your search or filters to find what you're looking for."
              : "Generate a template with AI or save a contract as a reusable template."}
          </p>
          {hasFilters ? (
            <button
              onClick={clearFilters}
              className="px-4 py-2 text-sm bg-slate-100 text-slate-700 rounded-lg hover:bg-slate-200 transition-colors"
            >
              Clear Filters
            </button>
          ) : (
            showCreateButton && (
              <div className="flex gap-3">
                <button
                  onClick={() => router.push("/templates/generate")}
                  className="inline-flex items-center gap-2 px-4 py-2 text-sm font-medium text-white bg-violet-600 rounded-lg hover:bg-violet-700 transition-colors"
                >
                  <Sparkles className="w-4 h-4" />
                  Generate with AI
                </button>
                <button
                  onClick={() => router.push("/contracts/new")}
                  className="inline-flex items-center gap-2 px-4 py-2 text-sm font-medium text-slate-700 bg-slate-100 rounded-lg hover:bg-slate-200 transition-colors"
                >
                  <Plus className="w-4 h-4" />
                  Create Contract
                </button>
              </div>
            )
          )}
        </div>
      )}

      {/* Templates Grid */}
      {!loading && !error && templates.length > 0 && (
        <div className={`grid gap-4 ${compact ? "grid-cols-1" : "grid-cols-1 md:grid-cols-2 lg:grid-cols-3"}`}>
          {templates.map((template) => (
            <TemplateCard
              key={template.id}
              template={template}
              isOwner={template.created_by_id === userId}
              onUse={onSelect}
              onEdit={handleEdit}
              onDelete={handleDelete}
            />
          ))}
        </div>
      )}
    </div>
  );
}
