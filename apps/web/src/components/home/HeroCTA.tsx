"use client";

import { useState, useRef } from "react";
import { useRouter } from "next/navigation";
import { ArrowUp } from "lucide-react";
import { motion } from "framer-motion";

type Mode = "create" | "review" | "ask";

const PLACEHOLDERS: Record<Mode, string> = {
  create: "Employment Agreement",
  review: "Paste your contract here to review...",
  ask: "What should I include in an NDA?",
};

export function HeroCTA() {
  const [mode, setMode] = useState<Mode>("create");
  const [input, setInput] = useState("");
  const textareaRef = useRef<HTMLTextAreaElement>(null);
  const router = useRouter();

  const handleSubmit = () => {
    const prompt = input.trim() || PLACEHOLDERS[mode];
    router.push(`/create?mode=${mode}&prompt=${encodeURIComponent(prompt)}`);
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
            placeholder={PLACEHOLDERS[mode]}
            onKeyDown={(e) => {
              if (e.key === "Enter" && !e.shiftKey) {
                e.preventDefault();
                handleSubmit();
              }
            }}
            rows={3}
            className="w-full resize-none border-0 bg-transparent text-slate-900 placeholder:text-slate-400 focus:outline-none text-base leading-relaxed"
          />

          <div className="flex items-center justify-between mt-3 pt-3 border-t border-slate-100">
            <div className="inline-flex items-center bg-slate-100 rounded-lg p-0.5">
              {(["create", "review", "ask"] as Mode[]).map((m) => (
                <button
                  key={m}
                  onClick={() => setMode(m)}
                  className={`px-3.5 py-1.5 text-sm font-medium rounded-md transition-all ${
                    mode === m
                      ? "bg-[#529ec6] text-white shadow-sm"
                      : "text-slate-600 hover:text-slate-900"
                  }`}
                >
                  {m === "create" ? "Create" : m === "review" ? "Review" : "Ask"}
                </button>
              ))}
            </div>

            <button
              onClick={handleSubmit}
              className="w-9 h-9 flex items-center justify-center rounded-full bg-[#529ec6] text-white hover:bg-[#4589ad] transition-all hover:shadow-lg"
            >
              <ArrowUp className="w-4 h-4" />
            </button>
          </div>
        </div>
      </div>
    </motion.div>
  );
}
