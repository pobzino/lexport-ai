"use client";

import { useState, useEffect } from "react";
import {
  ShieldAlert,
  X,
  RefreshCw,
  CheckCircle2,
  AlertCircle,
  AlertTriangle,
  Info,
  Loader2,
  Shield,
  MapPin,
  FileWarning,
  Lock,
  ArrowRight,
  Sparkles,
} from "lucide-react";
import Link from "next/link";
import { RiskCard, RiskCardSkeleton } from "./RiskCard";
import type {
  RiskAnalysisResult,
  ClauseRisk,
  MissingProtection,
  JurisdictionAlert,
} from "@/types/risk-analysis";

interface RiskAnalysisPanelProps {
  contractId: string;
  onClose: () => void;
  onJumpToClause: (clauseId: string) => void;
  onImplement?: (risk: ClauseRisk | MissingProtection | JurisdictionAlert) => Promise<void>;
  analysis: RiskAnalysisResult | null;
  loading: boolean;
  error: string | null;
  onRefresh: () => void;
  showUpgradeTeaser?: boolean;
}

export function RiskAnalysisPanel({
  contractId,
  onClose,
  onJumpToClause,
  onImplement,
  analysis,
  loading,
  error,
  onRefresh,
  showUpgradeTeaser = false,
}: RiskAnalysisPanelProps) {
  // Group risks by severity for display
  const groupedRisks = analysis
    ? {
      critical: [
        ...analysis.clauseRisks.filter((r) => r.severity === "critical"),
        ...analysis.missingProtections.filter((r) => r.severity === "critical"),
        ...analysis.jurisdictionAlerts.filter((r) => r.severity === "critical"),
      ],
      warning: [
        ...analysis.clauseRisks.filter((r) => r.severity === "warning"),
        ...analysis.missingProtections.filter((r) => r.severity === "warning"),
        ...analysis.jurisdictionAlerts.filter((r) => r.severity === "warning"),
      ],
      info: [
        ...analysis.clauseRisks.filter((r) => r.severity === "info"),
        ...analysis.missingProtections.filter((r) => r.severity === "info"),
        ...analysis.jurisdictionAlerts.filter((r) => r.severity === "info"),
      ],
    }
    : null;

  // Helper to determine risk type
  const getRiskType = (
    risk: ClauseRisk | MissingProtection | JurisdictionAlert
  ): "clause" | "missing" | "jurisdiction" => {
    if ("clauseId" in risk) return "clause";
    if ("standardFor" in risk) return "missing";
    return "jurisdiction";
  };

  // Overall risk level styling
  const getRiskLevelStyle = (level: "low" | "medium" | "high") => {
    switch (level) {
      case "high":
        return {
          bg: "bg-red-100",
          text: "text-red-700",
          border: "border-red-200",
          icon: AlertCircle,
        };
      case "medium":
        return {
          bg: "bg-amber-100",
          text: "text-amber-700",
          border: "border-amber-200",
          icon: AlertTriangle,
        };
      case "low":
        return {
          bg: "bg-emerald-100",
          text: "text-emerald-700",
          border: "border-emerald-200",
          icon: CheckCircle2,
        };
    }
  };

  return (
    <aside className="w-96 flex-shrink-0 bg-white border-l border-slate-200 flex flex-col overflow-hidden">
      {/* Header */}
      <div className="px-4 py-3 border-b border-slate-200 flex-shrink-0">
        <div className="flex items-center justify-between">
          <div className="flex items-center gap-2">
            <ShieldAlert className="w-5 h-5 text-amber-600" />
            <span className="font-semibold text-slate-900">Risk Analysis</span>
          </div>
          <div className="flex items-center gap-1">
            <button
              onClick={onRefresh}
              disabled={loading}
              className="p-1.5 hover:bg-slate-100 rounded transition-colors disabled:opacity-50"
              title="Refresh analysis"
            >
              <RefreshCw
                className={`w-4 h-4 text-slate-500 ${loading ? "animate-spin" : ""}`}
              />
            </button>
            <button
              onClick={onClose}
              className="p-1.5 hover:bg-slate-100 rounded transition-colors"
            >
              <X className="w-4 h-4 text-slate-500" />
            </button>
          </div>
        </div>

        {/* Stats bar */}
        {analysis && !loading && (
          <div className="flex items-center gap-3 mt-3">
            {analysis.stats.critical > 0 && (
              <div className="flex items-center gap-1 text-red-600">
                <AlertCircle className="w-3.5 h-3.5" />
                <span className="text-xs font-medium">{analysis.stats.critical}</span>
              </div>
            )}
            {analysis.stats.warning > 0 && (
              <div className="flex items-center gap-1 text-amber-600">
                <AlertTriangle className="w-3.5 h-3.5" />
                <span className="text-xs font-medium">{analysis.stats.warning}</span>
              </div>
            )}
            {analysis.stats.info > 0 && (
              <div className="flex items-center gap-1 text-blue-500">
                <Info className="w-3.5 h-3.5" />
                <span className="text-xs font-medium">{analysis.stats.info}</span>
              </div>
            )}
            {analysis.stats.total === 0 && (
              <div className="flex items-center gap-1 text-emerald-600">
                <CheckCircle2 className="w-3.5 h-3.5" />
                <span className="text-xs font-medium">No issues found</span>
              </div>
            )}
          </div>
        )}
      </div>

      {/* Content */}
      <div className="flex-1 overflow-auto p-4 space-y-4">
        {/* Upgrade teaser for free users */}
        {showUpgradeTeaser && !loading && (
          <div className="relative">
            {/* Blurred sample content */}
            <div className="select-none pointer-events-none blur-[6px] opacity-60">
              <div className="p-3 rounded-lg border bg-amber-100 border-amber-200 mb-3">
                <div className="flex items-center gap-2 mb-2">
                  <AlertTriangle className="w-4 h-4 text-amber-700" />
                  <span className="text-sm font-medium text-amber-700">Medium Risk</span>
                </div>
                <p className="text-sm text-slate-600">AI has detected potential issues that need your attention.</p>
              </div>

              <div className="mb-3">
                <h3 className="flex items-center gap-2 text-sm font-medium text-red-700 mb-2">
                  <AlertCircle className="w-4 h-4" />
                  Critical Issues (2)
                </h3>
                <div className="space-y-2">
                  <div className="p-3 rounded-lg border border-red-200 bg-red-50">
                    <p className="text-sm font-medium text-slate-900">Unlimited liability exposure</p>
                    <p className="text-xs text-slate-500 mt-1">The liability cap may not adequately protect your interests.</p>
                  </div>
                  <div className="p-3 rounded-lg border border-red-200 bg-red-50">
                    <p className="text-sm font-medium text-slate-900">Missing termination notice period</p>
                    <p className="text-xs text-slate-500 mt-1">No minimum notice period is specified for contract termination.</p>
                  </div>
                </div>
              </div>

              <div>
                <h3 className="flex items-center gap-2 text-sm font-medium text-amber-700 mb-2">
                  <AlertTriangle className="w-4 h-4" />
                  Warnings (3)
                </h3>
                <div className="space-y-2">
                  <div className="p-3 rounded-lg border border-amber-200 bg-amber-50">
                    <p className="text-sm font-medium text-slate-900">Broad non-compete clause</p>
                    <p className="text-xs text-slate-500 mt-1">Geographic and temporal scope may be overly restrictive.</p>
                  </div>
                </div>
              </div>
            </div>

            {/* Upgrade overlay */}
            <div className="absolute inset-0 flex items-center justify-center bg-white/40 backdrop-blur-[1px]">
              <div className="bg-white rounded-xl shadow-lg border border-slate-200 p-6 max-w-[280px] text-center">
                <div className="w-12 h-12 bg-amber-100 rounded-full flex items-center justify-center mx-auto mb-3">
                  <Sparkles className="w-6 h-6 text-amber-600" />
                </div>
                <h4 className="font-semibold text-slate-900 mb-1">Unlock Risk Analysis</h4>
                <p className="text-sm text-slate-600 mb-4">
                  Get AI-powered analysis of potential risks, missing protections, and jurisdiction issues.
                </p>
                <Link
                  href="/settings/billing"
                  className="inline-flex items-center gap-1.5 bg-[#202e46] text-white px-4 py-2 rounded-lg text-sm font-semibold hover:bg-[#1a2539] transition-colors"
                >
                  Upgrade to Pro
                  <ArrowRight className="w-3.5 h-3.5" />
                </Link>
              </div>
            </div>
          </div>
        )}

        {/* Loading state */}
        {loading && (
          <div className="space-y-3">
            <div className="flex items-center gap-2 text-slate-500 mb-4">
              <Loader2 className="w-4 h-4 animate-spin" />
              <span className="text-sm">Analyzing contract...</span>
            </div>
            <RiskCardSkeleton />
            <RiskCardSkeleton />
            <RiskCardSkeleton />
          </div>
        )}

        {/* Error state */}
        {error && !loading && (
          <div className="text-center py-8">
            {error.toLowerCase().includes("pro feature") || error.toLowerCase().includes("upgrade") ? (
              <>
                <Lock className="w-10 h-10 text-amber-500 mx-auto mb-3" />
                <p className="font-medium text-slate-900 mb-2">Pro Feature</p>
                <p className="text-sm text-slate-600 mb-4">{error}</p>
                <Link
                  href="/settings/billing"
                  className="inline-flex items-center px-4 py-2 text-sm bg-[#529ec6] text-white rounded-lg hover:bg-[#4589ad] transition-colors"
                >
                  Upgrade to Pro
                </Link>
              </>
            ) : (
              <>
                <AlertCircle className="w-10 h-10 text-red-400 mx-auto mb-3" />
                <p className="text-sm text-slate-600 mb-3">{error}</p>
                <button
                  onClick={onRefresh}
                  className="px-4 py-2 text-sm bg-slate-100 text-slate-700 rounded-lg hover:bg-slate-200 transition-colors"
                >
                  Try Again
                </button>
              </>
            )}
          </div>
        )}

        {/* Success state with results */}
        {analysis && !loading && !error && (
          <>
            {/* Overall summary */}
            {analysis.overallSummary && (
              <div
                className={`p-3 rounded-lg border ${getRiskLevelStyle(analysis.overallRiskLevel).bg
                  } ${getRiskLevelStyle(analysis.overallRiskLevel).border}`}
              >
                <div className="flex items-center gap-2 mb-2">
                  {(() => {
                    const style = getRiskLevelStyle(analysis.overallRiskLevel);
                    const Icon = style.icon;
                    return (
                      <>
                        <Icon className={`w-4 h-4 ${style.text}`} />
                        <span
                          className={`text-sm font-medium capitalize ${style.text}`}
                        >
                          {analysis.overallRiskLevel} Risk
                        </span>
                      </>
                    );
                  })()}
                </div>
                <p className="text-sm text-slate-600">{analysis.overallSummary}</p>
              </div>
            )}

            {/* No issues state */}
            {analysis.stats.total === 0 && (
              <div className="text-center py-8">
                <CheckCircle2 className="w-12 h-12 text-emerald-500 mx-auto mb-3" />
                <p className="font-medium text-slate-900">Looking good!</p>
                <p className="text-sm text-slate-500 mt-1">
                  No significant risks detected in this contract.
                </p>
              </div>
            )}

            {/* Critical issues */}
            {groupedRisks && groupedRisks.critical.length > 0 && (
              <div>
                <h3 className="flex items-center gap-2 text-sm font-medium text-red-700 mb-2">
                  <AlertCircle className="w-4 h-4" />
                  Critical Issues ({groupedRisks.critical.length})
                </h3>
                <div className="space-y-2">
                  {groupedRisks.critical.map((risk, i) => (
                    <RiskCard
                      key={`critical-${i}`}
                      risk={risk}
                      type={getRiskType(risk)}
                      onJumpToClause={onJumpToClause}
                      onImplement={onImplement}
                    />
                  ))}
                </div>
              </div>
            )}

            {/* Warnings */}
            {groupedRisks && groupedRisks.warning.length > 0 && (
              <div>
                <h3 className="flex items-center gap-2 text-sm font-medium text-amber-700 mb-2">
                  <AlertTriangle className="w-4 h-4" />
                  Warnings ({groupedRisks.warning.length})
                </h3>
                <div className="space-y-2">
                  {groupedRisks.warning.map((risk, i) => (
                    <RiskCard
                      key={`warning-${i}`}
                      risk={risk}
                      type={getRiskType(risk)}
                      onJumpToClause={onJumpToClause}
                      onImplement={onImplement}
                    />
                  ))}
                </div>
              </div>
            )}

            {/* Info */}
            {groupedRisks && groupedRisks.info.length > 0 && (
              <div>
                <h3 className="flex items-center gap-2 text-sm font-medium text-blue-600 mb-2">
                  <Info className="w-4 h-4" />
                  Suggestions ({groupedRisks.info.length})
                </h3>
                <div className="space-y-2">
                  {groupedRisks.info.map((risk, i) => (
                    <RiskCard
                      key={`info-${i}`}
                      risk={risk}
                      type={getRiskType(risk)}
                      onJumpToClause={onJumpToClause}
                      onImplement={onImplement}
                    />
                  ))}
                </div>
              </div>
            )}
          </>
        )}
      </div>

      {/* Footer */}
      {analysis && !loading && (
        <div className="px-4 py-3 border-t border-slate-200 flex-shrink-0">
          <p className="text-xs text-slate-400 text-center">
            AI-powered analysis. Always review with legal counsel.
          </p>
        </div>
      )}
    </aside>
  );
}
