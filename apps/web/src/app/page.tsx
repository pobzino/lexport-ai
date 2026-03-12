import type { Metadata } from "next";
import { Navbar } from "@/components/home/Navbar";
import { Hero } from "@/components/home/Hero";
import { Features } from "@/components/home/Features";
import { HowItWorks } from "@/components/home/HowItWorks";
import { AIFeatures } from "@/components/home/AIFeatures";
import { GetPaid } from "@/components/home/GetPaid";
import { Pricing } from "@/components/home/Pricing";
import { FAQ } from "@/components/home/FAQ";
import { CTA } from "@/components/home/CTA";
import { Footer } from "@/components/home/Footer";

export const metadata: Metadata = {
  title: "Lexport - AI-Powered Legal Contracts, E-Signatures & Payments",
  description:
    "Generate legally binding contracts with AI in minutes. Built-in e-signatures, payment collection, and contract management for founders, freelancers, and small businesses.",
  openGraph: {
    title: "Lexport - AI-Powered Legal Contracts, E-Signatures & Payments",
    description:
      "Generate legally binding contracts with AI in minutes. Built-in e-signatures, payment collection, and contract management.",
    url: "https://lexportai.com",
  },
  twitter: {
    title: "Lexport - AI-Powered Legal Contracts, E-Signatures & Payments",
    description:
      "Generate legally binding contracts with AI in minutes. Built-in e-signatures, payment collection, and contract management.",
  },
  alternates: {
    canonical: "https://lexportai.com",
  },
};

export default function HomePage() {
  return (
    <div className="min-h-screen bg-white">
      <Navbar />
      <main>
        <Hero />
        <HowItWorks />
        <AIFeatures />
        <GetPaid />
        <Features />
        <Pricing />
        <FAQ />
        <CTA />
      </main>
      <Footer />
    </div>
  );
}
