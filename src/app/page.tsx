import Link from "next/link";
import Image from "next/image";
import {
  FileText,
  Sparkles,
  MessageSquare,
  Send,
  Download,
  Shield,
  Zap,
  Clock,
  Users,
  Star,
  Check,
  ChevronDown,
  ArrowRight,
} from "lucide-react";

export default function HomePage() {
  return (
    <div className="min-h-screen bg-white">
      {/* Navigation */}
      <nav className="sticky top-0 z-50 bg-[#f8f9fb]/80 backdrop-blur-xl shadow-[0_1px_3px_rgba(0,0,0,0.05)]">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
          <div className="flex justify-between items-center h-16">
            <div className="flex items-center gap-8">
              <Link href="/" className="flex items-center">
                <Image
                  src="/dark-logo.png"
                  alt="Lexport"
                  width={160}
                  height={48}
                  className="h-11 w-auto"
                />
              </Link>

              <div className="hidden md:flex items-center gap-6">
                <a
                  href="#features"
                  className="text-sm text-slate-600 hover:text-[#202e46] transition-colors"
                >
                  Features
                </a>
                <a
                  href="#how-it-works"
                  className="text-sm text-slate-600 hover:text-[#202e46] transition-colors"
                >
                  How it Works
                </a>
                <a
                  href="#pricing"
                  className="text-sm text-slate-600 hover:text-[#202e46] transition-colors"
                >
                  Pricing
                </a>
              </div>
            </div>

            <div className="flex items-center gap-4">
              <Link
                href="/login"
                className="text-sm font-medium text-slate-600 hover:text-[#202e46] transition-colors"
              >
                Sign In
              </Link>
              <Link
                href="/register"
                className="text-sm font-medium bg-[#202e46] text-white px-4 py-2 rounded-lg hover:bg-[#1a2539] transition-colors"
              >
                Get Started
              </Link>
            </div>
          </div>
        </div>
      </nav>

      {/* Hero Section */}
      <section className="py-20 px-4 sm:px-6 lg:px-8 bg-gradient-to-b from-slate-50 to-white">
        <div className="max-w-7xl mx-auto">
          <div className="text-center max-w-4xl mx-auto mb-12">
            <div className="inline-flex items-center gap-2 bg-[#202e46]/10 text-[#202e46] px-4 py-1.5 rounded-full text-sm font-medium mb-6">
              <Sparkles className="w-4 h-4" />
              AI-Powered Legal Platform
            </div>
            <h1 className="text-5xl sm:text-6xl font-bold tracking-tight mb-6">
              <span className="text-slate-900">Your </span>
              <span className="text-[#202e46]">
                AI legal assistant
              </span>
              <br />
              <span className="text-slate-900">for your business needs</span>
            </h1>
            <p className="text-xl text-slate-600 mb-10 max-w-2xl mx-auto">
              Generate contracts, collect e-signatures, and manage legal
              documents with AI. Built for startup founders and freelancers in
              California, Texas, New York, and the UK.
            </p>
            <div className="flex flex-col sm:flex-row gap-4 justify-center">
              <Link
                href="/register"
                className="inline-flex items-center justify-center bg-[#202e46] text-white px-8 py-3 rounded-lg text-lg font-medium hover:bg-[#1a2539] transition-all shadow-lg shadow-slate-500/25"
              >
                Start your free trial
                <ArrowRight className="w-5 h-5 ml-2" />
              </Link>
              <Link
                href="#how-it-works"
                className="inline-flex items-center justify-center bg-white text-slate-700 px-8 py-3 rounded-lg text-lg font-medium border border-slate-200 hover:bg-slate-50 transition-colors"
              >
                See how it works
              </Link>
            </div>
            <p className="mt-4 text-sm text-slate-500">
              No credit card required. 14-day free trial.
            </p>
          </div>

          {/* Product Mockup */}
          <div className="max-w-5xl mx-auto">
            <div className="bg-white rounded-2xl shadow-2xl shadow-slate-200/50 border border-slate-200 overflow-hidden">
              <div className="bg-slate-100 px-4 py-3 flex items-center gap-2">
                <div className="flex gap-1.5">
                  <div className="w-3 h-3 rounded-full bg-red-400"></div>
                  <div className="w-3 h-3 rounded-full bg-yellow-400"></div>
                  <div className="w-3 h-3 rounded-full bg-green-400"></div>
                </div>
                <div className="flex-1 text-center">
                  <span className="text-xs text-slate-500">
                    Lexport - Contract Generator
                  </span>
                </div>
              </div>
              <div className="p-8 bg-gradient-to-br from-slate-50 to-white">
                <div className="grid md:grid-cols-2 gap-8">
                  <div className="space-y-4">
                    <div className="bg-white rounded-lg p-4 border border-slate-200">
                      <label className="text-sm font-medium text-slate-700">
                        Contract Type
                      </label>
                      <div className="mt-2 flex items-center justify-between bg-slate-50 rounded-lg px-4 py-3">
                        <span className="text-slate-600">
                          Non-Disclosure Agreement (NDA)
                        </span>
                        <ChevronDown className="w-4 h-4 text-slate-400" />
                      </div>
                    </div>
                    <div className="bg-white rounded-lg p-4 border border-slate-200">
                      <label className="text-sm font-medium text-slate-700">
                        Jurisdiction
                      </label>
                      <div className="mt-2 flex items-center justify-between bg-slate-50 rounded-lg px-4 py-3">
                        <span className="text-slate-600">California, USA</span>
                        <ChevronDown className="w-4 h-4 text-slate-400" />
                      </div>
                    </div>
                    <div className="bg-[#202e46] text-white rounded-lg px-4 py-3 text-center font-medium">
                      Generate with AI
                    </div>
                  </div>
                  <div className="bg-white rounded-lg p-4 border border-slate-200">
                    <div className="flex items-center gap-2 mb-3">
                      <FileText className="w-4 h-4 text-[#202e46]" />
                      <span className="text-sm font-medium text-slate-700">
                        Preview
                      </span>
                    </div>
                    <div className="space-y-2 text-sm text-slate-500">
                      <div className="h-3 bg-slate-100 rounded w-3/4"></div>
                      <div className="h-3 bg-slate-100 rounded w-full"></div>
                      <div className="h-3 bg-slate-100 rounded w-5/6"></div>
                      <div className="h-3 bg-slate-100 rounded w-2/3"></div>
                      <div className="h-3 bg-slate-100 rounded w-full"></div>
                      <div className="h-3 bg-slate-100 rounded w-4/5"></div>
                    </div>
                  </div>
                </div>
              </div>
            </div>
          </div>
        </div>
      </section>

      {/* How It Works Section */}
      <section id="how-it-works" className="py-20 px-4 sm:px-6 lg:px-8 bg-white">
        <div className="max-w-7xl mx-auto">
          <div className="text-center mb-16">
            <div className="inline-flex items-center gap-2 bg-emerald-100 text-emerald-700 px-4 py-1.5 rounded-full text-sm font-medium mb-4">
              Simple workflow
            </div>
            <h2 className="text-3xl sm:text-4xl font-bold text-slate-900 mb-4">
              How it works
            </h2>
            <p className="text-slate-600 max-w-2xl mx-auto">
              Create legally binding contracts in minutes with our streamlined
              4-step process
            </p>
          </div>

          <div className="grid md:grid-cols-4 gap-8">
            {[
              {
                step: "1",
                icon: Sparkles,
                title: "Generate",
                description:
                  "Describe your needs and let AI create a custom contract tailored to your jurisdiction",
                color: "slate",
              },
              {
                step: "2",
                icon: MessageSquare,
                title: "Review",
                description:
                  "Chat with AI to review, understand, and refine any clause in plain English",
                color: "blue",
              },
              {
                step: "3",
                icon: Send,
                title: "Send",
                description:
                  "Send for e-signature with one click. Track status in real-time",
                color: "emerald",
              },
              {
                step: "4",
                icon: Download,
                title: "Download",
                description:
                  "Get your signed contract as PDF. Stored securely in your dashboard",
                color: "amber",
              },
            ].map((item) => (
              <div key={item.step} className="text-center">
                <div
                  className={`w-16 h-16 mx-auto mb-4 rounded-2xl flex items-center justify-center ${item.color === "slate"
                      ? "bg-[#202e46]/10"
                      : item.color === "blue"
                        ? "bg-blue-100"
                        : item.color === "emerald"
                          ? "bg-emerald-100"
                          : "bg-amber-100"
                    }`}
                >
                  <item.icon
                    className={`w-8 h-8 ${item.color === "slate"
                        ? "text-[#202e46]"
                        : item.color === "blue"
                          ? "text-blue-600"
                          : item.color === "emerald"
                            ? "text-emerald-600"
                            : "text-amber-600"
                      }`}
                  />
                </div>
                <div className="text-sm font-medium text-[#202e46] mb-2">
                  Step {item.step}
                </div>
                <h3 className="text-xl font-semibold text-slate-900 mb-2">
                  {item.title}
                </h3>
                <p className="text-slate-600 text-sm">{item.description}</p>
              </div>
            ))}
          </div>
        </div>
      </section>

      {/* Features Section */}
      <section id="features" className="py-20 px-4 sm:px-6 lg:px-8 bg-slate-50">
        <div className="max-w-7xl mx-auto">
          <div className="text-center mb-16">
            <div className="inline-flex items-center gap-2 bg-[#202e46]/10 text-[#202e46] px-4 py-1.5 rounded-full text-sm font-medium mb-4">
              Powerful features
            </div>
            <h2 className="text-3xl sm:text-4xl font-bold text-slate-900 mb-4">
              Everything you need for legal documents
            </h2>
            <p className="text-slate-600 max-w-2xl mx-auto">
              From creation to signature, Lexport handles the entire contract
              lifecycle
            </p>
          </div>

          <div className="grid md:grid-cols-3 gap-6">
            {[
              {
                icon: Zap,
                title: "AI Contract Generation",
                description:
                  "Generate jurisdiction-specific contracts in seconds. Supports CA, TX, NY, and UK law.",
                color: "slate",
              },
              {
                icon: MessageSquare,
                title: "AI Legal Chat",
                description:
                  "Chat with AI to modify clauses, ask questions, and understand complex legal terms.",
                color: "blue",
              },
              {
                icon: FileText,
                title: "E-Signatures",
                description:
                  "Legally binding e-signatures compliant with ESIGN, UETA, and UK eIDAS regulations.",
                color: "emerald",
              },
              {
                icon: Shield,
                title: "Legally Compliant",
                description:
                  "Templates reviewed by legal professionals. Updated for latest regulations.",
                color: "amber",
              },
              {
                icon: Clock,
                title: "Real-time Tracking",
                description:
                  "Track signature status, get notifications, and see who has signed.",
                color: "rose",
              },
              {
                icon: Users,
                title: "Team Collaboration",
                description:
                  "Invite team members, set permissions, and collaborate on contracts.",
                color: "cyan",
              },
            ].map((feature, index) => (
              <div
                key={index}
                className="bg-white rounded-2xl p-6 border border-slate-200 hover:shadow-lg hover:border-slate-300 transition-all"
              >
                <div
                  className={`w-12 h-12 rounded-xl flex items-center justify-center mb-4 ${feature.color === "slate"
                      ? "bg-[#202e46]/10"
                      : feature.color === "blue"
                        ? "bg-blue-100"
                        : feature.color === "emerald"
                          ? "bg-emerald-100"
                          : feature.color === "amber"
                            ? "bg-amber-100"
                            : feature.color === "rose"
                              ? "bg-rose-100"
                              : "bg-cyan-100"
                    }`}
                >
                  <feature.icon
                    className={`w-6 h-6 ${feature.color === "slate"
                        ? "text-[#202e46]"
                        : feature.color === "blue"
                          ? "text-blue-600"
                          : feature.color === "emerald"
                            ? "text-emerald-600"
                            : feature.color === "amber"
                              ? "text-amber-600"
                              : feature.color === "rose"
                                ? "text-rose-600"
                                : "text-cyan-600"
                      }`}
                  />
                </div>
                <h3 className="text-lg font-semibold text-slate-900 mb-2">
                  {feature.title}
                </h3>
                <p className="text-slate-600 text-sm">{feature.description}</p>
              </div>
            ))}
          </div>
        </div>
      </section>

      {/* Testimonials Section */}
      <section className="py-20 px-4 sm:px-6 lg:px-8 bg-white">
        <div className="max-w-7xl mx-auto">
          <div className="text-center mb-12">
            <p className="text-slate-600 mb-4">
              Join thousands of legal professionals who have transformed their
              workflow
            </p>
            <div className="flex items-center justify-center gap-2">
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
            </div>
          </div>

          <div className="grid md:grid-cols-3 gap-6">
            {[
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
            ].map((testimonial, index) => (
              <div
                key={index}
                className="bg-white rounded-2xl p-6 border border-slate-200"
              >
                <div className="text-[#202e46] mb-4">
                  <svg
                    className="w-8 h-8"
                    fill="currentColor"
                    viewBox="0 0 24 24"
                  >
                    <path d="M14.017 21v-7.391c0-5.704 3.731-9.57 8.983-10.609l.995 2.151c-2.432.917-3.995 3.638-3.995 5.849h4v10h-9.983zm-14.017 0v-7.391c0-5.704 3.748-9.57 9-10.609l.996 2.151c-2.433.917-3.996 3.638-3.996 5.849h3.983v10h-9.983z" />
                  </svg>
                </div>
                <div className="flex mb-3">
                  {[1, 2, 3, 4, 5].map((i) => (
                    <Star
                      key={i}
                      className="w-4 h-4 text-yellow-400 fill-yellow-400"
                    />
                  ))}
                </div>
                <p className="text-slate-700 mb-4">&ldquo;{testimonial.quote}&rdquo;</p>
                <div
                  className={`inline-block px-3 py-1 rounded-full text-sm font-medium mb-4 ${testimonial.color === "slate"
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
                    className={`w-10 h-10 rounded-full flex items-center justify-center text-white font-medium ${testimonial.color === "slate"
                        ? "bg-[#202e46]"
                        : testimonial.color === "blue"
                          ? "bg-blue-600"
                          : "bg-emerald-600"
                      }`}
                  >
                    {testimonial.initials}
                  </div>
                  <div>
                    <p className="font-medium text-slate-900">
                      {testimonial.name}
                    </p>
                    <p className="text-sm text-slate-500">
                      {testimonial.role}, {testimonial.company}
                    </p>
                  </div>
                </div>
              </div>
            ))}
          </div>
        </div>
      </section>

      {/* Pricing Section */}
      <section id="pricing" className="py-20 px-4 sm:px-6 lg:px-8 bg-slate-50">
        <div className="max-w-5xl mx-auto">
          <div className="text-center mb-12">
            <div className="inline-flex items-center gap-2 bg-[#202e46]/10 text-[#202e46] px-4 py-1.5 rounded-full text-sm font-medium mb-4">
              <Sparkles className="w-4 h-4" />
              Simple, transparent pricing
            </div>
            <h2 className="text-3xl sm:text-4xl font-bold text-slate-900 mb-4">
              Choose your plan
            </h2>
            <p className="text-slate-600 max-w-2xl mx-auto">
              Start with a 14-day free trial. No credit card required.
              Experience the complete end-to-end legal workflow platform.
            </p>
          </div>

          <div className="grid md:grid-cols-2 gap-8">
            {/* Professional Plan */}
            <div className="bg-white rounded-2xl border-2 border-[#202e46] overflow-hidden shadow-xl">
              <div className="bg-[#202e46] text-white text-center py-2 text-sm font-medium">
                <span className="mr-2">✨</span> Most Popular
              </div>
              <div className="p-8">
                <h3 className="text-2xl font-bold text-slate-900">
                  Professional
                </h3>
                <p className="text-slate-600 mt-1">
                  Perfect for growing legal teams
                </p>
                <div className="mt-6">
                  <span className="text-5xl font-bold text-slate-900">$79</span>
                  <span className="text-slate-600">/month</span>
                  <p className="text-sm text-slate-500 mt-1">per user/month</p>
                </div>
                <Link
                  href="/register"
                  className="mt-6 w-full inline-flex items-center justify-center bg-[#202e46] text-white px-6 py-3 rounded-lg font-medium hover:bg-[#1a2539] transition-all"
                >
                  Start free trial
                  <ArrowRight className="w-4 h-4 ml-2" />
                </Link>
                <div className="mt-8">
                  <p className="font-medium text-slate-900 mb-4">
                    Everything included:
                  </p>
                  <ul className="space-y-3">
                    {[
                      "Unlimited AI contract generation",
                      "Smart contract review & analysis",
                      "AI legal assistant chat",
                      "Seamless e-signature workflows",
                      "Advanced analytics & insights",
                    ].map((feature, i) => (
                      <li key={i} className="flex items-center gap-3">
                        <Check className="w-5 h-5 text-emerald-500 flex-shrink-0" />
                        <span className="text-slate-600">{feature}</span>
                      </li>
                    ))}
                  </ul>
                </div>
              </div>
            </div>

            {/* Enterprise Plan */}
            <div className="bg-white rounded-2xl border border-slate-200 overflow-hidden">
              <div className="p-8 pt-12">
                <h3 className="text-2xl font-bold text-slate-900">Enterprise</h3>
                <p className="text-slate-600 mt-1">For large organizations</p>
                <div className="mt-6">
                  <span className="text-5xl font-bold text-slate-900">
                    Custom
                  </span>
                </div>
                <Link
                  href="/contact"
                  className="mt-6 w-full inline-flex items-center justify-center bg-slate-900 text-white px-6 py-3 rounded-lg font-medium hover:bg-slate-800 transition-colors"
                >
                  Contact sales
                </Link>
                <div className="mt-8">
                  <p className="font-medium text-slate-900 mb-4">
                    Everything included:
                  </p>
                  <ul className="space-y-3">
                    {[
                      "Everything in Professional",
                      "Single Sign-On (SSO)",
                      "Advanced security controls",
                      "Custom integrations",
                      "Dedicated account manager",
                      "SLA guarantees",
                      "Custom AI model training",
                    ].map((feature, i) => (
                      <li key={i} className="flex items-center gap-3">
                        <Check className="w-5 h-5 text-emerald-500 flex-shrink-0" />
                        <span className="text-slate-600">{feature}</span>
                      </li>
                    ))}
                  </ul>
                </div>
              </div>
            </div>
          </div>
        </div>
      </section>

      {/* FAQ Section */}
      <section className="py-20 px-4 sm:px-6 lg:px-8 bg-white">
        <div className="max-w-3xl mx-auto">
          <div className="text-center mb-12">
            <h2 className="text-3xl sm:text-4xl font-bold text-slate-900 mb-4">
              Questions? We have answers.
            </h2>
            <p className="text-slate-600">
              Everything you need to know about our end-to-end legal platform
            </p>
          </div>

          <div className="space-y-4">
            {[
              {
                question: "How does the end-to-end workflow actually work?",
                answer:
                  "It's simple: Generate contracts with AI in 2 minutes, get instant AI review and risk analysis, chat with AI to make any changes, then send for e-signatures. Everything happens in one platform with no context switching or manual handoffs.",
              },
              {
                question: "How accurate is the AI contract generation?",
                answer:
                  "Our AI is trained on thousands of legal templates and continuously updated with the latest regulations. All templates are reviewed by licensed attorneys and comply with CA, TX, NY, and UK law.",
              },
              {
                question: "Can I really chat with AI to modify contracts?",
                answer:
                  "Yes! Our AI legal assistant understands contract language and can make changes based on plain English instructions. Ask it to modify clauses, explain terms, or suggest improvements.",
              },
              {
                question: "What contract types are supported?",
                answer:
                  "We support NDAs (mutual and one-way), Independent Contractor Agreements, Consulting Agreements, SAFE Notes, Freelance Service Agreements, IP Assignments, Advisor Agreements, and more.",
              },
              {
                question: "Is my data secure?",
                answer:
                  "Absolutely. We use bank-level encryption (AES-256), SOC 2 compliant infrastructure, and never train our AI on your documents. Your contracts remain private and confidential.",
              },
            ].map((faq, index) => (
              <details
                key={index}
                className="group bg-white rounded-xl border border-slate-200 overflow-hidden"
              >
                <summary className="flex items-center justify-between p-6 cursor-pointer list-none">
                  <span className="font-medium text-slate-900">
                    {faq.question}
                  </span>
                  <ChevronDown className="w-5 h-5 text-slate-400 group-open:rotate-180 transition-transform" />
                </summary>
                <div className="px-6 pb-6 text-slate-600">{faq.answer}</div>
              </details>
            ))}
          </div>
        </div>
      </section>

      {/* CTA Section */}
      <section className="py-20 px-4 sm:px-6 lg:px-8">
        <div className="max-w-5xl mx-auto">
          <div className="bg-slate-900 rounded-3xl p-12 text-center relative overflow-hidden">
            {/* Decorative elements */}
            <div className="absolute top-8 left-8 text-slate-700">
              <Sparkles className="w-12 h-12" />
            </div>
            <div className="absolute bottom-8 right-8 text-slate-700">
              <div className="w-16 h-16 border-4 border-slate-700 rounded-full"></div>
            </div>

            <h2 className="text-3xl sm:text-4xl font-bold text-white mb-4 relative z-10">
              Ready to experience{" "}
              <span className="text-slate-300">Lexport</span>?
            </h2>
            <p className="text-slate-400 mb-8 max-w-2xl mx-auto relative z-10">
              Join thousands of legal professionals who trust Lexport for their
              contract workflows. Start your free trial today - no credit card
              required.
            </p>
            <div className="flex flex-col sm:flex-row gap-4 justify-center relative z-10">
              <Link
                href="/register"
                className="inline-flex items-center justify-center bg-white text-slate-900 px-8 py-3 rounded-lg text-lg font-medium hover:bg-slate-100 transition-colors"
              >
                Start your free trial
                <ArrowRight className="w-5 h-5 ml-2" />
              </Link>
              <Link
                href="/contact"
                className="inline-flex items-center justify-center border border-slate-600 text-white px-8 py-3 rounded-lg text-lg font-medium hover:bg-slate-800 transition-colors"
              >
                Schedule a demo
              </Link>
            </div>
          </div>
        </div>
      </section>

      {/* Footer */}
      <footer className="py-12 px-4 sm:px-6 lg:px-8 bg-slate-50 border-t border-slate-200">
        <div className="max-w-7xl mx-auto">
          <div className="grid md:grid-cols-4 gap-8 mb-8">
            {/* Brand */}
            <div>
              <div className="flex items-center mb-4">
                <Image
                  src="/dark-logo.png"
                  alt="Lexport"
                  width={160}
                  height={48}
                  className="h-11 w-auto"
                />
              </div>
              <p className="text-slate-600 text-sm mb-4">
                Revolutionizing legal workflows with AI-powered contract
                generation and e-signatures.
              </p>
              <p className="text-slate-500 text-sm">
                &copy; {new Date().getFullYear()} Lexport. All rights reserved.
              </p>
            </div>

            {/* Product */}
            <div>
              <h4 className="font-semibold text-slate-900 mb-4">Product</h4>
              <ul className="space-y-2">
                {["Features", "Pricing", "Templates", "Integrations"].map(
                  (item) => (
                    <li key={item}>
                      <a
                        href="#"
                        className="text-slate-600 hover:text-[#202e46] text-sm transition-colors"
                      >
                        {item}
                      </a>
                    </li>
                  )
                )}
              </ul>
            </div>

            {/* Resources */}
            <div>
              <h4 className="font-semibold text-slate-900 mb-4">Resources</h4>
              <ul className="space-y-2">
                {[
                  "Documentation",
                  "Legal Templates",
                  "Help Center",
                  "Blog",
                ].map((item) => (
                  <li key={item}>
                    <a
                      href="#"
                      className="text-slate-600 hover:text-[#202e46] text-sm transition-colors"
                    >
                      {item}
                    </a>
                  </li>
                ))}
              </ul>
            </div>

            {/* Company */}
            <div>
              <h4 className="font-semibold text-slate-900 mb-4">Company</h4>
              <ul className="space-y-2">
                <li>
                  <a href="#" className="text-slate-600 hover:text-[#202e46] text-sm transition-colors">
                    About
                  </a>
                </li>
                <li>
                  <a href="#" className="text-slate-600 hover:text-[#202e46] text-sm transition-colors">
                    Careers
                  </a>
                </li>
                <li>
                  <Link href="/privacy" className="text-slate-600 hover:text-[#202e46] text-sm transition-colors">
                    Privacy Policy
                  </Link>
                </li>
                <li>
                  <a href="#" className="text-slate-600 hover:text-[#202e46] text-sm transition-colors">
                    Terms of Service
                  </a>
                </li>
              </ul>
            </div>
          </div>
        </div>
      </footer>
    </div>
  );
}
