import { Navbar } from "@/components/home/Navbar";
import { Footer } from "@/components/home/Footer";
import { CTA } from "@/components/home/CTA";
import Link from "next/link";
import {
    FileSignature,
    Shield,
    Clock,
    Smartphone,
    CheckCircle2,
    ArrowRight,
    Mail,
    Bell,
    Lock,
    Eye,
    Fingerprint,
    Globe
} from "lucide-react";

export const metadata = {
    title: "E-Signatures",
    description: "Legally-binding e-signatures with full audit trails. ESIGN, UETA, and UK ECA 2000 compliant.",
    openGraph: {
        title: "E-Signatures - Lexport",
        description: "Legally-binding e-signatures with full audit trails. ESIGN, UETA, and UK ECA 2000 compliant.",
        url: "https://lexportai.com/solutions/signatures",
    },
    twitter: {
        title: "E-Signatures - Lexport",
        description: "Legally-binding e-signatures with full audit trails. ESIGN, UETA, and UK ECA 2000 compliant.",
    },
    alternates: { canonical: "https://lexportai.com/solutions/signatures" },
};

const features = [
    {
        icon: Shield,
        title: "Legally Binding",
        description: "Compliant with ESIGN Act, UETA, and UK Electronic Communications Act 2000.",
    },
    {
        icon: Smartphone,
        title: "Mobile-Optimized",
        description: "60%+ of signatures happen on mobile. Our signing experience is designed for phones first.",
    },
    {
        icon: Lock,
        title: "Full Audit Trail",
        description: "Timestamps, IP addresses, and device info recorded for every action.",
    },
    {
        icon: Bell,
        title: "Auto-Reminders",
        description: "Automatic email reminders for pending signatures. Never chase signers again.",
    },
    {
        icon: Fingerprint,
        title: "Verification Options",
        description: "Email verification, SMS codes, or ID verification for high-value contracts.",
    },
    {
        icon: Globe,
        title: "Global Acceptance",
        description: "E-signatures accepted in 180+ countries. International business made easy.",
    },
];

const signingMethods = [
    { name: "Draw", description: "Sign with finger or stylus" },
    { name: "Type", description: "Type your name, choose a font" },
    { name: "Upload", description: "Upload an image of your signature" },
];

