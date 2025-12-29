"use client";

import { useState, useEffect, useRef } from "react";
import { motion, AnimatePresence } from "framer-motion";
import {
    FileText,
    PenTool,
    DollarSign,
    Check,
    Sparkles,
    Send,
    CreditCard,
    PartyPopper
} from "lucide-react";

type DemoStep = "idle" | "generating" | "generated" | "sending" | "signing" | "signed" | "payment" | "paid" | "complete";

export function HeroMockDemo() {
    const [step, setStep] = useState<DemoStep>("idle");
    const [typedText, setTypedText] = useState("");
    const [cursorPos, setCursorPos] = useState({ x: 400, y: 300 });
    const [showCursor, setShowCursor] = useState(false);
    const [signatureProgress, setSignatureProgress] = useState(0);

    const contractContent = `CONSULTING AGREEMENT

This Agreement ("Agreement") is entered into as of {{DATE}}

BETWEEN:
Party A: Acme Corporation ("Client")
Party B: John Smith Consulting ("Consultant")

1. SCOPE OF SERVICES
The Consultant agrees to provide strategic 
consulting services as outlined in Exhibit A.

2. COMPENSATION
Client shall pay Consultant $5,000 USD
upon execution of this Agreement.`;

    // Auto-play the demo
    useEffect(() => {
        let cancelled = false;

        const sequence = async () => {
            if (cancelled) return;

            // Reset
            setTypedText("");
            setStep("idle");
            setShowCursor(false);
            setSignatureProgress(0);

            await new Promise(r => setTimeout(r, 1000));
            if (cancelled) return;

            // Start generating
            setStep("generating");

            // Type out content faster
            for (let i = 0; i <= contractContent.length; i++) {
                if (cancelled) return;
                await new Promise(r => setTimeout(r, 8)); // Faster typing
                setTypedText(contractContent.slice(0, i));
            }

            await new Promise(r => setTimeout(r, 400));
            if (cancelled) return;
            setStep("generated");

            // Show cursor moving to button
            await new Promise(r => setTimeout(r, 600));
            if (cancelled) return;
            setShowCursor(true);
            setCursorPos({ x: 150, y: 320 }); // Start position

            await new Promise(r => setTimeout(r, 300));
            if (cancelled) return;
            setCursorPos({ x: 180, y: 350 }); // Move to button

            await new Promise(r => setTimeout(r, 400));
            if (cancelled) return;
            setStep("sending");
            setShowCursor(false);

            await new Promise(r => setTimeout(r, 600));
            if (cancelled) return;
            setStep("signing");

            // Animate signature
            for (let i = 0; i <= 100; i += 4) {
                if (cancelled) return;
                await new Promise(r => setTimeout(r, 30));
                setSignatureProgress(i);
            }

            await new Promise(r => setTimeout(r, 500));
            if (cancelled) return;
            setStep("signed");

            await new Promise(r => setTimeout(r, 1200));
            if (cancelled) return;
            setStep("payment");

            await new Promise(r => setTimeout(r, 1500));
            if (cancelled) return;
            setStep("paid");

            await new Promise(r => setTimeout(r, 1500));
            if (cancelled) return;
            setStep("complete");

            await new Promise(r => setTimeout(r, 3000));
        };

        sequence();

        const interval = setInterval(sequence, 18000);
        return () => {
            cancelled = true;
            clearInterval(interval);
        };
    }, []);

    return (
        <div className="relative bg-white rounded-2xl shadow-2xl shadow-slate-200/60 border border-slate-200/80 overflow-hidden">
            {/* macOS Window Chrome */}
            <div className="bg-slate-50 border-b border-slate-100 px-4 py-3 flex items-center gap-2">
                <div className="flex gap-1.5">
                    <div className="w-3 h-3 rounded-full bg-red-400 hover:bg-red-500 transition-colors"></div>
                    <div className="w-3 h-3 rounded-full bg-yellow-400 hover:bg-yellow-500 transition-colors"></div>
                    <div className="w-3 h-3 rounded-full bg-green-400 hover:bg-green-500 transition-colors"></div>
                </div>
                <div className="flex-1 flex justify-center">
                    <div className="bg-white px-4 py-1.5 rounded-lg text-xs text-slate-400 font-medium border border-slate-100 flex items-center gap-2">
                        <span className="w-2 h-2 rounded-full bg-green-500 animate-pulse"></span>
                        app.lexport.ai
                    </div>
                </div>
                <div className="w-16"></div>
            </div>

            {/* Demo Content */}
            <div className="p-6 sm:p-8 min-h-[380px] bg-gradient-to-b from-white to-slate-50/50 relative">
                {/* Animated cursor */}
                <AnimatePresence>
                    {showCursor && (
                        <motion.div
                            initial={{ opacity: 0, scale: 0.5 }}
                            animate={{
                                opacity: 1,
                                scale: 1,
                                x: cursorPos.x,
                                y: cursorPos.y
                            }}
                            exit={{ opacity: 0, scale: 0.5 }}
                            transition={{ type: "spring", stiffness: 200, damping: 20 }}
                            className="absolute z-50 pointer-events-none"
                        >
                            <svg width="24" height="24" viewBox="0 0 24 24" fill="none">
                                <path d="M5.5 3.21V20.8c0 .45.54.67.85.35l4.86-4.86a.5.5 0 01.35-.15h6.87a.5.5 0 00.35-.85L6.35 2.86a.5.5 0 00-.85.35z" fill="#000" stroke="#fff" strokeWidth="1.5" />
                            </svg>
                        </motion.div>
                    )}
                </AnimatePresence>

                {/* Complete overlay */}
                <AnimatePresence>
                    {step === "complete" && (
                        <motion.div
                            initial={{ opacity: 0 }}
                            animate={{ opacity: 1 }}
                            exit={{ opacity: 0 }}
                            className="absolute inset-0 z-40 bg-white/90 backdrop-blur-sm flex flex-col items-center justify-center"
                        >
                            <motion.div
                                initial={{ scale: 0 }}
                                animate={{ scale: 1 }}
                                transition={{ type: "spring", stiffness: 200, damping: 15 }}
                                className="w-16 h-16 rounded-full bg-emerald-100 flex items-center justify-center mb-4"
                            >
                                <PartyPopper className="w-8 h-8 text-emerald-600" />
                            </motion.div>
                            <motion.h3
                                initial={{ opacity: 0, y: 10 }}
                                animate={{ opacity: 1, y: 0 }}
                                transition={{ delay: 0.2 }}
                                className="text-xl font-bold text-slate-900 mb-2"
                            >
                                Deal Closed! 🎉
                            </motion.h3>
                            <motion.p
                                initial={{ opacity: 0, y: 10 }}
                                animate={{ opacity: 1, y: 0 }}
                                transition={{ delay: 0.3 }}
                                className="text-slate-500 text-sm"
                            >
                                Contract signed • $5,000 received
                            </motion.p>
                        </motion.div>
                    )}
                </AnimatePresence>

                <div className="flex gap-6">
                    {/* Left: Contract Editor */}
                    <div className="flex-1 min-w-0">
                        <div className="flex items-center gap-3 mb-4">
                            <div className="w-8 h-8 rounded-lg bg-[#529ec6]/10 flex items-center justify-center">
                                <FileText className="w-4 h-4 text-[#529ec6]" />
                            </div>
                            <div>
                                <p className="font-semibold text-slate-900 text-sm">Consulting Agreement</p>
                                <p className="text-xs text-slate-400">California, USA</p>
                            </div>

                            {/* Status Badge */}
                            <AnimatePresence mode="wait">
                                {step === "generating" && (
                                    <motion.div
                                        key="generating"
                                        initial={{ opacity: 0, scale: 0.8 }}
                                        animate={{ opacity: 1, scale: 1 }}
                                        exit={{ opacity: 0, scale: 0.8 }}
                                        className="ml-auto flex items-center gap-1.5 text-xs font-medium text-[#529ec6] bg-[#529ec6]/10 px-2.5 py-1 rounded-full"
                                    >
                                        <Sparkles className="w-3 h-3 animate-spin" />
                                        AI Generating...
                                    </motion.div>
                                )}
                                {step === "generated" && (
                                    <motion.div
                                        key="ready"
                                        initial={{ opacity: 0, scale: 0.8 }}
                                        animate={{ opacity: 1, scale: 1 }}
                                        exit={{ opacity: 0, scale: 0.8 }}
                                        className="ml-auto flex items-center gap-1.5 text-xs font-medium text-emerald-600 bg-emerald-50 px-2.5 py-1 rounded-full"
                                    >
                                        <Check className="w-3 h-3" />
                                        Ready to Send
                                    </motion.div>
                                )}
                                {(step === "sending" || step === "signing") && (
                                    <motion.div
                                        key="pending"
                                        initial={{ opacity: 0, scale: 0.8 }}
                                        animate={{ opacity: 1, scale: 1 }}
                                        exit={{ opacity: 0, scale: 0.8 }}
                                        className="ml-auto flex items-center gap-1.5 text-xs font-medium text-amber-600 bg-amber-50 px-2.5 py-1 rounded-full"
                                    >
                                        <PenTool className="w-3 h-3" />
                                        Awaiting Signature
                                    </motion.div>
                                )}
                                {(step === "signed" || step === "payment" || step === "paid" || step === "complete") && (
                                    <motion.div
                                        key="signed"
                                        initial={{ opacity: 0, scale: 0.8 }}
                                        animate={{ opacity: 1, scale: 1 }}
                                        exit={{ opacity: 0, scale: 0.8 }}
                                        className="ml-auto flex items-center gap-1.5 text-xs font-medium text-emerald-600 bg-emerald-50 px-2.5 py-1 rounded-full"
                                    >
                                        <Check className="w-3 h-3" />
                                        Fully Signed
                                    </motion.div>
                                )}
                            </AnimatePresence>
                        </div>

                        {/* Contract Content with AI glow effect */}
                        <div className={`bg-slate-50 rounded-lg p-4 h-52 overflow-hidden border transition-all duration-500 ${step === "generating"
                            ? "border-[#529ec6]/30 shadow-[0_0_20px_rgba(82,158,198,0.15)]"
                            : "border-slate-100"
                            }`}>
                            <pre className="text-[11px] text-slate-600 font-mono whitespace-pre-wrap leading-relaxed">
                                {typedText}
                                {step === "generating" && (
                                    <motion.span
                                        animate={{ opacity: [1, 0] }}
                                        transition={{ repeat: Infinity, duration: 0.5 }}
                                        className="inline-block w-1.5 h-3.5 bg-[#529ec6] ml-0.5"
                                    />
                                )}
                            </pre>

                            {/* Signature area */}
                            <AnimatePresence>
                                {(step === "signing" || step === "signed" || step === "payment" || step === "paid" || step === "complete") && (
                                    <motion.div
                                        initial={{ opacity: 0, y: 10 }}
                                        animate={{ opacity: 1, y: 0 }}
                                        className="mt-3 pt-3 border-t border-slate-200"
                                    >
                                        <p className="text-[10px] text-slate-400 mb-2">Signature:</p>
                                        <svg viewBox="0 0 200 40" className="h-8 w-32">
                                            <motion.path
                                                d="M10,30 Q30,10 50,25 T90,20 T130,30 T170,15"
                                                fill="none"
                                                stroke="#202e46"
                                                strokeWidth="2"
                                                strokeLinecap="round"
                                                initial={{ pathLength: 0 }}
                                                animate={{ pathLength: signatureProgress / 100 }}
                                                transition={{ duration: 0.1 }}
                                            />
                                        </svg>
                                    </motion.div>
                                )}
                            </AnimatePresence>
                        </div>

                        {/* Action Button */}
                        <AnimatePresence mode="wait">
                            {step === "generated" && (
                                <motion.button
                                    key="send"
                                    initial={{ opacity: 0, y: 10 }}
                                    animate={{ opacity: 1, y: 0 }}
                                    exit={{ opacity: 0, scale: 0.95 }}
                                    className="mt-4 w-full flex items-center justify-center gap-2 bg-[#202e46] text-white py-2.5 rounded-lg text-sm font-medium hover:bg-[#1a2539] transition-colors"
                                >
                                    <Send className="w-4 h-4" />
                                    Send for signature
                                </motion.button>
                            )}
                        </AnimatePresence>
                    </div>

                    {/* Right: Status Panel */}
                    <div className="w-52 space-y-3">
                        {/* Step indicators */}
                        <div className="bg-white rounded-xl border border-slate-100 p-4 shadow-sm">
                            <p className="text-xs font-medium text-slate-400 uppercase tracking-wider mb-4">Workflow</p>

                            <div className="space-y-3">
                                {/* Generate */}
                                <div className="flex items-center gap-3">
                                    <motion.div
                                        animate={{
                                            backgroundColor: step === "idle" ? "#f1f5f9" :
                                                step === "generating" ? "rgba(82,158,198,0.2)" :
                                                    "#10b981",
                                            boxShadow: step === "generating" ? "0 0 0 3px rgba(82,158,198,0.3)" : "none"
                                        }}
                                        className="w-7 h-7 rounded-full flex items-center justify-center transition-colors"
                                    >
                                        {step !== "idle" && step !== "generating" ? (
                                            <Check className="w-3.5 h-3.5 text-white" />
                                        ) : (
                                            <Sparkles className={`w-3.5 h-3.5 ${step === "generating" ? "text-[#529ec6] animate-spin" : "text-slate-400"}`} />
                                        )}
                                    </motion.div>
                                    <div>
                                        <span className={`text-sm font-medium ${step === "generating" ? "text-[#529ec6]" : step !== "idle" ? "text-slate-900" : "text-slate-400"}`}>
                                            Generate
                                        </span>
                                        {step === "generating" && (
                                            <motion.p
                                                initial={{ opacity: 0 }}
                                                animate={{ opacity: 1 }}
                                                className="text-[10px] text-slate-400"
                                            >
                                                AI drafting contract...
                                            </motion.p>
                                        )}
                                    </div>
                                </div>

                                {/* Sign */}
                                <div className="flex items-center gap-3">
                                    <motion.div
                                        animate={{
                                            backgroundColor: ["idle", "generating", "generated", "sending"].includes(step) ? "#f1f5f9" :
                                                step === "signing" ? "rgba(82,158,198,0.2)" :
                                                    "#10b981",
                                            boxShadow: step === "signing" ? "0 0 0 3px rgba(82,158,198,0.3)" : "none"
                                        }}
                                        className="w-7 h-7 rounded-full flex items-center justify-center"
                                    >
                                        {["signed", "payment", "paid", "complete"].includes(step) ? (
                                            <Check className="w-3.5 h-3.5 text-white" />
                                        ) : (
                                            <PenTool className={`w-3.5 h-3.5 ${step === "signing" ? "text-[#529ec6]" : "text-slate-400"}`} />
                                        )}
                                    </motion.div>
                                    <div>
                                        <span className={`text-sm font-medium ${step === "signing" ? "text-[#529ec6]" : ["signed", "payment", "paid", "complete"].includes(step) ? "text-slate-900" : "text-slate-400"}`}>
                                            Sign
                                        </span>
                                        {step === "signing" && (
                                            <motion.p
                                                initial={{ opacity: 0 }}
                                                animate={{ opacity: 1 }}
                                                className="text-[10px] text-slate-400"
                                            >
                                                Client signing...
                                            </motion.p>
                                        )}
                                    </div>
                                </div>

                                {/* Pay */}
                                <div className="flex items-center gap-3">
                                    <motion.div
                                        animate={{
                                            backgroundColor: ["idle", "generating", "generated", "sending", "signing", "signed"].includes(step) ? "#f1f5f9" :
                                                step === "payment" ? "rgba(16,185,129,0.2)" :
                                                    "#10b981",
                                            boxShadow: step === "payment" ? "0 0 0 3px rgba(16,185,129,0.3)" : "none"
                                        }}
                                        className="w-7 h-7 rounded-full flex items-center justify-center"
                                    >
                                        {["paid", "complete"].includes(step) ? (
                                            <Check className="w-3.5 h-3.5 text-white" />
                                        ) : (
                                            <DollarSign className={`w-3.5 h-3.5 ${step === "payment" ? "text-emerald-600" : "text-slate-400"}`} />
                                        )}
                                    </motion.div>
                                    <div>
                                        <span className={`text-sm font-medium ${step === "payment" ? "text-emerald-600" : ["paid", "complete"].includes(step) ? "text-slate-900" : "text-slate-400"}`}>
                                            Get Paid
                                        </span>
                                        {step === "payment" && (
                                            <motion.p
                                                initial={{ opacity: 0 }}
                                                animate={{ opacity: 1 }}
                                                className="text-[10px] text-slate-400"
                                            >
                                                Processing payment...
                                            </motion.p>
                                        )}
                                    </div>
                                </div>
                            </div>
                        </div>

                        {/* Payment Card */}
                        <AnimatePresence>
                            {(step === "payment" || step === "paid" || step === "complete") && (
                                <motion.div
                                    initial={{ opacity: 0, y: 10, scale: 0.95 }}
                                    animate={{ opacity: 1, y: 0, scale: 1 }}
                                    exit={{ opacity: 0 }}
                                    className={`rounded-xl p-4 border transition-colors ${step === "paid" || step === "complete"
                                        ? "bg-emerald-50 border-emerald-200"
                                        : "bg-amber-50 border-amber-200"
                                        }`}
                                >
                                    <div className="flex items-center justify-between mb-2">
                                        <span className="text-xs font-medium text-slate-600">Payment</span>
                                        {step === "paid" || step === "complete" ? (
                                            <motion.span
                                                initial={{ scale: 0 }}
                                                animate={{ scale: 1 }}
                                                className="text-xs text-emerald-600 font-medium bg-emerald-100 px-2 py-0.5 rounded-full flex items-center gap-1"
                                            >
                                                <Check className="w-3 h-3" />
                                                Received
                                            </motion.span>
                                        ) : (
                                            <span className="text-xs text-amber-600 font-medium bg-amber-100 px-2 py-0.5 rounded-full animate-pulse">
                                                Processing...
                                            </span>
                                        )}
                                    </div>
                                    <div className="text-2xl font-bold text-slate-900">$5,000</div>
                                    <div className="text-xs text-slate-400 mb-3">Consulting retainer</div>

                                    {(step === "paid" || step === "complete") && (
                                        <motion.div
                                            initial={{ opacity: 0, y: 5 }}
                                            animate={{ opacity: 1, y: 0 }}
                                            className="flex items-center gap-2 text-emerald-600 bg-emerald-100/50 rounded-lg py-2 px-3"
                                        >
                                            <CreditCard className="w-4 h-4" />
                                            <span className="text-xs font-medium">Deposited to bank</span>
                                        </motion.div>
                                    )}
                                </motion.div>
                            )}
                        </AnimatePresence>
                    </div>
                </div>
            </div>
        </div>
    );
}
