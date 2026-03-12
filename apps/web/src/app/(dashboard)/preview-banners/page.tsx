"use client";

import Link from "next/link";
import { X, ArrowRight, Sparkles, Crown, Rocket, Gift } from "lucide-react";

interface VariantProps {
  onDismiss: () => void;
  href: string;
}

/* 1 — Dark gradient with emerald accent + animated border */
function Variant1({ onDismiss, href }: VariantProps) {
  return (
    <div className="relative rounded-xl p-[1.5px] overflow-hidden">
      {/* Animated rotating gradient border */}
      <div className="absolute inset-0 rounded-xl bg-[conic-gradient(from_var(--border-angle),#10b981,#0ea5e9,#8b5cf6,#10b981)] animate-[border-spin_4s_linear_infinite]" style={{ "--border-angle": "0deg" } as React.CSSProperties} />
      {/* Inner card */}
      <div className="relative rounded-[10px] bg-gradient-to-r from-slate-900 via-slate-800 to-slate-900 overflow-hidden">
        <div className="absolute inset-0 bg-[radial-gradient(ellipse_at_right,rgba(16,185,129,0.15),transparent_70%)]" />
        <div className="relative flex items-center gap-4 px-5 py-4">
          <div className="flex-shrink-0 w-9 h-9 rounded-lg bg-emerald-500/20 flex items-center justify-center">
            <Rocket className="w-4.5 h-4.5 text-emerald-400" />
          </div>
          <div className="flex-1 min-w-0">
            <p className="text-sm font-semibold text-white">
              Upgrade to Pro — <span className="text-emerald-400">50% off</span>
            </p>
            <p className="text-xs text-slate-400 mt-0.5">
              50 contracts &middot; Unlimited signatures &middot; AI chat &middot; <span className="text-emerald-400/80">Save $120/year</span>
            </p>
          </div>
          <div className="flex items-center gap-2 flex-shrink-0">
            <span className="hidden sm:inline text-xs text-slate-500 line-through">$19.99</span>
            <Link href={href} className="inline-flex items-center gap-1.5 px-5 py-2 bg-emerald-500 text-white text-sm font-semibold rounded-lg hover:bg-emerald-400 transition-all active:scale-[0.98] shadow-lg shadow-emerald-500/25">
              $9.99/mo
              <ArrowRight className="w-3.5 h-3.5" />
            </Link>
            <button onClick={onDismiss} className="p-1.5 rounded-md text-slate-500 hover:text-slate-300 hover:bg-white/5 transition-colors" aria-label="Dismiss">
              <X className="w-3.5 h-3.5" />
            </button>
          </div>
        </div>
      </div>
    </div>
  );
}

/* 2 — Vibrant indigo-to-purple gradient */
function Variant2({ onDismiss, href }: VariantProps) {
  return (
    <div className="relative rounded-xl overflow-hidden bg-gradient-to-r from-indigo-600 via-violet-600 to-purple-600">
      <div className="absolute inset-0 bg-[radial-gradient(circle_at_20%_50%,rgba(255,255,255,0.1),transparent_50%)]" />
      <div className="relative flex items-center gap-4 px-5 py-4">
        <div className="flex-shrink-0 w-9 h-9 rounded-lg bg-white/15 flex items-center justify-center backdrop-blur-sm">
          <Crown className="w-4.5 h-4.5 text-amber-300" />
        </div>
        <div className="flex-1 min-w-0">
          <p className="text-sm font-semibold text-white">
            Go Pro — Half price for early adopters
          </p>
          <p className="text-xs text-indigo-200 mt-0.5">
            50 contracts &middot; Unlimited signatures &middot; AI chat &middot; Risk analysis
          </p>
        </div>
        <div className="flex items-center gap-2 flex-shrink-0">
          <div className="hidden sm:flex flex-col items-end mr-1">
            <span className="text-xs text-indigo-300 line-through">$19.99</span>
            <span className="text-lg font-bold text-white leading-none">$9.99<span className="text-xs font-normal text-indigo-200">/mo</span></span>
          </div>
          <Link href={href} className="inline-flex items-center gap-1.5 px-5 py-2 bg-white text-indigo-700 text-sm font-semibold rounded-lg hover:bg-indigo-50 transition-all active:scale-[0.98] shadow-lg shadow-black/10">
            Upgrade
            <ArrowRight className="w-3.5 h-3.5" />
          </Link>
          <button onClick={onDismiss} className="p-1.5 rounded-md text-indigo-300 hover:text-white hover:bg-white/10 transition-colors" aria-label="Dismiss">
            <X className="w-3.5 h-3.5" />
          </button>
        </div>
      </div>
    </div>
  );
}

