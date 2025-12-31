"use client";

import Link from "next/link";
import { Check, Sparkles, ArrowRight, X } from "lucide-react";
import { motion } from "framer-motion";

export function Pricing() {
    return (
        <section id="pricing" className="py-24 px-4 sm:px-6 lg:px-8 bg-slate-50">
            <div className="max-w-6xl mx-auto">
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
                        Start free and upgrade when you need more. No hidden fees.
                    </motion.p>
                </div>

                <div className="grid md:grid-cols-3 gap-6 items-start">
                    {/* Free Plan */}
                    <motion.div
                        initial={{ opacity: 0, y: 20 }}
                        whileInView={{ opacity: 1, y: 0 }}
                        viewport={{ once: true }}
                        className="bg-white rounded-2xl border border-slate-200 overflow-hidden hover:shadow-lg transition-shadow"
                    >
                        <div className="p-8">
                            <h3 className="text-2xl font-bold text-slate-900">Free</h3>
                            <p className="text-slate-600 mt-1">Try before you commit</p>
                            <div className="mt-6 flex items-baseline gap-1">
                                <span className="text-5xl font-bold text-slate-900 tracking-tight">$0</span>
                                <span className="text-slate-600 font-medium">/month</span>
                            </div>
                            <p className="text-sm text-slate-500 mt-2 mb-6">forever free</p>

                            <Link
                                href="/register"
                                className="w-full inline-flex items-center justify-center bg-slate-100 text-slate-900 px-6 py-3 rounded-xl font-semibold hover:bg-slate-200 transition-all"
                            >
                                Get started
                            </Link>

                            <div className="mt-8 pt-6 border-t border-slate-100">
                                <ul className="space-y-3">
                                    {[
                                        { text: "1 AI-generated contract", included: true },
                                        { text: "Up to 3 signatures", included: true },
                                        { text: "Basic templates", included: true },
                                        { text: "Buy more templates ($10 each)", included: true },
                                        { text: "0.5% payment fee", included: true },
                                        { text: "Unlimited contracts", included: false },
                                        { text: "AI contract review", included: false },
                                    ].map((feature, i) => (
                                        <li key={i} className="flex items-start gap-3">
                                            <div className={`flex-shrink-0 w-5 h-5 rounded-full flex items-center justify-center mt-0.5 ${feature.included ? "bg-emerald-100" : "bg-slate-100"}`}>
                                                {feature.included ? (
                                                    <Check className="w-3 h-3 text-emerald-600" />
                                                ) : (
                                                    <X className="w-3 h-3 text-slate-400" />
                                                )}
                                            </div>
                                            <span className={feature.included ? "text-slate-600" : "text-slate-400"}>{feature.text}</span>
                                        </li>
                                    ))}
                                </ul>
                            </div>
                        </div>
                    </motion.div>

                    {/* Pro Plan */}
                    <motion.div
                        initial={{ opacity: 0, y: 20 }}
                        whileInView={{ opacity: 1, y: 0 }}
                        viewport={{ once: true }}
                        transition={{ delay: 0.1 }}
                        className="bg-white rounded-2xl border-2 border-[#202e46] overflow-hidden shadow-2xl relative z-10 transform md:-translate-y-4"
                    >
                        <div className="bg-[#202e46] text-white text-center py-2.5 text-sm font-medium tracking-wide">
                            MOST POPULAR
                        </div>
                        <div className="p-8">
                            <h3 className="text-2xl font-bold text-slate-900">Pro</h3>
                            <p className="text-slate-600 mt-1">For freelancers & small teams</p>
                            <div className="mt-6 flex items-baseline gap-1">
                                <span className="text-5xl font-bold text-slate-900 tracking-tight">$25</span>
                                <span className="text-slate-600 font-medium">/month</span>
                            </div>
                            <p className="text-sm text-slate-500 mt-2 mb-6">billed monthly</p>

                            <Link
                                href="/register"
                                className="w-full inline-flex items-center justify-center bg-[#202e46] text-white px-6 py-3 rounded-xl font-semibold hover:bg-[#1a2539] transition-all hover:shadow-lg"
                            >
                                Start free trial
                                <ArrowRight className="w-4 h-4 ml-2" />
                            </Link>

                            <div className="mt-8 pt-6 border-t border-slate-100">
                                <ul className="space-y-3">
                                    {[
                                        "Unlimited AI contracts",
                                        "Unlimited signatures",
                                        "All premium templates",
                                        "AI contract review & chat",
                                        "Payment collection",
                                        "0.25% payment fee",
                                        "Priority support",
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

                    {/* Team Plan */}
                    <motion.div
                        initial={{ opacity: 0, y: 20 }}
                        whileInView={{ opacity: 1, y: 0 }}
                        viewport={{ once: true }}
                        transition={{ delay: 0.2 }}
                        className="bg-white rounded-2xl border border-slate-200 overflow-hidden hover:shadow-lg transition-shadow"
                    >
                        <div className="p-8">
                            <h3 className="text-2xl font-bold text-slate-900">Team</h3>
                            <p className="text-slate-600 mt-1">For growing businesses</p>
                            <div className="mt-6 flex items-baseline gap-1">
                                <span className="text-5xl font-bold text-slate-900 tracking-tight">$79</span>
                                <span className="text-slate-600 font-medium">/month</span>
                            </div>
                            <p className="text-sm text-slate-500 mt-2 mb-6">per seat, billed monthly</p>

                            <Link
                                href="/register"
                                className="w-full inline-flex items-center justify-center bg-slate-100 text-slate-900 px-6 py-3 rounded-xl font-semibold hover:bg-slate-200 transition-all"
                            >
                                Start free trial
                            </Link>

                            <div className="mt-8 pt-6 border-t border-slate-100">
                                <ul className="space-y-3">
                                    {[
                                        "Everything in Pro",
                                        "Team collaboration",
                                        "Shared template library",
                                        "Admin controls",
                                        "0% payment fee",
                                        "API access",
                                        "Dedicated support",
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
                </div>

                {/* Enterprise callout */}
                <motion.div
                    initial={{ opacity: 0, y: 20 }}
                    whileInView={{ opacity: 1, y: 0 }}
                    viewport={{ once: true }}
                    transition={{ delay: 0.3 }}
                    className="mt-12 text-center"
                >
                    <p className="text-slate-600">
                        Need enterprise features? SSO, custom integrations, SLA guarantees?{" "}
                        <Link href="/contact" className="text-[#529ec6] font-medium hover:underline">
                            Contact sales
                        </Link>
                    </p>
                </motion.div>
            </div>
        </section>
    );
}
