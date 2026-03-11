"use client";

import { useState, useEffect } from "react";
import Link from "next/link";
import { X, Zap, ArrowRight } from "lucide-react";
import { useSubscription } from "@/lib/hooks/useSubscription";

const DISMISS_KEY = "lexport_upgrade_card_dismissed";
const DISMISS_DURATION = 7 * 24 * 60 * 60 * 1000; // 7 days

export function UpgradeCard() {
  const subscription = useSubscription();
  const [dismissed, setDismissed] = useState(true); // Start hidden to avoid flash

  useEffect(() => {
    const dismissedAt = localStorage.getItem(DISMISS_KEY);
    if (dismissedAt) {
      const elapsed = Date.now() - parseInt(dismissedAt, 10);
      setDismissed(elapsed < DISMISS_DURATION);
    } else {
      setDismissed(false);
    }
  }, []);

  const handleDismiss = () => {
    localStorage.setItem(DISMISS_KEY, Date.now().toString());
    setDismissed(true);
  };

  // Don't show for paid users or while loading
  if (subscription.isLoading || subscription.tier !== "free" || dismissed) {
    return null;
  }

  return (
    <div className="relative overflow-hidden rounded-xl bg-gradient-to-r from-[#202e46] via-[#2a3d5c] to-[#1a2539]">
      {/* Subtle decorative elements */}
      <div className="absolute top-0 right-0 w-32 h-32 bg-white/5 rounded-full -translate-y-1/2 translate-x-1/2" />
      <div className="absolute bottom-0 left-1/3 w-24 h-24 bg-white/5 rounded-full translate-y-1/2" />

      <div className="relative flex items-center gap-4 px-5 py-3.5">
        {/* Icon */}
        <div className="flex-shrink-0 flex items-center justify-center w-8 h-8 rounded-lg bg-amber-400/20 ring-1 ring-amber-400/30">
          <Zap className="w-4 h-4 text-amber-400" />
        </div>

        {/* Text */}
        <p className="flex-1 text-sm text-slate-200">
          <span className="font-semibold text-white">50% off Pro</span>
          <span className="mx-1.5 text-slate-500">—</span>
          50 contracts/mo, unlimited signatures, AI chat & all templates.
        </p>

        {/* CTA */}
        <Link
          href="/settings/billing?promo=FIRST50"
          className="flex-shrink-0 inline-flex items-center gap-1.5 px-4 py-2 bg-white text-[#202e46] text-xs font-bold rounded-lg hover:bg-slate-100 transition-all hover:shadow-lg hover:shadow-white/10 active:scale-[0.98]"
        >
          Upgrade — $9.99/mo
          <ArrowRight className="w-3 h-3" />
        </Link>

        {/* Dismiss */}
        <button
          onClick={handleDismiss}
          className="flex-shrink-0 p-1 rounded-md hover:bg-white/10 transition-colors"
          aria-label="Dismiss"
        >
          <X className="w-3.5 h-3.5 text-slate-400" />
        </button>
      </div>
    </div>
  );
}
