"use client";

import { useState, useEffect, useRef } from "react";
import { useSearchParams } from "next/navigation";
import {
  CreditCard,
  Check,
  ArrowRight,
  Loader2,
  AlertCircle,
  Crown,
  Zap,
  Users,
  FileText,
  PenTool,
  Building2,
  RefreshCw,
  MessageSquare,
  Code,
} from "lucide-react";
import {
  useSubscription,
  getUsagePercentage,
  getTierDisplayName,
  getTierBadgeColor,
} from "@/lib/hooks/useSubscription";
import type { SubscriptionTier } from "@/db/types";
import { trackSubscription } from "@/lib/gtm";

interface PlanDef {
  id: SubscriptionTier;
  name: string;
  monthlyPrice: number;
  annualPrice: number;
  description: string;
  features: Array<{ text: string; included: boolean }>;
  cta: string;
  highlighted: boolean;
}

const PLANS: PlanDef[] = [
  {
    id: "free",
    name: "Free",
    monthlyPrice: 0,
    annualPrice: 0,
    description: "Try it out",
    features: [
      { text: "1 AI contract/month", included: true },
      { text: "2 signature requests/month", included: true },
      { text: "Collect payments", included: true },
      { text: "Basic templates", included: true },
      { text: "AI contract chat", included: false },
      { text: "Premium templates", included: false },
    ],
    cta: "Current Plan",
    highlighted: false,
  },
  {
    id: "pro",
    name: "Pro",
    monthlyPrice: 19.99,
    annualPrice: 149.99,
    description: "For freelancers & professionals",
    features: [
      { text: "50 AI contracts/month", included: true },
      { text: "Unlimited signatures", included: true },
      { text: "Full template library", included: true },
      { text: "AI contract chat & review", included: true },
      { text: "Priority support", included: true },
      { text: "Premium templates", included: true },
    ],
    cta: "Upgrade to Pro",
    highlighted: true,
  },
  {
    id: "team",
    name: "Business",
    monthlyPrice: 39.99,
    annualPrice: 399.99,
    description: "For high-volume users",
    features: [
      { text: "200 AI contracts/month", included: true },
      { text: "Unlimited signatures", included: true },
      { text: "Full template library", included: true },
      { text: "AI contract chat & review", included: true },
      { text: "Priority support", included: true },
      { text: "Dedicated account manager", included: true },
    ],
    cta: "Upgrade to Business",
    highlighted: false,
  },
];