/* 3 — Clean white with colourful left stripe */
function Variant3({ onDismiss, href }: VariantProps) {
  return (
    <div className="relative rounded-xl overflow-hidden border border-slate-200 bg-white flex">
      <div className="w-1.5 bg-gradient-to-b from-violet-500 via-fuchsia-500 to-pink-500 flex-shrink-0" />
      <div className="flex items-center gap-4 px-5 py-4 flex-1">
        <div className="flex-shrink-0 w-9 h-9 rounded-lg bg-gradient-to-br from-violet-100 to-pink-100 flex items-center justify-center">
          <Gift className="w-4.5 h-4.5 text-fuchsia-600" />
        </div>
        <div className="flex-1 min-w-0">
          <p className="text-sm font-semibold text-slate-900">
            Limited offer: <span className="text-fuchsia-600">50% off Pro</span>
          </p>
          <p className="text-xs text-slate-500 mt-0.5">
            50 contracts &middot; Unlimited signatures &middot; AI chat &middot; Save $120/year
          </p>
        </div>
        <div className="flex items-center gap-3 flex-shrink-0">
          <div className="hidden sm:block text-right">
            <span className="text-xs text-slate-400 line-through">$19.99</span>
            <span className="ml-1.5 text-base font-bold text-slate-900">$9.99<span className="text-xs font-normal text-slate-500">/mo</span></span>
          </div>
          <Link href={href} className="inline-flex items-center gap-1.5 px-5 py-2 bg-gradient-to-r from-violet-600 to-fuchsia-600 text-white text-sm font-semibold rounded-lg hover:from-violet-500 hover:to-fuchsia-500 transition-all active:scale-[0.98] shadow-sm">
            Upgrade
            <ArrowRight className="w-3.5 h-3.5" />
          </Link>
          <button onClick={onDismiss} className="p-1.5 rounded-md text-slate-400 hover:text-slate-600 hover:bg-slate-100 transition-colors" aria-label="Dismiss">
            <X className="w-3.5 h-3.5" />
          </button>
        </div>
      </div>
    </div>
  );
}

/* 4 — Bold black with neon green */
function Variant4({ onDismiss, href }: VariantProps) {
  return (
    <div className="relative rounded-xl overflow-hidden bg-black">
      <div className="absolute inset-0 bg-[radial-gradient(ellipse_at_left,rgba(74,222,128,0.08),transparent_60%)]" />
      <div className="relative flex items-center gap-4 px-5 py-4">
        <div className="flex-shrink-0 w-9 h-9 rounded-lg border border-green-500/30 bg-green-500/10 flex items-center justify-center">
          <Sparkles className="w-4.5 h-4.5 text-green-400" />
        </div>
        <div className="flex-1 min-w-0">
          <p className="text-sm font-semibold text-white">
            Pro <span className="ml-1.5 text-xs font-bold px-2 py-0.5 rounded-full bg-green-500/20 text-green-400 border border-green-500/30">50% OFF</span>
          </p>
          <p className="text-xs text-slate-400 mt-1">
            50 contracts &middot; Unlimited signatures &middot; AI chat &middot; Risk analysis
          </p>
        </div>
        <div className="flex items-center gap-2 flex-shrink-0">
          <span className="hidden sm:inline text-xs text-slate-600 line-through">$19.99</span>
          <Link href={href} className="inline-flex items-center gap-1.5 px-5 py-2 bg-green-500 text-black text-sm font-bold rounded-lg hover:bg-green-400 transition-all active:scale-[0.98] shadow-lg shadow-green-500/20">
            $9.99/mo
            <ArrowRight className="w-3.5 h-3.5" />
          </Link>
          <button onClick={onDismiss} className="p-1.5 rounded-md text-slate-600 hover:text-slate-400 hover:bg-white/5 transition-colors" aria-label="Dismiss">
            <X className="w-3.5 h-3.5" />
          </button>
        </div>
      </div>
    </div>
  );
}

export default function PreviewBannersPage() {
  const noop = () => {};
  const href = "/settings/billing?promo=FIRST50";

  return (
    <div className="max-w-4xl mx-auto py-10 px-6 space-y-10">
      <div>
        <h1 className="text-2xl font-bold text-slate-900">Upgrade Banner Variants</h1>
        <p className="text-sm text-slate-500 mt-1">Pick the one you like best.</p>
      </div>

      <div className="space-y-8">
        <div className="space-y-3">
          <h2 className="text-sm font-semibold text-slate-700 uppercase tracking-wider">1 — Dark + Emerald</h2>
          <Variant1 onDismiss={noop} href={href} />
        </div>

        <div className="space-y-3">
          <h2 className="text-sm font-semibold text-slate-700 uppercase tracking-wider">2 — Indigo / Purple Gradient</h2>
          <Variant2 onDismiss={noop} href={href} />
        </div>

        <div className="space-y-3">
          <h2 className="text-sm font-semibold text-slate-700 uppercase tracking-wider">3 — White + Violet Stripe</h2>
          <Variant3 onDismiss={noop} href={href} />
        </div>

        <div className="space-y-3">
          <h2 className="text-sm font-semibold text-slate-700 uppercase tracking-wider">4 — Black + Neon Green</h2>
          <Variant4 onDismiss={noop} href={href} />
        </div>
      </div>
    </div>
  );
}
