"use client";

import { useState } from "react";
import { ChevronLeft, ChevronRight } from "lucide-react";
import { RiskSummary } from "./risk-summary";
import { ClauseRiskCard } from "./clause-risk-card";
import { MissingProtectionCard } from "./missing-protection-card";
import { JurisdictionAlertCard } from "./jurisdiction-alert-card";

export type RiskCarouselProps = {
  overallRiskLevel: "low" | "medium" | "high";
  overallSummary: string;
  stats: {
    total: number;
    critical: number;
    warning: number;
    info: number;
  };
  clauseRisks: Array<{
    clauseId: string;
    clauseTitle: string;
    severity: "critical" | "warning" | "info";
    category: string;
    title: string;
    description: string;
    problematicText?: string;
    suggestion?: string;
    affectedParty?: "client" | "contractor" | "both";
  }>;
  missingProtections: Array<{
    severity: "critical" | "warning" | "info";
    title: string;
    description: string;
    standardFor?: string[];
    suggestion: string;
  }>;
  jurisdictionAlerts: Array<{
    severity: "critical" | "warning" | "info";
    jurisdiction: string;
    title: string;
    description: string;
    legalReference?: string;
    affectedClauseId?: string;
  }>;
  onJumpToClause?: (clauseId: string) => void;
  onApplyFix?: (suggestion: string, clauseId: string) => void;
  onAddClause?: (suggestion: string) => void;
};

type RiskItem = {
  type: "clauseRisk" | "missingProtection" | "jurisdictionAlert";
  severity: "critical" | "warning" | "info";
  data: unknown;
};

export function RiskCarousel({
  overallRiskLevel,
  overallSummary,
  stats,
  clauseRisks,
  missingProtections,
  jurisdictionAlerts,
  onJumpToClause,
  onApplyFix,
  onAddClause,
}: RiskCarouselProps) {
  const [currentIndex, setCurrentIndex] = useState(0);

  // Combine all risks into a single array, sorted by severity
  const allRisks: RiskItem[] = [
    ...clauseRisks.map((r) => ({ type: "clauseRisk" as const, severity: r.severity, data: r })),
    ...jurisdictionAlerts.map((a) => ({ type: "jurisdictionAlert" as const, severity: a.severity, data: a })),
    ...missingProtections.map((p) => ({ type: "missingProtection" as const, severity: p.severity, data: p })),
  ].sort((a, b) => {
    const order = { critical: 0, warning: 1, info: 2 };
    return order[a.severity] - order[b.severity];
  });

  const totalItems = allRisks.length;
  const hasMultipleItems = totalItems > 1;

  const goToPrevious = () => {
    setCurrentIndex((prev) => (prev === 0 ? totalItems - 1 : prev - 1));
  };

  const goToNext = () => {
    setCurrentIndex((prev) => (prev === totalItems - 1 ? 0 : prev + 1));
  };

  const renderCurrentItem = () => {
    if (totalItems === 0) return null;
    const item = allRisks[currentIndex];

    switch (item.type) {
      case "clauseRisk": {
        const risk = item.data as RiskCarouselProps["clauseRisks"][0];
        return (
          <ClauseRiskCard
            {...risk}
            onJumpToClause={onJumpToClause}
            onApplyFix={onApplyFix}
          />
        );
      }
      case "jurisdictionAlert": {
        const alert = item.data as RiskCarouselProps["jurisdictionAlerts"][0];
        return (
          <JurisdictionAlertCard
            {...alert}
            onJumpToClause={onJumpToClause}
          />
        );
      }
      case "missingProtection": {
        const protection = item.data as RiskCarouselProps["missingProtections"][0];
        return (
          <MissingProtectionCard
            {...protection}
            onAddClause={onAddClause}
          />
        );
      }
    }
  };

  return (
    <div className="space-y-3">
      {/* Summary - always visible */}
      <RiskSummary
        overallRiskLevel={overallRiskLevel}
        overallSummary={overallSummary}
        stats={stats}
      />

      {/* Carousel for individual risks */}
      {totalItems > 0 && (
        <div className="relative">
          {/* Navigation header */}
          {hasMultipleItems && (
            <div className="flex items-center justify-between mb-2">
              <span className="text-xs text-slate-500">
                {currentIndex + 1} of {totalItems} issues
              </span>
              <div className="flex items-center gap-1">
                <button
                  onClick={goToPrevious}
                  className="p-1 rounded hover:bg-slate-100 text-slate-600"
                  aria-label="Previous issue"
                >
                  <ChevronLeft className="h-4 w-4" />
                </button>
                <button
                  onClick={goToNext}
                  className="p-1 rounded hover:bg-slate-100 text-slate-600"
                  aria-label="Next issue"
                >
                  <ChevronRight className="h-4 w-4" />
                </button>
              </div>
            </div>
          )}

          {/* Current card */}
          <div className="transition-all duration-200">
            {renderCurrentItem()}
          </div>

          {/* Dot indicators */}
          {hasMultipleItems && (
            <div className="flex items-center justify-center gap-1 mt-2">
              {allRisks.map((item, idx) => (
                <button
                  key={idx}
                  onClick={() => setCurrentIndex(idx)}
                  className={`h-1.5 rounded-full transition-all ${
                    idx === currentIndex
                      ? "w-4 bg-slate-600"
                      : `w-1.5 ${
                          item.severity === "critical"
                            ? "bg-red-300"
                            : item.severity === "warning"
                            ? "bg-amber-300"
                            : "bg-blue-300"
                        }`
                  }`}
                  aria-label={`Go to issue ${idx + 1}`}
                />
              ))}
            </div>
          )}
        </div>
      )}
    </div>
  );
}
