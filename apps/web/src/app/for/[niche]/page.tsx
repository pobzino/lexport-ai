import type { Metadata } from "next";
import { notFound } from "next/navigation";
import Link from "next/link";
import { Navbar } from "@/components/home/Navbar";
import { Footer } from "@/components/home/Footer";
import { CTA } from "@/components/home/CTA";
import {
  ArrowRight,
  CheckCircle2,
  FileText,
  Workflow,
  Cpu,
  Megaphone,
  LayoutTemplate,
  Palette,
  Code2,
  PenLine,
  Lightbulb,
  Camera,
  type LucideIcon,
} from "lucide-react";
import { getNiche, getAllNicheSlugs } from "@/lib/personas/niches";

export const revalidate = 3600;
export const dynamicParams = false;

interface Props {
  params: Promise<{ niche: string }>;
}

export function generateStaticParams() {
  return getAllNicheSlugs();
}

export async function generateMetadata({ params }: Props): Promise<Metadata> {
  const { niche: slug } = await params;
  const niche = getNiche(slug);
  if (!niche) return { title: "Not Found" };
  return {
    title: niche.metaTitle,
    description: niche.metaDescription,
    alternates: { canonical: `/for/${niche.slug}` },
    openGraph: {
      title: niche.metaTitle,
      description: niche.metaDescription,
      url: `https://lexportai.com/for/${niche.slug}`,
    },
  };
}

const ICONS: Record<string, LucideIcon> = {
  Workflow,
  Cpu,
  Megaphone,
  LayoutTemplate,
  Palette,
  Code2,
  PenLine,
  Lightbulb,
  Camera,
};

const ACCENT: Record<
  string,
  {
    text: string;
    btn: string;
    btnShadow: string;
    badge: string;
    glow: string;
    iconText: string;
    cardHover: string;
  }
> = {
  orange: {
    text: "text-orange-500",
    btn: "bg-orange-500 hover:bg-orange-600",
    btnShadow: "shadow-orange-500/20",
    badge: "bg-orange-50 text-orange-700",
    glow: "from-orange-100/40 via-amber-100/30 to-[#529ec6]/20",
    iconText: "text-orange-500",
    cardHover: "hover:border-orange-100",
  },
  blue: {
    text: "text-[#529ec6]",
    btn: "bg-[#529ec6] hover:bg-[#3f8bb3]",
    btnShadow: "shadow-[#529ec6]/20",
    badge: "bg-sky-50 text-sky-700",
    glow: "from-sky-100/40 via-cyan-100/30 to-[#529ec6]/20",
    iconText: "text-[#529ec6]",
    cardHover: "hover:border-sky-100",
  },
  violet: {
    text: "text-violet-500",
    btn: "bg-violet-500 hover:bg-violet-600",
    btnShadow: "shadow-violet-500/20",
    badge: "bg-violet-50 text-violet-700",
    glow: "from-violet-100/40 via-purple-100/30 to-[#529ec6]/20",
    iconText: "text-violet-500",
    cardHover: "hover:border-violet-100",
  },
  emerald: {
    text: "text-emerald-500",
    btn: "bg-emerald-500 hover:bg-emerald-600",
    btnShadow: "shadow-emerald-500/20",
    badge: "bg-emerald-50 text-emerald-700",
    glow: "from-emerald-100/40 via-teal-100/30 to-[#529ec6]/20",
    iconText: "text-emerald-500",
    cardHover: "hover:border-emerald-100",
  },
};

