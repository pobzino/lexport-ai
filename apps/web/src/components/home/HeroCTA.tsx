"use client";

import { useState, useRef, useEffect } from "react";
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

export function HeroCTA() {
  const [input, setInput] = useState("");
  const [placeholderIndex, setPlaceholderIndex] = useState(0);
  const textareaRef = useRef<HTMLTextAreaElement>(null);
  const router = useRouter();

  // Rotate placeholder text
  useEffect(() => {
    const timer = setInterval(() => {
      setPlaceholderIndex((i) => (i + 1) % PLACEHOLDERS.length);
    }, 3500);
    return () => clearInterval(timer);
  }, []);

  const handleSubmit = () => {
    const prompt = input.trim() || PLACEHOLDERS[placeholderIndex];
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
          <textarea
            ref={textareaRef}
            value={input}
            onChange={(e) => setInput(e.target.value)}
            placeholder={PLACEHOLDERS[placeholderIndex]}
            onKeyDown={(e) => {
              if (e.key === "Enter" && !e.shiftKey) {
                e.preventDefault();
                handleSubmit();
              }
            }}
            rows={2}
            className="w-full resize-none border-0 bg-transparent text-slate-900 placeholder:text-slate-400 focus:outline-none text-base leading-relaxed"
          />

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
