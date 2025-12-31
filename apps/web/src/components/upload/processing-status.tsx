"use client";

import {
  Upload,
  FileSearch,
  Sparkles,
  Brain,
  FileCheck,
  Check,
  Loader2,
} from "lucide-react";
import { motion } from "framer-motion";

export type ProcessingStep =
  | "uploading"
  | "extracting"
  | "ocr"
  | "parsing"
  | "creating"
  | "complete";

interface ProcessingStatusProps {
  currentStep: ProcessingStep;
  ocrRequired?: boolean;
  error?: string;
}

const STEPS = {
  uploading: {
    label: "Uploading file",
    description: "Securely uploading your document...",
    icon: Upload,
  },
  extracting: {
    label: "Extracting text",
    description: "Reading content from your document...",
    icon: FileSearch,
  },
  ocr: {
    label: "Processing with AI Vision",
    description: "Using GPT-4 to read your scanned document...",
    icon: Sparkles,
  },
  parsing: {
    label: "Parsing contract structure",
    description: "AI is organizing your contract into clauses...",
    icon: Brain,
  },
  creating: {
    label: "Creating contract",
    description: "Setting up your contract in Lexport...",
    icon: FileCheck,
  },
  complete: {
    label: "Complete",
    description: "Your contract is ready!",
    icon: Check,
  },
};

export function ProcessingStatus({
  currentStep,
  ocrRequired = false,
  error,
}: ProcessingStatusProps) {
  // Determine which steps to show based on OCR requirement
  const stepsToShow = getStepsForProcessing(ocrRequired);
  const currentIndex = stepsToShow.indexOf(currentStep);

  return (
    <div className="w-full max-w-md mx-auto">
      {/* Progress indicator */}
      <div className="relative mb-8">
        {/* Background line */}
        <div className="absolute top-5 left-0 right-0 h-0.5 bg-slate-200" />

        {/* Progress line */}
        <motion.div
          className="absolute top-5 left-0 h-0.5 bg-[#529ec6]"
          initial={{ width: "0%" }}
          animate={{
            width: `${(currentIndex / (stepsToShow.length - 1)) * 100}%`,
          }}
          transition={{ duration: 0.5, ease: "easeInOut" }}
        />

        {/* Step indicators */}
        <div className="relative flex justify-between">
          {stepsToShow.map((stepKey, index) => {
            const step = STEPS[stepKey];
            const Icon = step.icon;
            const isActive = index === currentIndex;
            const isComplete = index < currentIndex;

            return (
              <div key={stepKey} className="flex flex-col items-center">
                <motion.div
                  initial={{ scale: 0.8 }}
                  animate={{
                    scale: isActive ? 1.1 : 1,
                    backgroundColor: isComplete
                      ? "#10b981"
                      : isActive
                      ? "#529ec6"
                      : "#e2e8f0",
                  }}
                  className={`
                    w-10 h-10 rounded-full flex items-center justify-center
                    ${isComplete || isActive ? "shadow-lg" : ""}
                  `}
                >
                  {isComplete ? (
                    <Check className="w-5 h-5 text-white" />
                  ) : isActive ? (
                    <motion.div
                      animate={{ rotate: 360 }}
                      transition={{
                        duration: 2,
                        repeat: Infinity,
                        ease: "linear",
                      }}
                    >
                      <Loader2 className="w-5 h-5 text-white" />
                    </motion.div>
                  ) : (
                    <Icon className="w-5 h-5 text-slate-400" />
                  )}
                </motion.div>
              </div>
            );
          })}
        </div>
      </div>

      {/* Current step info */}
      <motion.div
        key={currentStep}
        initial={{ opacity: 0, y: 10 }}
        animate={{ opacity: 1, y: 0 }}
        className="text-center"
      >
        <h3 className="text-xl font-semibold text-slate-900 mb-2">
          {STEPS[currentStep].label}
        </h3>
        <p className="text-slate-500">{STEPS[currentStep].description}</p>
      </motion.div>

      {/* Error state */}
      {error && (
        <motion.div
          initial={{ opacity: 0, y: 10 }}
          animate={{ opacity: 1, y: 0 }}
          className="mt-6 p-4 bg-red-50 border border-red-200 rounded-xl text-center"
        >
          <p className="text-red-600">{error}</p>
        </motion.div>
      )}
    </div>
  );
}

function getStepsForProcessing(ocrRequired: boolean): ProcessingStep[] {
  const steps: ProcessingStep[] = ["uploading", "extracting"];

  if (ocrRequired) {
    steps.push("ocr");
  }

  // Always include parsing for AI processing
  steps.push("parsing", "creating", "complete");

  return steps;
}
