"use client";

import { AlertTriangle, AlertCircle, Info, ChevronRight } from "lucide-react";

export type ClauseRiskProps = {
  clauseId: string;
  clauseTitle: string;
  severity: "critical" | "warning" | "info";
  category: string;
  title: string;
  description: string;
  problematicText?: string;
  suggestion?: string;
  affectedParty?: "client" | "contractor" | "both";
  onJumpToClause?: (clauseId: string) => void;
  onApplyFix?: (suggestion: string, clauseId: string) => void;
};

const severityConfig = {
  critical: {
    icon: AlertTriangle,
    bg: "bg-red-50",
    border: "border-red-200",
    text: "text-red-700",
    badge: "bg-red-100 text-red-700",
  },
  warning: {
    icon: AlertCircle,
    bg: "bg-yellow-50",
    border: "border-yellow-200",
    text: "text-yellow-700",
    badge: "bg-yellow-100 text-yellow-700",
  },
  info: {
    icon: Info,
    bg: "bg-blue-50",
    border: "border-blue-200",
    text: "text-blue-700",
    badge: "bg-blue-100 text-blue-700",
  },
};

export function ClauseRiskCard({
  clauseId,
  clauseTitle,
  severity,
  category,
  title,
  description,
  problematicText,
  suggestion,
  onJumpToClause,
  onApplyFix,
}: ClauseRiskProps) {
  const config = severityConfig[severity];
  const Icon = config.icon;

  return (
    <div className={`rounded-lg border ${config.border} ${config.bg} p-4`}>
      <div className="flex items-start gap-3">
        <Icon className={`h-5 w-5 mt-0.5 flex-shrink-0 ${config.text}`} />
        <div className="flex-1 min-w-0">
          <div className="flex items-center gap-2 mb-1 flex-wrap">
            <span className={`font-medium ${config.text}`}>{title}</span>
            <span
              className={`text-xs px-1.5 py-0.5 rounded ${config.badge}`}
            >
              {category.replace(/_/g, " ")}
            </span>
          </div>

          <p className="text-sm text-gray-700 mb-2">{description}</p>

          {problematicText && (
            <div className="text-xs bg-white/50 p-2 rounded border border-gray-200 mb-2 font-mono break-words">
              &ldquo;{problematicText}&rdquo;
            </div>
          )}

          {suggestion && (
            <div className="text-sm text-gray-600 mb-3">
              <strong>Suggestion:</strong> {suggestion}
            </div>
          )}

          <div className="flex gap-2 flex-wrap">
            {onJumpToClause && (
              <button
                onClick={() => onJumpToClause(clauseId)}
                className="text-xs flex items-center gap-1 text-gray-600 hover:text-gray-900 transition-colors"
              >
                Go to &ldquo;{clauseTitle}&rdquo;{" "}
                <ChevronRight className="h-3 w-3" />
              </button>
            )}
            {suggestion && onApplyFix && (
              <button
                onClick={() => onApplyFix(suggestion, clauseId)}
                className="text-xs bg-white px-2 py-1 rounded border border-gray-300 hover:bg-gray-50 transition-colors"
              >
                Apply Fix
              </button>
            )}
          </div>
        </div>
      </div>
    </div>
  );
}
