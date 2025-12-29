"use client";

import { useState } from "react";
import { ChevronDown, ChevronUp, FileText, AlertTriangle } from "lucide-react";
import { motion, AnimatePresence } from "framer-motion";
import type { ContractContent } from "@/db/types";

interface ContentPreviewProps {
  text?: string;
  content?: ContractContent;
  mode: "quick" | "full";
  wordCount?: number;
  confidence?: "high" | "medium" | "low";
}

export function ContentPreview({
  text,
  content,
  mode,
  wordCount,
  confidence,
}: ContentPreviewProps) {
  const [isExpanded, setIsExpanded] = useState(false);

  if (mode === "quick" && text) {
    return (
      <div className="bg-slate-50 rounded-xl border border-slate-200 overflow-hidden">
        {/* Header */}
        <div className="flex items-center justify-between p-4 border-b border-slate-200">
          <div className="flex items-center gap-3">
            <div className="w-10 h-10 rounded-lg bg-[#529ec6]/10 flex items-center justify-center">
              <FileText className="w-5 h-5 text-[#529ec6]" />
            </div>
            <div>
              <h4 className="font-medium text-slate-900">Extracted Text</h4>
              <p className="text-sm text-slate-500">
                {wordCount?.toLocaleString()} words extracted
              </p>
            </div>
          </div>
          <button
            onClick={() => setIsExpanded(!isExpanded)}
            className="flex items-center gap-1 text-sm text-[#529ec6] hover:text-[#4189b1]"
          >
            {isExpanded ? "Collapse" : "Preview"}
            {isExpanded ? (
              <ChevronUp className="w-4 h-4" />
            ) : (
              <ChevronDown className="w-4 h-4" />
            )}
          </button>
        </div>

        {/* Content preview */}
        <AnimatePresence>
          {isExpanded && (
            <motion.div
              initial={{ height: 0, opacity: 0 }}
              animate={{ height: "auto", opacity: 1 }}
              exit={{ height: 0, opacity: 0 }}
              transition={{ duration: 0.2 }}
            >
              <div className="p-4 max-h-64 overflow-y-auto">
                <pre className="text-sm text-slate-700 whitespace-pre-wrap font-mono">
                  {text.slice(0, 2000)}
                  {text.length > 2000 && (
                    <span className="text-slate-400">
                      ... ({text.length - 2000} more characters)
                    </span>
                  )}
                </pre>
              </div>
            </motion.div>
          )}
        </AnimatePresence>
      </div>
    );
  }

  if (mode === "full" && content) {
    return (
      <div className="space-y-4">
        {/* Confidence indicator */}
        {confidence && (
          <div
            className={`flex items-center gap-2 px-4 py-2 rounded-lg ${
              confidence === "high"
                ? "bg-emerald-50 text-emerald-700"
                : confidence === "medium"
                ? "bg-amber-50 text-amber-700"
                : "bg-red-50 text-red-700"
            }`}
          >
            {confidence !== "high" && (
              <AlertTriangle className="w-4 h-4" />
            )}
            <span className="text-sm font-medium">
              {confidence === "high"
                ? "High confidence parsing"
                : confidence === "medium"
                ? "Some sections may need review"
                : "Manual review recommended"}
            </span>
          </div>
        )}

        {/* Parsed structure preview */}
        <div className="bg-slate-50 rounded-xl border border-slate-200 overflow-hidden">
          <div className="p-4 border-b border-slate-200">
            <h4 className="font-medium text-slate-900">Parsed Structure</h4>
            <p className="text-sm text-slate-500">
              {content.clauses.length} clauses identified
            </p>
          </div>

          <div className="divide-y divide-slate-200">
            {/* Preamble */}
            {content.preamble && (
              <SectionPreview title="Preamble" content={content.preamble} />
            )}

            {/* Recitals */}
            {content.recitals && (
              <SectionPreview title="Recitals" content={content.recitals} />
            )}

            {/* Clauses */}
            {content.clauses.slice(0, 5).map((clause, index) => (
              <SectionPreview
                key={clause.id}
                title={clause.title || `Clause ${index + 1}`}
                content={clause.content}
              />
            ))}

            {content.clauses.length > 5 && (
              <div className="p-4 text-center text-sm text-slate-500">
                + {content.clauses.length - 5} more clauses
              </div>
            )}

            {/* Signature Block */}
            {content.signatureBlock && (
              <SectionPreview
                title="Signature Block"
                content={content.signatureBlock}
              />
            )}
          </div>
        </div>
      </div>
    );
  }

  return null;
}

interface SectionPreviewProps {
  title: string;
  content: string;
}

function SectionPreview({ title, content }: SectionPreviewProps) {
  const [isExpanded, setIsExpanded] = useState(false);

  return (
    <div className="p-4">
      <button
        onClick={() => setIsExpanded(!isExpanded)}
        className="flex items-center justify-between w-full text-left"
      >
        <span className="font-medium text-slate-700">{title}</span>
        {isExpanded ? (
          <ChevronUp className="w-4 h-4 text-slate-400" />
        ) : (
          <ChevronDown className="w-4 h-4 text-slate-400" />
        )}
      </button>

      <AnimatePresence>
        {isExpanded && (
          <motion.div
            initial={{ height: 0, opacity: 0 }}
            animate={{ height: "auto", opacity: 1 }}
            exit={{ height: 0, opacity: 0 }}
            className="mt-2"
          >
            <p className="text-sm text-slate-600 whitespace-pre-wrap">
              {content.slice(0, 500)}
              {content.length > 500 && "..."}
            </p>
          </motion.div>
        )}
      </AnimatePresence>
    </div>
  );
}
