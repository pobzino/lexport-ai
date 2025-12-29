"use client";

import { motion } from "framer-motion";
import { Star } from "lucide-react";
import Image from "next/image";

const testimonials = [
    {
        quote:
            "Lexport transformed our contract workflow completely. What used to take our legal team weeks now happens in hours. The AI is incredibly smart and catches things we might miss.",
        metric: "80% faster contract processing",
        name: "Sarah Mitchell",
        role: "General Counsel",
        company: "TechCorp",
        initials: "SM",
        color: "slate",
    },
    {
        quote:
            "The end-to-end workflow is seamless. Generate, review, modify with AI chat, and get signatures - all in one platform. Our clients love how simple the signing process is.",
        metric: "95% signature completion rate",
        name: "Michael Chen",
        role: "Legal Operations Manager",
        company: "GrowthVentures",
        initials: "MC",
        color: "blue",
    },
    {
        quote:
            "Having an AI legal assistant that understands our contracts and can make changes instantly is revolutionary. It's like having a senior lawyer available 24/7.",
        metric: "Zero compliance issues in 6 months",
        name: "Emily Rodriguez",
        role: "Partner",
        company: "Rodriguez & Associates",
        initials: "ER",
        color: "emerald",
    },
];

export function Testimonials() {
    return (
        <section className="py-24 px-4 sm:px-6 lg:px-8 bg-white overflow-hidden">
            <div className="max-w-7xl mx-auto">
                <div className="text-center mb-16">
                    <motion.p
                        initial={{ opacity: 0, y: 10 }}
                        whileInView={{ opacity: 1, y: 0 }}
                        viewport={{ once: true }}
                        className="text-slate-600 mb-4 font-medium"
                    >
                        Join thousands of legal professionals who have transformed their
                        workflow
                    </motion.p>
                    <motion.div
                        initial={{ opacity: 0, scale: 0.95 }}
                        whileInView={{ opacity: 1, scale: 1 }}
                        viewport={{ once: true }}
                        transition={{ delay: 0.1 }}
                        className="flex items-center justify-center gap-2"
                    >
                        <div className="flex">
                            {[1, 2, 3, 4, 5].map((i) => (
                                <Star
                                    key={i}
                                    className="w-5 h-5 text-yellow-400 fill-yellow-400"
                                />
                            ))}
                        </div>
                        <span className="font-bold text-slate-900">4.9/5</span>
                        <span className="text-slate-500">from 2,300+ reviews</span>
                    </motion.div>
                </div>

                <div className="grid md:grid-cols-3 gap-8">
                    {testimonials.map((testimonial, index) => (
                        <motion.div
                            key={index}
                            initial={{ opacity: 0, y: 20 }}
                            whileInView={{ opacity: 1, y: 0 }}
                            viewport={{ once: true }}
                            transition={{ delay: index * 0.1 }}
                            className="bg-slate-50 rounded-2xl p-8 border border-slate-100 hover:shadow-xl hover:shadow-slate-200/50 hover:bg-white hover:border-slate-200 transition-all duration-300 relative group"
                        >
                            <div className="text-[#202e46]/10 mb-6 absolute top-6 right-6 transform group-hover:scale-110 transition-transform">
                                <svg
                                    className="w-12 h-12"
                                    fill="currentColor"
                                    viewBox="0 0 24 24"
                                >
                                    <path d="M14.017 21v-7.391c0-5.704 3.731-9.57 8.983-10.609l.995 2.151c-2.432.917-3.995 3.638-3.995 5.849h4v10h-9.983zm-14.017 0v-7.391c0-5.704 3.748-9.57 9-10.609l.996 2.151c-2.433.917-3.996 3.638-3.996 5.849h3.983v10h-9.983z" />
                                </svg>
                            </div>

                            <div className="flex mb-4">
                                {[1, 2, 3, 4, 5].map((i) => (
                                    <Star
                                        key={i}
                                        className="w-4 h-4 text-yellow-400 fill-yellow-400"
                                    />
                                ))}
                            </div>

                            <p className="text-slate-700 mb-6 leading-relaxed relative z-10">&ldquo;{testimonial.quote}&rdquo;</p>

                            <div className="border-t border-slate-200/60 my-6" />

                            <div
                                className={`inline-block px-3 py-1 rounded-full text-xs font-semibold mb-6 ${testimonial.color === "slate"
                                        ? "bg-[#202e46]/10 text-[#202e46]"
                                        : testimonial.color === "blue"
                                            ? "bg-blue-100 text-blue-700"
                                            : "bg-emerald-100 text-emerald-700"
                                    }`}
                            >
                                {testimonial.metric}
                            </div>

                            <div className="flex items-center gap-3">
                                <div
                                    className={`w-10 h-10 rounded-full flex items-center justify-center text-white font-medium shadow-md ${testimonial.color === "slate"
                                            ? "bg-[#202e46]"
                                            : testimonial.color === "blue"
                                                ? "bg-blue-600"
                                                : "bg-emerald-600"
                                        }`}
                                >
                                    {testimonial.initials}
                                </div>
                                <div>
                                    <p className="font-bold text-slate-900">
                                        {testimonial.name}
                                    </p>
                                    <p className="text-xs text-slate-500 font-medium">
                                        {testimonial.role}, {testimonial.company}
                                    </p>
                                </div>
                            </div>
                        </motion.div>
                    ))}
                </div>
            </div>
        </section>
    );
}
