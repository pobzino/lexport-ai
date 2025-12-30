import { Navbar } from "@/components/home/Navbar";
import { Footer } from "@/components/home/Footer";
import { CTA } from "@/components/home/CTA";
import Link from "next/link";
import {
    Hammer,
    Clock,
    Shield,
    FileText,
    CheckCircle2,
    ArrowRight,
    DollarSign,
    Users,
    Calendar,
    AlertTriangle,
    Star,
    Wrench
} from "lucide-react";

export const metadata = {
    title: "Lexport for Contractors | Professional Contracts Made Easy",
    description: "Create professional contractor agreements, collect deposits, and protect your business with legally-binding contracts.",
};

const benefits = [
    {
        icon: Shield,
        title: "Liability Protection",
        description: "Clear scope definitions and indemnification clauses protect you from disputes.",
    },
    {
        icon: DollarSign,
        title: "Upfront Deposits",
        description: "Collect 30-50% before starting any work. No more materials out of pocket.",
    },
    {
        icon: Calendar,
        title: "Change Orders",
        description: "Built-in change order templates for scope changes. Every extra is documented.",
    },
    {
        icon: FileText,
        title: "Lien Rights",
        description: "Templates include preliminary notice language to preserve your lien rights.",
    },
];

const contractTypes = [
    "General Contractor Agreement",
    "Subcontractor Agreement",
    "Home Improvement Contract",
    "Change Order Forms",
    "Material Supply Agreement",
    "Warranty Agreement",
];

export default function ContractorsPage() {
    return (
        <div className="min-h-screen bg-white">
            <Navbar />

            <main>
                {/* Hero Section */}
                <section className="relative pt-32 pb-20 overflow-hidden bg-grid">
                    <div className="absolute inset-0 z-0 pointer-events-none">
                        <div className="absolute top-1/3 left-1/2 -translate-x-1/2 -translate-y-1/2 w-[900px] h-[600px] bg-gradient-to-r from-amber-100/40 via-yellow-100/30 to-[#529ec6]/20 rounded-full blur-3xl opacity-60" />
                    </div>

                    <div className="relative z-10 max-w-5xl mx-auto px-4 sm:px-6 lg:px-8 text-center">
                        <div className="inline-flex items-center gap-2 bg-amber-50 text-amber-700 px-4 py-1.5 rounded-full text-sm font-medium mb-8">
                            <Hammer className="w-4 h-4" />
                            For Contractors
                        </div>

                        <h1 className="text-5xl sm:text-6xl lg:text-7xl font-extrabold tracking-tight text-slate-900 mb-6">
                            Protect your work.
                            <span className="block text-amber-500">Get paid on time.</span>
                        </h1>

                        <p className="text-lg sm:text-xl text-slate-500 mb-10 max-w-2xl mx-auto leading-relaxed">
                            Professional contractor agreements with deposit collection, change order tracking,
                            and liability protection. Work confidently knowing you're covered.
                        </p>

                        <div className="flex flex-col sm:flex-row gap-3 justify-center">
                            <Link
                                href="/register"
                                className="inline-flex items-center justify-center bg-amber-500 text-white px-8 py-4 rounded-xl text-base font-semibold hover:bg-amber-600 transition-all hover:scale-[1.02] shadow-lg shadow-amber-500/20"
                            >
                                Create your first contract
                                <ArrowRight className="w-4 h-4 ml-2" />
                            </Link>
                        </div>
                    </div>
                </section>

                {/* Benefits Grid */}
                <section className="py-24 bg-slate-50">
                    <div className="max-w-6xl mx-auto px-4 sm:px-6 lg:px-8">
                        <div className="text-center mb-16">
                            <h2 className="text-3xl sm:text-4xl font-bold text-slate-900 mb-4">
                                Built for the trades
                            </h2>
                            <p className="text-lg text-slate-500 max-w-2xl mx-auto">
                                Features designed specifically for contractors and construction professionals.
                            </p>
                        </div>

                        <div className="grid md:grid-cols-2 gap-8">
                            {benefits.map((benefit, index) => (
                                <div
                                    key={index}
                                    className="bg-white rounded-2xl p-8 shadow-sm border border-slate-100 hover:shadow-lg hover:border-amber-100 transition-all group"
                                >
                                    <div className="flex gap-5">
                                        <div className="w-12 h-12 bg-amber-50 rounded-xl flex items-center justify-center flex-shrink-0 group-hover:bg-amber-100 transition-colors">
                                            <benefit.icon className="w-6 h-6 text-amber-600" />
                                        </div>
                                        <div>
                                            <h3 className="text-xl font-semibold text-slate-900 mb-2">
                                                {benefit.title}
                                            </h3>
                                            <p className="text-slate-500 leading-relaxed">
                                                {benefit.description}
                                            </p>
                                        </div>
                                    </div>
                                </div>
                            ))}
                        </div>
                    </div>
                </section>

                {/* Contract Types */}
                <section className="py-24">
                    <div className="max-w-4xl mx-auto px-4 sm:px-6 lg:px-8">
                        <div className="text-center mb-12">
                            <h2 className="text-3xl sm:text-4xl font-bold text-slate-900 mb-4">
                                Contractor-specific templates
                            </h2>
                        </div>

                        <div className="grid sm:grid-cols-2 gap-4">
                            {contractTypes.map((type, index) => (
                                <div
                                    key={index}
                                    className="flex items-center gap-3 p-4 bg-white rounded-xl border border-slate-100 hover:border-amber-200 transition-all"
                                >
                                    <CheckCircle2 className="w-5 h-5 text-amber-500" />
                                    <span className="text-slate-700">{type}</span>
                                </div>
                            ))}
                        </div>
                    </div>
                </section>

                {/* Scenario */}
                <section className="py-20 bg-gradient-to-b from-slate-50 to-white">
                    <div className="max-w-5xl mx-auto px-4 sm:px-6 lg:px-8">
                        <div className="bg-white rounded-3xl shadow-xl border border-slate-100 overflow-hidden">
                            <div className="p-8 md:p-12">
                                <div className="flex items-center gap-2 mb-6">
                                    <Wrench className="w-5 h-5 text-amber-500" />
                                    <span className="text-sm font-medium text-amber-600">Real Scenario</span>
                                </div>
                                <h3 className="text-2xl font-bold text-slate-900 mb-4">
                                    "The kitchen remodel just cost me an extra $4,000"
                                </h3>
                                <p className="text-slate-500 mb-6">
                                    Client wanted new cabinets mid-project. Without a change order, you'd eat the cost.
                                    With Lexport, you send a change order in 30 seconds — client signs and pays the difference before you buy materials.
                                </p>
                                <div className="grid sm:grid-cols-3 gap-4">
                                    <div className="p-4 bg-amber-50 rounded-xl text-center">
                                        <p className="text-2xl font-bold text-amber-600">30s</p>
                                        <p className="text-sm text-slate-500">Change order drafted</p>
                                    </div>
                                    <div className="p-4 bg-amber-50 rounded-xl text-center">
                                        <p className="text-2xl font-bold text-amber-600">5min</p>
                                        <p className="text-sm text-slate-500">Client signs on phone</p>
                                    </div>
                                    <div className="p-4 bg-emerald-50 rounded-xl text-center">
                                        <p className="text-2xl font-bold text-emerald-600">$4,000</p>
                                        <p className="text-sm text-slate-500">Collected immediately</p>
                                    </div>
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
