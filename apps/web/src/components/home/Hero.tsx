"use client";

import Link from "next/link";
import { ArrowRight } from "lucide-react";
import { motion } from "framer-motion";
import { HeroMockDemo } from "./HeroMockDemo";

export function Hero() {
    return (
        <section className="relative pt-20 sm:pt-28 lg:pt-32 pb-16 sm:pb-20 lg:pb-24 overflow-hidden bg-grid">
            {/* Subtle gradient glow */}
            <div className="absolute inset-0 z-0 pointer-events-none">
                <div className="absolute top-1/2 left-1/2 -translate-x-1/2 -translate-y-1/2 w-[400px] sm:w-[600px] lg:w-[800px] h-[300px] sm:h-[450px] lg:h-[600px] bg-gradient-to-r from-[#529ec6]/20 via-[#529ec6]/10 to-emerald-100/30 rounded-full blur-3xl opacity-60" />
            </div>

            <div className="relative z-10 max-w-5xl mx-auto px-4 sm:px-6 lg:px-8">
                {/* Centered Hero Content */}
                <div className="text-center max-w-3xl mx-auto mb-12 sm:mb-16 lg:mb-20">
                    <motion.div
                        initial={{ opacity: 0, y: 16 }}
                        animate={{ opacity: 1, y: 0 }}
                        transition={{ duration: 0.4 }}
                        className="inline-flex items-center gap-2 bg-slate-100 text-slate-600 px-3 sm:px-4 py-1.5 rounded-full text-xs sm:text-sm font-medium mb-6 sm:mb-8"
                    >
                        <span className="w-1.5 h-1.5 rounded-full bg-emerald-500"></span>
                        The complete contract-to-cash platform
                    </motion.div>

                    <h1 className="text-4xl sm:text-5xl md:text-6xl lg:text-7xl font-extrabold tracking-tight text-slate-900 mb-4 sm:mb-6">
                        <motion.span
                            initial={{ opacity: 0, y: 16 }}
                            animate={{ opacity: 1, y: 0 }}
                            transition={{ duration: 0.4, delay: 0.1 }}
                            className="block"
                        >
                            Generate contracts.
                        </motion.span>
                        <motion.span
                            initial={{ opacity: 0, y: 16 }}
                            animate={{ opacity: 1, y: 0 }}
                            transition={{ duration: 0.4, delay: 0.3 }}
                            className="block text-[#529ec6]"
                        >
                            Get them signed.
                        </motion.span>
                        <motion.span
                            initial={{ opacity: 0, y: 16 }}
                            animate={{ opacity: 1, y: 0 }}
                            transition={{ duration: 0.4, delay: 0.5 }}
                            className="block text-gradient"
                        >
                            Get paid.
                        </motion.span>
                    </h1>

                    <motion.p
                        initial={{ opacity: 0, y: 16 }}
                        animate={{ opacity: 1, y: 0 }}
                        transition={{ duration: 0.4, delay: 0.15 }}
                        className="text-base sm:text-lg md:text-xl text-slate-500 mb-8 sm:mb-10 max-w-xl mx-auto leading-relaxed px-2 sm:px-0"
                    >
                        AI-powered contracts with built-in e-signatures and payment collection.
                        Stop chasing invoices.
                    </motion.p>

                    <motion.div
                        initial={{ opacity: 0, y: 16 }}
                        animate={{ opacity: 1, y: 0 }}
                        transition={{ duration: 0.4, delay: 0.2 }}
                        className="flex flex-col sm:flex-row gap-3 justify-center"
                    >
                        <Link
                            href="/register"
                            className="inline-flex items-center justify-center bg-slate-900 text-white px-6 py-3 rounded-xl text-base font-medium hover:bg-slate-800 transition-all hover:scale-[1.02] shadow-lg shadow-slate-900/10"
                        >
                            Start for free
                            <ArrowRight className="w-4 h-4 ml-2" />
                        </Link>
                        <Link
                            href="#how-it-works"
                            className="inline-flex items-center justify-center bg-white text-slate-600 px-6 py-3 rounded-xl text-base font-medium border border-slate-200 hover:bg-slate-50 hover:border-slate-300 transition-all"
                        >
                            See how it works
                        </Link>
                    </motion.div>
                </div>

                {/* Animated Product Demo */}
                <motion.div
                    initial={{ opacity: 0, y: 24 }}
                    animate={{ opacity: 1, y: 0 }}
                    transition={{ duration: 0.6, delay: 0.3 }}
                    className="relative max-w-4xl mx-auto"
                >
                    <div className="absolute -inset-4 bg-gradient-to-r from-[#529ec6]/20 via-[#529ec6]/10 to-emerald-500/20 rounded-3xl blur-2xl opacity-50" />
                    <div className="relative">
                        <HeroMockDemo />
                    </div>
                </motion.div>
            </div>
        </section>
    );
}

