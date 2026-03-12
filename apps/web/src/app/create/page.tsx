"use client";

import { useState, useEffect, Suspense } from "react";
import { useSearchParams } from "next/navigation";
import Link from "next/link";
import Image from "next/image";
import {
  ArrowRight,
  ArrowLeft,
  Loader2,
  Sparkles,
  Shield,
  Briefcase,
  Users,
  TrendingUp,
  Edit,
  FileCheck,
  UserCheck,
  ClipboardList,
  FileText,
  ShoppingCart,
  CheckCircle2,
  X,
} from "lucide-react";

// --- Types ---

interface IntakeAnalysis {
  suggestedType: string;
  confidence: number;
  contractTypeName: string;
  contractTypeDescription: string;
  contractTypeIcon: string;
  jurisdiction: string | null;
  jurisdictionName: string | null;
  availableJurisdictions: { id: string; name: string }[];
  extractedFields: Record<string, string | number | boolean>;
  followUpQuestions: {
    field: string;
    question: string;
    type: "text" | "select" | "number" | "date";
    options?: string[];
    required: boolean;
  }[];
  reasoning: string;
  previewSnippet?: {
    title: string;
    preamble: string;
    recitals: string;
  };
}

// Icon mapping — matches contracts/new
const CONTRACT_ICONS: Record<string, typeof Shield> = {
  shield: Shield,
  briefcase: Briefcase,
  users: Users,
  "trending-up": TrendingUp,
  edit: Edit,
  "file-check": FileCheck,
  "user-check": UserCheck,
  "clipboard-list": ClipboardList,
  "file-text": FileText,
  "shopping-cart": ShoppingCart,
};

function formatFieldLabel(key: string): string {
  return key
    .replace(/([A-Z])/g, " $1")
    .replace(/^./, (str) => str.toUpperCase())
    .replace(/([a-z])([A-Z])/g, "$1 $2");
}

// --- Steps ---

const STEPS = [
  { id: 1, label: "Describe" },
  { id: 2, label: "Result" },
];