export default async function NichePage({ params }: Props) {
  const { niche: slug } = await params;
  const niche = getNiche(slug);
  if (!niche) notFound();

  const a = ACCENT[niche.accent];
  const Icon = ICONS[niche.icon] ?? FileText;

  return (
    <div className="min-h-screen bg-white">
      <Navbar />

      <main>
        {/* Hero */}
        <section className="relative pt-32 pb-20 overflow-hidden bg-grid">
          <div className="absolute inset-0 z-0 pointer-events-none">
            <div
              className={`absolute top-1/3 left-1/2 -translate-x-1/2 -translate-y-1/2 w-[900px] h-[600px] bg-gradient-to-r ${a.glow} rounded-full blur-3xl opacity-60`}
            />
          </div>

          <div className="relative z-10 max-w-5xl mx-auto px-4 sm:px-6 lg:px-8 text-center">
            <div
              className={`inline-flex items-center gap-2 ${a.badge} px-4 py-1.5 rounded-full text-sm font-medium mb-8`}
            >
              <Icon className="w-4 h-4" />
              {niche.badge}
            </div>

            <h1 className="text-5xl sm:text-6xl lg:text-7xl font-extrabold tracking-tight text-slate-900 mb-6">
              {niche.h1a}
              <span className={`block ${a.text}`}>{niche.h1b}</span>
            </h1>

            <p className="text-lg sm:text-xl text-slate-500 mb-10 max-w-2xl mx-auto leading-relaxed">
              {niche.subhead}
            </p>

            <div className="flex flex-col sm:flex-row gap-3 justify-center">
              <Link
                href="/register"
                className={`inline-flex items-center justify-center ${a.btn} text-white px-8 py-4 rounded-xl text-base font-semibold transition-all hover:scale-[1.02] shadow-lg ${a.btnShadow}`}
              >
                Start free — no credit card
                <ArrowRight className="w-4 h-4 ml-2" />
              </Link>
            </div>
          </div>
        </section>

        {/* Problem / Solution */}
        <section className="py-20 bg-slate-50">
          <div className="max-w-5xl mx-auto px-4 sm:px-6 lg:px-8">
            <div className="text-center mb-12">
              <h2 className="text-3xl sm:text-4xl font-bold text-slate-900">
                {niche.problemsHeading}
              </h2>
            </div>
            <div className="grid md:grid-cols-2 gap-6">
              {niche.problems.map((item, i) => (
                <div
                  key={i}
                  className="bg-white rounded-2xl p-6 shadow-sm border border-slate-100"
                >
                  <p className="text-slate-500 line-through">{item.problem}</p>
                  <div className="flex items-center gap-2 mt-2">
                    <CheckCircle2 className="w-5 h-5 text-emerald-500 flex-shrink-0" />
                    <p className="font-semibold text-slate-900">{item.solution}</p>
                  </div>
                </div>
              ))}
            </div>
          </div>
        </section>

        {/* Contracts built for this niche — wired to the real template pages */}
        <section className="py-24">
          <div className="max-w-5xl mx-auto px-4 sm:px-6 lg:px-8">
            <div className="text-center mb-12">
              <h2 className="text-3xl sm:text-4xl font-bold text-slate-900 mb-4">
                The contracts {niche.badge.replace(/^For /, "").toLowerCase()} actually need
              </h2>
              <p className="text-slate-500 max-w-2xl mx-auto">
                Generate a legally binding contract, get it e-signed, and collect
                payment — in one flow.
              </p>
            </div>
            <div className="grid sm:grid-cols-2 lg:grid-cols-3 gap-6">
              {niche.contracts.map((c) => (
                <Link
                  key={c.slug}
                  href={`/templates/${c.slug}`}
                  className={`group block p-6 bg-white rounded-2xl border border-slate-100 hover:shadow-lg ${a.cardHover} transition-all`}
                >
                  <FileText className={`w-8 h-8 ${a.iconText} mb-4`} />
                  <h3 className="font-semibold text-slate-900 mb-2">{c.label}</h3>
                  <p className="text-sm text-slate-500 mb-4">{c.why}</p>
                  <span
                    className={`inline-flex items-center text-sm font-medium ${a.text}`}
                  >
                    Use this template
                    <ArrowRight className="w-4 h-4 ml-1 group-hover:translate-x-0.5 transition-transform" />
                  </span>
                </Link>
              ))}
            </div>
          </div>
        </section>

        {/* Use cases */}
        <section className="py-20 bg-gradient-to-b from-slate-50 to-white">
          <div className="max-w-5xl mx-auto px-4 sm:px-6 lg:px-8">
            <div className="grid sm:grid-cols-2 lg:grid-cols-4 gap-6">
              {niche.useCases.map((u, i) => (
                <div
                  key={i}
                  className="p-6 bg-white rounded-xl border border-slate-100 text-center"
                >
                  <h3 className="font-semibold text-slate-900 mb-2">{u.title}</h3>
                  <p className="text-sm text-slate-500">{u.description}</p>
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
