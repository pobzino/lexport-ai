"use client";

import { useState } from "react";
import { ChevronDown, ChevronRight, Plus, Minus, Edit3 } from "lucide-react";
import type { VersionDiff, ClauseDiff, VersionComparison } from "@/db/types";

interface DiffViewerProps {
  comparison: VersionComparison;
  mode?: "inline" | "side-by-side";
}

export function DiffViewer({ comparison, mode = "inline" }: DiffViewerProps) {
  const [expandedSections, setExpandedSections] = useState<Set<string>>(
    new Set(["preamble", "recitals", "clauses", "signature"])
  );

  const toggleSection = (section: string) => {
    const newExpanded = new Set(expandedSections);
    if (newExpanded.has(section)) {
      newExpanded.delete(section);
    } else {
      newExpanded.add(section);
    }
    setExpandedSections(newExpanded);
  };

  const hasChangesInSection = (diffs: VersionDiff[]): boolean => {
    return diffs.some((d) => d.type !== "unchanged");
  };

  return (
    <div className="space-y-4">
      {/* Version Header */}
      <div className="flex items-center justify-between text-sm text-slate-500 pb-2 border-b border-slate-200">
        <span>
          Comparing version {comparison.fromVersion} to version{" "}
          {comparison.toVersion}
        </span>
        <div className="flex items-center gap-4">
          <span className="flex items-center gap-1">
            <span className="w-2 h-2 rounded-full bg-green-500" />
            Added
          </span>
          <span className="flex items-center gap-1">
            <span className="w-2 h-2 rounded-full bg-red-500" />
            Removed
          </span>
        </div>
      </div>

      {/* Preamble Section */}
      <DiffSection
        title="Preamble"
        sectionKey="preamble"
        diffs={comparison.preambleDiff}
        hasChanges={hasChangesInSection(comparison.preambleDiff)}
        expanded={expandedSections.has("preamble")}
        onToggle={() => toggleSection("preamble")}
        mode={mode}
      />

      {/* Recitals Section */}
      {comparison.recitalsDiff.length > 0 && (
        <DiffSection
          title="Recitals"
          sectionKey="recitals"
          diffs={comparison.recitalsDiff}
          hasChanges={hasChangesInSection(comparison.recitalsDiff)}
          expanded={expandedSections.has("recitals")}
          onToggle={() => toggleSection("recitals")}
          mode={mode}
        />
      )}

      {/* Clauses Section */}
      <div className="border border-slate-200 rounded-lg overflow-hidden">
        <button
          onClick={() => toggleSection("clauses")}
          className="w-full flex items-center justify-between px-4 py-3 bg-slate-50 hover:bg-slate-100 transition-colors"
        >
          <div className="flex items-center gap-2">
            {expandedSections.has("clauses") ? (
              <ChevronDown className="w-4 h-4 text-slate-500" />
            ) : (
              <ChevronRight className="w-4 h-4 text-slate-500" />
            )}
            <span className="font-medium text-slate-900">Clauses</span>
            <ClauseStats clausesDiff={comparison.clausesDiff} />
          </div>
        </button>
        {expandedSections.has("clauses") && (
          <div className="divide-y divide-slate-100">
            {comparison.clausesDiff.map((clauseDiff) => (
              <ClauseDiffRow
                key={clauseDiff.clauseId}
                clauseDiff={clauseDiff}
                mode={mode}
              />
            ))}
          </div>
        )}
      </div>

      {/* Signature Block Section */}
      <DiffSection
        title="Signature Block"
        sectionKey="signature"
        diffs={comparison.signatureBlockDiff}
        hasChanges={hasChangesInSection(comparison.signatureBlockDiff)}
        expanded={expandedSections.has("signature")}
        onToggle={() => toggleSection("signature")}
        mode={mode}
      />
    </div>
  );
}

interface DiffSectionProps {
  title: string;
  sectionKey: string;
  diffs: VersionDiff[];
  hasChanges: boolean;
  expanded: boolean;
  onToggle: () => void;
  mode: "inline" | "side-by-side";
}

function DiffSection({
  title,
  diffs,
  hasChanges,
  expanded,
  onToggle,
  mode,
}: DiffSectionProps) {
  if (diffs.length === 0) return null;

  return (
    <div className="border border-slate-200 rounded-lg overflow-hidden">
      <button
        onClick={onToggle}
        className="w-full flex items-center justify-between px-4 py-3 bg-slate-50 hover:bg-slate-100 transition-colors"
      >
        <div className="flex items-center gap-2">
          {expanded ? (
            <ChevronDown className="w-4 h-4 text-slate-500" />
          ) : (
            <ChevronRight className="w-4 h-4 text-slate-500" />
          )}
          <span className="font-medium text-slate-900">{title}</span>
          {hasChanges ? (
            <span className="px-2 py-0.5 text-xs rounded-full bg-amber-100 text-amber-700">
              Changed
            </span>
          ) : (
            <span className="px-2 py-0.5 text-xs rounded-full bg-slate-100 text-slate-500">
              No changes
            </span>
          )}
        </div>
      </button>
      {expanded && (
        <div className="p-4 bg-white">
          <InlineDiff diffs={diffs} />
        </div>
      )}
    </div>
  );
}

interface InlineDiffProps {
  diffs: VersionDiff[];
}

