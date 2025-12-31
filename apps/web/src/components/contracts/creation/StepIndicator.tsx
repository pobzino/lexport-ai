"use client";

import { Check } from "lucide-react";
import { motion } from "framer-motion";

export interface WizardStep {
  id: number;
  name: string;
  description: string;
}

interface StepIndicatorProps {
  steps: WizardStep[];
  currentStep: number;
  onStepClick?: (step: number) => void;
  allowNavigation?: boolean;
}

export function StepIndicator({
  steps,
  currentStep,
  onStepClick,
  allowNavigation = false,
}: StepIndicatorProps) {
  return (
    <div className="bg-white border-b border-slate-200">
      <div className="max-w-5xl mx-auto px-4 py-4">
        <div className="flex items-center justify-center">
          {steps.map((step, index) => {
            const isCompleted = currentStep > step.id;
            const isCurrent = currentStep === step.id;
            const isClickable = allowNavigation && (isCompleted || isCurrent);

            return (
              <div key={step.id} className="flex items-center">
                <button
                  onClick={() => isClickable && onStepClick?.(step.id)}
                  disabled={!isClickable}
                  className={`flex items-center ${isClickable ? "cursor-pointer" : "cursor-default"}`}
                >
                  <motion.div
                    initial={false}
                    animate={{
                      scale: isCurrent ? 1.05 : 1,
                      backgroundColor: isCompleted
                        ? "rgb(16 185 129)" // emerald-500
                        : isCurrent
                          ? "#202e46"
                          : "rgb(226 232 240)", // slate-200
                    }}
                    transition={{ duration: 0.2 }}
                    className={`w-8 h-8 rounded-full flex items-center justify-center text-sm font-medium ${
                      isCompleted || isCurrent ? "text-white" : "text-slate-600"
                    }`}
                  >
                    {isCompleted ? (
                      <motion.div
                        initial={{ scale: 0 }}
                        animate={{ scale: 1 }}
                        transition={{ type: "spring", stiffness: 500, damping: 30 }}
                      >
                        <Check className="w-4 h-4" />
                      </motion.div>
                    ) : (
                      step.id
                    )}
                  </motion.div>
                  <div className="ml-3 hidden sm:block text-left">
                    <p
                      className={`text-sm font-medium transition-colors ${
                        isCurrent || isCompleted ? "text-slate-900" : "text-slate-500"
                      }`}
                    >
                      {step.name}
                    </p>
                    <p className="text-xs text-slate-500">{step.description}</p>
                  </div>
                </button>
                {index < steps.length - 1 && (
                  <motion.div
                    initial={false}
                    animate={{
                      backgroundColor: isCompleted
                        ? "rgb(16 185 129)"
                        : "rgb(226 232 240)",
                    }}
                    transition={{ duration: 0.3 }}
                    className="w-16 sm:w-24 h-0.5 mx-4"
                  />
                )}
              </div>
            );
          })}
        </div>
      </div>
    </div>
  );
}

// Mobile-friendly step indicator (compact version)
export function MobileStepIndicator({
  steps,
  currentStep,
}: Pick<StepIndicatorProps, "steps" | "currentStep">) {
  const current = steps.find((s) => s.id === currentStep);

  return (
    <div className="bg-white border-b border-slate-200 px-4 py-3 sm:hidden">
      <div className="flex items-center justify-between">
        <div>
          <p className="text-sm font-medium text-slate-900">
            Step {currentStep} of {steps.length}
          </p>
          <p className="text-xs text-slate-500">{current?.name}</p>
        </div>
        <div className="flex gap-1">
          {steps.map((step) => (
            <div
              key={step.id}
              className={`w-2 h-2 rounded-full transition-colors ${
                currentStep > step.id
                  ? "bg-emerald-500"
                  : currentStep === step.id
                    ? "bg-[#202e46]"
                    : "bg-slate-200"
              }`}
            />
          ))}
        </div>
      </div>
    </div>
  );
}
