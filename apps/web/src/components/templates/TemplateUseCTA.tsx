"use client";

import { useState, useEffect } from "react";
import { createClient } from "@/lib/supabase/client";
import Link from "next/link";
import { ArrowRight, Crown, Sparkles, Check } from "lucide-react";
import { trackTemplateCTAClicked, trackTemplatePurchaseStarted, trackTemplateUsed } from "@/lib/analytics";

interface TemplateUseCTAProps {
  templateId: string | null;
  contractType: string;
  jurisdiction: string;
  isPremium: boolean;
  price: number | null; // cents
  typeSlug: string;
  jurisdictionSlug: string;
}

type AuthState = "loading" | "unauthenticated" | "free" | "free_owned" | "pro" | "business";

export function TemplateUseCTA({
  templateId,
  contractType,
  jurisdiction,
  isPremium,
  price,
  typeSlug,
  jurisdictionSlug,
}: TemplateUseCTAProps) {
  const [authState, setAuthState] = useState<AuthState>("loading");
  const [using, setUsing] = useState(false);
  const [buying, setBuying] = useState(false);

  const returnUrl = `/templates/${typeSlug}/${jurisdictionSlug}`;

  useEffect(() => {
    async function checkAuth() {
      const supabase = createClient();
      const {
        data: { session },
      } = await supabase.auth.getSession();

      if (!session) {
        setAuthState("unauthenticated");
        return;
      }

      try {
        const res = await fetch("/api/user/subscription");
        if (res.ok) {
          const data = await res.json();
          const tier = data.tier || "free";
          if (tier === "pro" || tier === "team") {
            setAuthState(tier === "team" ? "business" : "pro");
            return;
          }
        }

        // Free tier — check if they already own this premium template
        if (isPremium && templateId) {
          const ownershipRes = await fetch(`/api/templates/${templateId}/purchase`);
          if (ownershipRes.ok) {
            const ownershipData = await ownershipRes.json();
            if (ownershipData.owned) {
              setAuthState("free_owned");
              return;
            }
          }
        }

        setAuthState("free");
      } catch {
        setAuthState("free");
      }
    }

    checkAuth();
  }, [isPremium, templateId]);

  const handleUseTemplate = async () => {
    if (!templateId) return;
    setUsing(true);
    trackTemplateUsed(templateId, contractType, jurisdiction);
    try {
      const res = await fetch(`/api/templates/${templateId}/use`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          contractType,
          jurisdiction,
          values: {},
        }),
      });

      if (res.ok) {
        const data = await res.json();
        if (data.contractId) {
          window.location.href = `/contracts/${data.contractId}/edit`;
          return;
        }
      }

      // Fallback: go to contract creation with type pre-selected
      window.location.href = `/contracts/new?type=${contractType}&jurisdiction=${jurisdiction}`;
    } catch {
      window.location.href = `/contracts/new?type=${contractType}&jurisdiction=${jurisdiction}`;
    }
  };

  const handleBuyTemplate = async () => {
    if (!templateId) return;
    setBuying(true);
    trackTemplatePurchaseStarted(templateId, contractType, jurisdiction);
    try {
      const res = await fetch(`/api/templates/${templateId}/purchase`, {
        method: "POST",
      });

      if (res.ok) {
        const data = await res.json();
        if (data.url) {
          // Redirect to Stripe Checkout
          window.location.href = data.url;
          return;
        }
        if (data.success) {
          // Pro/Team user — template granted instantly
          setAuthState("free_owned");
          setBuying(false);
          return;
        }
      }

      const errorData = await res.json().catch(() => null);
      alert(errorData?.error || "Failed to start purchase. Please try again.");
    } catch {
      alert("Something went wrong. Please try again.");
    }
    setBuying(false);
  };

  if (authState === "loading") {
    return (
      <div className="bg-white rounded-xl border border-slate-200 p-6">
        <div className="h-12 bg-slate-100 rounded-lg animate-pulse" />
      </div>
    );
  }

  // Unauthenticated — primary CTA to register
  if (authState === "unauthenticated") {
    return (
      <div className="bg-gradient-to-br from-[#202e46] to-[#1a2539] rounded-xl p-6 text-white">
        <h3 className="text-lg font-semibold mb-2">
          {isPremium ? "Get this premium template" : "Use this template for free"}
        </h3>
        <p className="text-white/70 text-sm mb-4">
          Create an account to customize, e-sign, and share this contract.
          {isPremium
            ? " Premium templates start at $10 or are included free with Pro."
            : " Free plan includes 1 contract per month."}
        </p>
        <Link
          href={`/register?returnTo=${encodeURIComponent(returnUrl)}`}
          className="inline-flex items-center gap-2 px-6 py-3 bg-white text-[#202e46] font-semibold rounded-lg hover:bg-slate-100 transition-colors w-full justify-center"
        >
          Get Started Free
          <ArrowRight className="w-4 h-4" />
        </Link>
        <p className="text-white/50 text-xs text-center mt-3">
          No credit card required
        </p>
      </div>
    );
  }

  // Free tier + premium template + already purchased — can use directly
  if (authState === "free_owned") {
    return (
      <div className="bg-white rounded-xl border border-slate-200 p-6">
        <div className="flex items-center gap-2 mb-3">
          <Check className="w-4 h-4 text-emerald-500" />
          <span className="text-sm font-medium text-emerald-700">
            You own this template
          </span>
        </div>
        <button
          onClick={handleUseTemplate}
          disabled={using || !templateId}
          className="flex items-center justify-center gap-2 px-6 py-3 bg-[#202e46] text-white font-semibold rounded-lg hover:bg-[#1a2539] transition-colors w-full disabled:opacity-50"
        >
          {using ? (
            "Creating contract..."
          ) : (
            <>
              Use This Template
              <ArrowRight className="w-4 h-4" />
            </>
          )}
        </button>
      </div>
    );
  }

  // Free tier + premium template — upgrade or buy
  if (authState === "free" && isPremium) {
    const displayPrice = price && price > 0 ? price : 999; // Default $9.99

    return (
      <div className="bg-white rounded-xl border border-slate-200 p-6 space-y-3">
        <div className="flex items-center gap-2 mb-1">
          <Crown className="w-4 h-4 text-amber-500" />
          <span className="text-sm font-medium text-amber-700">
            Premium Template
          </span>
        </div>
        <button
          onClick={handleBuyTemplate}
          disabled={buying || !templateId}
          className="flex items-center justify-center gap-2 px-6 py-3 bg-[#202e46] text-white font-semibold rounded-lg hover:bg-[#1a2539] transition-colors w-full disabled:opacity-50"
        >
          {buying
            ? "Redirecting to checkout..."
            : `Buy This Template — $${(displayPrice / 100).toFixed(2)}`}
        </button>
        <div className="relative flex items-center justify-center">
          <div className="absolute inset-0 flex items-center">
            <div className="w-full border-t border-slate-200" />
          </div>
          <span className="relative bg-white px-3 text-xs text-slate-400">or</span>
        </div>
        <Link
          href="/settings/billing"
          className="flex items-center justify-center gap-2 px-6 py-3 bg-white text-slate-700 border border-slate-200 font-medium rounded-lg hover:bg-slate-50 transition-colors w-full"
        >
          <Sparkles className="w-4 h-4" />
          Upgrade to Pro — All Templates Included
        </Link>
        <p className="text-xs text-slate-500 text-center">
          Pro plan: $19.99/mo — unlimited access to all premium templates
        </p>
      </div>
    );
  }

  // Authenticated (free + non-premium, or pro/business) — direct use
  return (
    <div className="bg-white rounded-xl border border-slate-200 p-6">
      <button
        onClick={handleUseTemplate}
        disabled={using || !templateId}
        className="flex items-center justify-center gap-2 px-6 py-3 bg-[#202e46] text-white font-semibold rounded-lg hover:bg-[#1a2539] transition-colors w-full disabled:opacity-50"
      >
        {using ? (
          "Creating contract..."
        ) : (
          <>
            Use This Template
            <ArrowRight className="w-4 h-4" />
          </>
        )}
      </button>
      {!templateId && (
        <Link
          href={`/contracts/new?type=${contractType}&jurisdiction=${jurisdiction}`}
          className="flex items-center justify-center gap-2 px-6 py-3 mt-3 bg-white text-[#202e46] border border-slate-200 font-medium rounded-lg hover:bg-slate-50 transition-colors w-full"
        >
          Create from Scratch Instead
        </Link>
      )}
    </div>
  );
}
