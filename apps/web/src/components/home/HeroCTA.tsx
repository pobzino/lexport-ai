"use client";

import { useState, useRef, useEffect, useCallback } from "react";
import { useRouter } from "next/navigation";
import { ArrowUp } from "lucide-react";
import { motion } from "framer-motion";

const PLACEHOLDERS = [
  "Create an NDA for my startup",
  "Freelance contract for web development",
  "Non-Disclosure Agreement",
  "Independent Contractor Agreement",
  "I need a consulting agreement for a 3-month project",
  "SAFE Note for my seed round",
  "Service agreement between my agency and a client",
  "Mutual NDA between two companies",
  "Employment offer letter for a software engineer",
  "Partnership agreement for a joint venture",
];

const TYPE_SPEED = 45;
const DELETE_SPEED = 25;
const PAUSE_AFTER_TYPE = 2000;
const PAUSE_AFTER_DELETE = 400;

function useTypewriter(texts: string[]) {
  const [displayText, setDisplayText] = useState("");
  const [textIndex, setTextIndex] = useState(0);
  const [isDeleting, setIsDeleting] = useState(false);
  const [isPaused, setIsPaused] = useState(false);

  const tick = useCallback(() => {
    const currentText = texts[textIndex];

    if (isPaused) return;

    if (!isDeleting) {
      // Typing
      if (displayText.length < currentText.length) {
        setDisplayText(currentText.slice(0, displayText.length + 1));
      } else {
        // Done typing — pause then start deleting
        setIsPaused(true);
        setTimeout(() => {
          setIsPaused(false);
          setIsDeleting(true);
        }, PAUSE_AFTER_TYPE);
      }
    } else {
      // Deleting
      if (displayText.length > 0) {
        setDisplayText(displayText.slice(0, -1));
      } else {
        // Done deleting — pause then move to next
        setIsDeleting(false);
        setIsPaused(true);
        setTimeout(() => {
          setIsPaused(false);
          setTextIndex((i) => (i + 1) % texts.length);
        }, PAUSE_AFTER_DELETE);
      }
    }
  }, [displayText, textIndex, isDeleting, isPaused, texts]);

  useEffect(() => {
    const speed = isDeleting ? DELETE_SPEED : TYPE_SPEED;
    const timer = setTimeout(tick, speed);
    return () => clearTimeout(timer);
  }, [tick, isDeleting]);

  return displayText;
}

export function HeroCTA() {
  const [input, setInput] = useState("");
  const [isFocused, setIsFocused] = useState(false);
  const textareaRef = useRef<HTMLTextAreaElement>(null);
  const router = useRouter();
  const animatedPlaceholder = useTypewriter(PLACEHOLDERS);

  const handleSubmit = () => {
    const prompt = input.trim() || animatedPlaceholder || PLACEHOLDERS[0];
    router.push(`/create?mode=create&prompt=${encodeURIComponent(prompt)}`);
  };

  return (
    <motion.div
      initial={{ opacity: 0, y: 16 }}
      animate={{ opacity: 1, y: 0 }}
      transition={{ duration: 0.5, delay: 0.2 }}
      className="max-w-2xl mx-auto"
    >
      <p className="text-center text-sm text-slate-500 mb-4">
        Draft, review and edit legal documents for 120+ jurisdictions globally
      </p>

      <div className="relative group">
        <div className="absolute -inset-[1px] rounded-2xl bg-gradient-to-r from-[#529ec6]/40 via-[#529ec6]/20 to-[#529ec6]/40 opacity-60 group-hover:opacity-80 transition-opacity" />

        <div className="relative bg-white rounded-2xl p-4 sm:p-5">
          <div className="relative">
            <textarea
              ref={textareaRef}
              value={input}
              onChange={(e) => setInput(e.target.value)}
              onFocus={() => setIsFocused(true)}
              onBlur={() => setIsFocused(false)}
              onKeyDown={(e) => {
                if (e.key === "Enter" && !e.shiftKey) {
                  e.preventDefault();
                  handleSubmit();
                }
              }}
              rows={2}
              className="w-full resize-none border-0 bg-transparent text-slate-900 focus:outline-none text-base leading-relaxed"
            />
            {/* Animated placeholder overlay */}
            {!input && !isFocused && (
              <div className="absolute inset-0 pointer-events-none text-base leading-relaxed text-slate-400">
                {animatedPlaceholder}
                <span className="inline-block w-[2px] h-[1.1em] bg-slate-300 align-middle ml-[1px] animate-pulse" />
              </div>
            )}
            {!input && isFocused && (
              <div className="absolute inset-0 pointer-events-none text-base leading-relaxed text-slate-400">
                Describe the contract you need...
              </div>
            )}
          </div>

          <div className="flex items-center justify-end mt-3 pt-3 border-t border-slate-100">
            <button
              onClick={handleSubmit}
              className="inline-flex items-center gap-2 px-5 py-2 rounded-full bg-[#529ec6] text-white text-sm font-medium hover:bg-[#4589ad] transition-all hover:shadow-lg"
            >
              Create
              <ArrowUp className="w-4 h-4" />
            </button>
          </div>
        </div>
      </div>
    </motion.div>
  );
}