function InlineDiff({ diffs }: InlineDiffProps) {
  return (
    <div className="font-mono text-sm leading-relaxed whitespace-pre-wrap">
      {diffs.map((diff, index) => {
        if (diff.type === "added") {
          return (
            <span
              key={index}
              className="bg-green-100 text-green-800 px-0.5 rounded"
            >
              {diff.value}
            </span>
          );
        }
        if (diff.type === "removed") {
          return (
            <span
              key={index}
              className="bg-red-100 text-red-800 line-through px-0.5 rounded"
            >
              {diff.value}
            </span>
          );
        }
        return <span key={index}>{diff.value}</span>;
      })}
    </div>
  );
}

interface ClauseStatsProps {
  clausesDiff: ClauseDiff[];
}

function ClauseStats({ clausesDiff }: ClauseStatsProps) {
  const added = clausesDiff.filter((c) => c.status === "added").length;
  const removed = clausesDiff.filter((c) => c.status === "removed").length;
  const modified = clausesDiff.filter((c) => c.status === "modified").length;

  if (added === 0 && removed === 0 && modified === 0) {
    return (
      <span className="px-2 py-0.5 text-xs rounded-full bg-slate-100 text-slate-500">
        No changes
      </span>
    );
  }

  return (
    <div className="flex items-center gap-2">
      {added > 0 && (
        <span className="flex items-center gap-1 px-2 py-0.5 text-xs rounded-full bg-green-100 text-green-700">
          <Plus className="w-3 h-3" />
          {added}
        </span>
      )}
      {removed > 0 && (
        <span className="flex items-center gap-1 px-2 py-0.5 text-xs rounded-full bg-red-100 text-red-700">
          <Minus className="w-3 h-3" />
          {removed}
        </span>
      )}
      {modified > 0 && (
        <span className="flex items-center gap-1 px-2 py-0.5 text-xs rounded-full bg-amber-100 text-amber-700">
          <Edit3 className="w-3 h-3" />
          {modified}
        </span>
      )}
    </div>
  );
}

interface ClauseDiffRowProps {
  clauseDiff: ClauseDiff;
  mode: "inline" | "side-by-side";
}

function ClauseDiffRow({ clauseDiff, mode }: ClauseDiffRowProps) {
  const [expanded, setExpanded] = useState(clauseDiff.status !== "unchanged");

  const statusColors = {
    added: "bg-green-50 border-l-4 border-green-500",
    removed: "bg-red-50 border-l-4 border-red-500",
    modified: "bg-amber-50 border-l-4 border-amber-500",
    unchanged: "",
  };

  const statusIcons = {
    added: <Plus className="w-4 h-4 text-green-600" />,
    removed: <Minus className="w-4 h-4 text-red-600" />,
    modified: <Edit3 className="w-4 h-4 text-amber-600" />,
    unchanged: null,
  };

  const statusLabels = {
    added: "Added",
    removed: "Removed",
    modified: "Modified",
    unchanged: "Unchanged",
  };

  return (
    <div className={statusColors[clauseDiff.status]}>
      <button
        onClick={() => setExpanded(!expanded)}
        className="w-full flex items-center justify-between px-4 py-3 hover:bg-white/50 transition-colors"
      >
        <div className="flex items-center gap-2">
          {expanded ? (
            <ChevronDown className="w-4 h-4 text-slate-400" />
          ) : (
            <ChevronRight className="w-4 h-4 text-slate-400" />
          )}
          {statusIcons[clauseDiff.status]}
          <span className="font-medium text-slate-800">
            {clauseDiff.clauseTitle}
          </span>
        </div>
        <span
          className={`text-xs px-2 py-0.5 rounded-full ${
            clauseDiff.status === "added"
              ? "bg-green-100 text-green-700"
              : clauseDiff.status === "removed"
                ? "bg-red-100 text-red-700"
                : clauseDiff.status === "modified"
                  ? "bg-amber-100 text-amber-700"
                  : "bg-slate-100 text-slate-500"
          }`}
        >
          {statusLabels[clauseDiff.status]}
        </span>
      </button>

      {expanded && (
        <div className="px-4 pb-4 pt-2 space-y-3">
          {/* Title diff if changed */}
          {clauseDiff.titleDiff && (
            <div>
              <p className="text-xs font-medium text-slate-500 uppercase mb-1">
                Title
              </p>
              <div className="p-2 bg-white rounded border border-slate-200">
                <InlineDiff diffs={clauseDiff.titleDiff} />
              </div>
            </div>
          )}

          {/* Content diff */}
          {clauseDiff.contentDiff && (
            <div>
              <p className="text-xs font-medium text-slate-500 uppercase mb-1">
                Content
              </p>
              <div className="p-3 bg-white rounded border border-slate-200 max-h-64 overflow-auto">
                <InlineDiff diffs={clauseDiff.contentDiff} />
              </div>
            </div>
          )}
        </div>
      )}
    </div>
  );
}

// Compact diff display for the version list
interface CompactDiffProps {
  changeSummary: string | null;
  changeType: string;
}

export function CompactDiff({ changeSummary, changeType }: CompactDiffProps) {
  const typeIcons = {
    create: <Plus className="w-3 h-3 text-green-600" />,
    edit: <Edit3 className="w-3 h-3 text-amber-600" />,
    ai_modification: (
      <span className="text-xs text-violet-600 font-medium">AI</span>
    ),
    rollback: <span className="text-xs text-blue-600 font-medium">RB</span>,
  };

  return (
    <div className="flex items-center gap-2 text-sm text-slate-600">
      {typeIcons[changeType as keyof typeof typeIcons] || (
        <Edit3 className="w-3 h-3 text-slate-400" />
      )}
      <span className="truncate">{changeSummary || "Content updated"}</span>
    </div>
  );
}
