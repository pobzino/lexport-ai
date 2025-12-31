"use client";

import { ShieldOff, Plus } from "lucide-react";

export type MissingProtectionProps = {
  severity: "critical" | "warning" | "info";
  title: string;
  description: string;
  suggestion: string;
  standardFor?: string[];
  onAddClause?: (suggestion: string) => void;
};

const severityBadge = {
  critical: "bg-red-100 text-red-700",
  warning: "bg-yellow-100 text-yellow-700",
  info: "bg-blue-100 text-blue-700",
};

export function MissingProtectionCard({
  severity,
  title,
  description,
  suggestion,
  standardFor,
  onAddClause,
}: MissingProtectionProps) {
  return (
    <div className="rounded-lg border border-orange-200 bg-orange-50 p-4">
      <div className="flex items-start gap-3">
        <ShieldOff className="h-5 w-5 text-orange-600 mt-0.5 flex-shrink-0" />
        <div className="flex-1 min-w-0">
          <div className="flex items-center gap-2 mb-1 flex-wrap">
            <span className="font-medium text-orange-800">{title}</span>
            <span
              className={`text-xs px-1.5 py-0.5 rounded ${severityBadge[severity]}`}
            >
              {severity}
            </span>
          </div>

          <p className="text-sm text-gray-700 mb-2">{description}</p>

          {standardFor && standardFor.length > 0 && (
            <p className="text-xs text-gray-500 mb-2">
              Standard for: {standardFor.join(", ")}
            </p>
          )}

          <div className="bg-white/60 p-2 rounded text-sm border border-orange-100 mb-3 break-words">
            <strong>Suggested clause:</strong> {suggestion}
          </div>

          {onAddClause && (
            <button
              onClick={() => onAddClause(suggestion)}
              className="text-xs flex items-center gap-1 bg-orange-600 text-white px-3 py-1.5 rounded hover:bg-orange-700 transition-colors"
            >
              <Plus className="h-3 w-3" /> Add This Clause
            </button>
          )}
        </div>
      </div>
    </div>
  );
}
