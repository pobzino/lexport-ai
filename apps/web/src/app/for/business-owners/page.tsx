import { Navbar } from "@/components/home/Navbar";
import { Footer } from "@/components/home/Footer";
import { CTA } from "@/components/home/CTA";
import Link from "next/link";
import {
    Building2,
    Clock,
    Shield,
    FileText,
    CheckCircle2,
    ArrowRight,
    DollarSign,
    Users,
    BarChart3,
    Zap,
    Lock,
    Layers
} from "lucide-react";

export const metadata = {
    title: "Lexport for Business Owners | Streamline Your Contract Process",
    description: "Professional contracts for vendors, clients, and employees. Save hours and protect your business.",
    openGraph: {
        title: "Lexport for Business Owners - Streamline Contracts",
        description: "Professional contracts for vendors, clients, and employees. Save hours and protect your business.",
        url: "https://lexportai.com/for/business-owners",
    },
    twitter: {
        title: "Lexport for Business Owners - Streamline Contracts",
        description: "Professional contracts for vendors, clients, and employees. Save hours and protect your business.",
    },
    alternates: { canonical: "https://lexportai.com/for/business-owners" },
};

const features = [
    {
        icon: Layers,
        title: "Template Library",
        description: "Build your own library of company templates. Reuse and customize for consistency.",
    },
    {
        icon: Users,
        title: "Team Access",
        description: "Invite your team with role-based permissions. Control who can edit vs. send.",
    },
    {
        icon: Lock,
        title: "Brand Compliance",
        description: "Lock down key terms and clauses. Employees use your approved language.",
    },
    {
        icon: BarChart3,
        title: "Analytics Dashboard",
        description: "Track contract status, signing rates, and average time-to-signature.",
    },
];

const useCases = [
    {
        title: "Vendor Agreements",
        description: "Standardize terms with all your suppliers",
        icon: Building2,
    },
    {
        title: "Client Contracts",
        description: "Professional proposals that close deals",
        icon: FileText,
    },
    {
        title: "Employee Onboarding",
        description: "Offer letters, NDAs, and IP assignment",
        icon: Users,
    },
    {
        title: "Partnerships",
        description: "Co-marketing and referral agreements",
        icon: Zap,
    },
];

const stats = [
    { value: "4hrs", label: "Saved per contract" },
    { value: "87%", label: "Faster signing" },
    { value: "$350", label: "Avg legal savings" },
];

