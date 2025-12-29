"use client";

import { FileText, Sparkles, Check } from "lucide-react";
import { motion } from "framer-motion";

interface ModeSelectorProps {
  selectedMode: "quick" | "full" | null;
  onModeSelect: (mode: "quick" | "full") => void;
  disabled?: boolean;
}

export function ModeSelector({
  selectedMode,
  onModeSelect,
  disabled = false,
}: ModeSelectorProps) {
  return (
    <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
      {/* Quick Mode */}
      <button
        onClick={() => onModeSelect("quick")}
        disabled={disabled}
        className={`
          relative flex flex-col items-start p-6 rounded-2xl border-2 text-left
          transition-all duration-200
          ${
            selectedMode === "quick"
              ? "border-[#529ec6] bg-[#529ec6]/5"
              : "border-slate-200 hover:border-slate-300 hover:bg-slate-50"
          }
          ${disabled ? "opacity-50 cursor-not-allowed" : "cursor-pointer"}
        `}
      >
        {selectedMode === "quick" && (
          <motion.div
            initial={{ scale: 0 }}
            animate={{ scale: 1 }}
            className="absolute top-4 right-4 w-6 h-6 rounded-full bg-[#529ec6] flex items-center justify-center"
          >
            <Check className="w-4 h-4 text-white" />
          </motion.div>
        )}

        <div
          className={`
            w-12 h-12 rounded-xl flex items-center justify-center mb-4
            ${selectedMode === "quick" ? "bg-[#529ec6]/20" : "bg-slate-100"}
          `}
        >
          <FileText
            className={`w-6 h-6 ${
              selectedMode === "quick" ? "text-[#529ec6]" : "text-slate-500"
            }`}
          />
        </div>

        <h3 className="text-lg font-semibold text-slate-900 mb-2">Quick Mode</h3>
        <p className="text-sm text-slate-500 mb-4">
          Keep your original document layout intact. Perfect for when you want to
          add signature fields while preserving the exact formatting.
        </p>

        <div className="space-y-2">
          <div className="flex items-center gap-2 text-sm text-slate-600">
            <Check className="w-4 h-4 text-emerald-500" />
            <span>Preserve original PDF layout</span>
          </div>
          <div className="flex items-center gap-2 text-sm text-slate-600">
            <Check className="w-4 h-4 text-emerald-500" />
            <span>Visual signature field placement</span>
          </div>
          <div className="flex items-center gap-2 text-sm text-slate-600">
            <Check className="w-4 h-4 text-emerald-500" />
            <span>AI risk analysis included</span>
          </div>
        </div>

        <div className="mt-4 px-3 py-1.5 bg-emerald-50 text-emerald-700 text-xs font-medium rounded-full">
          Recommended for most contracts
        </div>
      </button>

      {/* Full Mode */}
      <button
        onClick={() => onModeSelect("full")}
        disabled={disabled}
        className={`
          relative flex flex-col items-start p-6 rounded-2xl border-2 text-left
          transition-all duration-200
          ${
            selectedMode === "full"
              ? "border-[#529ec6] bg-[#529ec6]/5"
              : "border-slate-200 hover:border-slate-300 hover:bg-slate-50"
          }
          ${disabled ? "opacity-50 cursor-not-allowed" : "cursor-pointer"}
        `}
      >
        {selectedMode === "full" && (
          <motion.div
            initial={{ scale: 0 }}
            animate={{ scale: 1 }}
            className="absolute top-4 right-4 w-6 h-6 rounded-full bg-[#529ec6] flex items-center justify-center"
          >
            <Check className="w-4 h-4 text-white" />
          </motion.div>
        )}

        <div
          className={`
            w-12 h-12 rounded-xl flex items-center justify-center mb-4
            ${selectedMode === "full" ? "bg-[#529ec6]/20" : "bg-slate-100"}
          `}
        >
          <Sparkles
            className={`w-6 h-6 ${
              selectedMode === "full" ? "text-[#529ec6]" : "text-slate-500"
            }`}
          />
        </div>

        <h3 className="text-lg font-semibold text-slate-900 mb-2">Full Mode</h3>
        <p className="text-sm text-slate-500 mb-4">
          AI parses your contract into editable clauses. Best when you want to
          modify, reorganize, or enhance the contract content.
        </p>

        <div className="space-y-2">
          <div className="flex items-center gap-2 text-sm text-slate-600">
            <Check className="w-4 h-4 text-emerald-500" />
            <span>Edit individual clauses</span>
          </div>
          <div className="flex items-center gap-2 text-sm text-slate-600">
            <Check className="w-4 h-4 text-emerald-500" />
            <span>AI-powered restructuring</span>
          </div>
          <div className="flex items-center gap-2 text-sm text-slate-600">
            <Check className="w-4 h-4 text-emerald-500" />
            <span>All Quick Mode features</span>
          </div>
        </div>

        <div className="mt-4 px-3 py-1.5 bg-purple-50 text-purple-700 text-xs font-medium rounded-full">
          Best for editing contracts
        </div>
      </button>
    </div>
  );
}
