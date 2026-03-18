"use client";

import { useState, useEffect, useRef } from "react";
import { Sparkles, CheckCircle2 } from "lucide-react";
import { motion, AnimatePresence } from "framer-motion";

const STAGES = [
  { id: "analyzing", label: "Analyzing requirements" },
  { id: "drafting", label: "Drafting clauses" },
  { id: "reviewing", label: "Legal review" },
  { id: "finalizing", label: "Finalizing document" },
];

const STAGE_DURATIONS = [5000, 15000, 15000, 15000];

interface ContractGeneratingOverlayProps {
  isVisible: boolean;
  contractType?: string;
  serverProgress?: number;
  serverStatus?: string;
  lastServerEventAt?: number;
}

export function ContractGeneratingOverlay({
  isVisible,
  contractType,
  serverProgress,
  serverStatus,
  lastServerEventAt,
}: ContractGeneratingOverlayProps) {
  const [currentStage, setCurrentStage] = useState(0);
  const [progress, setProgress] = useState(0);
  const [nowTick, setNowTick] = useState(Date.now());
  const startTimeRef = useRef<number | null>(null);

  const effectiveProgress = serverProgress !== undefined ? serverProgress : progress;

  useEffect(() => {
    if (!isVisible) return;
    const tick = setInterval(() => setNowTick(Date.now()), 500);
    return () => clearInterval(tick);
  }, [isVisible]);

  useEffect(() => {
    if (!isVisible) {
      setCurrentStage(0);
      setProgress(0);
      startTimeRef.current = null;
      return;
    }

    if (!startTimeRef.current) startTimeRef.current = Date.now();

    if (serverProgress !== undefined) {
      if (serverProgress < 25) setCurrentStage(0);
      else if (serverProgress < 50) setCurrentStage(1);
      else if (serverProgress < 75) setCurrentStage(2);
      else setCurrentStage(3);
      return;
    }

    const totalDuration = STAGE_DURATIONS.reduce((a, b) => a + b, 0);

    const interval = setInterval(() => {
      if (!startTimeRef.current) return;
      const elapsed = Date.now() - startTimeRef.current;
      setProgress(Math.min((elapsed / totalDuration) * 100, 95));

      let acc = 0;
      for (let i = 0; i < STAGE_DURATIONS.length; i++) {
        acc += STAGE_DURATIONS[i];
        if (elapsed < acc) { setCurrentStage(i); break; }
        if (i === STAGE_DURATIONS.length - 1) setCurrentStage(i);
      }
    }, 100);

    return () => clearInterval(interval);
  }, [isVisible, serverProgress]);

  if (!isVisible) return null;

  const displayLabel = serverStatus || STAGES[currentStage]?.label;
  const elapsedMs = startTimeRef.current ? Math.max(0, nowTick - startTimeRef.current) : 0;
  const elapsedSeconds = Math.floor(elapsedMs / 1000);
  const staleMs =
    lastServerEventAt && serverProgress !== undefined
      ? Math.max(0, nowTick - lastServerEventAt)
      : 0;
  const showStalledHint = staleMs > 12000 && effectiveProgress < 95;
  const showLongRunningHint = elapsedSeconds >= 45;
  const footerMessage = showStalledHint
    ? "Still working. Complex contracts can take up to 2 minutes."
    : showLongRunningHint
      ? "Almost there. We're validating and saving your draft."
      : "This usually takes 60-90 seconds";

  return (
    <motion.div
      initial={{ opacity: 0 }}
      animate={{ opacity: 1 }}
      exit={{ opacity: 0 }}
      className="fixed inset-0 z-50 flex items-center justify-center bg-white"
    >
      <div className="relative z-10 max-w-md w-full mx-6 text-center">
        {/* Minimal pulsing icon */}
        <motion.div
          className="inline-flex mb-10"
          initial={{ scale: 0.9, opacity: 0 }}
          animate={{ scale: 1, opacity: 1 }}
          transition={{ duration: 0.4 }}
        >
          <div className="relative">
            <motion.div
              animate={{ scale: [1, 1.6, 1], opacity: [0.15, 0, 0.15] }}
              transition={{ duration: 2.5, repeat: Infinity, ease: "easeInOut" }}
              className="absolute inset-0 bg-slate-900 rounded-full"
            />
            <div className="relative w-16 h-16 bg-slate-900 rounded-full flex items-center justify-center">
              <Sparkles className="w-7 h-7 text-white" strokeWidth={1.5} />
            </div>
          </div>
        </motion.div>

        {/* Title */}
        <motion.h2
          initial={{ y: 12, opacity: 0 }}
          animate={{ y: 0, opacity: 1 }}
          transition={{ delay: 0.15 }}
          className="text-2xl font-bold text-slate-900 tracking-tight"
        >
          Creating your contract
        </motion.h2>

        {contractType && (
          <motion.p
            initial={{ y: 12, opacity: 0 }}
            animate={{ y: 0, opacity: 1 }}
            transition={{ delay: 0.2 }}
            className="text-slate-400 text-sm mt-1.5 capitalize font-medium"
          >
            {contractType.replace(/_/g, " ")}
          </motion.p>
        )}

        {/* Progress bar — thin, clean */}
        <motion.div
          initial={{ opacity: 0 }}
          animate={{ opacity: 1 }}
          transition={{ delay: 0.3 }}
          className="mt-10 mb-10 mx-auto max-w-xs"
        >
          <div className="relative h-1 bg-slate-100 rounded-full overflow-hidden">
            <motion.div
              className="h-full bg-slate-900 rounded-full"
              style={{ width: `${effectiveProgress}%` }}
              transition={{ duration: 0.4, ease: "easeOut" }}
            />
            <motion.div
              className="absolute inset-y-0 w-1/3 bg-gradient-to-r from-transparent via-white/60 to-transparent pointer-events-none"
              animate={{ x: ["-130%", "320%"] }}
              transition={{ duration: 1.6, repeat: Infinity, ease: "linear" }}
            />
          </div>
          <p className="text-xs text-slate-400 mt-3 font-medium tabular-nums">
            {Math.round(effectiveProgress)}%
          </p>
          <p className="text-[11px] text-slate-300 mt-1 tabular-nums">
            Elapsed {elapsedSeconds}s
          </p>
        </motion.div>

        {/* Stage steps — minimal vertical list */}
        <motion.div
          initial={{ y: 12, opacity: 0 }}
          animate={{ y: 0, opacity: 1 }}
          transition={{ delay: 0.4 }}
          className="space-y-0 text-left max-w-[240px] mx-auto"
        >
          {STAGES.map((s, idx) => {
            const isActive = idx === currentStage;
            const isCompleted = idx < currentStage;

            return (
              <div
                key={s.id}
                className="flex items-center gap-3 py-2.5"
              >
                <div className="flex-shrink-0 w-5 h-5 flex items-center justify-center">
                  {isCompleted ? (
                    <CheckCircle2 className="w-4 h-4 text-emerald-500" strokeWidth={2} />
                  ) : isActive ? (
                    <motion.div
                      animate={{ scale: [1, 1.3, 1], opacity: [0.5, 1, 0.5] }}
                      transition={{ duration: 1.5, repeat: Infinity }}
                      className="w-2 h-2 bg-slate-900 rounded-full"
                    />
                  ) : (
                    <div className="w-1.5 h-1.5 bg-slate-200 rounded-full" />
                  )}
                </div>
                <AnimatePresence mode="wait">
                  <span
                    className={`text-sm transition-colors duration-300 ${isActive
                        ? "text-slate-900 font-semibold"
                        : isCompleted
                          ? "text-slate-400"
                          : "text-slate-300"
                      }`}
                  >
                    {idx === currentStage && serverStatus ? displayLabel : s.label}
                  </span>
                </AnimatePresence>
              </div>
            );
          })}
        </motion.div>

        {/* Subtle footer note */}
        <motion.p
          initial={{ opacity: 0 }}
          animate={{ opacity: 1 }}
          transition={{ delay: 0.6 }}
          className="text-xs text-slate-300 mt-12"
        >
          {footerMessage}
        </motion.p>
      </div>
    </motion.div>
  );
}