export default function BillingPage() {
  const subscription = useSubscription();
  const searchParams = useSearchParams();
  const [upgrading, setUpgrading] = useState<string | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [successMessage, setSuccessMessage] = useState<string | null>(null);
  const [verifying, setVerifying] = useState(false);
  const [billingCycle, setBillingCycle] = useState<"monthly" | "annual">("monthly");

  const plansSectionRef = useRef<HTMLDivElement>(null);

  // Get promo code from URL (e.g., /settings/billing?promo=FIRST50)
  const promoCode = searchParams.get("promo");
  const isSuccess = searchParams.get("success") === "true";
  const sessionId = searchParams.get("session_id");
  const isCanceled = searchParams.get("canceled") === "true";

  // Verify session on success redirect — ensures subscription is active even if webhook was slow
  useEffect(() => {
    if (!isSuccess || !sessionId || verifying || successMessage) return;

    async function verifySession() {
      setVerifying(true);
      try {
        const res = await fetch("/api/billing/verify-session", {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({ sessionId }),
        });
        const data = await res.json();
        if (res.ok) {
          setSuccessMessage(
            data.status === "already_active"
              ? "Your subscription is active!"
              : "Your subscription has been activated successfully!"
          );
          // Track conversion
          if (data.status !== "already_active") {
            trackSubscription(data.plan || "pro");
          }
          // Refresh subscription data
          subscription.refetch();
        } else {
          setError(data.error || "Failed to verify subscription. Please refresh the page.");
        }
      } catch {
        setError("Failed to verify subscription. Please refresh the page.");
      } finally {
        setVerifying(false);
      }
    }

    verifySession();
  }, [isSuccess, sessionId]); // eslint-disable-line react-hooks/exhaustive-deps

  // Auto-scroll to plans section when promo code is present (wait for subscription to load)
  useEffect(() => {
    if (promoCode && !subscription.isLoading && plansSectionRef.current) {
      setTimeout(() => {
        plansSectionRef.current?.scrollIntoView({ behavior: "smooth" });
      }, 100);
    }
  }, [promoCode, subscription.isLoading]);

  const handleUpgrade = async (planId: string) => {
    if (planId === subscription.tier) return;

    setUpgrading(planId);
    setError(null);

    try {
      const response = await fetch("/api/billing/create-checkout", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ planId, promoCode: promoCode || undefined, billingCycle }),
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

  if (subscription.isLoading) {
    return (
      <div className="flex items-center justify-center min-h-[400px]">
        <Loader2 className="w-8 h-8 animate-spin text-slate-400" />
      </div>
    );
  }

  const currentPlan = PLANS.find((p) => p.id === subscription.tier) || PLANS[0];

  // Check if limits are effectively unlimited (999999 is the placeholder for unlimited)
  const isContractsUnlimited = subscription.contractsLimit >= 999999;
  const isSignaturesUnlimited = subscription.signaturesLimit >= 999999;
  const isChatUnlimited = subscription.chatMessagesLimit >= 999999;

  const contractsPercent = isContractsUnlimited ? 0 : getUsagePercentage(subscription.contractsUsed, subscription.contractsLimit);
  const signaturesPercent = isSignaturesUnlimited ? 0 : getUsagePercentage(subscription.signaturesUsed, subscription.signaturesLimit);

  return (
    <div className="max-w-5xl mx-auto">
      <div className="mb-8">
        <h1 className="text-2xl font-bold text-slate-900">Billing & Subscription</h1>
        <p className="text-slate-600 mt-1">Manage your subscription and billing details</p>
      </div>

      {verifying && (
        <div className="mb-6 p-4 bg-blue-50 border border-blue-200 rounded-xl flex items-center gap-3">
          <Loader2 className="w-5 h-5 text-blue-500 animate-spin flex-shrink-0" />
          <p className="text-blue-800 font-medium">Verifying your subscription...</p>
        </div>
      )}

      {successMessage && (
        <div className="mb-6 p-4 bg-emerald-50 border border-emerald-200 rounded-xl flex items-start gap-3">
          <Check className="w-5 h-5 text-emerald-500 flex-shrink-0 mt-0.5" />
          <div>
            <p className="text-emerald-800 font-medium">{successMessage}</p>
            <p className="text-emerald-700 text-sm">Your account has been upgraded. Enjoy your new features!</p>
          </div>
        </div>
      )}

      {isCanceled && !successMessage && (
        <div className="mb-6 p-4 bg-amber-50 border border-amber-200 rounded-xl flex items-start gap-3">
          <AlertCircle className="w-5 h-5 text-amber-500 flex-shrink-0 mt-0.5" />
          <p className="text-amber-800 font-medium">Checkout was canceled. No charges were made.</p>
        </div>
      )}

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
              subscription.tier === "free"
                ? "bg-slate-100"
                : subscription.tier === "pro"
                ? "bg-[#202e46]"
                : "bg-gradient-to-br from-purple-500 to-indigo-600"
            }`}>
              {subscription.tier === "free" ? (
                <FileText className="w-6 h-6 text-slate-600" />
              ) : subscription.tier === "pro" ? (
                <Zap className="w-6 h-6 text-white" />
              ) : (
                <Crown className="w-6 h-6 text-white" />
              )}
            </div>
            <div>
              <div className="flex items-center gap-2">
                <h2 className="text-lg font-semibold text-slate-900">
                  {currentPlan.name} Plan
                </h2>
                {subscription.source === "organization" && subscription.organizationName && (
                  <span className="inline-flex items-center gap-1 px-2 py-0.5 bg-purple-100 text-purple-700 text-xs font-medium rounded-full">
                    <Building2 className="w-3 h-3" />
                    {subscription.organizationName}
                  </span>
                )}
              </div>
              <p className="text-sm text-slate-500">{currentPlan.description}</p>
            </div>
          </div>
          <div className="flex items-center gap-2">
            {subscription.tier !== "free" && subscription.source !== "organization" && (
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
        </div>

        {/* Feature Badges */}
        <div className="flex flex-wrap gap-2 mb-6">
          {subscription.hasTemplateAccess && (
            <span className="inline-flex items-center gap-1 px-2 py-1 bg-indigo-50 text-indigo-700 text-xs font-medium rounded-lg">
              <FileText className="w-3 h-3" />
              Template Library
            </span>
          )}
          {subscription.hasAIChat && (
            <span className="inline-flex items-center gap-1 px-2 py-1 bg-blue-50 text-blue-700 text-xs font-medium rounded-lg">
              <MessageSquare className="w-3 h-3" />
              AI Chat
            </span>
          )}
          {subscription.hasPremiumTemplates && (
            <span className="inline-flex items-center gap-1 px-2 py-1 bg-amber-50 text-amber-700 text-xs font-medium rounded-lg">
              <Crown className="w-3 h-3" />
              Premium Templates
            </span>
          )}
          {subscription.hasTeamFeatures && (
            <span className="inline-flex items-center gap-1 px-2 py-1 bg-purple-50 text-purple-700 text-xs font-medium rounded-lg">
              <Users className="w-3 h-3" />
              Team Features
            </span>
          )}
          {subscription.hasApiAccess && (
            <span className="inline-flex items-center gap-1 px-2 py-1 bg-emerald-50 text-emerald-700 text-xs font-medium rounded-lg">
              <Code className="w-3 h-3" />
              API Access
            </span>
          )}
        </div>

        {/* Usage Stats */}
        <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
          {/* Contracts Usage */}
          <div className="bg-slate-50 rounded-xl p-4">
            <div className="flex items-center justify-between mb-2">
              <div className="flex items-center gap-2 text-slate-600">
                <FileText className="w-4 h-4" />
                <span className="text-sm font-medium">AI Contracts</span>
              </div>
              {!isContractsUnlimited && subscription.daysUntilReset !== null && (
                <span className="text-xs text-slate-500 flex items-center gap-1">
                  <RefreshCw className="w-3 h-3" />
                  Resets in {subscription.daysUntilReset} day{subscription.daysUntilReset !== 1 ? "s" : ""}
                </span>
              )}
            </div>
            <div className="flex items-baseline gap-1 mb-2">
              <span className="text-2xl font-bold text-slate-900">
                {isContractsUnlimited ? "Unlimited" : subscription.contractsUsed}
              </span>
              {!isContractsUnlimited && (
                <span className="text-slate-500">
                  / {subscription.contractsLimit}
                </span>
              )}
            </div>
            {!isContractsUnlimited && (
              <div className="h-2 bg-slate-200 rounded-full overflow-hidden">
                <div
                  className={`h-full rounded-full transition-all ${
                    contractsPercent >= 100 ? "bg-red-500" : contractsPercent >= 80 ? "bg-amber-500" : "bg-emerald-500"
                  }`}
                  style={{ width: `${Math.min(100, contractsPercent)}%` }}
                />
              </div>
            )}
            {!subscription.canCreateContract && !isContractsUnlimited && (
              <p className="text-xs text-red-600 mt-2 font-medium">Limit reached - upgrade to create more</p>
            )}
          </div>

          {/* Signatures Usage */}
          <div className="bg-slate-50 rounded-xl p-4">
            <div className="flex items-center justify-between mb-2">
              <div className="flex items-center gap-2 text-slate-600">
                <PenTool className="w-4 h-4" />
                <span className="text-sm font-medium">Signature Requests</span>
              </div>
              {!isSignaturesUnlimited && subscription.daysUntilReset !== null && (
                <span className="text-xs text-slate-500 flex items-center gap-1">
                  <RefreshCw className="w-3 h-3" />
                  Resets in {subscription.daysUntilReset} day{subscription.daysUntilReset !== 1 ? "s" : ""}
                </span>
              )}
            </div>
            <div className="flex items-baseline gap-1 mb-2">
              <span className="text-2xl font-bold text-slate-900">
                {isSignaturesUnlimited ? "Unlimited" : subscription.signaturesUsed}
              </span>
              {!isSignaturesUnlimited && (
                <span className="text-slate-500">
                  / {subscription.signaturesLimit}
                </span>
              )}
            </div>
            {!isSignaturesUnlimited && (
              <div className="h-2 bg-slate-200 rounded-full overflow-hidden">
                <div
                  className={`h-full rounded-full transition-all ${
                    signaturesPercent >= 100 ? "bg-red-500" : signaturesPercent >= 80 ? "bg-amber-500" : "bg-emerald-500"
                  }`}
                  style={{ width: `${Math.min(100, signaturesPercent)}%` }}
                />
              </div>
            )}
            {!subscription.canSendSignature && !isSignaturesUnlimited && (
              <p className="text-xs text-red-600 mt-2 font-medium">Limit reached - upgrade for more</p>
            )}
          </div>
        </div>
      </div>

      {/* Plans */}
      <div className="mb-8" ref={plansSectionRef}>
        <div className="flex items-center justify-between mb-4">
          <h2 className="text-lg font-semibold text-slate-900">Choose Your Plan</h2>
          <div className="flex items-center bg-slate-100 rounded-lg p-1">
            <button
              onClick={() => setBillingCycle("monthly")}
              className={`px-3 py-1.5 text-sm font-medium rounded-md transition-all ${
                billingCycle === "monthly"
                  ? "bg-white text-slate-900 shadow-sm"
                  : "text-slate-500 hover:text-slate-700"
              }`}
            >
              Monthly
            </button>
            <button
              onClick={() => setBillingCycle("annual")}
              className={`px-3 py-1.5 text-sm font-medium rounded-md transition-all ${
                billingCycle === "annual"
                  ? "bg-white text-slate-900 shadow-sm"
                  : "text-slate-500 hover:text-slate-700"
              }`}
            >
              Annual
              <span className="ml-1.5 text-xs font-semibold text-emerald-600">Save 37%</span>
            </button>
          </div>
        </div>
        <div className="grid md:grid-cols-3 gap-6">
          {PLANS.map((plan) => {
            const isCurrent = plan.id === subscription.tier;
            const tierOrder: Record<string, number> = { free: 0, pro: 1, team: 2 };
            const currentTierOrder = tierOrder[subscription.tier] ?? 0;
            const planTierOrder = tierOrder[plan.id] ?? 0;
            const isUpgrade = planTierOrder > currentTierOrder;
            const isDowngrade = planTierOrder < currentTierOrder;
            const isBusinessPlan = plan.id === "team";
            const isManagedByOrg = subscription.source === "organization" && isCurrent;

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
                    {plan.id === "free" ? (
                      <>
                        <span className="text-4xl font-bold text-slate-900">$0</span>
                        <span className="text-slate-600">/forever</span>
                      </>
                    ) : billingCycle === "annual" ? (
                      <>
                        <span className="text-4xl font-bold text-slate-900">
                          ${(plan.annualPrice / 12).toFixed(2)}
                        </span>
                        <span className="text-slate-600">/mo</span>
                        <span className="ml-2 text-sm text-slate-400 line-through">
                          ${plan.monthlyPrice}
                        </span>
                      </>
                    ) : promoCode === "FIRST50" && plan.id === "pro" && !subscription.hasSubscribedBefore ? (
                      <>
                        <span className="text-4xl font-bold text-slate-900">${(plan.monthlyPrice / 2).toFixed(2)}</span>
                        <span className="text-slate-600">/mo</span>
                        <span className="ml-2 text-sm text-slate-400 line-through">
                          ${plan.monthlyPrice}
                        </span>
                      </>
                    ) : (
                      <>
                        <span className="text-4xl font-bold text-slate-900">${plan.monthlyPrice}</span>
                        <span className="text-slate-600">/month</span>
                      </>
                    )}
                  </div>
                  {plan.id !== "free" && billingCycle === "annual" && (
                    <p className="text-xs text-emerald-600 font-medium mt-1">
                      ${plan.annualPrice}/year — save ${((plan.monthlyPrice * 12) - plan.annualPrice).toFixed(0)}/year
                    </p>
                  )}
                  {promoCode === "FIRST50" && plan.id === "pro" && billingCycle === "monthly" && !subscription.hasSubscribedBefore && (
                    <p className="text-xs text-emerald-600 font-medium mt-1">
                      50% off your first month
                    </p>
                  )}

                  {isBusinessPlan && !isCurrent ? (
                    <a
                      href="mailto:team@lexportai.com?subject=Lexport Business Plan Inquiry"
                      className="w-full mt-6 py-3 px-4 rounded-xl font-semibold transition-all flex items-center justify-center gap-2 bg-slate-100 text-slate-900 hover:bg-slate-200"
                    >
                      {plan.cta}
                      <ArrowRight className="w-4 h-4" />
                    </a>
                  ) : (
                    <button
                      onClick={() => isUpgrade && !isManagedByOrg && handleUpgrade(plan.id)}
                      disabled={isCurrent || upgrading === plan.id || !isUpgrade || isManagedByOrg}
                      className={`w-full mt-6 py-3 px-4 rounded-xl font-semibold transition-all flex items-center justify-center gap-2 ${
                        isCurrent
                          ? "bg-emerald-100 text-emerald-700 cursor-default"
                          : isUpgrade && !isManagedByOrg
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
                      ) : isDowngrade ? (
                        "Included in your plan"
                      ) : (
                        "Current Plan"
                      )}
                    </button>
                  )}

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
            <h3 className="font-medium text-slate-900">When do my free tier limits reset?</h3>
            <p className="text-sm text-slate-600 mt-1">
              Free tier usage limits reset on the 1st of each month. You'll see the countdown to your next reset in the usage section above.
            </p>
          </div>
          <div>
            <h3 className="font-medium text-slate-900">What happens to my contracts if I downgrade?</h3>
            <p className="text-sm text-slate-600 mt-1">
              All your existing contracts remain accessible. You'll just be limited on creating new AI contracts and signatures on the free tier.
            </p>
          </div>
          <div>
            <h3 className="font-medium text-slate-900">Do you offer any discounts?</h3>
            <p className="text-sm text-slate-600 mt-1">
              {subscription.hasSubscribedBefore
                ? "Save up to 37% with annual billing. We also have a generous free tier so you can try Lexport before upgrading."
                : "New subscribers get 50% off their first month. You can also save up to 37% with annual billing."}
            </p>
          </div>
        </div>
      </div>
    </div>
  );
}
