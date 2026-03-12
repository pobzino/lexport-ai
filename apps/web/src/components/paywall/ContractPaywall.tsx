"use client";

import { Lock, Sparkles, Check, ArrowRight } from "lucide-react";
import Link from "next/link";

interface ContractPaywallProps {
  type: "contract_limit" | "signature_limit";
  currentUsage: number;
  limit: number;
}

export function ContractPaywall({ type, currentUsage, limit }: ContractPaywallProps) {
  const isContractLimit = type === "contract_limit";

  return (
    <div className="relative">
      {/* Gradient blur overlay */}
      <div className="absolute inset-0 bg-gradient-to-b from-transparent via-white/70 to-white backdrop-blur-sm z-10" />

      {/* Paywall content */}
      <div className="absolute inset-0 flex items-center justify-center z-20">
        <div className="bg-white rounded-2xl shadow-2xl border border-slate-200 p-8 max-w-md mx-4 text-center">
          <div className="w-16 h-16 bg-[#202e46]/10 rounded-full flex items-center justify-center mx-auto mb-4">
            <Lock className="w-8 h-8 text-[#202e46]" />
          </div>

          <h3 className="text-xl font-bold text-slate-900 mb-2">
            {isContractLimit
              ? "You've used your free contract"
              : "Signature limit reached"}
          </h3>

          <p className="text-slate-600 mb-6">
            {isContractLimit
              ? `You've created ${currentUsage} of ${limit} free AI-generated contract${limit > 1 ? 's' : ''}. Upgrade to Pro for unlimited contracts.`
              : `You've used ${currentUsage} of ${limit} free signatures. Upgrade to collect unlimited signatures.`}
          </p>

          <div className="space-y-3 mb-6 text-left">
            <div className="flex items-center gap-3 text-sm">
              <div className="w-5 h-5 rounded-full bg-emerald-100 flex items-center justify-center flex-shrink-0">
                <Check className="w-3 h-3 text-emerald-600" />
              </div>
              <span className="text-slate-700">Unlimited AI-generated contracts</span>
            </div>
            <div className="flex items-center gap-3 text-sm">
              <div className="w-5 h-5 rounded-full bg-emerald-100 flex items-center justify-center flex-shrink-0">
                <Check className="w-3 h-3 text-emerald-600" />
              </div>
              <span className="text-slate-700">Unlimited e-signatures</span>
            </div>
            <div className="flex items-center gap-3 text-sm">
              <div className="w-5 h-5 rounded-full bg-emerald-100 flex items-center justify-center flex-shrink-0">
                <Check className="w-3 h-3 text-emerald-600" />
              </div>
              <span className="text-slate-700">All premium templates included</span>
            </div>
            <div className="flex items-center gap-3 text-sm">
              <div className="w-5 h-5 rounded-full bg-emerald-100 flex items-center justify-center flex-shrink-0">
                <Check className="w-3 h-3 text-emerald-600" />
              </div>
              <span className="text-slate-700">AI contract review & chat</span>
            </div>
          </div>

          <div className="space-y-3">
            <Link
              href="/settings/billing"
              className="w-full inline-flex items-center justify-center bg-[#202e46] text-white px-6 py-3 rounded-xl font-semibold hover:bg-[#1a2539] transition-all hover:shadow-lg"
            >
              <Sparkles className="w-4 h-4 mr-2" />
              Upgrade to Pro - $19.99/mo
              <ArrowRight className="w-4 h-4 ml-2" />
            </Link>

            <p className="text-xs text-slate-500">
              Cancel anytime. 50% off your first month.
            </p>
          </div>
        </div>
      </div>
    </div>
  );
}

// Simpler inline paywall for sections
export function InlinePaywall() {
  return (
    <div className="bg-gradient-to-r from-[#202e46]/5 to-[#529ec6]/5 border border-[#202e46]/20 rounded-xl p-6 text-center">
      <div className="flex items-center justify-center gap-2 text-[#202e46] font-medium mb-2">
        <Lock className="w-4 h-4" />
        <span>Premium Feature</span>
      </div>
      <p className="text-sm text-slate-600 mb-4">
        Upgrade to Pro to unlock this feature
      </p>
      <Link
        href="/settings/billing"
        className="inline-flex items-center gap-2 text-sm font-medium text-[#529ec6] hover:underline"
      >
        Upgrade now
        <ArrowRight className="w-3 h-3" />
      </Link>
    </div>
  );
}
