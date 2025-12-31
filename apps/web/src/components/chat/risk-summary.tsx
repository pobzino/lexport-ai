"use client";

import { AlertTriangle, AlertCircle, Info, Shield } from "lucide-react";

export type RiskSummaryProps = {
  overallRiskLevel: "low" | "medium" | "high";
  overallSummary: string;
  stats: {
    total: number;
    critical: number;
    warning: number;
    info: number;
  };
};

const riskColors = {
  low: "bg-green-50 text-green-800 border-green-200",
  medium: "bg-yellow-50 text-yellow-800 border-yellow-200",
  high: "bg-red-50 text-red-800 border-red-200",
};

const riskIcons = {
  low: Shield,
  medium: AlertCircle,
  high: AlertTriangle,
};

export function RiskSummary({
  overallRiskLevel,
  overallSummary,
  stats,
}: RiskSummaryProps) {
  const Icon = riskIcons[overallRiskLevel];

  return (
    <div
      className={`rounded-lg border p-4 ${riskColors[overallRiskLevel]}`}
    >
      <div className="flex items-center gap-2 mb-2">
        <Icon className="h-5 w-5" />
        <span className="font-semibold capitalize">
          {overallRiskLevel} Risk
        </span>
      </div>
      <p className="text-sm mb-3">{overallSummary}</p>
      <div className="flex gap-4 text-xs">
        {stats.critical > 0 && (
          <span className="flex items-center gap-1 text-red-700">
            <AlertTriangle className="h-3 w-3" /> {stats.critical} critical
          </span>
        )}
        {stats.warning > 0 && (
          <span className="flex items-center gap-1 text-yellow-700">
            <AlertCircle className="h-3 w-3" /> {stats.warning} warnings
          </span>
        )}
        {stats.info > 0 && (
          <span className="flex items-center gap-1 text-blue-700">
            <Info className="h-3 w-3" /> {stats.info} info
          </span>
        )}
      </div>
    </div>
  );
}
