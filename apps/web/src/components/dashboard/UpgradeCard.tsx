"use client";

import { useState, useEffect } from "react";
import Link from "next/link";
import { X, ArrowRight, Rocket } from "lucide-react";
import { useSubscription } from "@/lib/hooks/useSubscription";

const DISMISS_KEY = "lexport_upgrade_card_dismissed";
const DISMISS_DURATION = 2 * 60 * 60 * 1000; // 2 hours

export function UpgradeCard() {
  const subscription = useSubscription();
  const [dismissed, setDismissed] = useState(true);

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

  if (subscription.isLoading || subscription.tier !== "free" || dismissed) {
    return null;
  }

  const showDiscount = !subscription.hasSubscribedBefore;
  const href = showDiscount ? "/settings/billing?promo=FIRST50" : "/settings/billing";

  return (
    <div className="relative rounded-xl p-[1.5px] overflow-hidden">
      {/* Animated rotating gradient border — blue-to-teal palette */}
      <div
        className="absolute inset-0 rounded-xl bg-[conic-gradient(from_var(--border-angle),#6b8db5,#529ec6,#4db8a4,#3dab8e,#529ec6,#6b8db5)] animate-[border-spin_4s_linear_infinite]"
        style={{ "--border-angle": "0deg" } as React.CSSProperties}
      />
      {/* Inner card */}
      <div className="relative rounded-[10px] bg-gradient-to-r from-slate-900 via-slate-800 to-slate-900 overflow-hidden">
        <div className="absolute inset-0 bg-[radial-gradient(ellipse_at_right,rgba(77,184,164,0.12),transparent_70%)]" />
        <div className="relative px-4 py-3 sm:px-5 sm:py-4">
          {/* Dismiss button */}
          <button onClick={handleDismiss} className="absolute top-2 right-2 p-1.5 rounded-md text-slate-500 hover:text-slate-300 hover:bg-white/5 transition-colors z-10" aria-label="Dismiss">
            <X className="w-3.5 h-3.5" />
          </button>

          {/* Desktop: single row */}
          <div className="hidden sm:flex items-center gap-4">
            <div className="flex-shrink-0 w-9 h-9 rounded-lg bg-[#4db8a4]/20 flex items-center justify-center">
              <Rocket className="w-4.5 h-4.5 text-[#4db8a4]" />
            </div>
            <div className="flex-1 min-w-0">
              <p className="text-sm font-semibold text-white">
                Upgrade to Pro{showDiscount && <> — <span className="text-[#4db8a4]">50% off</span></>}
              </p>
              <p className="text-xs text-slate-400 mt-0.5">
                50 contracts &middot; Unlimited signatures &middot; AI chat{showDiscount && <> &middot; <span className="text-[#4db8a4]/80">Save $120/year</span></>}
              </p>
            </div>
            <div className="flex items-center gap-3 flex-shrink-0">
              {showDiscount && <span className="text-xs text-slate-500 line-through">$19.99</span>}
              <Link
                href={href}
                className="inline-flex items-center gap-1.5 px-5 py-2 bg-[#4db8a4] text-white text-sm font-semibold rounded-lg hover:bg-[#3dab8e] transition-all active:scale-[0.98] shadow-lg shadow-[#4db8a4]/25"
              >
                {showDiscount ? "$9.99/mo" : "$19.99/mo"}
                <ArrowRight className="w-3.5 h-3.5" />
              </Link>
            </div>
          </div>

          {/* Mobile: stacked layout */}
          <div className="sm:hidden space-y-3 pr-6">
            <div className="flex items-center gap-3">
              <div className="flex-shrink-0 w-8 h-8 rounded-lg bg-[#4db8a4]/20 flex items-center justify-center">
                <Rocket className="w-4 h-4 text-[#4db8a4]" />
              </div>
              <p className="text-sm font-semibold text-white">
                Upgrade to Pro{showDiscount && <> — <span className="text-[#4db8a4]">50% off</span></>}
              </p>
            </div>
            <p className="text-xs text-slate-400">
              50 contracts &middot; Unlimited signatures &middot; AI chat{showDiscount && <> &middot; <span className="text-[#4db8a4]/80">Save $120/year</span></>}
            </p>
            <div className="flex items-center gap-3">
              <Link
                href={href}
                className="flex-1 inline-flex items-center justify-center gap-1.5 px-4 py-2.5 bg-[#4db8a4] text-white text-sm font-semibold rounded-lg hover:bg-[#3dab8e] transition-all active:scale-[0.98] shadow-lg shadow-[#4db8a4]/25"
              >
                {showDiscount ? (
                  <>$9.99/mo <span className="text-white/60 line-through text-xs ml-1">$19.99</span></>
                ) : (
                  "$19.99/mo"
                )}
                <ArrowRight className="w-3.5 h-3.5" />
              </Link>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}
