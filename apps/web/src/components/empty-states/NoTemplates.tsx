"use client";

import Link from "next/link";
import { FileStack, Plus, Sparkles } from "lucide-react";

interface NoTemplatesProps {
  showCta?: boolean;
  title?: string;
  description?: string;
  variant?: "default" | "filtered";
  onClearFilters?: () => void;
}

export function NoTemplates({
  showCta = true,
  title,
  description,
  variant = "default",
  onClearFilters,
}: NoTemplatesProps) {
  if (variant === "filtered") {
    return (
      <div className="text-center py-12 bg-slate-50 rounded-xl border border-slate-200">
        <div className="w-16 h-16 bg-slate-100 rounded-full flex items-center justify-center mx-auto mb-4">
          <FileStack className="w-8 h-8 text-slate-400" />
        </div>
        <h3 className="text-lg font-semibold text-slate-900 mb-2">
          {title || "No templates match your filters"}
        </h3>
        <p className="text-slate-500 mb-4 max-w-md mx-auto">
          {description || "Try adjusting your search or filters to find what you're looking for."}
        </p>
        {onClearFilters && (
          <button
            onClick={onClearFilters}
            className="px-4 py-2 text-sm bg-slate-100 text-slate-700 rounded-lg hover:bg-slate-200 transition-colors"
          >
            Clear Filters
          </button>
        )}
      </div>
    );
  }

  return (
    <div className="text-center py-16 px-6 bg-slate-50 rounded-xl border border-slate-200">
      {/* Illustration */}
      <div className="relative w-24 h-24 mx-auto mb-6">
        <div className="absolute inset-0 bg-gradient-to-br from-[#529ec6]/20 to-[#202e46]/20 rounded-full" />
        <div className="absolute inset-2 bg-white rounded-full flex items-center justify-center shadow-sm">
          <FileStack className="w-10 h-10 text-[#529ec6]" />
        </div>
        {/* Decorative stacked papers effect */}
        <div className="absolute -top-2 left-1/2 -translate-x-1/2 w-16 h-2 bg-[#529ec6]/10 rounded-t-sm" />
        <div className="absolute -top-4 left-1/2 -translate-x-1/2 w-12 h-2 bg-[#529ec6]/5 rounded-t-sm" />
      </div>

      <h3 className="text-xl font-semibold text-slate-900 mb-2">
        {title || "No templates yet"}
      </h3>
      <p className="text-slate-500 mb-8 max-w-md mx-auto">
        {description || "Templates help you create contracts faster. Generate one with AI or save a contract as a reusable template."}
      </p>

      {showCta && (
        <div className="flex flex-col sm:flex-row items-center justify-center gap-3">
          <Link
            href="/my-templates/generate"
            className="inline-flex items-center gap-2 px-6 py-3 bg-[#202e46] text-white rounded-lg hover:bg-[#1a2539] transition-colors font-medium"
          >
            <Sparkles className="w-4 h-4" />
            Generate with AI
          </Link>
          <Link
            href="/contracts/new"
            className="inline-flex items-center gap-2 px-6 py-3 border border-slate-300 text-slate-700 rounded-lg hover:bg-slate-50 transition-colors font-medium"
          >
            <Plus className="w-4 h-4" />
            Create Contract
          </Link>
        </div>
      )}
    </div>
  );
}
