import { Navbar } from "@/components/home/Navbar";
import { Footer } from "@/components/home/Footer";
import { CTA } from "@/components/home/CTA";
import Link from "next/link";
import {
    Rocket,
    Clock,
    Shield,
    FileText,
    CheckCircle2,
    ArrowRight,
    DollarSign,
    Users,
    Scale,
    Sparkles,
    Building,
    TrendingUp
} from "lucide-react";

export const metadata = {
    title: "Lexport for Founders | Fast, Professional Contracts for Startups",
    description: "SAFE notes, NDAs, contractor agreements. Everything you need to move fast without expensive lawyers.",
    openGraph: {
        title: "Lexport for Founders - Fast Contracts for Startups",
        description: "SAFE notes, NDAs, contractor agreements. Everything you need to move fast without expensive lawyers.",
        url: "https://lexportai.com/for/founders",
    },
    twitter: {
        title: "Lexport for Founders - Fast Contracts for Startups",
        description: "SAFE notes, NDAs, contractor agreements. Everything you need to move fast without expensive lawyers.",
    },
    alternates: { canonical: "https://lexportai.com/for/founders" },
};

const features = [
    {
        icon: Sparkles,
        title: "SAFE Notes in Minutes",
        description: "Generate Y Combinator-style SAFE notes. Cap or no cap, MFN, pro-rata — all customizable.",
    },
    {
        icon: Shield,
        title: "Advisor Agreements",
        description: "FAST agreements with standard vesting. Lock in advisors with proper equity docs.",
    },
    {
        icon: Users,
        title: "Contractor Onboarding",
        description: "Get contractors signed and productive the same day. IP assignment included.",
    },
    {
        icon: Scale,
        title: "Investor-Ready",
        description: "Documents that pass due diligence. No embarrassing handshake deals in your cap table.",
    },
];

const docTypes = [
    { name: "SAFE Note", badge: "Popular" },
    { name: "Advisor Agreement", badge: null },
    { name: "NDA (Mutual)", badge: null },
    { name: "Contractor Agreement", badge: null },
    { name: "IP Assignment", badge: null },
    { name: "Consulting Agreement", badge: null },
];

