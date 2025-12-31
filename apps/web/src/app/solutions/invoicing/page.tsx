import { Navbar } from "@/components/home/Navbar";
import { Footer } from "@/components/home/Footer";
import { CTA } from "@/components/home/CTA";
import Link from "next/link";
import {
    Receipt,
    CreditCard,
    Clock,
    Zap,
    CheckCircle2,
    ArrowRight,
    DollarSign,
    TrendingUp,
    Shield,
    Calendar,
    BarChart3,
    Repeat
} from "lucide-react";

export const metadata = {
    title: "Invoicing & Payments",
    description: "Get paid faster with built-in invoicing and payment collection. Collect deposits, full payments, or offer payment plans.",
};

const features = [
    {
        icon: CreditCard,
        title: "Collect at Signing",
        description: "Require payment before or with signature. No more chasing invoices after the work is done.",
    },
    {
        icon: DollarSign,
        title: "Flexible Options",
        description: "Collect deposits upfront, full payment, or offer Buy Now Pay Later with Klarna.",
    },
    {
        icon: Zap,
        title: "Instant Payouts",
        description: "Connect your Stripe account and receive payments directly to your bank account.",
    },
    {
        icon: Receipt,
        title: "Professional Invoices",
        description: "Branded invoices generated automatically. Customize with your logo and colors.",
    },
    {
        icon: Calendar,
        title: "Payment Reminders",
        description: "Automatic reminders for outstanding balances. Never chase a payment again.",
    },
    {
        icon: BarChart3,
        title: "Revenue Dashboard",
        description: "Track collected payments, outstanding balances, and revenue trends at a glance.",
    },
];

const paymentTypes = [
    {
        title: "Full Payment",
        description: "100% upfront at signing",
        icon: DollarSign,
        color: "emerald"
    },
    {
        title: "Deposit + Balance",
        description: "Collect 10-90% upfront, balance later",
        icon: TrendingUp,
        color: "blue"
    },
    {
        title: "Buy Now Pay Later",
        description: "Klarna/Afterpay installments",
        icon: Repeat,
        color: "purple"
    },
];

