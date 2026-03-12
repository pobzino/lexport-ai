"use client";

import { useState } from "react";
import { motion, AnimatePresence } from "framer-motion";
import {
    Sparkles,
    MessageSquare,
    Shield,
    FileText,
    Send,
    AlertTriangle,
    CheckCircle2,
    ChevronRight,
    Zap,
} from "lucide-react";
import Link from "next/link";

type TabId = "generate" | "chat" | "review";

interface Tab {
    id: TabId;
    label: string;
    icon: typeof Sparkles;
}

const tabs: Tab[] = [
    { id: "generate", label: "Generate", icon: Sparkles },
    { id: "chat", label: "Chat", icon: MessageSquare },
    { id: "review", label: "Review", icon: Shield },
];

// Generate Demo - Contract creation UI
function GenerateDemo() {
    return (
        <div className="bg-white rounded-2xl border border-slate-200 shadow-xl overflow-hidden">
            {/* Header */}
            <div className="px-5 py-4 border-b border-slate-100 bg-gradient-to-r from-slate-50 to-white">
                <div className="flex items-center gap-3">
                    <div className="w-10 h-10 rounded-xl bg-sky-100 flex items-center justify-center">
                        <FileText className="w-5 h-5 text-sky-600" />
                    </div>
                    <div>
                        <h4 className="font-semibold text-slate-900">New Contract</h4>
                        <p className="text-xs text-slate-500">AI-powered generation</p>
                    </div>
                </div>
            </div>
            {/* Form */}
            <div className="p-5 space-y-4">
                <div className="grid grid-cols-2 gap-4">
                    <div>
                        <label className="text-xs font-medium text-slate-500 mb-1.5 block">Contract Type</label>
                        <div className="px-3 py-2.5 bg-slate-50 rounded-lg border border-slate-200 text-sm text-slate-700">
                            Consulting Agreement
                        </div>
                    </div>
                    <div>
                        <label className="text-xs font-medium text-slate-500 mb-1.5 block">Jurisdiction</label>
                        <div className="px-3 py-2.5 bg-slate-50 rounded-lg border border-slate-200 text-sm text-slate-700">
                            California, USA
                        </div>
                    </div>
                </div>
                <div>
                    <label className="text-xs font-medium text-slate-500 mb-1.5 block">Describe your needs</label>
                    <div className="px-3 py-2.5 bg-slate-50 rounded-lg border border-slate-200 text-sm text-slate-600 min-h-[60px]">
                        6-month consulting engagement for product strategy, $15,000 monthly retainer, includes IP assignment...
                    </div>
                </div>
                {/* Generated preview */}
                <div className="bg-gradient-to-br from-sky-50 to-blue-50 rounded-xl p-4 border border-sky-100">
                    <div className="flex items-center gap-2 mb-3">
                        <div className="w-6 h-6 rounded-full bg-sky-500 flex items-center justify-center">
                            <Sparkles className="w-3 h-3 text-white" />
                        </div>
                        <span className="text-sm font-medium text-sky-700">AI generating your contract...</span>
                    </div>
                    <div className="space-y-2">
                        <div className="flex items-center gap-2 text-xs text-slate-600">
                            <CheckCircle2 className="w-3.5 h-3.5 text-emerald-500" />
                            <span>12 clauses tailored to California law</span>
                        </div>
                        <div className="flex items-center gap-2 text-xs text-slate-600">
                            <CheckCircle2 className="w-3.5 h-3.5 text-emerald-500" />
                            <span>IP assignment & confidentiality included</span>
                        </div>
                        <div className="flex items-center gap-2 text-xs text-slate-600">
                            <CheckCircle2 className="w-3.5 h-3.5 text-emerald-500" />
                            <span>Payment terms & termination clauses</span>
                        </div>
                    </div>
                </div>
            </div>
        </div>
    );
}

