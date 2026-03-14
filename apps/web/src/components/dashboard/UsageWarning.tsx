"use client";

import Link from "next/link";
import { ArrowRight } from "lucide-react";
import { useSubscription, getUsagePercentage } from "@/lib/hooks/useSubscription";

export function UsageWarning() {
  const subscription = useSubscription();

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

  const contractsNearLimit = contractsPercent >= 80;
  const signaturesNearLimit = signaturesPercent >= 80;
  const contractsAtLimit = subscription.contractsUsed >= subscription.contractsLimit;
  const signaturesAtLimit = subscription.signaturesUsed >= subscription.signaturesLimit;

  if (!contractsNearLimit && !signaturesNearLimit) {
    return null;
  }

  const atLimit = contractsAtLimit || signaturesAtLimit;

  let message = "";
  if (contractsAtLimit) {
    message = `${subscription.contractsUsed}/${subscription.contractsLimit} contracts used`;
  } else if (signaturesAtLimit) {
    message = `${subscription.signaturesUsed}/${subscription.signaturesLimit} signatures used`;
  } else if (contractsNearLimit) {
    message = `${subscription.contractsUsed}/${subscription.contractsLimit} contracts used`;
  } else if (signaturesNearLimit) {
    message = `${subscription.signaturesUsed}/${subscription.signaturesLimit} signatures used`;
  }

  const resetText =
    !atLimit && subscription.daysUntilReset !== null
      ? ` · Resets in ${subscription.daysUntilReset}d`
      : "";

  const percent = Math.round(Math.max(contractsPercent, signaturesPercent));

  return (
    <div
      className={`rounded-xl border px-4 py-3 ${
        atLimit
          ? "bg-red-50 border-red-200"
          : "bg-amber-50 border-amber-200"
      }`}
    >
      <div className="flex items-center gap-3">
        {/* Usage bar */}
        <div className="flex-1 min-w-0">
          <div className="flex items-center justify-between mb-1.5">
            <p className={`text-sm font-semibold ${atLimit ? "text-red-900" : "text-amber-900"}`}>
              {atLimit ? "Limit reached" : "Almost there"}
            </p>
            <span className={`text-xs font-medium ${atLimit ? "text-red-600" : "text-amber-600"}`}>
              {message}{resetText}
            </span>
          </div>
          <div className={`h-1.5 rounded-full ${atLimit ? "bg-red-200" : "bg-amber-200"}`}>
            <div
              className={`h-full rounded-full transition-all ${atLimit ? "bg-red-500" : "bg-amber-500"}`}
              style={{ width: `${Math.min(percent, 100)}%` }}
            />
          </div>
        </div>

        {/* CTA */}
        <Link
          href={subscription.hasSubscribedBefore ? "/settings/billing" : "/settings/billing?promo=FIRST50"}
          className={`flex-shrink-0 inline-flex items-center gap-1.5 px-4 py-1.5 text-xs font-semibold rounded-lg transition-all active:scale-[0.98] ${
            atLimit
              ? "bg-red-600 text-white hover:bg-red-500"
              : "bg-amber-600 text-white hover:bg-amber-500"
          }`}
        >
          Upgrade
          <ArrowRight className="w-3 h-3" />
        </Link>
      </div>
    </div>
  );
}
