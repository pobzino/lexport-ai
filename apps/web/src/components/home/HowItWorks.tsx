"use client";

import { motion } from "framer-motion";
import {
    Sparkles,
    PenTool,
    CreditCard,
    FileText,
    Check,
    ChevronDown,
    Send,
    Clock,
    CheckCircle2,
} from "lucide-react";

// Shared height for all demo cards
const DEMO_HEIGHT = "h-[290px]";

// Step 1: Generate - Contract form + AI generation
function GenerateDemo() {
    return (
        <div className={`bg-white rounded-lg border border-slate-200 overflow-hidden shadow-sm ${DEMO_HEIGHT} flex flex-col`}>
            {/* Form Header */}
            <div className="px-3 py-2 border-b border-slate-100 bg-slate-50 flex-shrink-0">
                <div className="flex items-center gap-2">
                    <div className="w-5 h-5 rounded bg-[#529ec6]/10 flex items-center justify-center">
                        <FileText className="w-3 h-3 text-[#529ec6]" />
                    </div>
                    <span className="text-xs font-medium text-slate-700">New Contract</span>
                </div>
            </div>
            {/* Form Fields */}
            <div className="p-3 space-y-2.5 flex-1 flex flex-col">
                <div>
                    <div className="text-[10px] text-slate-400 mb-1">Contract Type</div>
                    <div className="flex items-center justify-between px-2.5 py-2 bg-slate-50 rounded border border-slate-200 text-xs text-slate-700">
                        <span>Consulting Agreement</span>
                        <ChevronDown className="w-3 h-3 text-slate-400" />
                    </div>
                </div>
                <div>
                    <div className="text-[10px] text-slate-400 mb-1">Client Name</div>
                    <div className="px-2.5 py-2 bg-slate-50 rounded border border-slate-200 text-xs text-slate-700">
                        Acme Corp
                    </div>
                </div>
                <div>
                    <div className="text-[10px] text-slate-400 mb-1">Amount</div>
                    <div className="px-2.5 py-2 bg-slate-50 rounded border border-slate-200 text-xs text-slate-700">
                        $5,000
                    </div>
                </div>
                {/* Generate Button */}
                <button className="w-full flex items-center justify-center gap-1.5 bg-sky-500 hover:bg-sky-600 text-white py-2.5 rounded text-xs font-medium mt-auto">
                    <Sparkles className="w-3 h-3" />
                    Generate with AI
                </button>
            </div>
        </div>
    );
}

// Step 2: Sign - Signature collection UI
function SignDemo() {
    return (
        <div className={`bg-white rounded-lg border border-slate-200 overflow-hidden shadow-sm ${DEMO_HEIGHT} flex flex-col`}>
            {/* Header */}
            <div className="px-3 py-2 border-b border-slate-100 bg-slate-50 flex items-center justify-between flex-shrink-0">
                <div className="flex items-center gap-2">
                    <div className="w-5 h-5 rounded bg-amber-100 flex items-center justify-center">
                        <PenTool className="w-3 h-3 text-amber-600" />
                    </div>
                    <span className="text-xs font-medium text-slate-700">Signatures</span>
                </div>
                <span className="text-[10px] px-1.5 py-0.5 bg-amber-100 text-amber-700 rounded-full font-medium">1/2</span>
            </div>
            {/* Signers */}
            <div className="p-3 space-y-2.5 flex-1 flex flex-col">
                <div className="flex items-center gap-2.5 p-2.5 bg-emerald-50 rounded-lg border border-emerald-200">
                    <div className="w-7 h-7 rounded-full bg-emerald-100 flex items-center justify-center">
                        <Check className="w-3.5 h-3.5 text-emerald-600" />
                    </div>
                    <div className="flex-1 min-w-0">
                        <p className="text-xs font-medium text-slate-700 truncate">You (Sender)</p>
                        <p className="text-[10px] text-emerald-600">Signed Jan 15</p>
                    </div>
                </div>
                <div className="flex items-center gap-2.5 p-2.5 bg-amber-50 rounded-lg border border-amber-200">
                    <div className="w-7 h-7 rounded-full bg-amber-100 flex items-center justify-center">
                        <Clock className="w-3.5 h-3.5 text-amber-600" />
                    </div>
                    <div className="flex-1 min-w-0">
                        <p className="text-xs font-medium text-slate-700 truncate">john@acme.com</p>
                        <p className="text-[10px] text-amber-600">Awaiting signature</p>
                    </div>
                </div>
                {/* Send Reminder */}
                <button className="w-full flex items-center justify-center gap-1.5 bg-slate-100 text-slate-600 py-2.5 rounded text-xs font-medium mt-auto">
                    <Send className="w-3 h-3" />
                    Send Reminder
                </button>
            </div>
        </div>
    );
}