// Chat Demo - AI conversation UI
function ChatDemo() {
    return (
        <div className="bg-white rounded-2xl border border-slate-200 shadow-xl overflow-hidden">
            {/* Header */}
            <div className="px-5 py-4 border-b border-slate-100 bg-gradient-to-r from-slate-50 to-white">
                <div className="flex items-center gap-3">
                    <div className="w-10 h-10 rounded-xl bg-violet-100 flex items-center justify-center">
                        <MessageSquare className="w-5 h-5 text-violet-600" />
                    </div>
                    <div>
                        <h4 className="font-semibold text-slate-900">Contract Chat</h4>
                        <p className="text-xs text-slate-500">Consulting Agreement.pdf</p>
                    </div>
                </div>
            </div>
            {/* Chat messages */}
            <div className="p-5 space-y-4 bg-slate-50/50">
                {/* User message */}
                <div className="flex justify-end">
                    <div className="bg-[#202e46] text-white px-4 py-2.5 rounded-2xl rounded-br-md max-w-[80%]">
                        <p className="text-sm">Can you explain the termination clause and make it less restrictive?</p>
                    </div>
                </div>
                {/* AI response */}
                <div className="flex gap-3">
                    <div className="w-8 h-8 rounded-full bg-gradient-to-br from-violet-500 to-purple-600 flex items-center justify-center flex-shrink-0">
                        <Sparkles className="w-4 h-4 text-white" />
                    </div>
                    <div className="bg-white px-4 py-3 rounded-2xl rounded-tl-md border border-slate-200 max-w-[85%]">
                        <p className="text-sm text-slate-700 mb-3">
                            The current termination clause requires <span className="font-medium text-slate-900">60 days notice</span>. I can modify it to:
                        </p>
                        <div className="space-y-2 text-xs">
                            <div className="flex items-start gap-2 p-2 bg-emerald-50 rounded-lg border border-emerald-100">
                                <CheckCircle2 className="w-4 h-4 text-emerald-500 mt-0.5" />
                                <span className="text-slate-600">30 days written notice for convenience</span>
                            </div>
                            <div className="flex items-start gap-2 p-2 bg-emerald-50 rounded-lg border border-emerald-100">
                                <CheckCircle2 className="w-4 h-4 text-emerald-500 mt-0.5" />
                                <span className="text-slate-600">Immediate termination for material breach</span>
                            </div>
                        </div>
                        <button className="mt-3 text-xs font-medium text-violet-600 hover:text-violet-700 flex items-center gap-1">
                            Apply changes
                            <ChevronRight className="w-3 h-3" />
                        </button>
                    </div>
                </div>
            </div>
            {/* Input */}
            <div className="px-5 py-4 border-t border-slate-100">
                <div className="flex gap-2">
                    <input
                        type="text"
                        placeholder="Ask about your contract..."
                        className="flex-1 px-4 py-2.5 bg-slate-50 rounded-xl border border-slate-200 text-sm focus:outline-none"
                        readOnly
                    />
                    <button className="p-2.5 bg-violet-500 text-white rounded-xl">
                        <Send className="w-4 h-4" />
                    </button>
                </div>
            </div>
        </div>
    );
}

