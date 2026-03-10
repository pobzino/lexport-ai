"use client";

import { useState, useEffect } from "react";
import Link from "next/link";
import { X, Sparkles } from "lucide-react";
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
    <div className="flex items-center gap-3 px-4 py-2.5 bg-amber-50 border border-amber-200 rounded-xl text-sm">
      <Sparkles className="w-3.5 h-3.5 text-amber-500 flex-shrink-0" />
      <p className="flex-1 text-amber-800">
        <span className="font-semibold">Limited offer:</span> Get 50% off your first month of Pro — 50 contracts, AI chat, and all templates.
      </p>
      <Link
        href="/settings/billing?promo=FIRST50"
        className="flex-shrink-0 px-3 py-1 bg-amber-500 text-white text-xs font-semibold rounded-lg hover:bg-amber-600 transition-colors"
      >
        Upgrade — $9.99/mo
      </Link>
      <button
        onClick={handleDismiss}
        className="flex-shrink-0 p-1 rounded hover:bg-amber-100 transition-colors"
        aria-label="Dismiss"
      >
        <X className="w-3.5 h-3.5 text-amber-500" />
      </button>
    </div>
  );
}