export default function SignaturesPage() {
    return (
        <div className="min-h-screen bg-white">
            <Navbar />

            <main>
                {/* Hero Section */}
                <section className="relative pt-32 pb-20 overflow-hidden bg-grid">
                    <div className="absolute inset-0 z-0 pointer-events-none">
                        <div className="absolute top-1/3 left-1/2 -translate-x-1/2 -translate-y-1/2 w-[900px] h-[600px] bg-gradient-to-r from-emerald-100/40 via-[#529ec6]/15 to-[#529ec6]/25 rounded-full blur-3xl opacity-60" />
                    </div>

                    <div className="relative z-10 max-w-5xl mx-auto px-4 sm:px-6 lg:px-8 text-center">
                        <div className="inline-flex items-center gap-2 bg-emerald-50 text-emerald-700 px-4 py-1.5 rounded-full text-sm font-medium mb-8">
                            <FileSignature className="w-4 h-4" />
                            Legally Binding E-Signatures
                        </div>

                        <h1 className="text-5xl sm:text-6xl lg:text-7xl font-extrabold tracking-tight text-slate-900 mb-6">
                            Get contracts signed
                            <span className="block text-emerald-500">faster than ever</span>
                        </h1>

                        <p className="text-lg sm:text-xl text-slate-500 mb-10 max-w-2xl mx-auto leading-relaxed">
                            Send documents for signature in seconds. Track progress in real-time.
                            Every signature comes with a complete, legally-admissible audit trail.
                        </p>

                        <div className="flex flex-col sm:flex-row gap-3 justify-center">
                            <Link
                                href="/register"
                                className="inline-flex items-center justify-center bg-emerald-600 text-white px-8 py-4 rounded-xl text-base font-semibold hover:bg-emerald-700 transition-all hover:scale-[1.02] shadow-lg shadow-emerald-600/20"
                            >
                                Start collecting signatures
                                <ArrowRight className="w-4 h-4 ml-2" />
                            </Link>
                            <Link
                                href="#how-it-works"
                                className="inline-flex items-center justify-center bg-white text-slate-600 px-8 py-4 rounded-xl text-base font-medium border border-slate-200 hover:bg-slate-50 hover:border-slate-300 transition-all"
                            >
                                See how it works
                            </Link>
                        </div>
                    </div>
                </section>

                {/* Trust Badges */}
                <section className="py-12 border-b border-slate-100">
                    <div className="max-w-4xl mx-auto px-4 sm:px-6 lg:px-8">
                        <div className="flex flex-wrap justify-center gap-8 items-center text-slate-400">
                            <div className="flex items-center gap-2">
                                <Shield className="w-5 h-5" />
                                <span className="text-sm font-medium">ESIGN Compliant</span>
                            </div>
                            <div className="flex items-center gap-2">
                                <Shield className="w-5 h-5" />
                                <span className="text-sm font-medium">UETA Compliant</span>
                            </div>
                            <div className="flex items-center gap-2">
                                <Shield className="w-5 h-5" />
                                <span className="text-sm font-medium">UK ECA 2000</span>
                            </div>
                            <div className="flex items-center gap-2">
                                <Lock className="w-5 h-5" />
                                <span className="text-sm font-medium">Bank-Level Encryption</span>
                            </div>
                        </div>
                    </div>
                </section>

                {/* Features Grid */}
                <section className="py-24 bg-slate-50">
                    <div className="max-w-6xl mx-auto px-4 sm:px-6 lg:px-8">
                        <div className="text-center mb-16">
                            <h2 className="text-3xl sm:text-4xl font-bold text-slate-900 mb-4">
                                E-signatures built for speed and trust
                            </h2>
                            <p className="text-lg text-slate-500 max-w-2xl mx-auto">
                                Every feature designed to make signing effortless and legally ironclad.
                            </p>
                        </div>

                        <div className="grid md:grid-cols-2 lg:grid-cols-3 gap-8">
                            {features.map((feature, index) => (
                                <div
                                    key={index}
                                    className="bg-white rounded-2xl p-8 shadow-sm border border-slate-100 hover:shadow-lg hover:border-emerald-100 transition-all group"
                                >
                                    <div className="w-12 h-12 bg-emerald-50 rounded-xl flex items-center justify-center mb-5 group-hover:bg-emerald-100 transition-colors">
                                        <feature.icon className="w-6 h-6 text-emerald-600" />
                                    </div>
                                    <h3 className="text-xl font-semibold text-slate-900 mb-2">
                                        {feature.title}
                                    </h3>
                                    <p className="text-slate-500 leading-relaxed">
                                        {feature.description}
                                    </p>
                                </div>
                            ))}
                        </div>
                    </div>
                </section>

                {/* Signing Methods */}
                <section className="py-24">
                    <div className="max-w-5xl mx-auto px-4 sm:px-6 lg:px-8">
                        <div className="grid lg:grid-cols-2 gap-16 items-center">
                            <div>
                                <h2 className="text-3xl sm:text-4xl font-bold text-slate-900 mb-6">
                                    Sign your way
                                </h2>
                                <p className="text-lg text-slate-500 mb-8">
                                    We support multiple ways to sign, so everyone can find a method that works for them.
                                </p>
                                <div className="space-y-4">
                                    {signingMethods.map((method, index) => (
                                        <div key={index} className="flex items-center gap-4">
                                            <div className="w-10 h-10 bg-gradient-to-br from-emerald-500 to-emerald-600 rounded-lg flex items-center justify-center">
                                                <CheckCircle2 className="w-5 h-5 text-white" />
                                            </div>
                                            <div>
                                                <span className="font-semibold text-slate-900">{method.name}</span>
                                                <span className="text-slate-500 ml-2">— {method.description}</span>
                                            </div>
                                        </div>
                                    ))}
                                </div>
                            </div>
                            <div className="relative">
                                <div className="absolute -inset-4 bg-gradient-to-r from-emerald-500/20 via-[#529ec6]/10 to-emerald-500/20 rounded-3xl blur-2xl opacity-50" />
                                <div className="relative bg-white rounded-2xl shadow-2xl border border-slate-100 p-8">
                                    <div className="text-center mb-6">
                                        <Eye className="w-8 h-8 text-emerald-500 mx-auto mb-3" />
                                        <h3 className="font-semibold text-slate-900">Real-time tracking</h3>
                                    </div>
                                    <div className="space-y-3">
                                        <div className="flex items-center gap-3 p-3 bg-emerald-50 rounded-lg">
                                            <div className="w-2 h-2 bg-emerald-500 rounded-full" />
                                            <span className="text-sm text-slate-700">Contract sent to John</span>
                                            <span className="text-xs text-slate-400 ml-auto">2m ago</span>
                                        </div>
                                        <div className="flex items-center gap-3 p-3 bg-blue-50 rounded-lg">
                                            <div className="w-2 h-2 bg-blue-500 rounded-full" />
                                            <span className="text-sm text-slate-700">John viewed the contract</span>
                                            <span className="text-xs text-slate-400 ml-auto">1m ago</span>
                                        </div>
                                        <div className="flex items-center gap-3 p-3 bg-emerald-100 rounded-lg border border-emerald-200">
                                            <div className="w-2 h-2 bg-emerald-600 rounded-full animate-pulse" />
                                            <span className="text-sm font-medium text-emerald-700">John is signing...</span>
                                        </div>
                                    </div>
                                </div>
                            </div>
                        </div>
                    </div>
                </section>

                {/* How It Works */}
                <section id="how-it-works" className="py-24 bg-gradient-to-b from-slate-50 to-white">
                    <div className="max-w-5xl mx-auto px-4 sm:px-6 lg:px-8">
                        <div className="text-center mb-16">
                            <h2 className="text-3xl sm:text-4xl font-bold text-slate-900 mb-4">
                                Send for signature in 3 steps
                            </h2>
                        </div>

                        <div className="grid md:grid-cols-3 gap-12">
                            {[
                                { step: "1", title: "Upload or create", description: "Create a contract with AI or upload your own document." },
                                { step: "2", title: "Add signers", description: "Enter email addresses and set signing order." },
                                { step: "3", title: "Send & track", description: "Signers receive an email link. You get real-time updates." },
                            ].map((item, index) => (
                                <div key={index} className="text-center">
                                    <div className="w-16 h-16 bg-gradient-to-br from-emerald-500 to-emerald-600 rounded-2xl flex items-center justify-center text-2xl font-bold text-white mx-auto mb-5 shadow-lg shadow-emerald-500/20">
                                        {item.step}
                                    </div>
                                    <h3 className="text-xl font-semibold text-slate-900 mb-2">{item.title}</h3>
                                    <p className="text-slate-500">{item.description}</p>
                                </div>
                            ))}
                        </div>
                    </div>
                </section>

                <CTA />
            </main>

            <Footer />
        </div>
    );
}