export default function FoundersPage() {
    return (
        <div className="min-h-screen bg-white">
            <Navbar />

            <main>
                {/* Hero Section */}
                <section className="relative pt-32 pb-20 overflow-hidden bg-grid">
                    <div className="absolute inset-0 z-0 pointer-events-none">
                        <div className="absolute top-1/3 left-1/2 -translate-x-1/2 -translate-y-1/2 w-[900px] h-[600px] bg-gradient-to-r from-violet-100/40 via-purple-100/30 to-[#529ec6]/20 rounded-full blur-3xl opacity-60" />
                    </div>

                    <div className="relative z-10 max-w-5xl mx-auto px-4 sm:px-6 lg:px-8 text-center">
                        <div className="inline-flex items-center gap-2 bg-violet-50 text-violet-700 px-4 py-1.5 rounded-full text-sm font-medium mb-8">
                            <Rocket className="w-4 h-4" />
                            For Founders
                        </div>

                        <h1 className="text-5xl sm:text-6xl lg:text-7xl font-extrabold tracking-tight text-slate-900 mb-6">
                            Move fast.
                            <span className="block text-violet-500">Paperwork faster.</span>
                        </h1>

                        <p className="text-lg sm:text-xl text-slate-500 mb-10 max-w-2xl mx-auto leading-relaxed">
                            SAFE notes, advisor agreements, NDAs, and contractor docs — all the legal paperwork
                            you need to scale, without the $500/hour lawyer bills.
                        </p>

                        <div className="flex flex-col sm:flex-row gap-3 justify-center">
                            <Link
                                href="/register"
                                className="inline-flex items-center justify-center bg-violet-600 text-white px-8 py-4 rounded-xl text-base font-semibold hover:bg-violet-700 transition-all hover:scale-[1.02] shadow-lg shadow-violet-600/20"
                            >
                                Start for free
                                <ArrowRight className="w-4 h-4 ml-2" />
                            </Link>
                            <Link
                                href="/solutions/contracts"
                                className="inline-flex items-center justify-center bg-white text-slate-600 px-8 py-4 rounded-xl text-base font-medium border border-slate-200 hover:bg-slate-50 hover:border-slate-300 transition-all"
                            >
                                See all templates
                            </Link>
                        </div>
                    </div>
                </section>

                {/* Logos / Social Proof */}
                <section className="py-12 border-b border-slate-100">
                    <div className="max-w-4xl mx-auto px-4 sm:px-6 lg:px-8 text-center">
                        <p className="text-sm text-slate-400 mb-4">Trusted by founders at</p>
                        <div className="flex flex-wrap justify-center gap-8 items-center text-slate-300">
                            <Building className="w-8 h-8" />
                            <TrendingUp className="w-8 h-8" />
                            <Rocket className="w-8 h-8" />
                            <Scale className="w-8 h-8" />
                        </div>
                    </div>
                </section>

                {/* Features Grid */}
                <section className="py-24 bg-slate-50">
                    <div className="max-w-6xl mx-auto px-4 sm:px-6 lg:px-8">
                        <div className="text-center mb-16">
                            <h2 className="text-3xl sm:text-4xl font-bold text-slate-900 mb-4">
                                Built for startup speed
                            </h2>
                            <p className="text-lg text-slate-500 max-w-2xl mx-auto">
                                Everything you need from pre-seed to Series A. No lawyer required.
                            </p>
                        </div>

                        <div className="grid md:grid-cols-2 gap-8">
                            {features.map((feature, index) => (
                                <div
                                    key={index}
                                    className="bg-white rounded-2xl p-8 shadow-sm border border-slate-100 hover:shadow-lg hover:border-violet-100 transition-all group"
                                >
                                    <div className="flex gap-5">
                                        <div className="w-12 h-12 bg-violet-50 rounded-xl flex items-center justify-center flex-shrink-0 group-hover:bg-violet-100 transition-colors">
                                            <feature.icon className="w-6 h-6 text-violet-600" />
                                        </div>
                                        <div>
                                            <h3 className="text-xl font-semibold text-slate-900 mb-2">
                                                {feature.title}
                                            </h3>
                                            <p className="text-slate-500 leading-relaxed">
                                                {feature.description}
                                            </p>
                                        </div>
                                    </div>
                                </div>
                            ))}
                        </div>
                    </div>
                </section>

                {/* Document Types */}
                <section className="py-24">
                    <div className="max-w-4xl mx-auto px-4 sm:px-6 lg:px-8">
                        <div className="text-center mb-12">
                            <h2 className="text-3xl sm:text-4xl font-bold text-slate-900 mb-4">
                                Founder-focused templates
                            </h2>
                        </div>

                        <div className="grid sm:grid-cols-2 lg:grid-cols-3 gap-4">
                            {docTypes.map((doc, index) => (
                                <div
                                    key={index}
                                    className="flex items-center justify-between p-4 bg-white rounded-xl border border-slate-100 hover:border-violet-200 transition-all"
                                >
                                    <div className="flex items-center gap-3">
                                        <FileText className="w-5 h-5 text-violet-500" />
                                        <span className="text-slate-700">{doc.name}</span>
                                    </div>
                                    {doc.badge && (
                                        <span className="text-xs font-medium bg-violet-100 text-violet-700 px-2 py-1 rounded-full">
                                            {doc.badge}
                                        </span>
                                    )}
                                </div>
                            ))}
                        </div>
                    </div>
                </section>

                {/* Comparison */}
                <section className="py-20 bg-gradient-to-b from-slate-50 to-white">
                    <div className="max-w-4xl mx-auto px-4 sm:px-6 lg:px-8">
                        <div className="bg-white rounded-3xl shadow-xl border border-slate-100 overflow-hidden">
                            <div className="grid md:grid-cols-2">
                                <div className="p-8 border-b md:border-b-0 md:border-r border-slate-100">
                                    <h3 className="text-lg font-bold text-red-500 mb-4">The Old Way</h3>
                                    <ul className="space-y-3">
                                        {[
                                            "Call a lawyer, wait 2 weeks",
                                            "Pay $2,000+ for a SAFE note",
                                            "Back-and-forth emails for edits",
                                            "Print, sign, scan, email",
                                        ].map((item, i) => (
                                            <li key={i} className="flex items-center gap-2 text-slate-500">
                                                <span className="w-2 h-2 bg-red-300 rounded-full" />
                                                {item}
                                            </li>
                                        ))}
                                    </ul>
                                </div>
                                <div className="p-8 bg-violet-50/50">
                                    <h3 className="text-lg font-bold text-violet-600 mb-4">The Lexport Way</h3>
                                    <ul className="space-y-3">
                                        {[
                                            "Generate in 60 seconds",
                                            "Free for up to 3 contracts/month",
                                            "Edit directly in the app",
                                            "Sign on any device, track in real-time",
                                        ].map((item, i) => (
                                            <li key={i} className="flex items-center gap-2 text-slate-700">
                                                <CheckCircle2 className="w-4 h-4 text-violet-500" />
                                                {item}
                                            </li>
                                        ))}
                                    </ul>
                                </div>
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