// Review Demo - Risk analysis UI
function ReviewDemo() {
    return (
        <div className="bg-white rounded-2xl border border-slate-200 shadow-xl overflow-hidden">
            {/* Header */}
            <div className="px-5 py-4 border-b border-slate-100 bg-gradient-to-r from-slate-50 to-white">
                <div className="flex items-center justify-between">
                    <div className="flex items-center gap-3">
                        <div className="w-10 h-10 rounded-xl bg-amber-100 flex items-center justify-center">
                            <Shield className="w-5 h-5 text-amber-600" />
                        </div>
                        <div>
                            <h4 className="font-semibold text-slate-900">Risk Analysis</h4>
                            <p className="text-xs text-slate-500">Vendor Agreement.pdf</p>
                        </div>
                    </div>
                    <div className="flex items-center gap-1.5 px-3 py-1.5 bg-amber-100 rounded-full">
                        <AlertTriangle className="w-3.5 h-3.5 text-amber-600" />
                        <span className="text-xs font-medium text-amber-700">3 issues found</span>
                    </div>
                </div>
            </div>
            {/* Risk items */}
            <div className="p-5 space-y-3">
                {/* Critical */}
                <div className="p-4 bg-red-50 rounded-xl border border-red-100">
                    <div className="flex items-start gap-3">
                        <div className="w-6 h-6 rounded-full bg-red-100 flex items-center justify-center flex-shrink-0 mt-0.5">
                            <AlertTriangle className="w-3.5 h-3.5 text-red-600" />
                        </div>
                        <div className="flex-1">
                            <div className="flex items-center gap-2 mb-1">
                                <span className="text-xs font-semibold text-red-700 uppercase">Critical</span>
                            </div>
                            <p className="text-sm font-medium text-slate-900 mb-1">Unlimited liability exposure</p>
                            <p className="text-xs text-slate-600">Section 8.2 contains no cap on liability, exposing you to unlimited damages.</p>
                            <button className="mt-2 text-xs font-medium text-red-600 hover:text-red-700 flex items-center gap-1">
                                <Zap className="w-3 h-3" />
                                AI Fix
                            </button>
                        </div>
                    </div>
                </div>
                {/* Warning */}
                <div className="p-4 bg-amber-50 rounded-xl border border-amber-100">
                    <div className="flex items-start gap-3">
                        <div className="w-6 h-6 rounded-full bg-amber-100 flex items-center justify-center flex-shrink-0 mt-0.5">
                            <AlertTriangle className="w-3.5 h-3.5 text-amber-600" />
                        </div>
                        <div className="flex-1">
                            <div className="flex items-center gap-2 mb-1">
                                <span className="text-xs font-semibold text-amber-700 uppercase">Warning</span>
                            </div>
                            <p className="text-sm font-medium text-slate-900 mb-1">One-sided termination rights</p>
                            <p className="text-xs text-slate-600">Vendor can terminate with 7 days notice, but you require 90 days.</p>
                        </div>
                    </div>
                </div>
                {/* Info */}
                <div className="p-4 bg-blue-50 rounded-xl border border-blue-100">
                    <div className="flex items-start gap-3">
                        <div className="w-6 h-6 rounded-full bg-blue-100 flex items-center justify-center flex-shrink-0 mt-0.5">
                            <CheckCircle2 className="w-3.5 h-3.5 text-blue-600" />
                        </div>
                        <div className="flex-1">
                            <div className="flex items-center gap-2 mb-1">
                                <span className="text-xs font-semibold text-blue-700 uppercase">Suggestion</span>
                            </div>
                            <p className="text-sm font-medium text-slate-900 mb-1">Missing data protection clause</p>
                            <p className="text-xs text-slate-600">Consider adding GDPR/CCPA compliance language for data handling.</p>
                        </div>
                    </div>
                </div>
            </div>
        </div>
    );
}

const tabContent: Record<TabId, { title: string; subtitle: string; description: string; cta: string; Demo: () => React.ReactNode }> = {
    generate: {
        title: "Generate",
        subtitle: "Create contracts in seconds, not hours",
        description: "Describe what you need in plain English. Our AI generates legally-sound contracts tailored to your jurisdiction, complete with all necessary clauses and protections. No legal expertise required.",
        cta: "Try AI Generator",
        Demo: GenerateDemo,
    },
    chat: {
        title: "Chat",
        subtitle: "Your AI legal assistant, 24/7",
        description: "Ask questions about any clause, request explanations in simple terms, or have the AI make changes for you. It's like having a lawyer on speed dial, without the hourly rate.",
        cta: "Try AI Chat",
        Demo: ChatDemo,
    },
    review: {
        title: "Review",
        subtitle: "Catch risks before you sign",
        description: "Upload any contract and our AI instantly identifies potential issues, missing clauses, and unfavorable terms. Get actionable suggestions to protect your interests.",
        cta: "Try Risk Analysis",
        Demo: ReviewDemo,
    },
};

