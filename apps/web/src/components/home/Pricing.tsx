"use client";

import Link from "next/link";
import { Check, Sparkles, ArrowRight, X } from "lucide-react";
import { motion } from "framer-motion";

export function Pricing() {
    return (
        <section id="pricing" className="py-16 sm:py-20 lg:py-24 px-4 sm:px-6 lg:px-8 bg-slate-50">
            <div className="max-w-6xl mx-auto">
                <div className="text-center mb-10 sm:mb-12 lg:mb-16">
                    <motion.div
                        initial={{ opacity: 0, y: 10 }}
                        whileInView={{ opacity: 1, y: 0 }}
                        viewport={{ once: true }}
                        className="inline-flex items-center gap-2 bg-[#202e46]/10 text-[#202e46] px-3 sm:px-4 py-1.5 rounded-full text-xs sm:text-sm font-medium mb-3 sm:mb-4"
                    >
                        Simple, transparent pricing
                    </motion.div>
                    <motion.h2
                        initial={{ opacity: 0, y: 10 }}
                        whileInView={{ opacity: 1, y: 0 }}
                        viewport={{ once: true }}
                        transition={{ delay: 0.1 }}
                        className="text-2xl sm:text-3xl lg:text-4xl font-bold text-slate-900 mb-3 sm:mb-4"
                    >
                        Choose your plan
                    </motion.h2>
                    <motion.p
                        initial={{ opacity: 0, y: 10 }}
                        whileInView={{ opacity: 1, y: 0 }}
                        viewport={{ once: true }}
                        transition={{ delay: 0.2 }}
                        className="text-sm sm:text-base text-slate-600 max-w-2xl mx-auto"
                    >
                        Start free and upgrade when you need more. No hidden fees.
                    </motion.p>
                </div>

                <div className="grid grid-cols-1 lg:grid-cols-3 gap-4 sm:gap-6 items-start">
                    {/* Free Plan */}
                    <motion.div
                        initial={{ opacity: 0, y: 20 }}
                        whileInView={{ opacity: 1, y: 0 }}
                        viewport={{ once: true }}
                        className="bg-white rounded-xl sm:rounded-2xl border border-slate-200 overflow-hidden hover:shadow-lg transition-shadow"
                    >
                        <div className="p-5 sm:p-8">
                            <h3 className="text-xl sm:text-2xl font-bold text-slate-900">Free</h3>
                            <p className="text-slate-600 mt-1">Try before you commit</p>
                            <div className="mt-4 sm:mt-6 flex items-baseline gap-1">
                                <span className="text-4xl sm:text-5xl font-bold text-slate-900 tracking-tight">$0</span>
                                <span className="text-slate-600 font-medium">/month</span>
                            </div>
                            <p className="text-xs sm:text-sm text-slate-500 mt-2 mb-4 sm:mb-6">forever free</p>

                            <Link
                                href="/register"
                                className="w-full inline-flex items-center justify-center bg-slate-100 text-slate-900 px-5 sm:px-6 py-2.5 sm:py-3 rounded-lg sm:rounded-xl font-semibold hover:bg-slate-200 transition-all text-sm sm:text-base"
                            >
                                Get started
                            </Link>

                            <div className="mt-6 sm:mt-8 pt-4 sm:pt-6 border-t border-slate-100">
                                <ul className="space-y-3">
                                    {[
                                        { text: "1 AI contract/month", included: true },
                                        { text: "2 signature requests/month", included: true },
                                        { text: "Collect payments", included: true },
                                        { text: "7 free templates", included: true },
                                        { text: "Buy premium templates ($9.99 each)", included: true },
                                        { text: "AI contract chat", included: false },
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
                        className="bg-white rounded-xl sm:rounded-2xl border-2 border-[#202e46] overflow-hidden shadow-xl lg:shadow-2xl relative z-10 lg:-translate-y-4 order-first lg:order-none"
                    >
                        <div className="bg-[#202e46] text-white text-center py-2 sm:py-2.5 text-xs sm:text-sm font-medium tracking-wide">
                            MOST POPULAR
                        </div>
                        <div className="p-5 sm:p-8">
                            <h3 className="text-xl sm:text-2xl font-bold text-slate-900">Pro</h3>
                            <p className="text-slate-600 mt-1 text-sm sm:text-base">For freelancers & professionals</p>
                            <div className="mt-4 sm:mt-6 flex items-baseline gap-1">
                                <span className="text-4xl sm:text-5xl font-bold text-slate-900 tracking-tight">$19.99</span>
                                <span className="text-slate-600 font-medium">/month</span>
                            </div>
                            <p className="text-xs sm:text-sm text-slate-500 mt-2 mb-4 sm:mb-6">billed monthly</p>

                            <Link
                                href="/register"
                                className="w-full inline-flex items-center justify-center bg-[#202e46] text-white px-5 sm:px-6 py-2.5 sm:py-3 rounded-lg sm:rounded-xl font-semibold hover:bg-[#1a2539] transition-all hover:shadow-lg text-sm sm:text-base"
                            >
                                Start free trial
                                <ArrowRight className="w-4 h-4 ml-2" />
                            </Link>

                            <div className="mt-6 sm:mt-8 pt-4 sm:pt-6 border-t border-slate-100">
                                <ul className="space-y-3">
                                    {[
                                        "50 AI contracts/month",
                                        "Unlimited signatures",
                                        "All premium templates included",
                                        "AI contract chat & review",
                                        "Payment collection",
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

                    {/* Business Plan */}
                    <motion.div
                        initial={{ opacity: 0, y: 20 }}
                        whileInView={{ opacity: 1, y: 0 }}
                        viewport={{ once: true }}
                        transition={{ delay: 0.2 }}
                        className="bg-white rounded-xl sm:rounded-2xl border border-slate-200 overflow-hidden hover:shadow-lg transition-shadow"
                    >
                        <div className="p-5 sm:p-8">
                            <h3 className="text-xl sm:text-2xl font-bold text-slate-900">Business</h3>
                            <p className="text-slate-600 mt-1 text-sm sm:text-base">For high-volume users</p>
                            <div className="mt-4 sm:mt-6 flex items-baseline gap-1">
                                <span className="text-4xl sm:text-5xl font-bold text-slate-900 tracking-tight">$39.99</span>
                                <span className="text-slate-600 font-medium">/month</span>
                            </div>
                            <p className="text-xs sm:text-sm text-slate-500 mt-2 mb-4 sm:mb-6">billed monthly</p>

                            <a
                                href="mailto:team@lexportai.com?subject=Lexport Business Plan Inquiry"
                                className="w-full inline-flex items-center justify-center bg-slate-100 text-slate-900 px-5 sm:px-6 py-2.5 sm:py-3 rounded-lg sm:rounded-xl font-semibold hover:bg-slate-200 transition-all text-sm sm:text-base"
                            >
                                Contact Us
                            </a>

                            <div className="mt-6 sm:mt-8 pt-4 sm:pt-6 border-t border-slate-100">
                                <ul className="space-y-3">
                                    {[
                                        "200 AI contracts/month",
                                        "Unlimited signatures",
                                        "All premium templates included",
                                        "AI contract chat & review",
                                        "Priority support",
                                        "Dedicated account manager",
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
