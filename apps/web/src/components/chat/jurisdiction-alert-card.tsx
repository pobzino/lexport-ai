"use client";

import { Scale, ExternalLink } from "lucide-react";

export type JurisdictionAlertProps = {
  severity: "critical" | "warning" | "info";
  jurisdiction: string;
  title: string;
  description: string;
  legalReference?: string;
  affectedClauseId?: string;
  onJumpToClause?: (clauseId: string) => void;
};

const severityBadge = {
  critical: "bg-red-100 text-red-700",
  warning: "bg-yellow-100 text-yellow-700",
  info: "bg-blue-100 text-blue-700",
};

export function JurisdictionAlertCard({
  severity,
  jurisdiction,
  title,
  description,
  legalReference,
  affectedClauseId,
  onJumpToClause,
}: JurisdictionAlertProps) {
  const formatJurisdiction = (j: string) =>
    j.replace("us_", "").replace(/_/g, " ").toUpperCase();

  return (
    <div className="rounded-lg border border-purple-200 bg-purple-50 p-4">
      <div className="flex items-start gap-3">
        <Scale className="h-5 w-5 text-purple-600 mt-0.5 flex-shrink-0" />
        <div className="flex-1 min-w-0">
          <div className="flex items-center gap-2 mb-1 flex-wrap">
            <span className="font-medium text-purple-800">{title}</span>
            <span className="text-xs bg-purple-100 text-purple-700 px-2 py-0.5 rounded">
              {formatJurisdiction(jurisdiction)}
            </span>
            <span
              className={`text-xs px-1.5 py-0.5 rounded ${severityBadge[severity]}`}
            >
              {severity}
            </span>
          </div>

          <p className="text-sm text-gray-700 mb-2">{description}</p>

          {legalReference && (
            <p className="text-xs text-purple-600 flex items-center gap-1 mb-2">
              <ExternalLink className="h-3 w-3" />
              {legalReference}
            </p>
          )}

          {affectedClauseId && onJumpToClause && (
            <button
              onClick={() => onJumpToClause(affectedClauseId)}
              className="text-xs text-purple-700 hover:text-purple-900 underline transition-colors"
            >
              View affected clause →
            </button>
          )}
        </div>
      </div>
    </div>
  );
}
