import { Navbar } from "@/components/home/Navbar";
import { Footer } from "@/components/home/Footer";
import { CTA } from "@/components/home/CTA";
import Link from "next/link";
import {
    FileText,
    Sparkles,
    Shield,
    Clock,
    Globe,
    Zap,
    CheckCircle2,
    ArrowRight,
    Scale,
    Building2,
    Landmark,
    Library,
    AlertTriangle,
    MessageSquare,
    Eye,
    BookOpen
} from "lucide-react";

export const metadata = {
    title: "AI Contract Generation",
    description: "Generate legally-binding contracts in minutes with AI. Jurisdiction-aware templates, risk analysis, and clause explanations.",
};

const features = [
    {
        icon: Sparkles,
        title: "AI-Powered Generation",
        description: "Describe your needs in plain English and get a complete, customized contract in seconds.",
    },
    {
        icon: Library,
        title: "Template Repository",
        description: "Access our library of professionally-drafted templates. Save your own for quick reuse.",
    },
    {
        icon: AlertTriangle,
        title: "Risk Analysis",
        description: "AI scans for unusual clauses, missing protections, and potential legal issues before you sign.",
    },
    {
        icon: MessageSquare,
        title: "Clause Explanations",
        description: "Don't understand a term? Ask our AI to explain any clause in plain English.",
    },
    {
        icon: Globe,
        title: "Multi-Jurisdiction",
        description: "Templates validated for California, Texas, New York, and United Kingdom law.",
    },
    {
        icon: Clock,
        title: "Minutes, Not Days",
        description: "What used to take lawyers 3-5 days now takes you less than 5 minutes.",
    },
];

const contractTypes = [
    { name: "Non-Disclosure Agreement", icon: Shield, description: "Mutual or one-way NDAs" },
    { name: "Contractor Agreement", icon: Building2, description: "Independent contractor terms" },
    { name: "Consulting Agreement", icon: FileText, description: "Professional services" },
    { name: "SAFE Note", icon: Landmark, description: "Startup fundraising (US)" },
    { name: "Service Agreement", icon: FileText, description: "Freelance & project work" },
    { name: "IP Assignment", icon: Shield, description: "Intellectual property transfer" },
];

