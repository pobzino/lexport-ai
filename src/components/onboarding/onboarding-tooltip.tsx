"use client";

import { useState, useEffect, useRef } from "react";
import { X, Lightbulb } from "lucide-react";
import { useOnboarding } from "./onboarding-context";

interface OnboardingTooltipProps {
  tipId: string;
  title: string;
  description: string;
  position?: "top" | "bottom" | "left" | "right";
  children: React.ReactNode;
}

export function OnboardingTooltip({
  tipId,
  title,
  description,
  position = "bottom",
  children,
}: OnboardingTooltipProps) {
  const { isTipDismissed, dismissTip, isLoading } = useOnboarding();
  const [isVisible, setIsVisible] = useState(false);
  const [hasBeenSeen, setHasBeenSeen] = useState(false);
  const containerRef = useRef<HTMLDivElement>(null);

  // Show tooltip after a brief delay when component mounts
  useEffect(() => {
    if (isLoading || isTipDismissed(tipId) || hasBeenSeen) return;

    const timer = setTimeout(() => {
      setIsVisible(true);
      setHasBeenSeen(true);
    }, 500);

    return () => clearTimeout(timer);
  }, [tipId, isTipDismissed, isLoading, hasBeenSeen]);

  const handleDismiss = () => {
    setIsVisible(false);
    dismissTip(tipId);
  };

  // Don't render tooltip wrapper if dismissed
  if (isTipDismissed(tipId) && !isVisible) {
    return <>{children}</>;
  }

  const positionClasses = {
    top: "bottom-full left-1/2 -translate-x-1/2 mb-2",
    bottom: "top-full left-1/2 -translate-x-1/2 mt-2",
    left: "right-full top-1/2 -translate-y-1/2 mr-2",
    right: "left-full top-1/2 -translate-y-1/2 ml-2",
  };

  const arrowClasses = {
    top: "bottom-0 left-1/2 -translate-x-1/2 translate-y-1/2 rotate-45",
    bottom: "top-0 left-1/2 -translate-x-1/2 -translate-y-1/2 rotate-45",
    left: "right-0 top-1/2 -translate-y-1/2 translate-x-1/2 rotate-45",
    right: "left-0 top-1/2 -translate-y-1/2 -translate-x-1/2 rotate-45",
  };

  return (
    <div ref={containerRef} className="relative inline-block">
      {children}

      {isVisible && (
        <div
          className={`absolute z-50 ${positionClasses[position]}`}
          style={{ width: "280px" }}
        >
          {/* Tooltip card */}
          <div className="bg-slate-900 text-white rounded-xl shadow-xl p-4 relative">
            {/* Arrow */}
            <div
              className={`absolute w-3 h-3 bg-slate-900 ${arrowClasses[position]}`}
            />

            {/* Header */}
            <div className="flex items-start justify-between gap-2 mb-2">
              <div className="flex items-center gap-2">
                <div className="w-6 h-6 bg-violet-500/20 rounded-lg flex items-center justify-center">
                  <Lightbulb className="w-3.5 h-3.5 text-violet-400" />
                </div>
                <h4 className="font-semibold text-sm">{title}</h4>
              </div>
              <button
                onClick={handleDismiss}
                className="text-slate-400 hover:text-white transition-colors p-0.5"
              >
                <X className="w-4 h-4" />
              </button>
            </div>

            {/* Description */}
            <p className="text-sm text-slate-300 leading-relaxed">
              {description}
            </p>

            {/* Dismiss button */}
            <button
              onClick={handleDismiss}
              className="mt-3 text-xs text-violet-400 hover:text-violet-300 transition-colors"
            >
              Got it
            </button>
          </div>
        </div>
      )}
    </div>
  );
}