export default function BusinessOwnersPage() {
    return (
        <div className="min-h-screen bg-white">
            <Navbar />

            <main>
                {/* Hero Section */}
                <section className="relative pt-32 pb-20 overflow-hidden bg-grid">
                    <div className="absolute inset-0 z-0 pointer-events-none">
                        <div className="absolute top-1/3 left-1/2 -translate-x-1/2 -translate-y-1/2 w-[900px] h-[600px] bg-gradient-to-r from-blue-100/40 via-[#529ec6]/25 to-emerald-100/20 rounded-full blur-3xl opacity-60" />
                    </div>

                    <div className="relative z-10 max-w-5xl mx-auto px-4 sm:px-6 lg:px-8 text-center">
                        <div className="inline-flex items-center gap-2 bg-blue-50 text-blue-700 px-4 py-1.5 rounded-full text-sm font-medium mb-8">
                            <Building2 className="w-4 h-4" />
                            For Business Owners
                        </div>

                        <h1 className="text-5xl sm:text-6xl lg:text-7xl font-extrabold tracking-tight text-slate-900 mb-6">
                            Run your business.
                            <span className="block text-[#529ec6]">Not after paperwork.</span>
                        </h1>

                        <p className="text-lg sm:text-xl text-slate-500 mb-10 max-w-2xl mx-auto leading-relaxed">
                            Create professional contracts for vendors, clients, and employees.
                            Build your template library, invite your team, and protect your business.
                        </p>

                        <div className="flex flex-col sm:flex-row gap-3 justify-center">
                            <Link
                                href="/register"
                                className="inline-flex items-center justify-center bg-[#529ec6] text-white px-8 py-4 rounded-xl text-base font-semibold hover:bg-[#4189ad] transition-all hover:scale-[1.02] shadow-lg shadow-[#529ec6]/20"
                            >
                                Get started free
                                <ArrowRight className="w-4 h-4 ml-2" />
                            </Link>
                            <Link
                                href="/pricing"
                                className="inline-flex items-center justify-center bg-white text-slate-600 px-8 py-4 rounded-xl text-base font-medium border border-slate-200 hover:bg-slate-50 hover:border-slate-300 transition-all"
                            >
                                View team pricing
                            </Link>
                        </div>
                    </div>
                </section>

                {/* Stats */}
                <section className="py-16 border-b border-slate-100">
                    <div className="max-w-4xl mx-auto px-4 sm:px-6 lg:px-8">
                        <div className="grid grid-cols-3 gap-8 text-center">
                            {stats.map((stat, index) => (
                                <div key={index}>
                                    <p className="text-4xl sm:text-5xl font-bold text-[#529ec6]">{stat.value}</p>
                                    <p className="text-slate-500 mt-2">{stat.label}</p>
                                </div>
                            ))}
                        </div>
                    </div>
                </section>

                {/* Features Grid */}
                <section className="py-24 bg-slate-50">
                    <div className="max-w-6xl mx-auto px-4 sm:px-6 lg:px-8">
                        <div className="text-center mb-16">
                            <h2 className="text-3xl sm:text-4xl font-bold text-slate-900 mb-4">
                                Built for teams
                            </h2>
                            <p className="text-lg text-slate-500 max-w-2xl mx-auto">
                                Everything you need to standardize and scale your contract process.
                            </p>
                        </div>

                        <div className="grid md:grid-cols-2 gap-8">
                            {features.map((feature, index) => (
                                <div
                                    key={index}
                                    className="bg-white rounded-2xl p-8 shadow-sm border border-slate-100 hover:shadow-lg hover:border-[#529ec6]/20 transition-all group"
                                >
                                    <div className="flex gap-5">
                                        <div className="w-12 h-12 bg-[#529ec6]/10 rounded-xl flex items-center justify-center flex-shrink-0 group-hover:bg-[#529ec6]/20 transition-colors">
                                            <feature.icon className="w-6 h-6 text-[#529ec6]" />
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

                {/* Use Cases */}
                <section className="py-24">
                    <div className="max-w-5xl mx-auto px-4 sm:px-6 lg:px-8">
                        <div className="text-center mb-12">
                            <h2 className="text-3xl sm:text-4xl font-bold text-slate-900 mb-4">
                                Every contract your business needs
                            </h2>
                        </div>

                        <div className="grid sm:grid-cols-2 lg:grid-cols-4 gap-6">
                            {useCases.map((useCase, index) => (
                                <div
                                    key={index}
                                    className="p-6 bg-white rounded-xl border border-slate-100 hover:shadow-lg hover:border-[#529ec6]/20 transition-all text-center"
                                >
                                    <div className="w-12 h-12 bg-gradient-to-br from-[#202e46] to-[#529ec6] rounded-xl flex items-center justify-center mx-auto mb-4">
                                        <useCase.icon className="w-6 h-6 text-white" />
                                    </div>
                                    <h3 className="font-semibold text-slate-900 mb-2">{useCase.title}</h3>
                                    <p className="text-sm text-slate-500">{useCase.description}</p>
                                </div>
                            ))}
                        </div>
                    </div>
                </section>

                {/* Process Flow */}
                <section className="py-20 bg-gradient-to-b from-slate-50 to-white">
                    <div className="max-w-5xl mx-auto px-4 sm:px-6 lg:px-8">
                        <div className="text-center mb-12">
                            <h2 className="text-3xl sm:text-4xl font-bold text-slate-900 mb-4">
                                How it works for teams
                            </h2>
                        </div>

                        <div className="grid md:grid-cols-4 gap-8">
                            {[
                                { step: "1", title: "Create templates", desc: "Build your contract library" },
                                { step: "2", title: "Invite team", desc: "Set roles & permissions" },
                                { step: "3", title: "Send contracts", desc: "Team uses approved templates" },
                                { step: "4", title: "Track everything", desc: "Dashboard visibility" },
                            ].map((item, index) => (
                                <div key={index} className="text-center">
                                    <div className="w-12 h-12 bg-gradient-to-br from-[#202e46] to-[#529ec6] rounded-xl flex items-center justify-center text-lg font-bold text-white mx-auto mb-4">
                                        {item.step}
                                    </div>
                                    <h3 className="font-semibold text-slate-900 mb-1">{item.title}</h3>
                                    <p className="text-sm text-slate-500">{item.desc}</p>
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
