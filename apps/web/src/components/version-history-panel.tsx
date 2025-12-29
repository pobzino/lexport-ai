"use client";

import { useState, useEffect } from "react";
import {
  X,
  Clock,
  RotateCcw,
  Eye,
  ChevronDown,
  ChevronRight,
  Loader2,
  Sparkles,
  Edit3,
  Plus,
  FileText,
  ArrowLeftRight,
} from "lucide-react";
import type { ContractVersion, VersionComparison, ContractContent } from "@/db/types";
import { DiffViewer, CompactDiff } from "./diff-viewer";
import { RollbackModal } from "./rollback-modal";

interface VersionHistoryPanelProps {
  contractId: string;
  currentVersion: number;
  onClose: () => void;
  onVersionPreview: (content: ContractContent) => void;
  onRollback: (version: ContractVersion) => Promise<void>;
}

export function VersionHistoryPanel({
  contractId,
  currentVersion,
  onClose,
  onVersionPreview,
  onRollback,
}: VersionHistoryPanelProps) {
  const [versions, setVersions] = useState<ContractVersion[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [selectedVersion, setSelectedVersion] = useState<ContractVersion | null>(null);
  const [comparison, setComparison] = useState<VersionComparison | null>(null);
  const [comparingVersions, setComparingVersions] = useState<{
    from: number | null;
    to: number | null;
  }>({ from: null, to: null });
  const [loadingComparison, setLoadingComparison] = useState(false);
  const [showRollbackModal, setShowRollbackModal] = useState(false);
  const [rollbackTarget, setRollbackTarget] = useState<ContractVersion | null>(null);
  const [view, setView] = useState<"timeline" | "compare">("timeline");

  // Fetch versions on mount
  useEffect(() => {
    fetchVersions();
  }, [contractId]);

  const fetchVersions = async () => {
    try {
      setLoading(true);
      const response = await fetch(`/api/contracts/${contractId}/versions`);
      if (!response.ok) throw new Error("Failed to fetch versions");
      const data = await response.json();
      setVersions(data.versions || []);
    } catch (err) {
      setError(err instanceof Error ? err.message : "Failed to load versions");
    } finally {
      setLoading(false);
    }
  };

  const fetchComparison = async (fromVersion: number, toVersion: number) => {
    try {
      setLoadingComparison(true);
      const response = await fetch(`/api/contracts/${contractId}/versions/compare`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          fromVersionNumber: fromVersion,
          toVersionNumber: toVersion,
        }),
      });
      if (!response.ok) throw new Error("Failed to compare versions");
      const data = await response.json();
      setComparison(data.comparison);
    } catch (err) {
      console.error("Comparison error:", err);
    } finally {
      setLoadingComparison(false);
    }
  };

  const handleVersionSelect = (version: ContractVersion) => {
    setSelectedVersion(version);
    // Compare with previous version or current if it's the first
    const prevVersion = versions.find(
      (v) => v.version_number === version.version_number - 1
    );
    if (prevVersion) {
      setComparingVersions({
        from: prevVersion.version_number,
        to: version.version_number,
      });
      fetchComparison(prevVersion.version_number, version.version_number);
    }
  };

  const handleCompareVersions = () => {
    if (comparingVersions.from && comparingVersions.to) {
      fetchComparison(comparingVersions.from, comparingVersions.to);
    }
  };

  const handlePreviewVersion = (version: ContractVersion) => {
    onVersionPreview(version.content);
  };

  const handleRollbackClick = (version: ContractVersion) => {
    setRollbackTarget(version);
    setShowRollbackModal(true);
  };

  const handleRollbackConfirm = async () => {
    if (!rollbackTarget) return;
    await onRollback(rollbackTarget);
    setShowRollbackModal(false);
    setRollbackTarget(null);
    // Refresh versions after rollback
    await fetchVersions();
  };

  const formatDate = (dateString: string) => {
    const date = new Date(dateString);
    const now = new Date();
    const diffMs = now.getTime() - date.getTime();
    const diffMins = Math.floor(diffMs / 60000);
    const diffHours = Math.floor(diffMs / 3600000);
    const diffDays = Math.floor(diffMs / 86400000);

    if (diffMins < 1) return "Just now";
    if (diffMins < 60) return `${diffMins}m ago`;
    if (diffHours < 24) return `${diffHours}h ago`;
    if (diffDays < 7) return `${diffDays}d ago`;

    return date.toLocaleDateString("en-US", {
      month: "short",
      day: "numeric",
      year: date.getFullYear() !== now.getFullYear() ? "numeric" : undefined,
    });
  };

  const getChangeTypeIcon = (changeType: string) => {
    switch (changeType) {
      case "create":
        return <Plus className="w-4 h-4 text-green-600" />;
      case "edit":
        return <Edit3 className="w-4 h-4 text-amber-600" />;
      case "ai_modification":
        return <Sparkles className="w-4 h-4 text-[#529ec6]" />;
      case "rollback":
        return <RotateCcw className="w-4 h-4 text-blue-600" />;
      default:
        return <FileText className="w-4 h-4 text-slate-400" />;
    }
  };

  const getChangeTypeBadge = (changeType: string) => {
    const badges: Record<string, { bg: string; text: string; label: string }> = {
      create: { bg: "bg-green-100", text: "text-green-700", label: "Created" },
      edit: { bg: "bg-amber-100", text: "text-amber-700", label: "Edited" },
      ai_modification: { bg: "bg-[#529ec6]/10", text: "text-[#202e46]", label: "AI Modified" },
      rollback: { bg: "bg-blue-100", text: "text-blue-700", label: "Rollback" },
    };
    const badge = badges[changeType] || badges.edit;
    return (
      <span className={`px-2 py-0.5 text-xs rounded-full ${badge.bg} ${badge.text}`}>
        {badge.label}
      </span>
    );
  };

  return (
    <>
      <aside className="w-[480px] flex-shrink-0 bg-white border-l border-slate-200 flex flex-col h-full overflow-hidden">
        {/* Header */}
        <div className="px-4 py-3 border-b border-slate-200 flex-shrink-0">
          <div className="flex items-center justify-between">
            <div className="flex items-center gap-2">
              <Clock className="w-5 h-5 text-[#529ec6]" />
              <span className="font-semibold text-slate-900">Version History</span>
              <span className="text-xs bg-slate-100 text-slate-600 px-2 py-0.5 rounded-full">
                {versions.length} versions
              </span>
            </div>
            <button
              onClick={onClose}
              className="p-1.5 hover:bg-slate-100 rounded-lg transition-colors"
            >
              <X className="w-4 h-4 text-slate-500" />
            </button>
          </div>

          {/* View Toggle */}
          <div className="flex mt-3 bg-slate-100 rounded-lg p-1">
            <button
              onClick={() => setView("timeline")}
              className={`flex-1 px-3 py-1.5 text-sm font-medium rounded-md transition-colors ${
                view === "timeline"
                  ? "bg-white text-slate-900 shadow-sm"
                  : "text-slate-600 hover:text-slate-900"
              }`}
            >
              Timeline
            </button>
            <button
              onClick={() => setView("compare")}
              className={`flex-1 px-3 py-1.5 text-sm font-medium rounded-md transition-colors ${
                view === "compare"
                  ? "bg-white text-slate-900 shadow-sm"
                  : "text-slate-600 hover:text-slate-900"
              }`}
            >
              Compare
            </button>
          </div>
        </div>

        {/* Content */}
        <div className="flex-1 overflow-auto">
          {loading ? (
            <div className="flex items-center justify-center h-full">
              <Loader2 className="w-6 h-6 animate-spin text-[#529ec6]" />
            </div>
          ) : error ? (
            <div className="flex items-center justify-center h-full p-4">
              <div className="text-center">
                <p className="text-red-600 mb-2">{error}</p>
                <button
                  onClick={fetchVersions}
                  className="text-sm text-[#529ec6] hover:underline"
                >
                  Try again
                </button>
              </div>
            </div>
          ) : versions.length === 0 ? (
            <div className="flex flex-col items-center justify-center h-full p-6 text-center">
              <Clock className="w-12 h-12 text-slate-300 mb-3" />
              <h3 className="font-medium text-slate-900 mb-1">No version history yet</h3>
              <p className="text-sm text-slate-500">
                Version history will appear here as you make changes to the contract.
              </p>
            </div>
          ) : view === "timeline" ? (
            <div className="p-4">
              {/* Current Version Indicator */}
              <div className="mb-4 p-3 bg-[#529ec6]/5 rounded-lg border border-[#529ec6]/20">
                <div className="flex items-center justify-between">
                  <div className="flex items-center gap-2">
                    <div className="w-3 h-3 bg-[#202e46] rounded-full animate-pulse" />
                    <span className="font-medium text-[#202e46]">
                      Current: Version {currentVersion}
                    </span>
                  </div>
                  <span className="text-xs text-[#529ec6]">Live</span>
                </div>
              </div>

              {/* Version Timeline */}
              <div className="relative">
                {/* Timeline line */}
                <div className="absolute left-4 top-0 bottom-0 w-0.5 bg-slate-200" />

                {/* Version Items */}
                <div className="space-y-4">
                  {versions.map((version, index) => (
                    <div key={version.id} className="relative pl-10">
                      {/* Timeline dot */}
                      <div
                        className={`absolute left-2.5 w-3 h-3 rounded-full border-2 border-white shadow ${
                          selectedVersion?.id === version.id
                            ? "bg-[#202e46]"
                            : "bg-slate-300"
                        }`}
                      />

                      {/* Version Card */}
                      <div
                        className={`p-3 rounded-lg border transition-all cursor-pointer ${
                          selectedVersion?.id === version.id
                            ? "border-[#529ec6]/30 bg-[#529ec6]/5"
                            : "border-slate-200 hover:border-slate-300 hover:bg-slate-50"
                        }`}
                        onClick={() => handleVersionSelect(version)}
                      >
                        <div className="flex items-center justify-between mb-2">
                          <div className="flex items-center gap-2">
                            {getChangeTypeIcon(version.change_type)}
                            <span className="font-medium text-slate-900">
                              Version {version.version_number}
                            </span>
                            {getChangeTypeBadge(version.change_type)}
                          </div>
                          <span className="text-xs text-slate-500">
                            {formatDate(version.created_at)}
                          </span>
                        </div>

                        {version.change_summary && (
                          <p className="text-sm text-slate-600 line-clamp-2 mb-2">
                            {version.change_summary}
                          </p>
                        )}

                        {/* Actions */}
                        <div className="flex items-center gap-2 mt-2 pt-2 border-t border-slate-100">
                          <button
                            onClick={(e) => {
                              e.stopPropagation();
                              handlePreviewVersion(version);
                            }}
                            className="flex items-center gap-1 px-2 py-1 text-xs text-slate-600 hover:text-slate-900 hover:bg-slate-100 rounded transition-colors"
                          >
                            <Eye className="w-3 h-3" />
                            Preview
                          </button>
                          <button
                            onClick={(e) => {
                              e.stopPropagation();
                              handleRollbackClick(version);
                            }}
                            className="flex items-center gap-1 px-2 py-1 text-xs text-amber-600 hover:text-amber-700 hover:bg-amber-50 rounded transition-colors"
                          >
                            <RotateCcw className="w-3 h-3" />
                            Rollback
                          </button>
                        </div>
                      </div>
                    </div>
                  ))}
                </div>
              </div>
            </div>
          ) : (
            /* Compare View */
            <div className="p-4 space-y-4">
              {/* Version Selectors */}
              <div className="flex items-center gap-3">
                <div className="flex-1">
                  <label className="block text-xs font-medium text-slate-500 uppercase mb-1">
                    From
                  </label>
                  <select
                    value={comparingVersions.from || ""}
                    onChange={(e) =>
                      setComparingVersions((prev) => ({
                        ...prev,
                        from: parseInt(e.target.value) || null,
                      }))
                    }
                    className="w-full px-3 py-2 border border-slate-200 rounded-lg text-sm focus:ring-2 focus:ring-[#529ec6] focus:border-transparent"
                  >
                    <option value="">Select version</option>
                    {versions.map((v) => (
                      <option key={v.id} value={v.version_number}>
                        Version {v.version_number}
                      </option>
                    ))}
                  </select>
                </div>
                <ArrowLeftRight className="w-5 h-5 text-slate-400 mt-5" />
                <div className="flex-1">
                  <label className="block text-xs font-medium text-slate-500 uppercase mb-1">
                    To
                  </label>
                  <select
                    value={comparingVersions.to || ""}
                    onChange={(e) =>
                      setComparingVersions((prev) => ({
                        ...prev,
                        to: parseInt(e.target.value) || null,
                      }))
                    }
                    className="w-full px-3 py-2 border border-slate-200 rounded-lg text-sm focus:ring-2 focus:ring-[#529ec6] focus:border-transparent"
                  >
                    <option value="">Select version</option>
                    {versions.map((v) => (
                      <option key={v.id} value={v.version_number}>
                        Version {v.version_number}
                      </option>
                    ))}
                    <option value={currentVersion}>
                      Version {currentVersion} (Current)
                    </option>
                  </select>
                </div>
              </div>

              <button
                onClick={handleCompareVersions}
                disabled={!comparingVersions.from || !comparingVersions.to || loadingComparison}
                className="w-full flex items-center justify-center gap-2 px-4 py-2 bg-[#202e46] text-white rounded-lg hover:bg-[#1a2539] disabled:opacity-50 disabled:cursor-not-allowed transition-colors"
              >
                {loadingComparison ? (
                  <>
                    <Loader2 className="w-4 h-4 animate-spin" />
                    Comparing...
                  </>
                ) : (
                  <>
                    <ArrowLeftRight className="w-4 h-4" />
                    Compare Versions
                  </>
                )}
              </button>

              {/* Comparison Results */}
              {comparison && (
                <div className="mt-4 space-y-3">
                  {/* Comparison Header with Change Summary */}
                  <div className="flex items-center justify-between text-sm text-slate-600 mb-2">
                    <span>
                      Comparing version {comparison.fromVersion} to version {comparison.toVersion}
                    </span>
                    <div className="flex items-center gap-3">
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

                  {/* Change Summary from target version */}
                  {(() => {
                    const toVersion = versions.find(v => v.version_number === comparingVersions.to);
                    if (toVersion?.change_summary) {
                      return (
                        <div className="p-3 bg-slate-50 rounded-lg border border-slate-200">
                          <div className="flex items-center gap-2 mb-1">
                            {getChangeTypeIcon(toVersion.change_type)}
                            <span className="text-xs font-medium text-slate-500 uppercase">
                              Change Summary
                            </span>
                            {getChangeTypeBadge(toVersion.change_type)}
                          </div>
                          <p className="text-sm text-slate-700">{toVersion.change_summary}</p>
                        </div>
                      );
                    }
                    return null;
                  })()}

                  <DiffViewer comparison={comparison} mode="inline" />
                </div>
              )}
            </div>
          )}
        </div>
      </aside>

      {/* Rollback Modal */}
      {rollbackTarget && (
        <RollbackModal
          isOpen={showRollbackModal}
          onClose={() => {
            setShowRollbackModal(false);
            setRollbackTarget(null);
          }}
          onConfirm={handleRollbackConfirm}
          targetVersion={rollbackTarget}
          currentVersion={currentVersion}
        />
      )}
    </>
  );
}
