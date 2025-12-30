"use client";

import { useState, useEffect, useRef } from "react";
import { Sparkles, FileText, Scale, Shield, CheckCircle2 } from "lucide-react";
import { motion, AnimatePresence } from "framer-motion";

const GENERATION_STAGES = [
  {
    id: "analyzing",
    label: "Analyzing requirements",
    description: "Understanding your contract needs...",
    icon: Sparkles,
    duration: 5000,
  },
  {
    id: "drafting",
    label: "Drafting clauses",
    description: "Writing legally-sound provisions...",
    icon: FileText,
    duration: 15000,
  },
  {
    id: "reviewing",
    label: "Legal review",
    description: "Ensuring legal compliance...",
    icon: Scale,
    duration: 15000,
  },
  {
    id: "finalizing",
    label: "Finalizing document",
    description: "Applying finishing touches...",
    icon: Shield,
    duration: 15000,
  },
];

const TIPS = [
  "AI contracts save legal teams 80% of their time",
  "Each clause is optimized for your jurisdiction",
  "You can customize every section after generation",
  "E-signatures are included at no extra cost",
  "Contracts are automatically saved with version history",
];

interface ContractGeneratingOverlayProps {
  isVisible: boolean;
  contractType?: string;
}

export function ContractGeneratingOverlay({
  isVisible,
  contractType,
}: ContractGeneratingOverlayProps) {
  const [currentStage, setCurrentStage] = useState(0);
  const [tipIndex, setTipIndex] = useState(0);
  const [progress, setProgress] = useState(0);
  const startTimeRef = useRef<number | null>(null);

  // Cycle through stages - using refs to prevent reset
  useEffect(() => {
    if (!isVisible) {
      setCurrentStage(0);
      setProgress(0);
      startTimeRef.current = null;
      return;
    }

    // Initialize start time only once
    if (!startTimeRef.current) {
      startTimeRef.current = Date.now();
    }

    const totalDuration = GENERATION_STAGES.reduce((acc, s) => acc + s.duration, 0);

    // Smooth progress animation
    const progressInterval = setInterval(() => {
      if (!startTimeRef.current) return;

      const elapsed = Date.now() - startTimeRef.current;
      // Cap at 95% until complete, to show it's still working
      const newProgress = Math.min((elapsed / totalDuration) * 100, 95);
      setProgress(newProgress);

      // Calculate which stage we should be in based on elapsed time
      let accumulatedDuration = 0;
      for (let i = 0; i < GENERATION_STAGES.length; i++) {
        accumulatedDuration += GENERATION_STAGES[i].duration;
        if (elapsed < accumulatedDuration) {
          setCurrentStage(i);
          break;
        } else if (i === GENERATION_STAGES.length - 1) {
          setCurrentStage(i);
        }
      }
    }, 100);

    return () => {
      clearInterval(progressInterval);
    };
  }, [isVisible]);

  // Cycle tips
  useEffect(() => {
    if (!isVisible) return;

    const interval = setInterval(() => {
      setTipIndex((prev) => (prev + 1) % TIPS.length);
    }, 4000);

    return () => clearInterval(interval);
  }, [isVisible]);

  if (!isVisible) return null;

  const stage = GENERATION_STAGES[currentStage];
  const StageIcon = stage?.icon || Sparkles;

  return (
    <motion.div
      initial={{ opacity: 0 }}
      animate={{ opacity: 1 }}
      exit={{ opacity: 0 }}
      className="fixed inset-0 z-50 flex items-center justify-center"
    >
      {/* Dark navy background with gradient */}
      <div className="absolute inset-0 bg-[#202e46]">
        {/* Animated gradient orbs */}
        <motion.div
          animate={{
            scale: [1, 1.2, 1],
            opacity: [0.3, 0.5, 0.3]
          }}
          transition={{
            duration: 4,
            repeat: Infinity,
            ease: "easeInOut"
          }}
          className="absolute top-1/4 -left-20 w-96 h-96 bg-gradient-to-br from-[#529ec6]/30 to-transparent rounded-full blur-3xl"
        />
        <motion.div
          animate={{
            scale: [1.2, 1, 1.2],
            opacity: [0.2, 0.4, 0.2]
          }}
          transition={{
            duration: 5,
            repeat: Infinity,
            ease: "easeInOut",
            delay: 1
          }}
          className="absolute bottom-1/4 -right-20 w-96 h-96 bg-gradient-to-tl from-emerald-500/20 to-transparent rounded-full blur-3xl"
        />
        <motion.div
          animate={{
            scale: [1, 1.3, 1],
            opacity: [0.15, 0.3, 0.15]
          }}
          transition={{
            duration: 6,
            repeat: Infinity,
            ease: "easeInOut",
            delay: 2
          }}
          className="absolute top-1/2 left-1/2 -translate-x-1/2 -translate-y-1/2 w-[600px] h-[600px] bg-gradient-to-r from-[#529ec6]/20 via-transparent to-emerald-500/10 rounded-full blur-3xl"
        />
      </div>

      {/* Content */}
      <div className="relative z-10 max-w-lg w-full mx-4 text-center">
        {/* Main icon with glow effect */}
        <motion.div
          className="relative inline-flex mb-8"
          initial={{ scale: 0.8, opacity: 0 }}
          animate={{ scale: 1, opacity: 1 }}
          transition={{ duration: 0.5, ease: "easeOut" }}
        >
          <motion.div
            animate={{
              scale: [1, 1.2, 1],
              opacity: [0.3, 0.6, 0.3]
            }}
            transition={{
              duration: 2,
              repeat: Infinity,
              ease: "easeInOut"
            }}
            className="absolute inset-0 bg-[#529ec6]/40 rounded-full blur-2xl"
          />
          <div className="relative w-24 h-24 bg-gradient-to-br from-[#529ec6] to-[#3d7a9c] rounded-2xl flex items-center justify-center shadow-2xl shadow-[#529ec6]/30">
            <motion.div
              animate={{
                scale: [1, 1.15, 1],
                opacity: [0.9, 1, 0.9]
              }}
              transition={{
                duration: 1.5,
                repeat: Infinity,
                ease: "easeInOut"
              }}
            >
              <Sparkles className="w-12 h-12 text-white" />
            </motion.div>
          </div>
        </motion.div>

        {/* Title */}
        <motion.h2
          initial={{ y: 20, opacity: 0 }}
          animate={{ y: 0, opacity: 1 }}
          transition={{ delay: 0.2 }}
          className="text-3xl font-bold text-white mb-2"
        >
          Creating Your Contract
        </motion.h2>
        {contractType && (
          <motion.p
            initial={{ y: 20, opacity: 0 }}
            animate={{ y: 0, opacity: 1 }}
            transition={{ delay: 0.3 }}
            className="text-[#529ec6] mb-2 capitalize font-medium"
          >
            {contractType.replace(/_/g, " ")}
          </motion.p>
        )}
        <motion.p
          initial={{ y: 20, opacity: 0 }}
          animate={{ y: 0, opacity: 1 }}
          transition={{ delay: 0.35 }}
          className="text-slate-400 text-sm mb-6"
        >
          This typically takes 30-60 seconds. Please don&apos;t close this page.
        </motion.p>

        {/* Progress bar */}
        <motion.div
          initial={{ scaleX: 0, opacity: 0 }}
          animate={{ scaleX: 1, opacity: 1 }}
          transition={{ delay: 0.4 }}
          className="relative h-2 bg-slate-700/50 rounded-full overflow-hidden mb-8 mx-8"
        >
          <motion.div
            className="absolute inset-y-0 left-0 bg-gradient-to-r from-[#529ec6] via-emerald-500 to-[#529ec6] rounded-full"
            style={{ width: `${progress}%` }}
            transition={{ duration: 0.3, ease: "easeOut" }}
          />
          <div className="absolute inset-0 bg-gradient-to-r from-transparent via-white/20 to-transparent animate-shimmer" />
        </motion.div>

        {/* Stage indicators */}
        <motion.div
          initial={{ y: 20, opacity: 0 }}
          animate={{ y: 0, opacity: 1 }}
          transition={{ delay: 0.5 }}
          className="flex justify-center gap-3 mb-8"
        >
          {GENERATION_STAGES.map((s, idx) => {
            const Icon = s.icon;
            const isActive = idx === currentStage;
            const isCompleted = idx < currentStage;

            return (
              <motion.div
                key={s.id}
                animate={isActive ? { scale: [1, 1.1, 1] } : {}}
                transition={{ duration: 1, repeat: isActive ? Infinity : 0 }}
                className={`relative flex items-center justify-center w-12 h-12 rounded-xl transition-all duration-500 ${isActive
                  ? "bg-[#529ec6] shadow-lg shadow-[#529ec6]/40"
                  : isCompleted
                    ? "bg-emerald-500"
                    : "bg-slate-700/50"
                  }`}
              >
                {isCompleted ? (
                  <CheckCircle2 className="w-6 h-6 text-white" />
                ) : (
                  <Icon
                    className={`w-6 h-6 ${isActive ? "text-white" : "text-slate-500"
                      }`}
                  />
                )}
                {isActive && (
                  <motion.div
                    animate={{ scale: [1, 1.5], opacity: [0.5, 0] }}
                    transition={{ duration: 1.5, repeat: Infinity }}
                    className="absolute inset-0 rounded-xl bg-[#529ec6]"
                  />
                )}
              </motion.div>
            );
          })}
        </motion.div>

        {/* Current stage info */}
        <motion.div
          initial={{ y: 20, opacity: 0 }}
          animate={{ y: 0, opacity: 1 }}
          transition={{ delay: 0.6 }}
          className="space-y-2 mb-12"
        >
          <AnimatePresence mode="wait">
            <motion.p
              key={stage?.label}
              initial={{ y: 10, opacity: 0 }}
              animate={{ y: 0, opacity: 1 }}
              exit={{ y: -10, opacity: 0 }}
              className="text-xl font-semibold text-white flex items-center justify-center gap-2"
            >
              <StageIcon className="w-5 h-5 text-[#529ec6]" />
              {stage?.label}
            </motion.p>
          </AnimatePresence>
          <AnimatePresence mode="wait">
            <motion.p
              key={stage?.description}
              initial={{ opacity: 0 }}
              animate={{ opacity: 1 }}
              exit={{ opacity: 0 }}
              className="text-slate-400"
            >
              {stage?.description}
            </motion.p>
          </AnimatePresence>
        </motion.div>

        {/* Rotating tips */}
        <motion.div
          initial={{ y: 20, opacity: 0 }}
          animate={{ y: 0, opacity: 1 }}
          transition={{ delay: 0.7 }}
          className="bg-slate-800/40 backdrop-blur-sm rounded-xl px-6 py-4 mx-4 border border-slate-700/50"
        >
          <p className="text-sm text-slate-400">
            <span className="text-[#529ec6] font-medium">Did you know?</span>{" "}
            <AnimatePresence mode="wait">
              <motion.span
                key={tipIndex}
                initial={{ opacity: 0, y: 10 }}
                animate={{ opacity: 1, y: 0 }}
                exit={{ opacity: 0, y: -10 }}
                className="inline-block"
              >
                {TIPS[tipIndex]}
              </motion.span>
            </AnimatePresence>
          </p>
        </motion.div>
      </div>

      {/* Floating particles - brand colored */}
      <div className="absolute inset-0 pointer-events-none overflow-hidden">
        {[...Array(8)].map((_, i) => (
          <motion.div
            key={i}
            animate={{
              y: [0, -30, 0],
              x: [0, (i % 2 === 0 ? 10 : -10), 0],
              opacity: [0.2, 0.5, 0.2],
            }}
            transition={{
              duration: 3 + i * 0.5,
              repeat: Infinity,
              delay: i * 0.3,
              ease: "easeInOut",
            }}
            className={`absolute w-2 h-2 rounded-full ${i % 3 === 0
              ? "bg-[#529ec6]/40"
              : i % 3 === 1
                ? "bg-emerald-500/30"
                : "bg-white/20"
              }`}
            style={{
              left: `${10 + i * 12}%`,
              top: `${15 + (i % 4) * 20}%`,
            }}
          />
        ))}
      </div>
    </motion.div>
  );
}
