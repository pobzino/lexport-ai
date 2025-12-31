"use client";

import Link from "next/link";
import { motion } from "framer-motion";
import { Clock, Bell, CheckCircle2, ArrowRight } from "lucide-react";

export function GetPaid() {
    return (
        <section className="py-16 sm:py-24 lg:py-32 px-4 sm:px-6 lg:px-8 bg-white">
            <div className="max-w-5xl mx-auto">
                <div className="grid lg:grid-cols-2 gap-10 sm:gap-12 lg:gap-16 items-center">
                    {/* Left: Content */}
                    <motion.div
                        initial={{ opacity: 0, x: -16 }}
                        whileInView={{ opacity: 1, x: 0 }}
                        viewport={{ once: true }}
                    >
                        <p className="text-xs sm:text-sm font-medium text-emerald-600 uppercase tracking-wider mb-3 sm:mb-4">
                            Payment collection
                        </p>
                        <h2 className="text-2xl sm:text-3xl lg:text-4xl font-bold text-slate-900 mb-4 sm:mb-6">
                            Get paid the moment they sign
                        </h2>
                        <p className="text-base sm:text-lg text-slate-500 mb-8 sm:mb-10 leading-relaxed">
                            Stop sending separate invoices. Attach payment to your contract and collect
                            automatically when your client signs.
                        </p>

                        <div className="space-y-4 sm:space-y-5 mb-8 sm:mb-10">
                            {[
                                { icon: Clock, text: "Payment collected right after signature" },
                                { icon: Bell, text: "Automated reminders until they sign" },
                                { icon: CheckCircle2, text: "Powered by Stripe" },
                            ].map((item, index) => (
                                <motion.div
                                    key={index}
                                    initial={{ opacity: 0, x: -16 }}
                                    whileInView={{ opacity: 1, x: 0 }}
                                    viewport={{ once: true }}
                                    transition={{ delay: index * 0.1 }}
                                    className="flex items-center gap-3 text-slate-600"
                                >
                                    <div className="w-7 h-7 sm:w-8 sm:h-8 rounded-lg bg-emerald-100 flex items-center justify-center flex-shrink-0">
                                        <item.icon className="w-3.5 h-3.5 sm:w-4 sm:h-4 text-emerald-600" />
                                    </div>
                                    <span className="text-sm">{item.text}</span>
                                </motion.div>
                            ))}
                        </div>

                        <Link
                            href="/register"
                            className="inline-flex items-center text-sm font-medium text-emerald-600 hover:text-emerald-700 transition-colors"
                        >
                            Start getting paid faster
                            <ArrowRight className="w-4 h-4 ml-1" />
                        </Link>
                    </motion.div>

                    {/* Right: Visual */}
                    <motion.div
                        initial={{ opacity: 0, x: 16 }}
                        whileInView={{ opacity: 1, x: 0 }}
                        viewport={{ once: true }}
                    >
                        <div className="relative">
                            <div className="absolute -inset-4 bg-gradient-to-r from-emerald-500/10 to-teal-500/10 rounded-3xl blur-2xl" />

                            <div className="relative bg-white rounded-xl sm:rounded-2xl shadow-xl border border-slate-200/80 p-5 sm:p-8">
                                {/* Email header */}
                                <div className="flex items-center gap-3 mb-6 pb-6 border-b border-slate-100">
                                    <div className="w-8 h-8 rounded-full bg-indigo-500 flex items-center justify-center text-white font-medium text-sm">
                                        L
                                    </div>
                                    <div>
                                        <p className="text-sm font-medium text-slate-900">Contract ready to sign</p>
                                        <p className="text-xs text-slate-400">from Acme Inc.</p>
                                    </div>
                                </div>

                                {/* Contract preview */}
                                <div className="bg-slate-50 rounded-xl p-5 mb-4 border border-slate-100">
                                    <div className="flex items-center justify-between mb-4">
                                        <span className="font-medium text-slate-900">Consulting Agreement</span>
                                        <span className="text-xs text-slate-400">3 pages</span>
                                    </div>
                                    <div className="space-y-1.5">
                                        <div className="h-2 bg-slate-200/80 rounded-full w-full"></div>
                                        <div className="h-2 bg-slate-200/80 rounded-full w-4/5"></div>
                                        <div className="h-2 bg-slate-200/80 rounded-full w-full"></div>
                                    </div>
                                </div>

                                {/* Payment section */}
                                <div className="bg-emerald-50 rounded-xl p-5 border border-emerald-100">
                                    <div className="flex items-center justify-between mb-3">
                                        <span className="text-sm font-medium text-slate-700">Payment due</span>
                                        <span className="text-2xl font-bold text-slate-900">$5,000</span>
                                    </div>
                                    <div className="space-y-2">
                                        <div className="bg-indigo-500 text-white rounded-lg py-2.5 text-center font-medium text-sm">
                                            Sign contract
                                        </div>
                                        <div className="bg-emerald-500 text-white rounded-lg py-2.5 text-center font-medium text-sm">
                                            Pay $5,000
                                        </div>
                                    </div>
                                </div>
                            </div>
                        </div>
                    </motion.div>
                </div>
            </div>
        </section>
    );
}
