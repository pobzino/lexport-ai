import { Navbar } from "@/components/home/Navbar";
import { Footer } from "@/components/home/Footer";
import { CTA } from "@/components/home/CTA";
import Link from "next/link";
import {
    Briefcase,
    Clock,
    DollarSign,
    Shield,
    CheckCircle2,
    ArrowRight,
    FileText,
    Users,
    Zap,
    Star,
    AlertTriangle,
    TrendingUp
} from "lucide-react";

export const metadata = {
    title: "Lexport for Freelancers | Get Contracts Signed & Paid Faster",
    description: "Stop chasing payments. Generate professional contracts, get e-signatures, and collect payment — all in one workflow.",
};

const problems = [
    { icon: Clock, problem: "Spending hours drafting contracts", solution: "Generate in 60 seconds" },
    { icon: DollarSign, problem: "Chasing unpaid invoices", solution: "Collect payment at signing" },
    { icon: AlertTriangle, problem: "Scope creep & disputes", solution: "Clear terms, both parties signed" },
    { icon: Users, problem: "Clients ghosting after work", solution: "Get deposit upfront" },
];

const testimonials = [
    {
        quote: "I used to dread the contract process. Now I send a link and get paid before I start. Game changer.",
        name: "Sarah Chen",
        title: "UX Designer",
        avatar: "SC",
    },
    {
        quote: "Collected $8,000 in deposits last month alone. No more net-30 nightmares.",
        name: "Marcus Rivera",
        title: "Web Developer",
        avatar: "MR",
    },
];

const useCases = [
    { title: "Client Retainers", description: "Monthly retainer agreements with auto-billing" },
    { title: "Project Contracts", description: "One-off projects with deposits and milestones" },
    { title: "NDAs", description: "Protect your ideas before sharing concepts" },
    { title: "Service Agreements", description: "Define scope, deliverables, and payment terms" },
];

