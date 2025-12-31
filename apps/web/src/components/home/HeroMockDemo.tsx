"use client";

import { useState, useEffect } from "react";
import { motion, AnimatePresence } from "framer-motion";
import {
    FileText,
    Send,
    Check,
    Sparkles,
    PenTool,
    DollarSign,
    CreditCard,
} from "lucide-react";

type DemoStep =
    | "idle"
    | "generating"
    | "ready"
    | "sending"
    | "pending"
    | "signing"
    | "signed"
    | "collecting"
    | "paid"
    | "complete";

const CONTRACT_TEXT = `CONSULTING SERVICES AGREEMENT

This Consulting Services Agreement ("Agreement") is entered into as of January 15, 2025 ("Effective Date").

BETWEEN:
Client: Acme Technologies Inc.
Address: 123 Innovation Drive, San Francisco, CA 94105

AND:
Consultant: Sarah Chen Consulting LLC
Address: 456 Market Street, Suite 200, San Francisco, CA 94102

1. SERVICES
Consultant agrees to provide strategic product consulting services including market analysis, product roadmap development, and go-to-market strategy as detailed in Exhibit A.

2. COMPENSATION
Client shall pay Consultant a fixed fee of $5,000 USD, payable upon execution of this Agreement. Additional services shall be billed at $250/hour.

3. TERM
This Agreement shall commence on the Effective Date and continue for a period of three (3) months, unless terminated earlier in accordance with Section 7.

4. CONFIDENTIALITY
Both parties agree to maintain the confidentiality of all proprietary information disclosed during the engagement.`;

