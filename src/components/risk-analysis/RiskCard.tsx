"use client";

import {
  AlertTriangle,
  AlertCircle,
  Info,
  ChevronRight,
  FileWarning,
  Shield,
  Scale,
  MapPin,
  HelpCircle,
  Coins,
} from "lucide-react";
import type {
  ClauseRisk,
  MissingProtection,
  JurisdictionAlert,
  RiskSeverity,
  RiskCategory,
} from "@/types/risk-analysis";

// Severity configuration
const SEVERITY_CONFIG: Record<
  RiskSeverity,
  {
    icon: typeof AlertCircle;
    bgColor: string;
    borderColor: string;
    textColor: string;
    badgeColor: string;
  }
> = {
  critical: {
    icon: AlertCircle,
    bgColor: "bg-red-50",
    borderColor: "border-red-200",
    textColor: "text-red-700",
    badgeColor: "bg-red-100 text-red-700",
  },
  warning: {
    icon: AlertTriangle,
    bgColor: "bg-amber-50",
    borderColor: "border-amber-200",
    textColor: "text-amber-700",
    badgeColor: "bg-amber-100 text-amber-700",
  },
  info: {
    icon: Info,
    bgColor: "bg-blue-50",
    borderColor: "border-blue-200",
    textColor: "text-blue-600",
    badgeColor: "bg-blue-100 text-blue-600",
  },
};

// Category icons
const CATEGORY_ICONS: Record<RiskCategory, typeof AlertCircle> = {
  unusual_terms: FileWarning,
  missing_protection: Shield,
  one_sided: Scale,
  jurisdiction_issue: MapPin,
  ambiguity: HelpCircle,
  liability_exposure: Coins,
};

// Category labels
const CATEGORY_LABELS: Record<RiskCategory, string> = {
  unusual_terms: "Unusual",
  missing_protection: "Missing",
  one_sided: "One-sided",
  jurisdiction_issue: "Jurisdiction",
  ambiguity: "Unclear",
  liability_exposure: "Liability",
};

interface RiskCardProps {
  risk: ClauseRisk | MissingProtection | JurisdictionAlert;
  type: "clause" | "missing" | "jurisdiction";
  onJumpToClause?: (clauseId: string) => void;
}

export function RiskCard({ risk, type, onJumpToClause }: RiskCardProps) {
  const config = SEVERITY_CONFIG[risk.severity];
  const SeverityIcon = config.icon;

  // Get category icon and label for clause risks
  const isClauseRisk = type === "clause" && "category" in risk;
  const CategoryIcon = isClauseRisk
    ? CATEGORY_ICONS[(risk as ClauseRisk).category]
    : null;
  const categoryLabel = isClauseRisk
    ? CATEGORY_LABELS[(risk as ClauseRisk).category]
    : null;

  // Get clause info for clause risks
  const clauseTitle = "clauseTitle" in risk ? risk.clauseTitle : null;
  const clauseId = "clauseId" in risk ? risk.clauseId : null;
  const affectedClauseId =
    "affectedClauseId" in risk ? risk.affectedClauseId : null;

  // Get additional details
  const problematicText = "problematicText" in risk ? risk.problematicText : null;
  const suggestion = "suggestion" in risk ? risk.suggestion : null;
  const legalReference = "legalReference" in risk ? risk.legalReference : null;
  const jurisdiction = "jurisdiction" in risk ? risk.jurisdiction : null;

  const handleJumpToClause = () => {
    const targetClauseId = clauseId || affectedClauseId;
    if (targetClauseId && onJumpToClause) {
      onJumpToClause(targetClauseId);
    }
  };

  return (
    <div
      className={`rounded-lg border p-3 transition-all hover:shadow-sm ${config.bgColor} ${config.borderColor}`}
    >
      {/* Header */}
      <div className="flex items-start gap-2">
        <SeverityIcon className={`w-4 h-4 mt-0.5 flex-shrink-0 ${config.textColor}`} />
        <div className="flex-1 min-w-0">
          <div className="flex items-center gap-2 flex-wrap">
            <h4 className={`font-medium text-sm ${config.textColor}`}>
              {risk.title}
            </h4>
            {categoryLabel && CategoryIcon && (
              <span
                className={`inline-flex items-center gap-1 px-1.5 py-0.5 text-xs rounded ${config.badgeColor}`}
              >
                <CategoryIcon className="w-3 h-3" />
                {categoryLabel}
              </span>
            )}
          </div>

          {/* Clause reference */}
          {clauseTitle && (
            <p className="text-xs text-slate-500 mt-0.5">
              in {clauseTitle}
            </p>
          )}

          {/* Jurisdiction reference */}
          {jurisdiction && type === "jurisdiction" && (
            <p className="text-xs text-slate-500 mt-0.5">{jurisdiction}</p>
          )}
        </div>

        {/* Jump to clause button */}
        {(clauseId || affectedClauseId) && onJumpToClause && (
          <button
            onClick={handleJumpToClause}
            className={`p-1 rounded hover:bg-white/50 transition-colors ${config.textColor}`}
            title="Jump to clause"
          >
            <ChevronRight className="w-4 h-4" />
          </button>
        )}
      </div>

      {/* Description */}
      <p className="text-sm text-slate-600 mt-2 leading-relaxed">
        {risk.description}
      </p>

      {/* Problematic text quote */}
      {problematicText && (
        <div className="mt-2 p-2 bg-white/50 rounded border border-slate-200/50">
          <p className="text-xs text-slate-500 mb-1">Concerning text:</p>
          <p className="text-xs text-slate-700 italic">"{problematicText}"</p>
        </div>
      )}

      {/* Legal reference */}
      {legalReference && (
        <p className="text-xs text-slate-500 mt-2">
          <span className="font-medium">Ref:</span> {legalReference}
        </p>
      )}

      {/* Suggestion */}
      {suggestion && (
        <div className="mt-2 p-2 bg-white/70 rounded border border-emerald-200">
          <p className="text-xs text-emerald-700">
            <span className="font-medium">Suggestion:</span> {suggestion}
          </p>
        </div>
      )}
    </div>
  );
}

// Skeleton loading component
export function RiskCardSkeleton() {
  return (
    <div className="rounded-lg border border-slate-200 bg-slate-50 p-3 animate-pulse">
      <div className="flex items-start gap-2">
        <div className="w-4 h-4 bg-slate-200 rounded" />
        <div className="flex-1">
          <div className="h-4 bg-slate-200 rounded w-3/4" />
          <div className="h-3 bg-slate-200 rounded w-1/2 mt-1" />
        </div>
      </div>
      <div className="h-12 bg-slate-200 rounded mt-2" />
    </div>
  );
}