export default function InvoicingPage() {
    return (
        <div className="min-h-screen bg-white">
            <Navbar />

            <main>
                {/* Hero Section */}
                <section className="relative pt-32 pb-20 overflow-hidden bg-grid">
                    <div className="absolute inset-0 z-0 pointer-events-none">
                        <div className="absolute top-1/3 left-1/2 -translate-x-1/2 -translate-y-1/2 w-[900px] h-[600px] bg-gradient-to-r from-purple-100/30 via-emerald-100/20 to-[#529ec6]/20 rounded-full blur-3xl opacity-60" />
                    </div>

                    <div className="relative z-10 max-w-5xl mx-auto px-4 sm:px-6 lg:px-8 text-center">
                        <div className="inline-flex items-center gap-2 bg-emerald-50 text-emerald-700 px-4 py-1.5 rounded-full text-sm font-medium mb-8">
                            <Receipt className="w-4 h-4" />
                            Invoicing & Payments
                        </div>

                        <h1 className="text-5xl sm:text-6xl lg:text-7xl font-extrabold tracking-tight text-slate-900 mb-6">
                            Get paid when
                            <span className="block text-gradient">they sign</span>
                        </h1>

                        <p className="text-lg sm:text-xl text-slate-500 mb-10 max-w-2xl mx-auto leading-relaxed">
                            Stop chasing invoices. Collect payments as part of the signing flow.
                            Deposits, full payments, or flexible payment plans — all built in.
                        </p>

                        <div className="flex flex-col sm:flex-row gap-3 justify-center">
                            <Link
                                href="/register"
                                className="inline-flex items-center justify-center bg-gradient-to-r from-emerald-500 to-emerald-600 text-white px-8 py-4 rounded-xl text-base font-semibold hover:from-emerald-600 hover:to-emerald-700 transition-all hover:scale-[1.02] shadow-lg shadow-emerald-500/20"
                            >
                                Start collecting payments
                                <ArrowRight className="w-4 h-4 ml-2" />
                            </Link>
                            <Link
                                href="/settings/payments"
                                className="inline-flex items-center justify-center bg-white text-slate-600 px-8 py-4 rounded-xl text-base font-medium border border-slate-200 hover:bg-slate-50 hover:border-slate-300 transition-all"
                            >
                                Connect Stripe
                            </Link>
                        </div>
                    </div>
                </section>

                {/* Payment Types */}
                <section className="py-20">
                    <div className="max-w-5xl mx-auto px-4 sm:px-6 lg:px-8">
                        <div className="grid md:grid-cols-3 gap-6">
                            {paymentTypes.map((type, index) => {
                                const colorClasses = {
                                    emerald: "from-emerald-500 to-emerald-600 shadow-emerald-500/20 bg-emerald-50",
                                    blue: "from-[#529ec6] to-blue-600 shadow-blue-500/20 bg-blue-50",
                                    purple: "from-purple-500 to-purple-600 shadow-purple-500/20 bg-purple-50",
                                };
                                const colors = colorClasses[type.color as keyof typeof colorClasses];

                                return (
                                    <div
                                        key={index}
                                        className="text-center p-8 rounded-2xl bg-white border border-slate-100 hover:shadow-lg hover:border-slate-200 transition-all"
                                    >
                                        <div className={`w-14 h-14 bg-gradient-to-br ${colors.split(" ").slice(0, 2).join(" ")} rounded-xl flex items-center justify-center shadow-lg ${colors.split(" ")[2]} mx-auto mb-5`}>
                                            <type.icon className="w-7 h-7 text-white" />
                                        </div>
                                        <h3 className="text-xl font-semibold text-slate-900 mb-2">{type.title}</h3>
                                        <p className="text-slate-500">{type.description}</p>
                                    </div>
                                );
                            })}
                        </div>
                    </div>
                </section>

                {/* Features Grid */}
                <section className="py-24 bg-slate-50">
                    <div className="max-w-6xl mx-auto px-4 sm:px-6 lg:px-8">
                        <div className="text-center mb-16">
                            <h2 className="text-3xl sm:text-4xl font-bold text-slate-900 mb-4">
                                Everything you need to get paid
                            </h2>
                            <p className="text-lg text-slate-500 max-w-2xl mx-auto">
                                Professional invoicing and payment collection, built right into your contract workflow.
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

                {/* Revenue Preview */}
                <section className="py-24">
                    <div className="max-w-5xl mx-auto px-4 sm:px-6 lg:px-8">
                        <div className="grid lg:grid-cols-2 gap-16 items-center">
                            <div>
                                <h2 className="text-3xl sm:text-4xl font-bold text-slate-900 mb-6">
                                    Track every dollar
                                </h2>
                                <p className="text-lg text-slate-500 mb-8">
                                    See your revenue at a glance. Track payments, outstanding balances, and more in one dashboard.
                                </p>
                                <div className="space-y-4">
                                    {[
                                        "Real-time payment notifications",
                                        "Outstanding balance tracking",
                                        "Revenue analytics and trends",
                                        "Export to accounting software",
                                    ].map((item, index) => (
                                        <div key={index} className="flex items-center gap-3">
                                            <CheckCircle2 className="w-5 h-5 text-emerald-500" />
                                            <span className="text-slate-700">{item}</span>
                                        </div>
                                    ))}
                                </div>
                            </div>
                            <div className="relative">
                                <div className="absolute -inset-4 bg-gradient-to-r from-emerald-500/20 via-[#529ec6]/10 to-emerald-500/20 rounded-3xl blur-2xl opacity-50" />
                                <div className="relative bg-white rounded-2xl shadow-2xl border border-slate-100 p-6">
                                    <div className="flex items-center justify-between mb-6">
                                        <h3 className="font-semibold text-slate-900">This Month</h3>
                                        <span className="text-sm text-emerald-600 font-medium bg-emerald-50 px-2 py-1 rounded-full">+24%</span>
                                    </div>
                                    <div className="grid grid-cols-2 gap-4 mb-6">
                                        <div className="p-4 bg-emerald-50 rounded-xl">
                                            <p className="text-sm text-slate-500 mb-1">Collected</p>
                                            <p className="text-2xl font-bold text-emerald-600">$12,450</p>
                                        </div>
                                        <div className="p-4 bg-amber-50 rounded-xl">
                                            <p className="text-sm text-slate-500 mb-1">Pending</p>
                                            <p className="text-2xl font-bold text-amber-600">$3,200</p>
                                        </div>
                                    </div>
                                    <div className="space-y-3">
                                        <div className="flex items-center justify-between p-3 bg-slate-50 rounded-lg">
                                            <span className="text-sm text-slate-700">Acme Corp</span>
                                            <span className="text-sm font-medium text-emerald-600">+$5,000</span>
                                        </div>
                                        <div className="flex items-center justify-between p-3 bg-slate-50 rounded-lg">
                                            <span className="text-sm text-slate-700">Design Co</span>
                                            <span className="text-sm font-medium text-emerald-600">+$2,500</span>
                                        </div>
                                    </div>
                                </div>
                            </div>
                        </div>
                    </div>
                </section>

                {/* Stripe Integration */}
                <section className="py-20 bg-gradient-to-b from-slate-50 to-white">
                    <div className="max-w-4xl mx-auto px-4 sm:px-6 lg:px-8 text-center">
                        <div className="inline-flex items-center gap-2 bg-slate-100 text-slate-600 px-4 py-1.5 rounded-full text-sm font-medium mb-6">
                            <Shield className="w-4 h-4" />
                            Powered by Stripe
                        </div>
                        <h2 className="text-3xl sm:text-4xl font-bold text-slate-900 mb-4">
                            Industry-leading payment security
                        </h2>
                        <p className="text-lg text-slate-500 mb-8 max-w-2xl mx-auto">
                            We partner with Stripe, trusted by millions of businesses worldwide.
                            Your payments are protected by bank-level encryption and PCI DSS compliance.
                        </p>
                        <Link
                            href="/settings/payments"
                            className="inline-flex items-center text-[#529ec6] font-medium hover:underline"
                        >
                            Connect your Stripe account <ArrowRight className="w-4 h-4 ml-1" />
                        </Link>
                    </div>
                </section>

                <CTA />
            </main>

            <Footer />
        </div>
    );
}
