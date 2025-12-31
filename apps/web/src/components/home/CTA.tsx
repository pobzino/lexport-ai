"use client";

import Link from "next/link";
import { ArrowRight, Sparkles } from "lucide-react";
import { motion } from "framer-motion";

export function CTA() {
    return (
        <section className="py-24 px-4 sm:px-6 lg:px-8 bg-white">
            <div className="max-w-5xl mx-auto">
                <motion.div
                    initial={{ opacity: 0, scale: 0.95 }}
                    whileInView={{ opacity: 1, scale: 1 }}
                    viewport={{ once: true }}
                    className="bg-slate-900 rounded-[2.5rem] p-12 md:p-20 text-center relative overflow-hidden group shadow-2xl"
                >
                    {/* Background effects */}
                    <div className="absolute top-0 right-0 w-96 h-96 bg-blue-500 rounded-full blur-[100px] opacity-20 -mr-20 -mt-20 pointer-events-none group-hover:opacity-30 transition-opacity duration-700" />
                    <div className="absolute bottom-0 left-0 w-96 h-96 bg-purple-500 rounded-full blur-[100px] opacity-20 -ml-20 -mb-20 pointer-events-none group-hover:opacity-30 transition-opacity duration-700" />

                    {/* Decorative elements */}
                    <div className="absolute top-12 left-12 text-slate-700 opacity-50 animate-pulse">
                        <Sparkles className="w-8 h-8" />
                    </div>
                    <div className="absolute bottom-12 right-12 text-slate-700 opacity-50">
                        <div className="w-12 h-12 border-4 border-slate-700/50 rounded-full" />
                    </div>

                    <div className="relative z-10">
                        <h2 className="text-3xl sm:text-5xl font-bold text-white mb-6 leading-tight">
                            Ready to simplify your{" "}
                            <span className="text-transparent bg-clip-text bg-gradient-to-r from-blue-200 to-purple-200">contracts</span>?
                        </h2>
                        <p className="text-slate-300 mb-10 max-w-2xl mx-auto text-lg leading-relaxed">
                            Join founders and freelancers who use Lexport to create, sign, and get paid — all in one place. Free plan available.
                        </p>
                        <Link
                            href="/register"
                            className="inline-flex items-center justify-center bg-white text-slate-900 px-10 py-4 rounded-xl text-lg font-bold hover:bg-blue-50 transition-all hover:scale-105 shadow-lg shadow-white/10"
                        >
                            Try Free
                            <ArrowRight className="w-5 h-5 ml-2" />
                        </Link>
                    </div>
                </motion.div>
            </div>
        </section>
    );
}
