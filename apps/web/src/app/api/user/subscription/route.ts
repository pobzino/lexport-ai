import { NextResponse } from "next/server";
import { createClient } from "@/lib/supabase/server";
import type { EffectiveSubscription, SubscriptionTier } from "@/db/types";

// Feature flags by tier
const TIER_FEATURES: Record<SubscriptionTier, {
  hasAIChat: boolean;
  hasTemplateAccess: boolean; // Free tier has NO template access
  hasPremiumTemplates: boolean;
  hasTeamFeatures: boolean;
  hasApiAccess: boolean;
  platformFeePercent: number;
}> = {
  free: {
    hasAIChat: false,
    hasTemplateAccess: false, // Free tier cannot access templates
    hasPremiumTemplates: false,
    hasTeamFeatures: false,
    hasApiAccess: false,
    platformFeePercent: 5,
  },
  pro: {
    hasAIChat: true,
    hasTemplateAccess: true, // Pro gets template access
    hasPremiumTemplates: true,
    hasTeamFeatures: false,
    hasApiAccess: false,
    platformFeePercent: 2,
  },
  team: {
    hasAIChat: true,
    hasTemplateAccess: true, // Team gets template access
    hasPremiumTemplates: true,
    hasTeamFeatures: true,
    hasApiAccess: true,
    platformFeePercent: 0,
  },
};

export async function GET() {
  try {
    const supabase = await createClient();

    const {
      data: { user },
    } = await supabase.auth.getUser();

    if (!user) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    }

    // Try to get effective subscription using RPC (which considers org override)
    const { data: effectiveData, error: rpcError } = await supabase
      .rpc("get_effective_subscription", { user_uuid: user.id })
      .single<EffectiveSubscription>();

    // If RPC doesn't exist yet (migration not applied), fall back to direct query
    if (rpcError && (rpcError.code === "42883" || rpcError.code === "PGRST202")) {
      // Function doesn't exist, use fallback
      const { data: userData, error: userError } = await supabase
        .from("users")
        .select(
          "subscription_tier, subscription_status, ai_contracts_used, ai_contracts_limit, signatures_used, signatures_limit, usage_reset_at"
        )
        .eq("id", user.id)
        .single();

      // If columns don't exist yet, return defaults
      if (userError && userError.code === "42703") {
        return NextResponse.json({
          tier: "free" as SubscriptionTier,
          status: "active",
          source: "user",
          isUnlimited: false,
          // Usage
          contractsUsed: 0,
          contractsLimit: 1, // Free tier: 1 contract/month
          signaturesUsed: 0,
          signaturesLimit: 3, // Free tier: 3 signatures/month
          usageResetAt: null,
          daysUntilReset: null,
          // Feature flags
          canCreateContract: true,
          canSendSignature: true,
          ...TIER_FEATURES.free,
          organizationName: null,
        });
      }

      if (userError) throw userError;

      const tier = (userData?.subscription_tier as SubscriptionTier) || "free";
      const isUnlimited = tier === "pro" || tier === "team";
      const contractsLimit = userData?.ai_contracts_limit ?? 1; // Default: 1 for free tier
      const signaturesLimit = userData?.signatures_limit ?? 3; // Default: 3 for free tier
      const contractsUsed = userData?.ai_contracts_used ?? 0;
      const signaturesUsed = userData?.signatures_used ?? 0;

      return NextResponse.json({
        tier,
        status: userData?.subscription_status || "active",
        source: "user",
        isUnlimited,
        // Usage
        contractsUsed,
        contractsLimit,
        signaturesUsed,
        signaturesLimit,
        usageResetAt: userData?.usage_reset_at || null,
        daysUntilReset: calculateDaysUntilReset(userData?.usage_reset_at),
        // Feature flags
        canCreateContract: isUnlimited || contractsUsed < contractsLimit,
        canSendSignature: isUnlimited || signaturesUsed < signaturesLimit,
        ...TIER_FEATURES[tier],
        organizationName: null,
      });
    }

    if (rpcError) throw rpcError;

    // Use effective subscription data from RPC
    const tier = effectiveData?.effective_tier || "free";
    const isUnlimited = effectiveData?.is_unlimited || false;
    const contractsLimit = effectiveData?.contracts_limit ?? 1; // Default: 1 for free tier
    const signaturesLimit = effectiveData?.signatures_limit ?? 3; // Default: 3 for free tier
    const contractsUsed = effectiveData?.contracts_used ?? 0;
    const signaturesUsed = effectiveData?.signatures_used ?? 0;

    return NextResponse.json({
      tier,
      status: effectiveData?.effective_status || "active",
      source: effectiveData?.source || "user",
      isUnlimited,
      // Usage
      contractsUsed,
      contractsLimit,
      signaturesUsed,
      signaturesLimit,
      usageResetAt: effectiveData?.usage_reset_at || null,
      daysUntilReset: calculateDaysUntilReset(effectiveData?.usage_reset_at),
      // Feature flags
      canCreateContract: isUnlimited || contractsUsed < contractsLimit,
      canSendSignature: isUnlimited || signaturesUsed < signaturesLimit,
      ...TIER_FEATURES[tier as SubscriptionTier],
      organizationName: effectiveData?.organization_name || null,
    });
  } catch (error) {
    console.error("Error fetching subscription:", error);
    return NextResponse.json(
      { error: "Failed to fetch subscription" },
      { status: 500 }
    );
  }
}

// Calculate days until the next monthly reset
function calculateDaysUntilReset(usageResetAt: string | null | undefined): number | null {
  if (!usageResetAt) return null;

  const resetDate = new Date(usageResetAt);
  const now = new Date();

  // Calculate next reset date (first of next month from reset date)
  const nextReset = new Date(resetDate);
  nextReset.setMonth(nextReset.getMonth() + 1);
  nextReset.setDate(1);
  nextReset.setHours(0, 0, 0, 0);

  // If next reset is in the past, calculate from current month
  if (nextReset < now) {
    nextReset.setFullYear(now.getFullYear());
    nextReset.setMonth(now.getMonth() + 1);
    nextReset.setDate(1);
  }

  const diffTime = nextReset.getTime() - now.getTime();
  const diffDays = Math.ceil(diffTime / (1000 * 60 * 60 * 24));

  return Math.max(0, diffDays);
}
