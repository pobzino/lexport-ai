"use client";

import { useState, useEffect } from "react";
import Link from "next/link";
import {
  CreditCard,
  Check,
  Sparkles,
  ArrowRight,
  Loader2,
  AlertCircle,
  Crown,
  Zap,
  Users,
  FileText,
  PenTool,
} from "lucide-react";

interface SubscriptionData {
  tier: "free" | "pro" | "team";
  status: string;
  aiContractsUsed: number;
  aiContractsLimit: number;
  signaturesUsed: number;
  signaturesLimit: number;
  stripeCustomerId?: string;
  stripeSubscriptionId?: string;
}

const PLANS = [
  {
    id: "free",
    name: "Free",
    price: 0,
    period: "forever",
    description: "Try before you commit",
    features: [
      { text: "1 AI-generated contract", included: true },
      { text: "Up to 3 signatures", included: true },
      { text: "Basic templates", included: true },
      { text: "0.5% payment fee", included: true },
      { text: "Unlimited contracts", included: false },
      { text: "AI contract review", included: false },
    ],
    cta: "Current Plan",
    highlighted: false,
  },
  {
    id: "pro",
    name: "Pro",
    price: 25,
    period: "month",
    description: "For freelancers & small teams",
    features: [
      { text: "Unlimited AI contracts", included: true },
      { text: "Unlimited signatures", included: true },
      { text: "All premium templates", included: true },
      { text: "AI contract review & chat", included: true },
      { text: "Payment collection", included: true },
      { text: "0.25% payment fee", included: true },
      { text: "Priority support", included: true },
    ],
    cta: "Upgrade to Pro",
    highlighted: true,
  },
  {
    id: "team",
    name: "Team",
    price: 79,
    period: "month",
    description: "For growing businesses",
    features: [
      { text: "Everything in Pro", included: true },
      { text: "Team collaboration", included: true },
      { text: "Shared template library", included: true },
      { text: "Admin controls", included: true },
      { text: "0% payment fee", included: true },
      { text: "API access", included: true },
      { text: "Dedicated support", included: true },
    ],
    cta: "Upgrade to Team",
    highlighted: false,
  },
];

