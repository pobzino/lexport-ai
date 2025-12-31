"use client";

import { motion } from "framer-motion";
import { Sparkles, PenTool, CreditCard, FolderCheck } from "lucide-react";

export function HowItWorks() {
    const steps = [
        {
            step: "01",
            icon: Sparkles,
            title: "Generate",
            description: "AI creates your contract in seconds",
        },
        {
            step: "02",
            icon: PenTool,
            title: "Sign",
            description: "Collect e-signatures with one click",
        },
        {
            step: "03",
            icon: CreditCard,
            title: "Get paid",
            description: "Payment collected after signature",
        },
        {
            step: "04",
            icon: FolderCheck,
            title: "Store",
            description: "Everything tracked in your dashboard",
        },
    ];

    return (
        <section id="how-it-works" className="py-16 sm:py-24 lg:py-32 px-4 sm:px-6 lg:px-8 bg-slate-50 bg-grid">
            <div className="max-w-5xl mx-auto">
                <div className="text-center mb-10 sm:mb-12 lg:mb-16">
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

                <div className="grid grid-cols-2 lg:grid-cols-4 gap-4 sm:gap-6">
                    {steps.map((item, index) => (
                        <motion.div
                            key={item.step}
                            initial={{ opacity: 0, y: 16 }}
                            whileInView={{ opacity: 1, y: 0 }}
                            viewport={{ once: true }}
                            transition={{ delay: index * 0.1 }}
                            className="relative bg-white rounded-xl sm:rounded-2xl p-4 sm:p-6 border border-slate-200/80 hover:border-slate-300 transition-all hover:shadow-lg group"
                        >
                            <div className="text-xs font-mono text-slate-300 mb-3 sm:mb-4">{item.step}</div>
                            <div className="w-10 h-10 sm:w-12 sm:h-12 rounded-lg sm:rounded-xl bg-slate-100 flex items-center justify-center mb-3 sm:mb-4 group-hover:bg-indigo-100 transition-colors">
                                <item.icon className="w-4 h-4 sm:w-5 sm:h-5 text-slate-600 group-hover:text-indigo-600 transition-colors" />
                            </div>
                            <h3 className="text-base sm:text-lg font-semibold text-slate-900 mb-1 sm:mb-2">{item.title}</h3>
                            <p className="text-sm text-slate-500 leading-relaxed">{item.description}</p>
                        </motion.div>
                    ))}
                </div>
            </div>
        </section>
    );
}
