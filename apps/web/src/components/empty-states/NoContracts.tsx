"use client";

import Link from "next/link";
import { FileText, Plus, Upload, Sparkles } from "lucide-react";

interface NoContractsProps {
  showCta?: boolean;
  title?: string;
  description?: string;
  variant?: "default" | "filtered";
  onClearFilters?: () => void;
}

export function NoContracts({
  showCta = true,
  title,
  description,
  variant = "default",
  onClearFilters,
}: NoContractsProps) {
  if (variant === "filtered") {
    return (
      <div className="text-center py-12">
        <div className="w-16 h-16 bg-slate-100 rounded-full flex items-center justify-center mx-auto mb-4">
          <FileText className="w-8 h-8 text-slate-400" />
        </div>
        <h3 className="text-lg font-medium text-slate-900 mb-2">
          {title || "No matching contracts"}
        </h3>
        <p className="text-slate-500 mb-4 max-w-sm mx-auto">
          {description || "Try adjusting your search or filters to find what you're looking for."}
        </p>
        {onClearFilters && (
          <button
            onClick={onClearFilters}
            className="text-[#529ec6] hover:text-[#3d7a9e] font-medium"
          >
            Clear all filters
          </button>
        )}
      </div>
    );
  }

  return (
    <div className="text-center py-16 px-6">
      {/* Illustration */}
      <div className="relative w-24 h-24 mx-auto mb-6">
        <div className="absolute inset-0 bg-gradient-to-br from-[#529ec6]/20 to-[#202e46]/20 rounded-full" />
        <div className="absolute inset-2 bg-white rounded-full flex items-center justify-center shadow-sm">
          <FileText className="w-10 h-10 text-[#529ec6]" />
        </div>
        {/* Decorative elements */}
        <div className="absolute -top-1 -right-1 w-6 h-6 bg-[#529ec6]/10 rounded-full flex items-center justify-center">
          <Plus className="w-3 h-3 text-[#529ec6]" />
        </div>
        <div className="absolute -bottom-1 -left-1 w-5 h-5 bg-[#202e46]/10 rounded-full" />
      </div>

      <h3 className="text-xl font-semibold text-slate-900 mb-2">
        {title || "No contracts yet"}
      </h3>
      <p className="text-slate-500 mb-8 max-w-md mx-auto">
        {description || "Create your first contract using our AI-powered generator or upload an existing document to get started."}
      </p>

      {showCta && (
        <div className="flex flex-col sm:flex-row items-center justify-center gap-3">
          <Link
            href="/contracts/new"
            className="inline-flex items-center gap-2 px-6 py-3 bg-[#202e46] text-white rounded-lg hover:bg-[#1a2539] transition-colors font-medium"
          >
            <Sparkles className="w-4 h-4" />
            Create with AI
          </Link>
          <Link
            href="/contracts/upload"
            className="inline-flex items-center gap-2 px-6 py-3 border border-slate-300 text-slate-700 rounded-lg hover:bg-slate-50 transition-colors font-medium"
          >
            <Upload className="w-4 h-4" />
            Upload Contract
          </Link>
        </div>
      )}
    </div>
  );
}