export function HeroMockDemo() {
    const [step, setStep] = useState<DemoStep>("idle");
    const [typedLength, setTypedLength] = useState(0);
    const [signatureProgress, setSignatureProgress] = useState(0);

    useEffect(() => {
        let cancelled = false;

        const sleep = (ms: number) => new Promise(r => setTimeout(r, ms));

        const runDemo = async () => {
            // Reset
            setStep("idle");
            setTypedLength(0);
            setSignatureProgress(0);

            await sleep(600);
            if (cancelled) return;

            // Phase 1: AI Generation - type out contract
            setStep("generating");

            // Type out contract character by character
            const totalChars = CONTRACT_TEXT.length;
            const charsPerTick = 8;
            const tickDelay = 20;

            for (let i = 0; i <= totalChars; i += charsPerTick) {
                if (cancelled) return;
                setTypedLength(Math.min(i, totalChars));
                await sleep(tickDelay);
            }
            setTypedLength(totalChars);

            await sleep(800);
            if (cancelled) return;

            // Phase 2: Ready
            setStep("ready");
            await sleep(2200);
            if (cancelled) return;

            // Phase 3: Sending
            setStep("sending");
            await sleep(600);
            if (cancelled) return;

            setStep("pending");
            await sleep(1400);
            if (cancelled) return;

            // Phase 4: Signing
            setStep("signing");

            for (let i = 0; i <= 100; i += 4) {
                if (cancelled) return;
                await sleep(30);
                setSignatureProgress(i);
            }

            await sleep(500);
            if (cancelled) return;

            setStep("signed");
            await sleep(1200);
            if (cancelled) return;

            // Phase 5: Payment
            setStep("collecting");
            await sleep(1400);
            if (cancelled) return;

            setStep("paid");
            await sleep(1800);
            if (cancelled) return;

            // Phase 6: Complete
            setStep("complete");
            await sleep(3000);
        };

        runDemo();
        const interval = setInterval(runDemo, 18000);

        return () => {
            cancelled = true;
            clearInterval(interval);
        };
    }, []);

    const getStatusBadge = () => {
        const badges: Record<string, { icon: React.ReactNode; label: string; className: string }> = {
            generating: {
                icon: <Sparkles className="w-3 h-3" />,
                label: "AI Generating",
                className: "bg-[#529ec6]/10 text-[#529ec6]"
            },
            ready: {
                icon: <FileText className="w-3 h-3" />,
                label: "Draft",
                className: "bg-slate-100 text-slate-600"
            },
            sending: {
                icon: <Send className="w-3 h-3" />,
                label: "Sending...",
                className: "bg-blue-50 text-blue-600"
            },
            pending: {
                icon: <PenTool className="w-3 h-3" />,
                label: "Awaiting Signature",
                className: "bg-amber-50 text-amber-600"
            },
            signing: {
                icon: <PenTool className="w-3 h-3" />,
                label: "Signing...",
                className: "bg-amber-50 text-amber-600"
            },
            signed: {
                icon: <Check className="w-3 h-3" />,
                label: "Signed",
                className: "bg-emerald-50 text-emerald-600"
            },
            collecting: {
                icon: <DollarSign className="w-3 h-3" />,
                label: "Collecting Payment",
                className: "bg-amber-50 text-amber-600"
            },
            paid: {
                icon: <Check className="w-3 h-3" />,
                label: "Complete",
                className: "bg-emerald-100 text-emerald-700"
            },
            complete: {
                icon: <Check className="w-3 h-3" />,
                label: "Complete",
                className: "bg-emerald-100 text-emerald-700"
            }
        };

        const badge = badges[step];
        if (!badge) return null;

        return (
            <motion.div
                key={step}
                initial={{ opacity: 0, scale: 0.9 }}
                animate={{ opacity: 1, scale: 1 }}
                exit={{ opacity: 0, scale: 0.9 }}
                className={`flex items-center gap-1.5 px-2 py-0.5 sm:px-2.5 sm:py-1 rounded-full text-[10px] sm:text-xs font-medium ${badge.className}`}
            >
                {step === "generating" ? (
                    <motion.span animate={{ rotate: 360 }} transition={{ repeat: Infinity, duration: 2, ease: "linear" }}>
                        {badge.icon}
                    </motion.span>
                ) : badge.icon}
                <span className="hidden xs:inline sm:inline">{badge.label}</span>
            </motion.div>
        );
    };

    return (
        <div className="bg-white rounded-xl sm:rounded-2xl shadow-xl border border-slate-200 overflow-hidden relative h-[420px] sm:h-[480px] flex flex-col">
            {/* Header */}
            <div className="bg-slate-50 border-b border-slate-100 px-3 sm:px-4 py-2.5 sm:py-3 flex items-center justify-between flex-shrink-0">
                <div className="flex items-center gap-2.5 sm:gap-3 min-w-0">
                    <div className="w-7 h-7 sm:w-8 sm:h-8 rounded-lg bg-[#529ec6]/10 flex items-center justify-center flex-shrink-0">
                        <FileText className="w-3.5 h-3.5 sm:w-4 sm:h-4 text-[#529ec6]" />
                    </div>
                    <div className="min-w-0">
                        <p className="text-xs sm:text-sm font-semibold text-slate-900 truncate">
                            Consulting Services Agreement
                        </p>
                        <p className="text-[10px] sm:text-xs text-slate-400">California, USA</p>
                    </div>
                </div>
                <AnimatePresence mode="wait">
                    {getStatusBadge()}
                </AnimatePresence>
            </div>

            {/* Contract Content */}
            <div className="relative flex-1 overflow-hidden">
                {/* Complete Overlay */}
                <AnimatePresence>
                    {step === "complete" && (
                        <motion.div
                            initial={{ opacity: 0 }}
                            animate={{ opacity: 1 }}
                            exit={{ opacity: 0 }}
                            className="absolute inset-0 z-30 bg-white/95 backdrop-blur-sm flex flex-col items-center justify-center"
                        >
                            <motion.div
                                initial={{ scale: 0 }}
                                animate={{ scale: 1 }}
                                transition={{ type: "spring", stiffness: 200, damping: 15 }}
                                className="w-14 h-14 sm:w-16 sm:h-16 rounded-full bg-emerald-100 flex items-center justify-center mb-3 sm:mb-4"
                            >
                                <Check className="w-7 h-7 sm:w-8 sm:h-8 text-emerald-600" strokeWidth={2.5} />
                            </motion.div>
                            <motion.h3
                                initial={{ opacity: 0, y: 10 }}
                                animate={{ opacity: 1, y: 0 }}
                                transition={{ delay: 0.15 }}
                                className="text-lg sm:text-xl font-bold text-slate-900 mb-1"
                            >
                                Deal Complete
                            </motion.h3>
                            <motion.p
                                initial={{ opacity: 0, y: 10 }}
                                animate={{ opacity: 1, y: 0 }}
                                transition={{ delay: 0.25 }}
                                className="text-sm text-slate-500"
                            >
                                Signed & $5,000 received
                            </motion.p>
                        </motion.div>
                    )}
                </AnimatePresence>

                {/* Document */}
                <div className="p-4 sm:p-6 h-full overflow-hidden">
                    <div className={`transition-all duration-300 ${step === "generating" ? "opacity-100" : "opacity-90"}`}>
                        {/* Contract text with typing effect */}
                        <div className="font-mono text-[10px] sm:text-xs text-slate-600 leading-relaxed whitespace-pre-wrap">
                            {CONTRACT_TEXT.slice(0, typedLength)}
                            {step === "generating" && typedLength < CONTRACT_TEXT.length && (
                                <motion.span
                                    animate={{ opacity: [1, 0] }}
                                    transition={{ repeat: Infinity, duration: 0.5 }}
                                    className="inline-block w-0.5 sm:w-1 h-3 sm:h-3.5 bg-[#529ec6] ml-0.5 align-middle"
                                />
                            )}
                        </div>
                    </div>

                    {/* Fade out gradient at bottom */}
                    <div className="absolute bottom-0 left-0 right-0 h-16 sm:h-20 bg-gradient-to-t from-white to-transparent pointer-events-none" />
                </div>

                {/* Signature Section - overlaid at bottom */}
                <AnimatePresence>
                    {["signing", "signed", "collecting", "paid"].includes(step) && (
                        <motion.div
                            initial={{ opacity: 0, y: 20 }}
                            animate={{ opacity: 1, y: 0 }}
                            exit={{ opacity: 0, y: 20 }}
                            className="absolute bottom-0 left-0 right-0 bg-white border-t border-slate-100 p-3 sm:p-4"
                        >
                            <div className="flex items-end justify-between gap-4">
                                <div className="flex-1">
                                    <p className="text-[10px] sm:text-xs text-slate-400 mb-1 uppercase tracking-wide font-medium">
                                        Consultant Signature
                                    </p>
                                    <div className="border-b-2 border-slate-200 pb-1">
                                        <svg viewBox="0 0 200 30" className="h-6 sm:h-8 w-full max-w-[160px]">
                                            <motion.path
                                                d="M5,22 Q25,5 45,18 T85,15 T125,22 T165,10"
                                                fill="none"
                                                stroke="#1e293b"
                                                strokeWidth="2"
                                                strokeLinecap="round"
                                                initial={{ pathLength: 0 }}
                                                animate={{ pathLength: signatureProgress / 100 }}
                                            />
                                        </svg>
                                    </div>
                                    <p className="text-[10px] sm:text-xs text-slate-500 mt-1">Sarah Chen</p>
                                </div>
                                {["signed", "collecting", "paid"].includes(step) && (
                                    <motion.div
                                        initial={{ opacity: 0, scale: 0.8 }}
                                        animate={{ opacity: 1, scale: 1 }}
                                        className="flex items-center gap-1.5 px-2 py-1 bg-emerald-50 text-emerald-600 rounded-full text-[10px] sm:text-xs font-medium"
                                    >
                                        <Check className="w-3 h-3" />
                                        Signed
                                    </motion.div>
                                )}
                            </div>
                        </motion.div>
                    )}
                </AnimatePresence>
            </div>

            {/* Footer with Action/Payment */}
            <div className="border-t border-slate-100 bg-slate-50 px-3 sm:px-4 py-3 sm:py-4 flex-shrink-0">
                <AnimatePresence mode="wait">
                    {step === "ready" && (
                        <motion.button
                            key="send-btn"
                            initial={{ opacity: 0, y: 5 }}
                            animate={{ opacity: 1, y: 0 }}
                            exit={{ opacity: 0, y: -5 }}
                            className="w-full flex items-center justify-center gap-2 bg-emerald-600 hover:bg-emerald-700 text-white py-2.5 sm:py-3 rounded-lg text-sm font-medium transition-colors shadow-sm"
                        >
                            <Send className="w-4 h-4" />
                            Send for Signature
                        </motion.button>
                    )}

                    {["collecting", "paid"].includes(step) && (
                        <motion.div
                            key="payment"
                            initial={{ opacity: 0, y: 5 }}
                            animate={{ opacity: 1, y: 0 }}
                            exit={{ opacity: 0, y: -5 }}
                            className={`flex items-center justify-between p-3 sm:p-4 rounded-lg transition-colors ${
                                step === "paid"
                                    ? "bg-emerald-50 border border-emerald-200"
                                    : "bg-amber-50 border border-amber-200"
                            }`}
                        >
                            <div className="flex items-center gap-3">
                                <div className={`w-10 h-10 rounded-lg flex items-center justify-center ${
                                    step === "paid" ? "bg-emerald-100" : "bg-amber-100"
                                }`}>
                                    {step === "paid" ? (
                                        <Check className="w-5 h-5 text-emerald-600" strokeWidth={2.5} />
                                    ) : (
                                        <CreditCard className="w-5 h-5 text-amber-600" />
                                    )}
                                </div>
                                <div>
                                    <p className="text-base sm:text-lg font-bold text-slate-900">$5,000.00</p>
                                    <p className="text-xs text-slate-500">
                                        {step === "paid" ? "Payment received" : "Processing payment..."}
                                    </p>
                                </div>
                            </div>
                            {step === "paid" && (
                                <motion.span
                                    initial={{ opacity: 0, scale: 0.8 }}
                                    animate={{ opacity: 1, scale: 1 }}
                                    className="text-xs font-medium text-emerald-600 bg-emerald-100 px-3 py-1.5 rounded-full"
                                >
                                    Deposited
                                </motion.span>
                            )}
                            {step === "collecting" && (
                                <motion.div
                                    animate={{ opacity: [1, 0.4] }}
                                    transition={{ repeat: Infinity, duration: 0.8 }}
                                    className="w-2 h-2 rounded-full bg-amber-500"
                                />
                            )}
                        </motion.div>
                    )}

                    {!["ready", "collecting", "paid", "complete"].includes(step) && (
                        <motion.div
                            key="progress"
                            initial={{ opacity: 0 }}
                            animate={{ opacity: 1 }}
                            exit={{ opacity: 0 }}
                            className="flex items-center justify-center gap-3 sm:gap-4"
                        >
                            {/* Generate */}
                            <div className="flex items-center gap-1.5">
                                <div className={`w-5 h-5 sm:w-6 sm:h-6 rounded-full flex items-center justify-center text-white ${
                                    step === "generating" ? "bg-[#529ec6]" : "bg-emerald-500"
                                }`}>
                                    {step === "generating" ? (
                                        <motion.div animate={{ rotate: 360 }} transition={{ repeat: Infinity, duration: 2, ease: "linear" }}>
                                            <Sparkles className="w-3 h-3" />
                                        </motion.div>
                                    ) : (
                                        <Check className="w-3 h-3" strokeWidth={2.5} />
                                    )}
                                </div>
                                <span className="text-[10px] sm:text-xs font-medium text-slate-600">Generate</span>
                            </div>

                            <div className="w-6 sm:w-8 h-px bg-slate-200" />

                            {/* Sign */}
                            <div className="flex items-center gap-1.5">
                                <div className={`w-5 h-5 sm:w-6 sm:h-6 rounded-full flex items-center justify-center ${
                                    ["signed"].includes(step)
                                        ? "bg-emerald-500 text-white"
                                        : ["pending", "signing"].includes(step)
                                            ? "bg-amber-500 text-white"
                                            : "bg-slate-200 text-slate-400"
                                }`}>
                                    {["signed"].includes(step) ? (
                                        <Check className="w-3 h-3" strokeWidth={2.5} />
                                    ) : (
                                        <PenTool className="w-3 h-3" />
                                    )}
                                </div>
                                <span className={`text-[10px] sm:text-xs font-medium ${
                                    ["pending", "signing", "signed"].includes(step) ? "text-slate-600" : "text-slate-400"
                                }`}>Sign</span>
                            </div>

                            <div className="w-6 sm:w-8 h-px bg-slate-200" />

                            {/* Pay */}
                            <div className="flex items-center gap-1.5">
                                <div className="w-5 h-5 sm:w-6 sm:h-6 rounded-full flex items-center justify-center bg-slate-200 text-slate-400">
                                    <DollarSign className="w-3 h-3" />
                                </div>
                                <span className="text-[10px] sm:text-xs font-medium text-slate-400">Get Paid</span>
                            </div>
                        </motion.div>
                    )}
                </AnimatePresence>
            </div>
        </div>
    );
}
