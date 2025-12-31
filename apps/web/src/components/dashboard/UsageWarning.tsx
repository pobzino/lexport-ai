"use client";

import Link from "next/link";
import { AlertTriangle, Sparkles } from "lucide-react";
import { useSubscription, getUsagePercentage } from "@/lib/hooks/useSubscription";

export function UsageWarning() {
  const subscription = useSubscription();

  // Don't show for paid users or while loading
  if (subscription.isLoading || subscription.tier !== "free") {
    return null;
  }

  const contractsPercent = getUsagePercentage(
    subscription.contractsUsed,
    subscription.contractsLimit
  );
  const signaturesPercent = getUsagePercentage(
    subscription.signaturesUsed,
    subscription.signaturesLimit
  );

  // Show warning at 80% or higher, or when at limit
  const contractsNearLimit = contractsPercent >= 80;
  const signaturesNearLimit = signaturesPercent >= 80;
  const contractsAtLimit = subscription.contractsUsed >= subscription.contractsLimit;
  const signaturesAtLimit = subscription.signaturesUsed >= subscription.signaturesLimit;

  if (!contractsNearLimit && !signaturesNearLimit) {
    return null;
  }

  const atLimit = contractsAtLimit || signaturesAtLimit;

  return (
    <div
      className={`rounded-xl p-4 border ${
        atLimit
          ? "bg-red-50 border-red-200"
          : "bg-amber-50 border-amber-200"
      }`}
    >
      <div className="flex items-start gap-3">
        <div
          className={`p-2 rounded-lg ${
            atLimit ? "bg-red-100" : "bg-amber-100"
          }`}
        >
          <AlertTriangle
            className={`w-4 h-4 ${atLimit ? "text-red-600" : "text-amber-600"}`}
          />
        </div>
        <div className="flex-1 min-w-0">
          <h4
            className={`font-semibold text-sm ${
              atLimit ? "text-red-900" : "text-amber-900"
            }`}
          >
            {atLimit ? "You've hit your free limit" : "You're running low"}
          </h4>
          <p
            className={`text-sm mt-0.5 ${
              atLimit ? "text-red-700" : "text-amber-700"
            }`}
          >
            {contractsAtLimit && (
              <>You've used all {subscription.contractsLimit} AI contract{subscription.contractsLimit > 1 ? "s" : ""} this month. </>
            )}
            {signaturesAtLimit && !contractsAtLimit && (
              <>You've used all {subscription.signaturesLimit} signature requests this month. </>
            )}
            {!atLimit && contractsNearLimit && (
              <>You've used {subscription.contractsUsed} of {subscription.contractsLimit} AI contract{subscription.contractsLimit > 1 ? "s" : ""}. </>
            )}
            {!atLimit && signaturesNearLimit && !contractsNearLimit && (
              <>You've used {subscription.signaturesUsed} of {subscription.signaturesLimit} signature requests. </>
            )}
            {subscription.daysUntilReset !== null && !atLimit && (
              <span className="text-amber-600">Resets in {subscription.daysUntilReset} day{subscription.daysUntilReset !== 1 ? "s" : ""}.</span>
            )}
          </p>
          <Link
            href="/settings/billing?promo=FIRST50"
            className={`inline-flex items-center gap-1.5 mt-2 text-sm font-medium ${
              atLimit
                ? "text-red-700 hover:text-red-800"
                : "text-amber-700 hover:text-amber-800"
            }`}
          >
            <Sparkles className="w-3.5 h-3.5" />
            Upgrade to Pro — 50% off first month
          </Link>
        </div>
      </div>
    </div>
  );
}
