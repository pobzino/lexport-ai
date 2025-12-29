"use client";

import { motion } from "framer-motion";
import {
    Sparkles,
    MessageSquare,
    FileText,
    Shield,
    Globe,
    Users,
} from "lucide-react";

const features = [
    {
        icon: Sparkles,
        title: "AI contract generation",
        description: "Generate jurisdiction-specific contracts in seconds",
    },
    {
        icon: MessageSquare,
        title: "AI legal chat",
        description: "Modify clauses and ask questions in plain language",
    },
    {
        icon: FileText,
        title: "E-signatures",
        description: "Legally binding with full audit trail",
    },
    {
        icon: Shield,
        title: "Secure & encrypted",
        description: "Your documents are encrypted and private",
    },
    {
        icon: Globe,
        title: "Multi-jurisdiction",
        description: "Supports CA, TX, NY, and UK templates",
    },
    {
        icon: Users,
        title: "Team collaboration",
        description: "Invite team members and manage permissions",
    },
];

export function Features() {
    return (
        <section id="features" className="py-32 px-4 sm:px-6 lg:px-8 bg-white">
            <div className="max-w-5xl mx-auto">
                <div className="text-center mb-16">
                    <motion.p
                        initial={{ opacity: 0, y: 12 }}
                        whileInView={{ opacity: 1, y: 0 }}
                        viewport={{ once: true }}
                        className="text-sm font-medium text-slate-400 uppercase tracking-wider mb-4"
                    >
                        Features
                    </motion.p>
                    <motion.h2
                        initial={{ opacity: 0, y: 12 }}
                        whileInView={{ opacity: 1, y: 0 }}
                        viewport={{ once: true }}
                        transition={{ delay: 0.1 }}
                        className="text-3xl sm:text-4xl font-bold text-slate-900"
                    >
                        Everything you need for contracts
                    </motion.h2>
                </div>

                <div className="grid md:grid-cols-3 gap-4">
                    {features.map((feature, index) => (
                        <motion.div
                            key={index}
                            initial={{ opacity: 0, y: 16 }}
                            whileInView={{ opacity: 1, y: 0 }}
                            viewport={{ once: true }}
                            transition={{ delay: index * 0.05 }}
                            className="bg-slate-50 rounded-xl p-6 border border-slate-100 hover:border-slate-200 transition-all group"
                        >
                            <div className="w-10 h-10 rounded-lg bg-white border border-slate-200 flex items-center justify-center mb-4 group-hover:border-slate-300 transition-colors">
                                <feature.icon className="w-5 h-5 text-slate-600" />
                            </div>
                            <h3 className="font-semibold text-slate-900 mb-1">{feature.title}</h3>
                            <p className="text-sm text-slate-500">{feature.description}</p>
                        </motion.div>
                    ))}
                </div>
            </div>
        </section>
    );
}
