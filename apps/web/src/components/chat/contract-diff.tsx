"use client";

import { Check, X, ChevronRight } from "lucide-react";

export type ContractChange = {
  section: string;
  clauseId?: string;
  clauseTitle?: string;
  before: string;
  after: string;
};

export type ContractDiffProps = {
  changes: ContractChange[];
  explanation: string;
  onAccept?: () => void;
  onRevert?: () => void;
  onJumpToClause?: (clauseId: string) => void;
};

export function ContractDiff({
  changes,
  explanation,
  onAccept,
  onRevert,
  onJumpToClause,
}: ContractDiffProps) {
  return (
    <div className="rounded-lg border border-green-200 bg-green-50 p-4">
      <div className="flex items-center gap-2 mb-3">
        <Check className="h-5 w-5 text-green-600" />
        <span className="font-medium text-green-800">Changes Applied</span>
      </div>

      <p className="text-sm text-gray-700 mb-4">{explanation}</p>

      <div className="space-y-3">
        {changes.map((change, i) => (
          <div
            key={i}
            className="bg-white rounded border border-gray-200 overflow-hidden"
          >
            <div className="bg-gray-50 px-3 py-1.5 border-b border-gray-200 flex items-center justify-between">
              <span className="text-xs font-medium text-gray-600">
                {change.section === "clause" && change.clauseTitle
                  ? change.clauseTitle
                  : change.section.charAt(0).toUpperCase() +
                    change.section.slice(1)}
              </span>
              {change.clauseId && onJumpToClause && (
                <button
                  onClick={() => onJumpToClause(change.clauseId!)}
                  className="text-xs text-gray-500 hover:text-gray-700 flex items-center gap-1"
                >
                  View <ChevronRight className="h-3 w-3" />
                </button>
              )}
            </div>

            <div className="grid grid-cols-2 divide-x divide-gray-200">
              {/* Before */}
              <div className="p-2">
                <span className="text-xs text-red-600 font-medium mb-1 block">
                  Before
                </span>
                <div className="text-xs text-gray-600 bg-red-50 p-2 rounded line-through break-words">
                  {change.before.length > 200
                    ? change.before.substring(0, 200) + "..."
                    : change.before}
                </div>
              </div>

              {/* After */}
              <div className="p-2">
                <span className="text-xs text-green-600 font-medium mb-1 block">
                  After
                </span>
                <div className="text-xs text-gray-700 bg-green-50 p-2 rounded break-words">
                  {change.after.length > 200
                    ? change.after.substring(0, 200) + "..."
                    : change.after}
                </div>
              </div>
            </div>
          </div>
        ))}
      </div>

      {(onAccept || onRevert) && (
        <div className="flex gap-2 mt-4">
          {onAccept && (
            <button
              onClick={onAccept}
              className="text-xs flex items-center gap-1 bg-green-600 text-white px-3 py-1.5 rounded hover:bg-green-700 transition-colors"
            >
              <Check className="h-3 w-3" /> Keep Changes
            </button>
          )}
          {onRevert && (
            <button
              onClick={onRevert}
              className="text-xs flex items-center gap-1 bg-white text-gray-700 px-3 py-1.5 rounded border border-gray-300 hover:bg-gray-50 transition-colors"
            >
              <X className="h-3 w-3" /> Revert
            </button>
          )}
        </div>
      )}
    </div>
  );
}
