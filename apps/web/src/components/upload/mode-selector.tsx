"use client";

import { Sparkles, Check, FileSignature } from "lucide-react";
import { motion } from "framer-motion";

export type ProcessingMode = "sign_only" | "edit_and_sign";

interface ModeSelectorProps {
  selectedMode: ProcessingMode | null;
  onModeSelect: (mode: ProcessingMode) => void;
  disabled?: boolean;
}

export function ModeSelector({
  selectedMode,
  onModeSelect,
  disabled = false,
}: ModeSelectorProps) {
  const modes = [
    {
      id: "sign_only" as const,
      title: "Sign Only",
      description:
        "Keep your original PDF layout. Place signature fields visually on top of your document.",
      icon: FileSignature,
      features: [
        "Preserve original formatting",
        "Visual signature field placement",
        "AI risk analysis",
        "E-signatures on original PDF",
      ],
    },
    {
      id: "edit_and_sign" as const,
      title: "Edit & Sign",
      description:
        "AI parses your contract into editable clauses. Modify content before sending for signatures.",
      icon: Sparkles,
      features: [
        "Edit individual clauses",
        "AI-powered modifications",
        "AI risk analysis",
        "E-signatures embedded in PDF",
      ],
    },
  ];

  return (
    <div className="grid grid-cols-1 md:grid-cols-2 gap-4 max-w-3xl mx-auto">
      {modes.map((mode) => {
        const Icon = mode.icon;
        const isSelected = selectedMode === mode.id;

        return (
          <button
            key={mode.id}
            onClick={() => onModeSelect(mode.id)}
            disabled={disabled}
            className={`
              relative flex flex-col items-start p-6 rounded-2xl border-2 text-left
              transition-all duration-200
              ${
                isSelected
                  ? "border-[#529ec6] bg-[#529ec6]/5"
                  : "border-slate-200 hover:border-slate-300 hover:bg-slate-50"
              }
              ${disabled ? "opacity-50 cursor-not-allowed" : "cursor-pointer"}
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
            <p className="text-sm text-slate-500 mb-4">{mode.description}</p>

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
