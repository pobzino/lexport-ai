"use client";

import Link from "next/link";
import Image from "next/image";
import {
  Shield,
  Zap,
  Globe,
  FileText,
  CheckCircle,
  ArrowRight,
  Users,
  Lock,
  Scale,
} from "lucide-react";

export default function AboutPage() {
  return (
    <div className="min-h-screen bg-gradient-to-br from-slate-50 to-white">
      {/* Header */}
      <div className="border-b border-slate-200 bg-white/80 backdrop-blur-sm sticky top-0 z-50">
        <div className="max-w-6xl mx-auto px-4 py-4 flex items-center justify-between">
          <Link href="/" className="flex items-center gap-2">
            <Image
              src="/dark-logo.png"
              alt="Lexport"
              width={120}
              height={36}
              className="h-9 w-auto"
            />
          </Link>
          <div className="flex items-center gap-4">
            <Link
              href="/login"
              className="text-slate-600 hover:text-slate-900 font-medium"
            >
              Sign In
            </Link>
            <Link
              href="/register"
              className="px-4 py-2 bg-[#202e46] text-white rounded-lg hover:bg-[#1a2539] transition-colors"
            >
              Get Started
            </Link>
          </div>
        </div>
      </div>

      {/* Hero Section */}
      <div className="max-w-6xl mx-auto px-4 py-20">
        <div className="text-center mb-16">
          <h1 className="text-4xl md:text-5xl font-bold text-slate-900 mb-6">
            Legal contracts made simple for{" "}
            <span className="text-[#529ec6]">modern businesses</span>
          </h1>
          <p className="text-xl text-slate-600 max-w-3xl mx-auto">
            Lexport helps founders, freelancers, and businesses create
            professional legal contracts in minutes, not hours. Powered by AI,
            backed by legal expertise.
          </p>
        </div>

        {/* Mission */}
        <div className="bg-white rounded-2xl border border-slate-200 p-8 md:p-12 mb-16">
          <h2 className="text-2xl font-bold text-slate-900 mb-4">Our Mission</h2>
          <p className="text-lg text-slate-600 leading-relaxed">
            We believe that professional legal contracts shouldn&apos;t require
            expensive lawyers or complex legal knowledge. Lexport democratizes
            access to legally sound contracts, enabling anyone to protect their
            business relationships with confidence.
          </p>
        </div>

        {/* Features Grid */}
        <div className="grid md:grid-cols-3 gap-8 mb-16">
          <div className="bg-white rounded-xl border border-slate-200 p-6">
            <div className="w-12 h-12 bg-[#529ec6]/10 rounded-lg flex items-center justify-center mb-4">
              <Zap className="w-6 h-6 text-[#529ec6]" />
            </div>
            <h3 className="text-lg font-semibold text-slate-900 mb-2">
              AI-Powered Generation
            </h3>
            <p className="text-slate-600">
              Create customized contracts in minutes using our advanced AI that
              understands your specific needs and jurisdiction requirements.
            </p>
          </div>

          <div className="bg-white rounded-xl border border-slate-200 p-6">
            <div className="w-12 h-12 bg-[#529ec6]/10 rounded-lg flex items-center justify-center mb-4">
              <Shield className="w-6 h-6 text-[#529ec6]" />
            </div>
            <h3 className="text-lg font-semibold text-slate-900 mb-2">
              Legally Sound Templates
            </h3>
            <p className="text-slate-600">
              Our templates are crafted with legal expertise, ensuring your
              contracts meet professional standards and regulatory requirements.
            </p>
          </div>

          <div className="bg-white rounded-xl border border-slate-200 p-6">
            <div className="w-12 h-12 bg-[#529ec6]/10 rounded-lg flex items-center justify-center mb-4">
              <Globe className="w-6 h-6 text-[#529ec6]" />
            </div>
            <h3 className="text-lg font-semibold text-slate-900 mb-2">
              Multi-Jurisdiction Support
            </h3>
            <p className="text-slate-600">
              Create contracts compliant with laws in California, New York,
              Texas, and the United Kingdom, with more jurisdictions coming soon.
            </p>
          </div>
        </div>

        {/* What We Offer */}
        <div className="mb-16">
          <h2 className="text-2xl font-bold text-slate-900 mb-8 text-center">
            What We Offer
          </h2>
          <div className="grid md:grid-cols-2 gap-6">
            <div className="flex items-start gap-4 bg-white rounded-xl border border-slate-200 p-6">
              <div className="w-10 h-10 bg-emerald-100 rounded-lg flex items-center justify-center flex-shrink-0">
                <FileText className="w-5 h-5 text-emerald-600" />
              </div>
              <div>
                <h3 className="font-semibold text-slate-900 mb-1">
                  Contract Generation
                </h3>
                <p className="text-slate-600 text-sm">
                  NDAs, Consulting Agreements, Freelance Contracts, SAFE Notes,
                  Independent Contractor Agreements, and more.
                </p>
              </div>
            </div>

            <div className="flex items-start gap-4 bg-white rounded-xl border border-slate-200 p-6">
              <div className="w-10 h-10 bg-blue-100 rounded-lg flex items-center justify-center flex-shrink-0">
                <CheckCircle className="w-5 h-5 text-blue-600" />
              </div>
              <div>
                <h3 className="font-semibold text-slate-900 mb-1">
                  E-Signatures
                </h3>
                <p className="text-slate-600 text-sm">
                  Collect legally binding signatures from anywhere in the world.
                  Track signing progress and send automatic reminders.
                </p>
              </div>
            </div>

            <div className="flex items-start gap-4 bg-white rounded-xl border border-slate-200 p-6">
              <div className="w-10 h-10 bg-purple-100 rounded-lg flex items-center justify-center flex-shrink-0">
                <Scale className="w-5 h-5 text-purple-600" />
              </div>
              <div>
                <h3 className="font-semibold text-slate-900 mb-1">
                  Risk Analysis
                </h3>
                <p className="text-slate-600 text-sm">
                  AI-powered analysis identifies potential issues, unusual
                  clauses, and missing protections in your contracts.
                </p>
              </div>
            </div>

            <div className="flex items-start gap-4 bg-white rounded-xl border border-slate-200 p-6">
              <div className="w-10 h-10 bg-amber-100 rounded-lg flex items-center justify-center flex-shrink-0">
                <Lock className="w-5 h-5 text-amber-600" />
              </div>
              <div>
                <h3 className="font-semibold text-slate-900 mb-1">
                  Secure Payments
                </h3>
                <p className="text-slate-600 text-sm">
                  Collect payments alongside signatures. Integrated with Stripe
                  for secure, hassle-free transactions.
                </p>
              </div>
            </div>
          </div>
        </div>

        {/* Who We Serve */}
        <div className="bg-slate-50 rounded-2xl border border-slate-200 p-8 md:p-12 mb-16">
          <h2 className="text-2xl font-bold text-slate-900 mb-6 text-center">
            Who We Serve
          </h2>
          <div className="grid md:grid-cols-3 gap-8">
            <div className="text-center">
              <div className="w-16 h-16 bg-[#529ec6]/10 rounded-full flex items-center justify-center mx-auto mb-4">
                <Users className="w-8 h-8 text-[#529ec6]" />
              </div>
              <h3 className="font-semibold text-slate-900 mb-2">
                Startup Founders
              </h3>
              <p className="text-slate-600 text-sm">
                Protect your startup with advisor agreements, SAFE notes, and
                contractor agreements.
              </p>
            </div>

            <div className="text-center">
              <div className="w-16 h-16 bg-[#529ec6]/10 rounded-full flex items-center justify-center mx-auto mb-4">
                <FileText className="w-8 h-8 text-[#529ec6]" />
              </div>
              <h3 className="font-semibold text-slate-900 mb-2">Freelancers</h3>
              <p className="text-slate-600 text-sm">
                Secure your client relationships with professional service
                agreements and NDAs.
              </p>
            </div>

            <div className="text-center">
              <div className="w-16 h-16 bg-[#529ec6]/10 rounded-full flex items-center justify-center mx-auto mb-4">
                <Shield className="w-8 h-8 text-[#529ec6]" />
              </div>
              <h3 className="font-semibold text-slate-900 mb-2">
                Small Businesses
              </h3>
              <p className="text-slate-600 text-sm">
                Manage all your contracts from employment offers to vendor
                agreements.
              </p>
            </div>
          </div>
        </div>

        {/* CTA */}
        <div className="text-center">
          <h2 className="text-2xl font-bold text-slate-900 mb-4">
            Ready to get started?
          </h2>
          <p className="text-slate-600 mb-8 max-w-xl mx-auto">
            Create your first contract in minutes. No credit card required.
          </p>
          <Link
            href="/register"
            className="inline-flex items-center gap-2 px-8 py-4 bg-[#202e46] text-white rounded-lg hover:bg-[#1a2539] transition-colors text-lg font-medium"
          >
            Get Started Free
            <ArrowRight className="w-5 h-5" />
          </Link>
        </div>
      </div>

      {/* Footer */}
      <div className="border-t border-slate-200 bg-white mt-16">
        <div className="max-w-6xl mx-auto px-4 py-8">
          <div className="flex flex-col sm:flex-row items-center justify-between gap-4">
            <p className="text-sm text-slate-500">
              &copy; {new Date().getFullYear()} Lexport. All rights reserved.
            </p>
            <div className="flex items-center gap-6">
              <Link
                href="/privacy"
                className="text-sm text-slate-500 hover:text-slate-900"
              >
                Privacy Policy
              </Link>
              <Link
                href="/terms"
                className="text-sm text-slate-500 hover:text-slate-900"
              >
                Terms of Service
              </Link>
              <Link
                href="/contact"
                className="text-sm text-slate-500 hover:text-slate-900"
              >
                Contact
              </Link>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}
