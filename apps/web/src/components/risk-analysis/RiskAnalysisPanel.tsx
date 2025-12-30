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
} from "lucide-react";
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
            <AlertCircle className="w-10 h-10 text-red-400 mx-auto mb-3" />
            <p className="text-sm text-slate-600 mb-3">{error}</p>
            <button
              onClick={onRefresh}
              className="px-4 py-2 text-sm bg-slate-100 text-slate-700 rounded-lg hover:bg-slate-200 transition-colors"
            >
              Try Again
            </button>
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
