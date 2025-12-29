"use client";

import Link from "next/link";
import { Check, Sparkles, ArrowRight } from "lucide-react";
import { motion } from "framer-motion";

export function Pricing() {
    return (
        <section id="pricing" className="py-24 px-4 sm:px-6 lg:px-8 bg-slate-50">
            <div className="max-w-5xl mx-auto">
                <div className="text-center mb-16">
                    <motion.div
                        initial={{ opacity: 0, y: 10 }}
                        whileInView={{ opacity: 1, y: 0 }}
                        viewport={{ once: true }}
                        className="inline-flex items-center gap-2 bg-[#202e46]/10 text-[#202e46] px-4 py-1.5 rounded-full text-sm font-medium mb-4"
                    >
                        <Sparkles className="w-4 h-4" />
                        Simple, transparent pricing
                    </motion.div>
                    <motion.h2
                        initial={{ opacity: 0, y: 10 }}
                        whileInView={{ opacity: 1, y: 0 }}
                        viewport={{ once: true }}
                        transition={{ delay: 0.1 }}
                        className="text-3xl sm:text-4xl font-bold text-slate-900 mb-4"
                    >
                        Choose your plan
                    </motion.h2>
                    <motion.p
                        initial={{ opacity: 0, y: 10 }}
                        whileInView={{ opacity: 1, y: 0 }}
                        viewport={{ once: true }}
                        transition={{ delay: 0.2 }}
                        className="text-slate-600 max-w-2xl mx-auto"
                    >
                        Start with a 14-day free trial. No credit card required. Experience
                        the complete end-to-end legal workflow platform.
                    </motion.p>
                </div>

                <div className="grid md:grid-cols-2 gap-8 items-start">
                    {/* Professional Plan */}
                    <motion.div
                        initial={{ opacity: 0, x: -20 }}
                        whileInView={{ opacity: 1, x: 0 }}
                        viewport={{ once: true }}
                        className="bg-white rounded-2xl border-2 border-[#202e46] overflow-hidden shadow-2xl relative z-10 transform md:-translate-y-4"
                    >
                        <div className="bg-[#202e46] text-white text-center py-3 text-sm font-medium tracking-wide">
                            <span className="mr-2">✨</span> MOST POPULAR
                        </div>
                        <div className="p-8">
                            <h3 className="text-2xl font-bold text-slate-900">
                                Professional
                            </h3>
                            <p className="text-slate-600 mt-1">
                                Perfect for growing legal teams
                            </p>
                            <div className="mt-8 flex items-baseline gap-1">
                                <span className="text-6xl font-bold text-slate-900 tracking-tight">$79</span>
                                <span className="text-slate-600 font-medium">/month</span>
                            </div>
                            <p className="text-sm text-slate-500 mt-2 mb-8">per user</p>

                            <Link
                                href="/register"
                                className="w-full inline-flex items-center justify-center bg-[#202e46] text-white px-6 py-4 rounded-xl font-bold hover:bg-[#1a2539] transition-all hover:shadow-lg hover:scale-[1.02] active:scale-[0.98]"
                            >
                                Start free trial
                                <ArrowRight className="w-4 h-4 ml-2" />
                            </Link>

                            <div className="mt-8 pt-8 border-t border-slate-100">
                                <p className="font-semibold text-slate-900 mb-4">
                                    Everything included:
                                </p>
                                <ul className="space-y-4">
                                    {[
                                        "Unlimited AI contract generation",
                                        "Smart contract review & analysis",
                                        "AI legal assistant chat",
                                        "Seamless e-signature workflows",
                                        "Advanced analytics & insights",
                                    ].map((feature, i) => (
                                        <li key={i} className="flex items-start gap-3">
                                            <div className="flex-shrink-0 w-5 h-5 rounded-full bg-emerald-100 flex items-center justify-center mt-0.5">
                                                <Check className="w-3 h-3 text-emerald-600" />
                                            </div>
                                            <span className="text-slate-600">{feature}</span>
                                        </li>
                                    ))}
                                </ul>
                            </div>
                        </div>
                    </motion.div>

                    {/* Enterprise Plan */}
                    <motion.div
                        initial={{ opacity: 0, x: 20 }}
                        whileInView={{ opacity: 1, x: 0 }}
                        viewport={{ once: true }}
                        transition={{ delay: 0.1 }}
                        className="bg-white rounded-2xl border border-slate-200 overflow-hidden hover:shadow-xl transition-shadow"
                    >
                        <div className="p-8 pt-12">
                            <h3 className="text-2xl font-bold text-slate-900">Enterprise</h3>
                            <p className="text-slate-600 mt-1">For large organizations</p>
                            <div className="mt-8 mb-12">
                                <span className="text-5xl font-bold text-slate-900">
                                    Custom
                                </span>
                            </div>

                            <Link
                                href="/contact"
                                className="w-full inline-flex items-center justify-center bg-white text-slate-900 border border-slate-200 px-6 py-4 rounded-xl font-bold hover:bg-slate-50 hover:border-slate-300 transition-all"
                            >
                                Contact sales
                            </Link>

                            <div className="mt-8 pt-8 border-t border-slate-100">
                                <p className="font-semibold text-slate-900 mb-4">
                                    Everything included:
                                </p>
                                <ul className="space-y-4">
                                    {[
                                        "Everything in Professional",
                                        "Single Sign-On (SSO)",
                                        "Advanced security controls",
                                        "Custom integrations",
                                        "Dedicated account manager",
                                        "SLA guarantees",
                                        "Custom AI model training",
                                    ].map((feature, i) => (
                                        <li key={i} className="flex items-start gap-3">
                                            <div className="flex-shrink-0 w-5 h-5 rounded-full bg-slate-100 flex items-center justify-center mt-0.5">
                                                <Check className="w-3 h-3 text-slate-600" />
                                            </div>
                                            <span className="text-slate-600">{feature}</span>
                                        </li>
                                    ))}
                                </ul>
                            </div>
                        </div>
                    </motion.div>
                </div>
            </div>
        </section>
    );
}