export default function FreelancersPage() {
    return (
        <div className="min-h-screen bg-white">
            <Navbar />

            <main>
                {/* Hero Section */}
                <section className="relative pt-32 pb-20 overflow-hidden bg-grid">
                    <div className="absolute inset-0 z-0 pointer-events-none">
                        <div className="absolute top-1/3 left-1/2 -translate-x-1/2 -translate-y-1/2 w-[900px] h-[600px] bg-gradient-to-r from-orange-100/40 via-amber-100/30 to-[#529ec6]/20 rounded-full blur-3xl opacity-60" />
                    </div>

                    <div className="relative z-10 max-w-5xl mx-auto px-4 sm:px-6 lg:px-8 text-center">
                        <div className="inline-flex items-center gap-2 bg-orange-50 text-orange-700 px-4 py-1.5 rounded-full text-sm font-medium mb-8">
                            <Briefcase className="w-4 h-4" />
                            For Freelancers
                        </div>

                        <h1 className="text-5xl sm:text-6xl lg:text-7xl font-extrabold tracking-tight text-slate-900 mb-6">
                            Get paid before
                            <span className="block text-orange-500">you start working</span>
                        </h1>

                        <p className="text-lg sm:text-xl text-slate-500 mb-10 max-w-2xl mx-auto leading-relaxed">
                            No more chasing payments. Generate contracts, collect deposits at signing,
                            and protect yourself from scope creep — all in one tool.
                        </p>

                        <div className="flex flex-col sm:flex-row gap-3 justify-center">
                            <Link
                                href="/register"
                                className="inline-flex items-center justify-center bg-orange-500 text-white px-8 py-4 rounded-xl text-base font-semibold hover:bg-orange-600 transition-all hover:scale-[1.02] shadow-lg shadow-orange-500/20"
                            >
                                Start free — no credit card
                                <ArrowRight className="w-4 h-4 ml-2" />
                            </Link>
                        </div>

                        <p className="text-sm text-slate-400 mt-4">Join 2,000+ freelancers using Lexport</p>
                    </div>
                </section>

                {/* Problem/Solution Grid */}
                <section className="py-20 bg-slate-50">
                    <div className="max-w-5xl mx-auto px-4 sm:px-6 lg:px-8">
                        <div className="text-center mb-12">
                            <h2 className="text-3xl sm:text-4xl font-bold text-slate-900 mb-4">
                                Freelancing problems, solved.
                            </h2>
                        </div>

                        <div className="grid md:grid-cols-2 gap-6">
                            {problems.map((item, index) => (
                                <div
                                    key={index}
                                    className="bg-white rounded-2xl p-6 shadow-sm border border-slate-100"
                                >
                                    <div className="flex items-start gap-4">
                                        <div className="w-12 h-12 bg-red-50 rounded-xl flex items-center justify-center flex-shrink-0">
                                            <item.icon className="w-6 h-6 text-red-500" />
                                        </div>
                                        <div className="flex-1">
                                            <p className="text-slate-500 line-through">{item.problem}</p>
                                            <div className="flex items-center gap-2 mt-2">
                                                <CheckCircle2 className="w-5 h-5 text-emerald-500" />
                                                <p className="font-semibold text-slate-900">{item.solution}</p>
                                            </div>
                                        </div>
                                    </div>
                                </div>
                            ))}
                        </div>
                    </div>
                </section>

                {/* Use Cases */}
                <section className="py-24">
                    <div className="max-w-5xl mx-auto px-4 sm:px-6 lg:px-8">
                        <div className="text-center mb-12">
                            <h2 className="text-3xl sm:text-4xl font-bold text-slate-900 mb-4">
                                Perfect for every freelance scenario
                            </h2>
                        </div>

                        <div className="grid sm:grid-cols-2 lg:grid-cols-4 gap-6">
                            {useCases.map((useCase, index) => (
                                <div
                                    key={index}
                                    className="p-6 bg-white rounded-xl border border-slate-100 hover:shadow-lg hover:border-orange-100 transition-all text-center"
                                >
                                    <FileText className="w-8 h-8 text-orange-500 mx-auto mb-4" />
                                    <h3 className="font-semibold text-slate-900 mb-2">{useCase.title}</h3>
                                    <p className="text-sm text-slate-500">{useCase.description}</p>
                                </div>
                            ))}
                        </div>
                    </div>
                </section>

                {/* Testimonials */}
                <section className="py-20 bg-gradient-to-b from-slate-50 to-white">
                    <div className="max-w-4xl mx-auto px-4 sm:px-6 lg:px-8">
                        <div className="grid md:grid-cols-2 gap-8">
                            {testimonials.map((testimonial, index) => (
                                <div
                                    key={index}
                                    className="bg-white rounded-2xl p-8 shadow-lg border border-slate-100"
                                >
                                    <div className="flex gap-1 mb-4">
                                        {[1, 2, 3, 4, 5].map((star) => (
                                            <Star key={star} className="w-5 h-5 fill-amber-400 text-amber-400" />
                                        ))}
                                    </div>
                                    <p className="text-slate-700 text-lg mb-6">"{testimonial.quote}"</p>
                                    <div className="flex items-center gap-3">
                                        <div className="w-10 h-10 bg-gradient-to-br from-orange-400 to-orange-500 rounded-full flex items-center justify-center text-white font-semibold text-sm">
                                            {testimonial.avatar}
                                        </div>
                                        <div>
                                            <p className="font-semibold text-slate-900">{testimonial.name}</p>
                                            <p className="text-sm text-slate-500">{testimonial.title}</p>
                                        </div>
                                    </div>
                                </div>
                            ))}
                        </div>
                    </div>
                </section>

                {/* Stats */}
                <section className="py-16">
                    <div className="max-w-4xl mx-auto px-4 sm:px-6 lg:px-8">
                        <div className="grid grid-cols-3 gap-8 text-center">
                            <div>
                                <p className="text-4xl sm:text-5xl font-bold text-gradient">30s</p>
                                <p className="text-slate-500 mt-2">Average contract creation time</p>
                            </div>
                            <div>
                                <p className="text-4xl sm:text-5xl font-bold text-gradient">73%</p>
                                <p className="text-slate-500 mt-2">Collect deposit at signing</p>
                            </div>
                            <div>
                                <p className="text-4xl sm:text-5xl font-bold text-gradient">$0</p>
                                <p className="text-slate-500 mt-2">Unpaid invoice stress</p>
                            </div>
                        </div>
                    </div>
                </section>

                <CTA />
            </main>

            <Footer />
        </div>
    );
}
