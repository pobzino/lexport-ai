"use client";

import { useState, useEffect } from "react";
import Link from "next/link";
import { X, Sparkles, FileText, MessageSquare, Zap } from "lucide-react";
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
    <div className="relative bg-gradient-to-br from-[#202e46] to-[#1a2539] rounded-2xl p-6 text-white overflow-hidden">
      {/* Background pattern */}
      <div className="absolute inset-0 opacity-10">
        <div className="absolute top-0 right-0 w-64 h-64 bg-[#529ec6] rounded-full blur-3xl -translate-y-1/2 translate-x-1/2" />
        <div className="absolute bottom-0 left-0 w-48 h-48 bg-emerald-500 rounded-full blur-3xl translate-y-1/2 -translate-x-1/2" />
      </div>

      {/* Dismiss button */}
      <button
        onClick={handleDismiss}
        className="absolute top-4 right-4 p-1 rounded-lg hover:bg-white/10 transition-colors"
        aria-label="Dismiss"
      >
        <X className="w-4 h-4 text-white/60" />
      </button>

      <div className="relative">
        {/* Badge */}
        <div className="inline-flex items-center gap-1.5 px-3 py-1 bg-amber-500/20 text-amber-300 text-xs font-semibold rounded-full mb-4">
          <Sparkles className="w-3 h-3" />
          LIMITED OFFER
        </div>

        {/* Headline */}
        <h3 className="text-xl font-bold mb-2">
          Get 50% off your first month
        </h3>
        <p className="text-white/70 text-sm mb-4">
          Upgrade to Pro and unlock 50 contracts/month, AI chat, and our full template library.
        </p>

        {/* Features */}
        <div className="grid grid-cols-3 gap-3 mb-5">
          <div className="flex items-center gap-2 text-sm text-white/80">
            <FileText className="w-4 h-4 text-[#529ec6]" />
            <span>50 contracts/mo</span>
          </div>
          <div className="flex items-center gap-2 text-sm text-white/80">
            <MessageSquare className="w-4 h-4 text-[#529ec6]" />
            <span>AI chat</span>
          </div>
          <div className="flex items-center gap-2 text-sm text-white/80">
            <Zap className="w-4 h-4 text-[#529ec6]" />
            <span>All templates</span>
          </div>
        </div>

        {/* CTA */}
        <div className="flex items-center gap-4">
          <Link
            href="/settings/billing?promo=FIRST50"
            className="inline-flex items-center gap-2 px-5 py-2.5 bg-white text-[#202e46] font-semibold rounded-xl hover:bg-white/90 transition-colors"
          >
            Upgrade Now
            <span className="text-xs font-normal text-slate-500 line-through">$19.99</span>
            <span className="text-emerald-600 font-bold">$9.99/mo</span>
          </Link>
          <span className="text-xs text-white/50">Cancel anytime</span>
        </div>
      </div>
    </div>
  );
}