export function AIFeatures() {
    const [activeTab, setActiveTab] = useState<TabId>("generate");
    const content = tabContent[activeTab];

    return (
        <section className="py-20 sm:py-28 px-4 sm:px-6 lg:px-8 bg-gradient-to-b from-white to-slate-50">
            <div className="max-w-6xl mx-auto">
                {/* Section header */}
                <div className="text-center mb-12">
                    <motion.div
                        initial={{ opacity: 0, y: 10 }}
                        whileInView={{ opacity: 1, y: 0 }}
                        viewport={{ once: true }}
                        className="inline-flex items-center gap-2 bg-sky-100 text-sky-700 px-4 py-1.5 rounded-full text-sm font-medium mb-4"
                    >
                        <Sparkles className="w-4 h-4" />
                        Powered by AI
                    </motion.div>
                    <motion.h2
                        initial={{ opacity: 0, y: 10 }}
                        whileInView={{ opacity: 1, y: 0 }}
                        viewport={{ once: true }}
                        transition={{ delay: 0.1 }}
                        className="text-3xl sm:text-4xl lg:text-5xl font-bold text-slate-900 mb-4"
                    >
                        AI that actually helps
                    </motion.h2>
                    <motion.p
                        initial={{ opacity: 0, y: 10 }}
                        whileInView={{ opacity: 1, y: 0 }}
                        viewport={{ once: true }}
                        transition={{ delay: 0.2 }}
                        className="text-lg text-slate-600 max-w-2xl mx-auto"
                    >
                        Not just another chatbot. Real AI capabilities that save you time and protect your interests.
                    </motion.p>
                </div>

                {/* Tabs */}
                <motion.div
                    initial={{ opacity: 0, y: 10 }}
                    whileInView={{ opacity: 1, y: 0 }}
                    viewport={{ once: true }}
                    transition={{ delay: 0.3 }}
                    className="flex justify-center mb-12"
                >
                    <div className="inline-flex bg-slate-100 rounded-xl p-1.5">
                        {tabs.map((tab) => (
                            <button
                                key={tab.id}
                                onClick={() => setActiveTab(tab.id)}
                                className={`relative flex items-center gap-2 px-6 py-3 rounded-lg text-sm font-medium transition-all ${
                                    activeTab === tab.id
                                        ? "text-slate-900"
                                        : "text-slate-500 hover:text-slate-700"
                                }`}
                            >
                                {activeTab === tab.id && (
                                    <motion.div
                                        layoutId="activeTab"
                                        className="absolute inset-0 bg-white rounded-lg shadow-sm pointer-events-none"
                                        transition={{ type: "spring", duration: 0.5 }}
                                    />
                                )}
                                <tab.icon className={`w-4 h-4 relative z-10 ${activeTab === tab.id ? "text-sky-500" : ""}`} />
                                <span className="relative z-10">{tab.label}</span>
                            </button>
                        ))}
                    </div>
                </motion.div>

                {/* Content */}
                <AnimatePresence mode="wait">
                    <motion.div
                        key={activeTab}
                        initial={{ opacity: 0, y: 20 }}
                        animate={{ opacity: 1, y: 0 }}
                        exit={{ opacity: 0, y: -20 }}
                        transition={{ duration: 0.3 }}
                        className="grid lg:grid-cols-2 gap-8 lg:gap-16 items-center"
                    >
                        {/* Demo */}
                        <div className="order-2 lg:order-1">
                            <content.Demo />
                        </div>

                        {/* Description */}
                        <div className="order-1 lg:order-2">
                            <h3 className="text-2xl sm:text-3xl font-bold text-slate-900 mb-3">
                                {content.title}
                            </h3>
                            <p className="text-lg font-medium text-sky-600 mb-4">
                                {content.subtitle}
                            </p>
                            <p className="text-slate-600 mb-8 leading-relaxed">
                                {content.description}
                            </p>
                            <Link
                                href="/register"
                                className="inline-flex items-center gap-2 px-6 py-3 bg-[#202e46] text-white font-semibold rounded-xl hover:bg-[#1a2539] transition-all shadow-lg shadow-slate-900/10"
                            >
                                {content.cta}
                                <ChevronRight className="w-4 h-4" />
                            </Link>
                        </div>
                    </motion.div>
                </AnimatePresence>
            </div>
        </section>
    );
}
