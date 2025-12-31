"use client";

import { BookOpen, AlertTriangle, Lightbulb, ChevronRight } from "lucide-react";

export type ClauseExplanationProps = {
  clauseId: string;
  clauseTitle: string;
  summary: string;
  explanation: string;
  keyPoints: string[];
  risks?: string[];
  negotiationTips?: string[];
  onJumpToClause?: (clauseId: string) => void;
};

export function ClauseExplanationCard({
  clauseId,
  clauseTitle,
  summary,
  explanation,
  keyPoints,
  risks,
  negotiationTips,
  onJumpToClause,
}: ClauseExplanationProps) {
  return (
    <div className="rounded-lg border border-blue-200 bg-blue-50 p-4">
      <div className="flex items-start gap-3">
        <BookOpen className="h-5 w-5 text-blue-600 mt-0.5 flex-shrink-0" />
        <div className="flex-1 min-w-0">
          <div className="flex items-center justify-between mb-2">
            <span className="font-medium text-blue-800">{clauseTitle}</span>
            {onJumpToClause && (
              <button
                onClick={() => onJumpToClause(clauseId)}
                className="text-xs text-blue-600 hover:text-blue-800 flex items-center gap-1"
              >
                View clause <ChevronRight className="h-3 w-3" />
              </button>
            )}
          </div>

          {/* Summary */}
          <p className="text-sm font-medium text-gray-800 mb-2">{summary}</p>

          {/* Detailed explanation */}
          <p className="text-sm text-gray-700 mb-3">{explanation}</p>

          {/* Key Points */}
          {keyPoints.length > 0 && (
            <div className="mb-3">
              <span className="text-xs font-medium text-gray-600 mb-1 block">
                Key Points:
              </span>
              <ul className="text-sm text-gray-700 space-y-1">
                {keyPoints.map((point, i) => (
                  <li key={i} className="flex items-start gap-2">
                    <span className="text-blue-500 mt-1">•</span>
                    <span>{point}</span>
                  </li>
                ))}
              </ul>
            </div>
          )}

          {/* Risks */}
          {risks && risks.length > 0 && (
            <div className="mb-3 bg-red-50 rounded p-2 border border-red-100">
              <div className="flex items-center gap-1 text-xs font-medium text-red-700 mb-1">
                <AlertTriangle className="h-3 w-3" /> Potential Risks:
              </div>
              <ul className="text-sm text-red-700 space-y-1">
                {risks.map((risk, i) => (
                  <li key={i} className="flex items-start gap-2">
                    <span className="mt-1">•</span>
                    <span>{risk}</span>
                  </li>
                ))}
              </ul>
            </div>
          )}

          {/* Negotiation Tips */}
          {negotiationTips && negotiationTips.length > 0 && (
            <div className="bg-yellow-50 rounded p-2 border border-yellow-100">
              <div className="flex items-center gap-1 text-xs font-medium text-yellow-700 mb-1">
                <Lightbulb className="h-3 w-3" /> Negotiation Tips:
              </div>
              <ul className="text-sm text-yellow-800 space-y-1">
                {negotiationTips.map((tip, i) => (
                  <li key={i} className="flex items-start gap-2">
                    <span className="mt-1">•</span>
                    <span>{tip}</span>
                  </li>
                ))}
              </ul>
            </div>
          )}
        </div>
      </div>
    </div>
  );
}
