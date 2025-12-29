"use client";

import { useState } from "react";
import Link from "next/link";
import { Check, ChevronDown, ChevronUp, X, Sparkles } from "lucide-react";
import { useOnboarding } from "./onboarding-context";

export function OnboardingChecklist() {
  const {
    steps,
    completedCount,
    totalCount,
    showChecklist,
    dismissChecklist,
    isOnboardingComplete,
    isLoading,
  } = useOnboarding();

  const [isExpanded, setIsExpanded] = useState(true);

  // Don't show if loading, checklist dismissed, or all steps complete
  if (isLoading || !showChecklist || completedCount >= totalCount) {
    return null;
  }

  const progressPercent = Math.round((completedCount / totalCount) * 100);

  return (
    <div className="bg-white rounded-xl border border-slate-200 shadow-sm overflow-hidden">
      {/* Header */}
      <div
        className="flex items-center justify-between p-4 cursor-pointer hover:bg-slate-50 transition-colors"
        onClick={() => setIsExpanded(!isExpanded)}
      >
        <div className="flex items-center gap-3">
          <div className="w-10 h-10 bg-gradient-to-br from-violet-100 to-purple-100 rounded-xl flex items-center justify-center">
            <Sparkles className="w-5 h-5 text-violet-600" />
          </div>
          <div>
            <h3 className="font-semibold text-slate-900">Getting Started</h3>
            <p className="text-sm text-slate-500">
              {completedCount} of {totalCount} completed
            </p>
          </div>
        </div>

        <div className="flex items-center gap-2">
          {/* Progress circle */}
          <div className="relative w-10 h-10">
            <svg className="w-10 h-10 transform -rotate-90">
              <circle
                cx="20"
                cy="20"
                r="16"
                stroke="#e2e8f0"
                strokeWidth="3"
                fill="none"
              />
              <circle
                cx="20"
                cy="20"
                r="16"
                stroke="url(#gradient)"
                strokeWidth="3"
                fill="none"
                strokeLinecap="round"
                strokeDasharray={`${progressPercent} 100`}
              />
              <defs>
                <linearGradient id="gradient" x1="0%" y1="0%" x2="100%" y2="0%">
                  <stop offset="0%" stopColor="#8b5cf6" />
                  <stop offset="100%" stopColor="#a855f7" />
                </linearGradient>
              </defs>
            </svg>
            <span className="absolute inset-0 flex items-center justify-center text-xs font-semibold text-slate-700">
              {progressPercent}%
            </span>
          </div>

          {isExpanded ? (
            <ChevronUp className="w-5 h-5 text-slate-400" />
          ) : (
            <ChevronDown className="w-5 h-5 text-slate-400" />
          )}
        </div>
      </div>

      {/* Steps */}
      {isExpanded && (
        <div className="border-t border-slate-100">
          <div className="p-4 space-y-2">
            {steps.map((step, idx) => (
              <div
                key={step.id}
                className={`flex items-start gap-3 p-3 rounded-lg transition-colors ${
                  step.completed
                    ? "bg-emerald-50"
                    : idx === completedCount
                      ? "bg-violet-50 border border-violet-200"
                      : "bg-slate-50"
                }`}
              >
                {/* Checkbox */}
                <div className={`w-6 h-6 rounded-full flex items-center justify-center flex-shrink-0 mt-0.5 ${
                  step.completed
                    ? "bg-emerald-500"
                    : idx === completedCount
                      ? "bg-violet-500"
                      : "bg-slate-200"
                }`}>
                  {step.completed ? (
                    <Check className="w-4 h-4 text-white" />
                  ) : (
                    <span className={`text-xs font-semibold ${
                      idx === completedCount ? "text-white" : "text-slate-500"
                    }`}>
                      {idx + 1}
                    </span>
                  )}
                </div>

                {/* Content */}
                <div className="flex-1 min-w-0">
                  <p className={`font-medium ${
                    step.completed
                      ? "text-emerald-700 line-through"
                      : "text-slate-900"
                  }`}>
                    {step.label}
                  </p>
                  <p className="text-sm text-slate-500 mt-0.5">
                    {step.description}
                  </p>
                </div>

                {/* Action */}
                {!step.completed && step.href && idx === completedCount && (
                  <Link
                    href={step.href}
                    className="px-3 py-1.5 text-sm font-medium text-violet-600 bg-white border border-violet-200 rounded-lg hover:bg-violet-50 transition-colors flex-shrink-0"
                  >
                    Start
                  </Link>
                )}
              </div>
            ))}
          </div>

          {/* Footer */}
          <div className="px-4 pb-4">
            <button
              onClick={dismissChecklist}
              className="text-sm text-slate-400 hover:text-slate-600 transition-colors"
            >
              Dismiss checklist
            </button>
          </div>
        </div>
      )}
    </div>
  );
}

// Compact version for sidebar
export function OnboardingChecklistCompact() {
  const {
    completedCount,
    totalCount,
    showChecklist,
    isLoading,
  } = useOnboarding();

  if (isLoading || !showChecklist || completedCount >= totalCount) {
    return null;
  }

  const progressPercent = Math.round((completedCount / totalCount) * 100);

  return (
    <Link
      href="/dashboard"
      className="flex items-center gap-3 px-3 py-2 rounded-lg bg-violet-50 hover:bg-violet-100 transition-colors"
    >
      <div className="relative w-8 h-8">
        <svg className="w-8 h-8 transform -rotate-90">
          <circle
            cx="16"
            cy="16"
            r="12"
            stroke="#e2e8f0"
            strokeWidth="2"
            fill="none"
          />
          <circle
            cx="16"
            cy="16"
            r="12"
            stroke="#8b5cf6"
            strokeWidth="2"
            fill="none"
            strokeLinecap="round"
            strokeDasharray={`${progressPercent * 0.75} 100`}
          />
        </svg>
        <span className="absolute inset-0 flex items-center justify-center text-[10px] font-bold text-violet-600">
          {completedCount}/{totalCount}
        </span>
      </div>
      <div className="text-sm">
        <p className="font-medium text-violet-700">Getting Started</p>
        <p className="text-violet-500 text-xs">{progressPercent}% complete</p>
      </div>
    </Link>
  );
}