// Step 3: Get Paid - Payment UI
function PaymentDemo() {
    return (
        <div className={`bg-white rounded-lg border border-slate-200 overflow-hidden shadow-sm ${DEMO_HEIGHT} flex flex-col`}>
            {/* Header */}
            <div className="px-3 py-2 border-b border-slate-100 bg-slate-50 flex items-center justify-between flex-shrink-0">
                <div className="flex items-center gap-2">
                    <div className="w-5 h-5 rounded bg-emerald-100 flex items-center justify-center">
                        <CreditCard className="w-3 h-3 text-emerald-600" />
                    </div>
                    <span className="text-xs font-medium text-slate-700">Payment</span>
                </div>
                <span className="text-[10px] px-1.5 py-0.5 bg-emerald-100 text-emerald-700 rounded-full font-medium">Received</span>
            </div>
            {/* Payment Details */}
            <div className="p-4 flex-1 flex flex-col justify-center">
                <div className="text-center mb-4">
                    <p className="text-3xl font-bold text-slate-900">$5,000</p>
                    <p className="text-xs text-slate-500 mt-1">Consulting Agreement</p>
                </div>
                <div className="space-y-2.5 bg-slate-50 rounded-lg p-3">
                    <div className="flex items-center justify-between text-xs">
                        <span className="text-slate-500">Status</span>
                        <span className="text-emerald-600 font-medium flex items-center gap-1">
                            <CheckCircle2 className="w-3.5 h-3.5" />
                            Deposited
                        </span>
                    </div>
                    <div className="flex items-center justify-between text-xs">
                        <span className="text-slate-500">Account</span>
                        <span className="text-slate-700">Chase ****4521</span>
                    </div>
                    <div className="flex items-center justify-between text-xs">
                        <span className="text-slate-500">Date</span>
                        <span className="text-slate-700">Jan 15, 2025</span>
                    </div>
                </div>
            </div>
        </div>
    );
}

export function HowItWorks() {
    const steps = [
        {
            step: "01",
            icon: Sparkles,
            title: "Generate Contracts",
            description: "Fill in the basics, AI handles the rest",
            color: "bg-[#529ec6]",
            Demo: GenerateDemo,
        },
        {
            step: "02",
            icon: PenTool,
            title: "Sign",
            description: "Send for signatures with one click",
            color: "bg-amber-500",
            Demo: SignDemo,
        },
        {
            step: "03",
            icon: CreditCard,
            title: "Get Paid",
            description: "Collect payment when they sign",
            color: "bg-emerald-500",
            Demo: PaymentDemo,
        },
    ];

    return (
        <section id="how-it-works" className="py-16 sm:py-24 lg:py-32 px-4 sm:px-6 lg:px-8 bg-slate-50">
            <div className="max-w-6xl mx-auto">
                <div className="text-center mb-12 sm:mb-16">
                    <motion.p
                        initial={{ opacity: 0, y: 12 }}
                        whileInView={{ opacity: 1, y: 0 }}
                        viewport={{ once: true }}
                        className="text-sm font-medium text-slate-400 uppercase tracking-wider mb-4"
                    >
                        How it works
                    </motion.p>
                    <motion.h2
                        initial={{ opacity: 0, y: 12 }}
                        whileInView={{ opacity: 1, y: 0 }}
                        viewport={{ once: true }}
                        transition={{ delay: 0.1 }}
                        className="text-2xl sm:text-3xl lg:text-4xl font-bold text-slate-900"
                    >
                        From contract to cash in minutes
                    </motion.h2>
                </div>

                {/* Desktop: Horizontal flow */}
                <div className="hidden lg:block">
                    <div className="grid grid-cols-3 gap-8">
                        {steps.map((item, index) => (
                            <motion.div
                                key={item.step}
                                initial={{ opacity: 0, y: 20 }}
                                whileInView={{ opacity: 1, y: 0 }}
                                viewport={{ once: true }}
                                transition={{ delay: index * 0.1 }}
                                className="relative"
                            >
                                {/* Connector line */}
                                {index < steps.length - 1 && (
                                    <div className="absolute top-[195px] left-full w-8 h-px bg-slate-300 z-10" />
                                )}

                                {/* Step number + icon */}
                                <div className="flex items-center gap-3 mb-4">
                                    <div className={`w-10 h-10 rounded-xl ${item.color} flex items-center justify-center shadow-lg`}>
                                        <item.icon className="w-5 h-5 text-white" />
                                    </div>
                                    <div>
                                        <span className="text-xs font-mono text-slate-400">{item.step}</span>
                                        <h3 className="text-lg font-semibold text-slate-900">{item.title}</h3>
                                    </div>
                                </div>

                                {/* Demo UI */}
                                <div className="mb-3">
                                    <item.Demo />
                                </div>

                                {/* Description */}
                                <p className="text-sm text-slate-500">{item.description}</p>
                            </motion.div>
                        ))}
                    </div>
                </div>

                {/* Mobile/Tablet: Stacked cards */}
                <div className="lg:hidden grid grid-cols-1 sm:grid-cols-2 gap-6">
                    {steps.map((item, index) => (
                        <motion.div
                            key={item.step}
                            initial={{ opacity: 0, y: 16 }}
                            whileInView={{ opacity: 1, y: 0 }}
                            viewport={{ once: true }}
                            transition={{ delay: index * 0.1 }}
                            className="bg-white rounded-2xl p-4 sm:p-5 border border-slate-200 shadow-sm"
                        >
                            {/* Step header */}
                            <div className="flex items-center gap-3 mb-4">
                                <div className={`w-10 h-10 rounded-xl ${item.color} flex items-center justify-center shadow-lg`}>
                                    <item.icon className="w-5 h-5 text-white" />
                                </div>
                                <div>
                                    <span className="text-xs font-mono text-slate-400">{item.step}</span>
                                    <h3 className="text-lg font-semibold text-slate-900">{item.title}</h3>
                                </div>
                            </div>

                            {/* Demo UI */}
                            <div className="mb-3">
                                <item.Demo />
                            </div>

                            {/* Description */}
                            <p className="text-sm text-slate-500">{item.description}</p>
                        </motion.div>
                    ))}
                </div>
            </div>
        </section>
    );
}
