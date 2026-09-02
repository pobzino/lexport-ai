"use client";

import { ScanText, Check, FileSignature } from "lucide-react";
import { motion } from "framer-motion";

export type ProcessingMode = "sign_only" | "edit_and_sign";

interface ModeSelectorProps {
  selectedMode: ProcessingMode | null;
  onModeSelect: (mode: ProcessingMode) => void;
  disabled?: boolean;
  signOnlySupported?: boolean;
}

export function ModeSelector({
  selectedMode,
  onModeSelect,
  disabled = false,
  signOnlySupported = true,
}: ModeSelectorProps) {
  const modes = [
    {
      id: "sign_only" as const,
      title: "Keep the original",
      description:
        "Preserve the uploaded layout and place signature fields directly on it.",
      icon: FileSignature,
      badge: "Fastest",
      features: [
        "No reformatting",
        "Best for ready-to-sign documents",
        "PDF or scanned image",
      ],
    },
    {
      id: "edit_and_sign" as const,
      title: "Convert to editable",
      description:
        "Extract the legal text into clauses so you can review and edit it first.",
      icon: ScanText,
      features: [
        "Review extracted clauses",
        "Edit wording with AI",
        "Original file remains attached",
      ],
    },
  ];

  return (
    <div className="grid grid-cols-1 md:grid-cols-2 gap-4 max-w-3xl mx-auto">
      {modes.map((mode) => {
        const Icon = mode.icon;
        const isSelected = selectedMode === mode.id;
        const isUnavailable = mode.id === "sign_only" && !signOnlySupported;

        return (
          <button
            key={mode.id}
            onClick={() => onModeSelect(mode.id)}
            disabled={disabled || isUnavailable}
            aria-disabled={disabled || isUnavailable}
            className={`
              relative flex flex-col items-start p-6 rounded-2xl border-2 text-left
              transition-all duration-200
              ${
                isSelected
                  ? "border-[#529ec6] bg-[#529ec6]/5"
                  : "border-slate-200 hover:border-slate-300 hover:bg-slate-50"
              }
              ${disabled || isUnavailable ? "opacity-50 cursor-not-allowed" : "cursor-pointer"}
            `}
          >
            {isSelected && (
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
                ${isSelected ? "bg-[#529ec6]/20" : "bg-slate-100"}
              `}
            >
              <Icon
                className={`w-6 h-6 ${
                  isSelected ? "text-[#529ec6]" : "text-slate-500"
                }`}
              />
            </div>

            <h3 className="text-lg font-semibold text-slate-900 mb-2">
              {mode.title}
            </h3>
            {mode.badge && (
              <span className="mb-3 rounded-full bg-emerald-50 px-2.5 py-1 text-xs font-semibold text-emerald-700">
                {mode.badge}
              </span>
            )}
            <p className="text-sm text-slate-500 mb-4">{mode.description}</p>

            {isUnavailable && (
              <p className="mb-4 rounded-lg bg-amber-50 px-3 py-2 text-xs font-medium text-amber-800">
                Word files must be converted to editable clauses before signing.
              </p>
            )}

            <div className="space-y-2">
              {mode.features.map((feature, index) => (
                <div
                  key={index}
                  className="flex items-center gap-2 text-sm text-slate-600"
                >
                  <Check className="w-4 h-4 text-emerald-500 flex-shrink-0" />
                  <span>{feature}</span>
                </div>
              ))}
            </div>
          </button>
        );
      })}
    </div>
  );
}