export default function BillingPage() {
  const [subscription, setSubscription] = useState<SubscriptionData | null>(null);
  const [loading, setLoading] = useState(true);
  const [upgrading, setUpgrading] = useState<string | null>(null);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    fetchSubscription();
  }, []);

  const fetchSubscription = async () => {
    try {
      const response = await fetch("/api/user/subscription");
      if (!response.ok) throw new Error("Failed to fetch subscription");
      const data = await response.json();
      setSubscription(data);
    } catch (err) {
      setError(err instanceof Error ? err.message : "Failed to load subscription");
    } finally {
      setLoading(false);
    }
  };

  const handleUpgrade = async (planId: string) => {
    if (planId === subscription?.tier) return;

    setUpgrading(planId);
    setError(null);

    try {
      const response = await fetch("/api/billing/create-checkout", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ planId }),
      });

      if (!response.ok) {
        const data = await response.json();
        throw new Error(data.error || "Failed to create checkout session");
      }

      const { url } = await response.json();
      if (url) {
        window.location.href = url;
      }
    } catch (err) {
      setError(err instanceof Error ? err.message : "Failed to start upgrade");
      setUpgrading(null);
    }
  };

  const handleManageSubscription = async () => {
    setUpgrading("manage");
    try {
      const response = await fetch("/api/billing/portal", {
        method: "POST",
      });

      if (!response.ok) throw new Error("Failed to open billing portal");

      const { url } = await response.json();
      if (url) {
        window.location.href = url;
      }
    } catch (err) {
      setError(err instanceof Error ? err.message : "Failed to open billing portal");
      setUpgrading(null);
    }
  };

  if (loading) {
    return (
      <div className="flex items-center justify-center min-h-[400px]">
        <Loader2 className="w-8 h-8 animate-spin text-slate-400" />
      </div>
    );
  }

  const currentPlan = PLANS.find((p) => p.id === subscription?.tier) || PLANS[0];
  const isUnlimited = subscription?.tier !== "free";

  return (
    <div className="max-w-5xl mx-auto">
      <div className="mb-8">
        <h1 className="text-2xl font-bold text-slate-900">Billing & Subscription</h1>
        <p className="text-slate-600 mt-1">Manage your subscription and billing details</p>
      </div>

      {error && (
        <div className="mb-6 p-4 bg-red-50 border border-red-200 rounded-xl flex items-start gap-3">
          <AlertCircle className="w-5 h-5 text-red-500 flex-shrink-0 mt-0.5" />
          <div>
            <p className="text-red-800 font-medium">Error</p>
            <p className="text-red-700 text-sm">{error}</p>
          </div>
        </div>
      )}

      {/* Current Plan Summary */}
      <div className="bg-white rounded-2xl border border-slate-200 p-6 mb-8">
        <div className="flex items-center justify-between mb-4">
          <div className="flex items-center gap-3">
            <div className={`w-12 h-12 rounded-xl flex items-center justify-center ${
              subscription?.tier === "free"
                ? "bg-slate-100"
                : subscription?.tier === "pro"
                ? "bg-[#202e46]"
                : "bg-gradient-to-br from-amber-400 to-orange-500"
            }`}>
              {subscription?.tier === "free" ? (
                <FileText className="w-6 h-6 text-slate-600" />
              ) : subscription?.tier === "pro" ? (
                <Zap className="w-6 h-6 text-white" />
              ) : (
                <Crown className="w-6 h-6 text-white" />
              )}
            </div>
            <div>
              <h2 className="text-lg font-semibold text-slate-900">
                {currentPlan.name} Plan
              </h2>
              <p className="text-sm text-slate-500">{currentPlan.description}</p>
            </div>
          </div>
          {subscription?.tier !== "free" && (
            <button
              onClick={handleManageSubscription}
              disabled={upgrading === "manage"}
              className="px-4 py-2 text-sm font-medium text-slate-700 bg-slate-100 hover:bg-slate-200 rounded-lg transition-colors disabled:opacity-50"
            >
              {upgrading === "manage" ? (
                <Loader2 className="w-4 h-4 animate-spin" />
              ) : (
                "Manage Subscription"
              )}
            </button>
          )}
        </div>

        {/* Usage Stats */}
        <div className="grid grid-cols-2 gap-4 mt-6">
          <div className="bg-slate-50 rounded-xl p-4">
            <div className="flex items-center gap-2 text-slate-600 mb-2">
              <FileText className="w-4 h-4" />
              <span className="text-sm font-medium">AI Contracts</span>
            </div>
            <div className="flex items-baseline gap-1">
              <span className="text-2xl font-bold text-slate-900">
                {subscription?.aiContractsUsed || 0}
              </span>
              <span className="text-slate-500">
                / {isUnlimited ? "∞" : subscription?.aiContractsLimit || 1}
              </span>
            </div>
            {!isUnlimited && (subscription?.aiContractsUsed || 0) >= (subscription?.aiContractsLimit || 1) && (
              <p className="text-xs text-amber-600 mt-1">Limit reached</p>
            )}
          </div>

          <div className="bg-slate-50 rounded-xl p-4">
            <div className="flex items-center gap-2 text-slate-600 mb-2">
              <PenTool className="w-4 h-4" />
              <span className="text-sm font-medium">Signatures</span>
            </div>
            <div className="flex items-baseline gap-1">
              <span className="text-2xl font-bold text-slate-900">
                {subscription?.signaturesUsed || 0}
              </span>
              <span className="text-slate-500">
                / {isUnlimited ? "∞" : subscription?.signaturesLimit || 3}
              </span>
            </div>
            {!isUnlimited && (subscription?.signaturesUsed || 0) >= (subscription?.signaturesLimit || 3) && (
              <p className="text-xs text-amber-600 mt-1">Limit reached</p>
            )}
          </div>
        </div>
      </div>

      {/* Plans */}
      <div className="mb-8">
        <h2 className="text-lg font-semibold text-slate-900 mb-4">Choose Your Plan</h2>
        <div className="grid md:grid-cols-3 gap-6">
          {PLANS.map((plan) => {
            const isCurrent = plan.id === subscription?.tier;
            const isUpgrade =
              (subscription?.tier === "free" && (plan.id === "pro" || plan.id === "team")) ||
              (subscription?.tier === "pro" && plan.id === "team");

            return (
              <div
                key={plan.id}
                className={`bg-white rounded-2xl border-2 overflow-hidden transition-all ${
                  plan.highlighted
                    ? "border-[#202e46] shadow-xl"
                    : isCurrent
                    ? "border-emerald-500"
                    : "border-slate-200"
                }`}
              >
                {plan.highlighted && (
                  <div className="bg-[#202e46] text-white text-center py-2 text-sm font-medium">
                    MOST POPULAR
                  </div>
                )}
                {isCurrent && !plan.highlighted && (
                  <div className="bg-emerald-500 text-white text-center py-2 text-sm font-medium">
                    CURRENT PLAN
                  </div>
                )}

                <div className="p-6">
                  <h3 className="text-xl font-bold text-slate-900">{plan.name}</h3>
                  <p className="text-slate-600 text-sm mt-1">{plan.description}</p>

                  <div className="mt-4 flex items-baseline gap-1">
                    <span className="text-4xl font-bold text-slate-900">${plan.price}</span>
                    <span className="text-slate-600">/{plan.period}</span>
                  </div>

                  <button
                    onClick={() => isUpgrade && handleUpgrade(plan.id)}
                    disabled={isCurrent || upgrading === plan.id || !isUpgrade}
                    className={`w-full mt-6 py-3 px-4 rounded-xl font-semibold transition-all flex items-center justify-center gap-2 ${
                      isCurrent
                        ? "bg-emerald-100 text-emerald-700 cursor-default"
                        : isUpgrade
                        ? plan.highlighted
                          ? "bg-[#202e46] text-white hover:bg-[#1a2539]"
                          : "bg-slate-100 text-slate-900 hover:bg-slate-200"
                        : "bg-slate-100 text-slate-400 cursor-not-allowed"
                    }`}
                  >
                    {upgrading === plan.id ? (
                      <Loader2 className="w-4 h-4 animate-spin" />
                    ) : isCurrent ? (
                      <>
                        <Check className="w-4 h-4" />
                        Current Plan
                      </>
                    ) : isUpgrade ? (
                      <>
                        {plan.cta}
                        <ArrowRight className="w-4 h-4" />
                      </>
                    ) : (
                      "Current or Lower Tier"
                    )}
                  </button>

                  <ul className="mt-6 space-y-3">
                    {plan.features.map((feature, i) => (
                      <li key={i} className="flex items-start gap-3 text-sm">
                        <div
                          className={`w-5 h-5 rounded-full flex items-center justify-center flex-shrink-0 mt-0.5 ${
                            feature.included ? "bg-emerald-100" : "bg-slate-100"
                          }`}
                        >
                          <Check
                            className={`w-3 h-3 ${
                              feature.included ? "text-emerald-600" : "text-slate-400"
                            }`}
                          />
                        </div>
                        <span className={feature.included ? "text-slate-700" : "text-slate-400"}>
                          {feature.text}
                        </span>
                      </li>
                    ))}
                  </ul>
                </div>
              </div>
            );
          })}
        </div>
      </div>

      {/* FAQ */}
      <div className="bg-slate-50 rounded-2xl p-6">
        <h2 className="text-lg font-semibold text-slate-900 mb-4">Frequently Asked Questions</h2>
        <div className="space-y-4">
          <div>
            <h3 className="font-medium text-slate-900">Can I cancel anytime?</h3>
            <p className="text-sm text-slate-600 mt-1">
              Yes, you can cancel your subscription at any time. You'll continue to have access until the end of your billing period.
            </p>
          </div>
          <div>
            <h3 className="font-medium text-slate-900">What happens to my contracts if I downgrade?</h3>
            <p className="text-sm text-slate-600 mt-1">
              All your existing contracts remain accessible. You'll just be limited on creating new AI contracts and signatures on the free tier.
            </p>
          </div>
          <div>
            <h3 className="font-medium text-slate-900">Do you offer refunds?</h3>
            <p className="text-sm text-slate-600 mt-1">
              We offer a 7-day free trial on Pro and Team plans. If you're not satisfied, contact us within the trial period for a full refund.
            </p>
          </div>
        </div>
      </div>
    </div>
  );
}