function CreatePageContent() {
  const searchParams = useSearchParams();
  const initialPrompt = searchParams.get("prompt") || "";
  const initialMode = searchParams.get("mode") || "create";
  const isCreateMode = initialMode === "create";

  // Smart intake state
  const [description, setDescription] = useState(initialPrompt);
  const [isAnalyzing, setIsAnalyzing] = useState(false);
  const [analysis, setAnalysis] = useState<IntakeAnalysis | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [jurisdiction, setJurisdiction] = useState<string>("us_california");

  // Step: 1=describe, 2=analysis+signup
  const [step, setStep] = useState(1);

  // Auto-analyze if arriving from HeroCTA with a prompt
  useEffect(() => {
    if (initialPrompt && isCreateMode && !analysis && !isAnalyzing) {
      handleAnalyze();
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  const handleAnalyze = async () => {
    if (!description.trim() || description.length < 10) {
      setError("Please describe what you need in more detail (at least 10 characters)");
      return;
    }

    setIsAnalyzing(true);
    setError(null);

    try {
      const res = await fetch("/api/contracts/intake/preview", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ description: description.trim() }),
      });

      const data = await res.json();

      if (!res.ok) {
        throw new Error(data.error || "Failed to analyze your request");
      }

      setAnalysis(data.analysis);

      if (data.analysis.jurisdiction) {
        setJurisdiction(data.analysis.jurisdiction);
      }

      setStep(2);
    } catch (err) {
      setError(err instanceof Error ? err.message : "An error occurred");
    } finally {
      setIsAnalyzing(false);
    }
  };

  const handleResetAnalysis = () => {
    setAnalysis(null);
    setError(null);
    setStep(1);
  };

  // Build the register URL with context
  const registerUrl = `/register?action=create&prompt=${encodeURIComponent(description)}`;
  const loginUrl = `/login?action=create&prompt=${encodeURIComponent(description)}`;

  // For non-create modes, redirect to register directly
  if (!isCreateMode) {
    return (
      <div className="min-h-screen bg-slate-50">
        <SimpleNav />
        <div className="max-w-3xl mx-auto px-4 sm:px-6 py-8 sm:py-12">
          <div className="bg-white rounded-xl border border-slate-200 p-6 shadow-sm text-center">
            <h1 className="text-2xl font-bold text-slate-900 mb-2">
              {initialMode === "review" ? "Review a contract" : "Ask a legal question"}
            </h1>
            <p className="text-slate-500 mb-6">
              Sign up for free to use our AI-powered{" "}
              {initialMode === "review" ? "contract review" : "legal assistant"}.
            </p>
            <Link
              href={`/register?action=${initialMode}&prompt=${encodeURIComponent(initialPrompt)}`}
              className="inline-flex items-center gap-2 bg-[#529ec6] text-white px-6 py-3 rounded-xl font-semibold hover:bg-[#4589ad] transition-all"
            >
              Get started free
              <ArrowRight className="w-4 h-4" />
            </Link>
          </div>
        </div>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-slate-50">
      <SimpleNav />

      <div className="max-w-3xl mx-auto px-4 sm:px-6 py-8 sm:py-12">
        {/* Step indicator */}
        <div className="flex items-center gap-2 mb-8">
          {STEPS.map((s, i) => {
            const isCurrent = step === s.id;
            const isCompleted = step > s.id;
            return (
              <div key={s.id} className="flex items-center gap-2">
                {i > 0 && (
                  <div className={`w-6 sm:w-10 h-px ${isCompleted || isCurrent ? "bg-[#529ec6]" : "bg-slate-200"}`} />
                )}
                <div className="flex items-center gap-1.5">
                  <div
                    className={`w-7 h-7 rounded-full flex items-center justify-center text-xs font-semibold transition-colors ${
                      isCompleted
                        ? "bg-[#529ec6] text-white"
                        : isCurrent
                          ? "bg-[#529ec6] text-white"
                          : "bg-slate-200 text-slate-500"
                    }`}
                  >
                    {isCompleted ? (
                      <svg className="w-3.5 h-3.5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M5 13l4 4L19 7" />
                      </svg>
                    ) : (
                      s.id
                    )}
                  </div>
                  <span className={`text-sm font-medium hidden sm:block ${isCurrent ? "text-slate-900" : "text-slate-400"}`}>
                    {s.label}
                  </span>
                </div>
              </div>
            );
          })}
        </div>

        {/* Error */}
        {error && (
          <div className="mb-6 bg-red-50 border border-red-200 rounded-lg p-4 text-red-700 flex items-start gap-3">
            <X className="w-5 h-5 flex-shrink-0 mt-0.5" />
            <div>
              <p className="font-medium">Error</p>
              <p className="text-sm">{error}</p>
            </div>
            <button onClick={() => setError(null)} className="ml-auto text-red-500 hover:text-red-700">
              <X className="w-4 h-4" />
            </button>
          </div>
        )}

        {/* ============ Step 1: Describe ============ */}
        {step === 1 && (
          <div>
            <h1 className="text-2xl sm:text-3xl font-bold text-slate-900 mb-2">
              What do you need?
            </h1>
            <p className="text-slate-500 mb-6">
              Describe your situation in plain English and let AI choose the right contract.
            </p>

            <div className="bg-white rounded-xl border border-slate-200 p-5 space-y-4">
              <label className="block text-sm font-medium text-slate-700">
                Describe what you need
              </label>
              <textarea
                value={description}
                onChange={(e) => setDescription(e.target.value)}
                placeholder="Example: I'm hiring a freelance designer in California for a 3-month project to redesign our company website. The total budget is $15,000 with a 30% deposit upfront..."
                rows={4}
                className="w-full px-4 py-3 border border-slate-200 rounded-lg focus:outline-none focus:ring-2 focus:ring-[#529ec6]/20 focus:border-[#529ec6] resize-none text-slate-900 placeholder:text-slate-400"
                disabled={isAnalyzing}
                autoFocus
              />

              <div className="flex flex-col gap-3 lg:flex-row lg:items-center lg:justify-between">
                <p className="text-xs text-slate-500">
                  {description.trim().length} characters (minimum 10)
                </p>
                <button
                  type="button"
                  onClick={handleAnalyze}
                  disabled={isAnalyzing || description.length < 10}
                  className="flex items-center gap-2 px-6 py-2.5 rounded-lg font-medium bg-gradient-to-r from-[#202e46] to-[#2a3d5c] text-white hover:from-[#1a2539] hover:to-[#202e46] transition-all disabled:opacity-50 disabled:cursor-not-allowed"
                >
                  {isAnalyzing ? (
                    <>
                      <Loader2 className="w-4 h-4 animate-spin" />
                      Analyzing...
                    </>
                  ) : (
                    <>
                      <Sparkles className="w-4 h-4" />
                      Analyze & Continue
                    </>
                  )}
                </button>
              </div>

              <details className="rounded-lg border border-slate-200 bg-slate-50 px-3 py-2">
                <summary className="cursor-pointer text-sm font-medium text-slate-700">
                  Need an example prompt?
                </summary>
                <div className="mt-2 flex flex-wrap items-center gap-2">
                  {[
                    "NDA with investor",
                    "Freelance web redesign project",
                    "Consulting at $200/hour",
                  ].map((example) => (
                    <button
                      key={example}
                      type="button"
                      onClick={() => setDescription(example)}
                      className="text-xs px-2.5 py-1.5 bg-white hover:bg-slate-100 text-slate-600 rounded-full border border-slate-200 transition-colors"
                    >
                      {example}
                    </button>
                  ))}
                </div>
              </details>
            </div>
          </div>
        )}

        {/* ============ Step 2: Analysis + Sign-up Gate ============ */}
        {step === 2 && analysis && (
          <div className="space-y-6">
            {/* Analysis Card */}
            <div className="bg-white rounded-xl border-2 border-[#529ec6]/20 p-6">
              <div className="flex items-center justify-between mb-4">
                <div className="flex items-center gap-3">
                  <div className={`w-12 h-12 rounded-xl flex items-center justify-center ${
                    analysis.confidence > 50 ? "bg-[#529ec6]/10" : "bg-amber-50"
                  }`}>
                    {(() => {
                      const Icon = CONTRACT_ICONS[analysis.contractTypeIcon] || FileText;
                      return <Icon className={`w-6 h-6 ${analysis.confidence > 50 ? "text-[#529ec6]" : "text-amber-600"}`} />;
                    })()}
                  </div>
                  <div>
                    <p className={`text-sm font-medium ${analysis.confidence > 50 ? "text-[#529ec6]" : "text-amber-600"}`}>
                      {analysis.confidence > 50 ? "Recommended Contract" : "Custom Contract"}
                    </p>
                    <h3 className="text-xl font-bold text-slate-900">
                      {analysis.contractTypeName}
                    </h3>
                  </div>
                </div>
                {analysis.confidence > 50 && (
                  <div className={`px-3 py-1 rounded-full text-sm font-medium ${
                    analysis.confidence >= 80
                      ? "bg-emerald-100 text-emerald-700"
                      : analysis.confidence >= 60
                        ? "bg-amber-100 text-amber-700"
                        : "bg-slate-100 text-slate-600"
                  }`}>
                    {analysis.confidence}% match
                  </div>
                )}
              </div>

              <p className="text-slate-600 mb-4">
                {analysis.confidence > 50
                  ? analysis.contractTypeDescription
                  : "Our AI will generate this contract tailored to your specific needs."}
              </p>

              {/* Jurisdiction */}
              <div className="flex items-center gap-2 text-sm text-slate-500 mb-4">
                <span className="font-medium">Jurisdiction:</span>
                <select
                  value={jurisdiction}
                  onChange={(e) => setJurisdiction(e.target.value)}
                  className="px-2 py-1 border border-slate-200 rounded text-slate-700 bg-white"
                >
                  {analysis.availableJurisdictions.map((j) => (
                    <option key={j.id} value={j.id}>{j.name}</option>
                  ))}
                </select>
              </div>

              {/* Extracted Details */}
              {Object.keys(analysis.extractedFields).length > 0 && (
                <div className="bg-slate-50 rounded-lg p-4">
                  <p className="text-sm font-medium text-slate-700 mb-2">Details we found:</p>
                  <div className="grid grid-cols-2 gap-2 text-sm">
                    {Object.entries(analysis.extractedFields).map(([key, value]) => (
                      <div key={key} className="flex gap-2">
                        <span className="text-slate-500">{formatFieldLabel(key)}:</span>
                        <span className="text-slate-900 font-medium">{String(value)}</span>
                      </div>
                    ))}
                  </div>
                </div>
              )}
            </div>

            {/* Contract Preview Snippet */}
            {analysis.previewSnippet && (
              <div className="relative rounded-xl overflow-hidden border border-slate-200 shadow-sm">
                {/* Fake contract document */}
                <div className="bg-white px-8 sm:px-12 pt-10 pb-32 select-none" aria-hidden="true">
                  <h2 className="text-center text-lg sm:text-xl font-bold text-slate-900 tracking-wide mb-6">
                    {analysis.previewSnippet.title}
                  </h2>
                  <p className="text-sm sm:text-[15px] leading-relaxed text-slate-700 mb-5">
                    {analysis.previewSnippet.preamble}
                  </p>
                  <p className="text-xs font-semibold text-slate-500 uppercase tracking-wider mb-2">
                    Recitals
                  </p>
                  <p className="text-sm sm:text-[15px] leading-relaxed text-slate-700">
                    {analysis.previewSnippet.recitals}
                  </p>
                </div>

                {/* Blur + fade overlay */}
                <div className="absolute inset-0 bg-gradient-to-b from-transparent via-transparent via-30% to-white" />
                <div className="absolute bottom-0 left-0 right-0 h-48 backdrop-blur-[2px]" style={{ maskImage: "linear-gradient(to bottom, transparent, black 40%)", WebkitMaskImage: "linear-gradient(to bottom, transparent, black 40%)" }} />

                {/* CTA overlay */}
                <div className="absolute bottom-0 left-0 right-0 px-6 pb-6 pt-4 text-center">
                  <Link
                    href={registerUrl}
                    className="inline-flex items-center gap-2 bg-[#529ec6] text-white px-8 py-3 rounded-xl font-semibold hover:bg-[#4589ad] transition-all hover:shadow-lg text-base"
                  >
                    Sign up free to generate full contract
                    <ArrowRight className="w-4 h-4" />
                  </Link>
                  <div className="mt-3 flex flex-col sm:flex-row items-center justify-center gap-3 text-xs text-slate-500">
                    <span className="flex items-center gap-1">
                      <CheckCircle2 className="w-3.5 h-3.5 text-emerald-500" />
                      E-signatures included
                    </span>
                    <span className="flex items-center gap-1">
                      <CheckCircle2 className="w-3.5 h-3.5 text-emerald-500" />
                      PDF export
                    </span>
                    <span className="flex items-center gap-1">
                      <CheckCircle2 className="w-3.5 h-3.5 text-emerald-500" />
                      No credit card required
                    </span>
                  </div>
                  <p className="mt-2 text-xs text-slate-400">
                    Already have an account?{" "}
                    <Link href={loginUrl} className="text-[#529ec6] hover:underline font-medium">
                      Sign in
                    </Link>
                  </p>
                </div>
              </div>
            )}

            {/* Fallback CTA if no snippet */}
            {!analysis.previewSnippet && (
              <div className="bg-white rounded-xl border-2 border-[#529ec6]/30 p-6 sm:p-8 text-center">
                <h2 className="text-xl font-bold text-slate-900 mb-2">
                  Ready to generate your {analysis.contractTypeName}?
                </h2>
                <p className="text-sm text-slate-500 mb-5 max-w-md mx-auto">
                  Create a free account to generate the full contract. Your details will be pre-filled.
                </p>
                <div className="flex flex-col sm:flex-row items-center justify-center gap-4 text-sm text-slate-600 mb-6">
                  <span className="flex items-center gap-1.5">
                    <CheckCircle2 className="w-4 h-4 text-emerald-500" />
                    E-signatures
                  </span>
                  <span className="flex items-center gap-1.5">
                    <CheckCircle2 className="w-4 h-4 text-emerald-500" />
                    PDF export
                  </span>
                  <span className="flex items-center gap-1.5">
                    <CheckCircle2 className="w-4 h-4 text-emerald-500" />
                    No credit card
                  </span>
                </div>
                <Link
                  href={registerUrl}
                  className="inline-flex items-center gap-2 bg-[#529ec6] text-white px-8 py-3 rounded-xl font-semibold hover:bg-[#4589ad] transition-all hover:shadow-lg text-base"
                >
                  Sign up free & generate
                  <ArrowRight className="w-4 h-4" />
                </Link>
                <p className="mt-4 text-sm text-slate-400">
                  Already have an account?{" "}
                  <Link href={loginUrl} className="text-[#529ec6] hover:underline font-medium">
                    Sign in to generate
                  </Link>
                </p>
              </div>
            )}

            {/* Back link */}
            <button
              onClick={handleResetAnalysis}
              className="text-sm text-slate-500 hover:text-slate-700"
            >
              <ArrowLeft className="w-3.5 h-3.5 inline mr-1" />
              Try a different prompt
            </button>
          </div>
        )}
      </div>
    </div>
  );
}

function SimpleNav() {
  return (
    <nav className="bg-white border-b border-slate-200">
      <div className="max-w-4xl mx-auto px-4 sm:px-6 h-14 flex items-center justify-between">
        <Link href="/" className="flex items-center">
          <Image src="/dark-logo.png" alt="Lexport" width={100} height={30} className="h-7 w-auto" />
        </Link>
        <Link
          href="/register"
          className="text-sm font-medium bg-slate-900 text-white px-4 py-2 rounded-lg hover:bg-slate-800 transition-all"
        >
          Sign up free
        </Link>
      </div>
    </nav>
  );
}

export default function CreatePage() {
  return (
    <Suspense
      fallback={
        <div className="min-h-screen bg-slate-50 flex items-center justify-center">
          <Loader2 className="w-6 h-6 animate-spin text-slate-400" />
        </div>
      }
    >
      <CreatePageContent />
    </Suspense>
  );
}