export default function ContractsPage() {
    return (
        <div className="min-h-screen bg-white">
            <Navbar />

            <main>
                {/* Hero Section */}
                <section className="relative pt-32 pb-20 overflow-hidden bg-grid">
                    <div className="absolute inset-0 z-0 pointer-events-none">
                        <div className="absolute top-1/3 left-1/2 -translate-x-1/2 -translate-y-1/2 w-[900px] h-[600px] bg-gradient-to-r from-[#529ec6]/25 via-[#529ec6]/10 to-emerald-100/30 rounded-full blur-3xl opacity-60" />
                    </div>

                    <div className="relative z-10 max-w-5xl mx-auto px-4 sm:px-6 lg:px-8 text-center">
                        <div className="inline-flex items-center gap-2 bg-slate-100 text-slate-600 px-4 py-1.5 rounded-full text-sm font-medium mb-8">
                            <Sparkles className="w-4 h-4 text-[#529ec6]" />
                            AI-Powered Contracts
                        </div>

                        <h1 className="text-5xl sm:text-6xl lg:text-7xl font-extrabold tracking-tight text-slate-900 mb-6">
                            Generate contracts
                            <span className="block text-[#529ec6]">in minutes, not days</span>
                        </h1>

                        <p className="text-lg sm:text-xl text-slate-500 mb-10 max-w-2xl mx-auto leading-relaxed">
                            AI generates contracts from plain English. Risk analysis keeps you protected.
                            Clause explanations ensure you understand every term.
                        </p>

                        <div className="flex flex-col sm:flex-row gap-3 justify-center">
                            <Link
                                href="/register"
                                className="inline-flex items-center justify-center bg-slate-900 text-white px-8 py-4 rounded-xl text-base font-semibold hover:bg-slate-800 transition-all hover:scale-[1.02] shadow-lg shadow-slate-900/10"
                            >
                                Start generating for free
                                <ArrowRight className="w-4 h-4 ml-2" />
                            </Link>
                            <Link
                                href="/contracts/new"
                                className="inline-flex items-center justify-center bg-white text-slate-600 px-8 py-4 rounded-xl text-base font-medium border border-slate-200 hover:bg-slate-50 hover:border-slate-300 transition-all"
                            >
                                Try a demo
                            </Link>
                        </div>
                    </div>
                </section>

                {/* Features Grid */}
                <section className="py-24 bg-slate-50">
                    <div className="max-w-6xl mx-auto px-4 sm:px-6 lg:px-8">
                        <div className="text-center mb-16">
                            <h2 className="text-3xl sm:text-4xl font-bold text-slate-900 mb-4">
                                Why choose Lexport for contracts?
                            </h2>
                            <p className="text-lg text-slate-500 max-w-2xl mx-auto">
                                Professional-grade contracts without the professional fees.
                            </p>
                        </div>

                        <div className="grid md:grid-cols-2 lg:grid-cols-3 gap-8">
                            {features.map((feature, index) => (
                                <div
                                    key={index}
                                    className="bg-white rounded-2xl p-8 shadow-sm border border-slate-100 hover:shadow-lg hover:border-[#529ec6]/20 transition-all group"
                                >
                                    <div className="w-12 h-12 bg-[#529ec6]/10 rounded-xl flex items-center justify-center mb-5 group-hover:bg-[#529ec6]/20 transition-colors">
                                        <feature.icon className="w-6 h-6 text-[#529ec6]" />
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

                {/* Risk Analysis & Explanations Feature */}
                <section className="py-24">
                    <div className="max-w-6xl mx-auto px-4 sm:px-6 lg:px-8">
                        <div className="grid lg:grid-cols-2 gap-16 items-center">
                            <div>
                                <div className="inline-flex items-center gap-2 bg-red-50 text-red-600 px-3 py-1 rounded-full text-sm font-medium mb-6">
                                    <AlertTriangle className="w-4 h-4" />
                                    Contract Intelligence
                                </div>
                                <h2 className="text-3xl sm:text-4xl font-bold text-slate-900 mb-6">
                                    Know what you're signing
                                </h2>
                                <p className="text-lg text-slate-500 mb-8">
                                    Upload any contract and our AI will analyze it for risks, explain complex clauses,
                                    and highlight terms that need attention — before you sign.
                                </p>
                                <div className="space-y-4">
                                    {[
                                        { icon: Eye, text: "Spot one-sided or unusual clauses instantly" },
                                        { icon: Shield, text: "Identify missing liability protections" },
                                        { icon: MessageSquare, text: "Get plain-English explanations of legal jargon" },
                                        { icon: CheckCircle2, text: "Know what you're agreeing to" },
                                    ].map((item, index) => (
                                        <div key={index} className="flex items-center gap-3">
                                            <div className="w-8 h-8 bg-[#529ec6]/10 rounded-lg flex items-center justify-center">
                                                <item.icon className="w-4 h-4 text-[#529ec6]" />
                                            </div>
                                            <span className="text-slate-700">{item.text}</span>
                                        </div>
                                    ))}
                                </div>
                            </div>
                            <div className="relative">
                                <div className="absolute -inset-4 bg-gradient-to-r from-red-500/10 via-[#529ec6]/10 to-emerald-500/10 rounded-3xl blur-2xl opacity-50" />
                                <div className="relative bg-white rounded-2xl shadow-2xl border border-slate-100 p-6">
                                    <div className="flex items-center gap-2 mb-4">
                                        <AlertTriangle className="w-5 h-5 text-amber-500" />
                                        <span className="font-semibold text-slate-900">Risk Analysis</span>
                                    </div>
                                    <div className="space-y-3">
                                        <div className="p-3 bg-red-50 border border-red-100 rounded-lg">
                                            <div className="flex items-center gap-2 mb-1">
                                                <div className="w-2 h-2 bg-red-500 rounded-full" />
                                                <span className="text-sm font-medium text-red-700">High Risk</span>
                                            </div>
                                            <p className="text-sm text-red-600">Unlimited liability clause detected in Section 8.2</p>
                                        </div>
                                        <div className="p-3 bg-amber-50 border border-amber-100 rounded-lg">
                                            <div className="flex items-center gap-2 mb-1">
                                                <div className="w-2 h-2 bg-amber-500 rounded-full" />
                                                <span className="text-sm font-medium text-amber-700">Medium Risk</span>
                                            </div>
                                            <p className="text-sm text-amber-600">Non-compete period exceeds typical duration</p>
                                        </div>
                                        <div className="p-3 bg-emerald-50 border border-emerald-100 rounded-lg">
                                            <div className="flex items-center gap-2 mb-1">
                                                <div className="w-2 h-2 bg-emerald-500 rounded-full" />
                                                <span className="text-sm font-medium text-emerald-700">Good</span>
                                            </div>
                                            <p className="text-sm text-emerald-600">IP assignment clauses are standard</p>
                                        </div>
                                    </div>
                                    <button className="w-full mt-4 py-2 text-sm text-[#529ec6] font-medium hover:underline">
                                        View full analysis →
                                    </button>
                                </div>
                            </div>
                        </div>
                    </div>
                </section>

                {/* Template Library */}
                <section className="py-24 bg-slate-50">
                    <div className="max-w-6xl mx-auto px-4 sm:px-6 lg:px-8">
                        <div className="text-center mb-16">
                            <div className="inline-flex items-center gap-2 bg-[#529ec6]/10 text-[#529ec6] px-3 py-1 rounded-full text-sm font-medium mb-4">
                                <Library className="w-4 h-4" />
                                Template Repository
                            </div>
                            <h2 className="text-3xl sm:text-4xl font-bold text-slate-900 mb-4">
                                Start faster with templates
                            </h2>
                            <p className="text-lg text-slate-500 max-w-2xl mx-auto">
                                Access professionally-drafted templates or save your own for quick reuse.
                            </p>
                        </div>

                        <div className="grid sm:grid-cols-2 lg:grid-cols-3 gap-6">
                            {contractTypes.map((type, index) => (
                                <div
                                    key={index}
                                    className="flex items-start gap-4 p-6 bg-white rounded-xl border border-slate-100 hover:border-[#529ec6]/30 hover:shadow-md transition-all"
                                >
                                    <div className="w-10 h-10 bg-gradient-to-br from-[#202e46] to-[#529ec6] rounded-lg flex items-center justify-center flex-shrink-0">
                                        <type.icon className="w-5 h-5 text-white" />
                                    </div>
                                    <div>
                                        <h3 className="font-semibold text-slate-900 mb-1">{type.name}</h3>
                                        <p className="text-sm text-slate-500">{type.description}</p>
                                    </div>
                                </div>
                            ))}
                        </div>

                        <div className="text-center mt-12">
                            <p className="text-slate-500 mb-4">Plus your own saved templates...</p>
                            <Link
                                href="/templates"
                                className="inline-flex items-center text-[#529ec6] font-medium hover:underline"
                            >
                                Browse template library <ArrowRight className="w-4 h-4 ml-1" />
                            </Link>
                        </div>
                    </div>
                </section>

                {/* How It Works */}
                <section className="py-24 bg-gradient-to-b from-white to-slate-50">
                    <div className="max-w-5xl mx-auto px-4 sm:px-6 lg:px-8">
                        <div className="text-center mb-16">
                            <h2 className="text-3xl sm:text-4xl font-bold text-slate-900 mb-4">
                                How it works
                            </h2>
                        </div>

                        <div className="grid md:grid-cols-4 gap-8">
                            {[
                                { step: "1", title: "Describe or upload", description: "Tell us what you need or upload an existing contract." },
                                { step: "2", title: "AI generates", description: "Our AI creates a complete, customized contract." },
                                { step: "3", title: "Review risks", description: "See risk analysis and ask questions about any clause." },
                                { step: "4", title: "Send for signature", description: "Collect legally-binding e-signatures instantly." },
                            ].map((item, index) => (
                                <div key={index} className="text-center">
                                    <div className="w-14 h-14 bg-gradient-to-br from-[#202e46] to-[#529ec6] rounded-2xl flex items-center justify-center text-xl font-bold text-white mx-auto mb-4 shadow-lg shadow-[#202e46]/20">
                                        {item.step}
                                    </div>
                                    <h3 className="text-lg font-semibold text-slate-900 mb-2">{item.title}</h3>
                                    <p className="text-sm text-slate-500">{item.description}</p>
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
