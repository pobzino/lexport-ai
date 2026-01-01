import { NextResponse } from "next/server";
import { createClient } from "@/lib/supabase/server";
import type { EffectiveSubscription, SubscriptionTier } from "@/db/types";

// Feature flags and limits by tier
const TIER_CONFIG: Record<SubscriptionTier, {
  hasAIChat: boolean;
  hasTemplateAccess: boolean; // Free tier has basic templates only
  hasPremiumTemplates: boolean;
  hasRiskAnalysis: boolean;
  hasTeamFeatures: boolean;
  hasApiAccess: boolean;
  platformFeePercent: number;
  contractsLimit: number; // -1 = unlimited
  signaturesLimit: number; // -1 = unlimited
  chatMessagesLimit: number; // -1 = unlimited
}> = {
  free: {
    hasAIChat: true, // Free users can access chat with 5 message limit
    hasTemplateAccess: true, // Free tier gets basic templates
    hasPremiumTemplates: false,
    hasRiskAnalysis: false, // Risk analysis is Pro+ only
    hasTeamFeatures: false,
    hasApiAccess: false,
    platformFeePercent: 0,
    contractsLimit: 3, // 3 contracts/month
    signaturesLimit: 5, // 5 signatures/month
    chatMessagesLimit: 5, // 5 chat messages/month
  },
  pro: {
    hasAIChat: true,
    hasTemplateAccess: true,
    hasPremiumTemplates: true,
    hasRiskAnalysis: true,
    hasTeamFeatures: false,
    hasApiAccess: false,
    platformFeePercent: 0,
    contractsLimit: 50, // 50 contracts/month
    signaturesLimit: -1, // Unlimited
    chatMessagesLimit: -1, // Unlimited
  },
  team: { // Business plan (stored as "team" in DB)
    hasAIChat: true,
    hasTemplateAccess: true,
    hasPremiumTemplates: true,
    hasRiskAnalysis: true,
    hasTeamFeatures: false, // No team features - just more contracts
    hasApiAccess: false,
    platformFeePercent: 0,
    contractsLimit: 200, // 200 contracts/month
    signaturesLimit: -1, // Unlimited
    chatMessagesLimit: -1, // Unlimited
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

    // If RPC doesn't exist yet (migration not applied) OR user not found, fall back to direct query
    // 42883 = function doesn't exist, PGRST202 = function not found, PGRST116 = no rows found
    if (rpcError && (rpcError.code === "42883" || rpcError.code === "PGRST202" || rpcError.code === "PGRST116")) {
      // Function doesn't exist, use fallback
      const { data: userData, error: userError } = await supabase
        .from("users")
        .select(
          "subscription_tier, subscription_status, ai_contracts_used, ai_contracts_limit, signatures_used, signatures_limit, ai_chat_messages_used, usage_reset_at"
        )
        .eq("id", user.id)
        .single();

      // If columns don't exist yet OR user doesn't exist in table, return defaults
      // 42703 = column not found, PGRST116 = no rows found
      if (userError && (userError.code === "42703" || userError.code === "PGRST116")) {
        const config = TIER_CONFIG.free;
        return NextResponse.json({
          tier: "free" as SubscriptionTier,
          status: "active",
          source: "user",
          isUnlimited: false,
          // Usage
          contractsUsed: 0,
          contractsLimit: config.contractsLimit,
          signaturesUsed: 0,
          signaturesLimit: config.signaturesLimit,
          chatMessagesUsed: 0,
          chatMessagesLimit: config.chatMessagesLimit,
          usageResetAt: null,
          daysUntilReset: null,
          // Feature flags
          canCreateContract: true,
          canSendSignature: true,
          canSendChatMessage: true,
          hasAIChat: config.hasAIChat,
          hasRiskAnalysis: config.hasRiskAnalysis,
          hasTemplateAccess: config.hasTemplateAccess,
          hasPremiumTemplates: config.hasPremiumTemplates,
          hasTeamFeatures: config.hasTeamFeatures,
          hasApiAccess: config.hasApiAccess,
          platformFeePercent: config.platformFeePercent,
          organizationName: null,
        });
      }

      if (userError) throw userError;

      const tier = (userData?.subscription_tier as SubscriptionTier) || "free";
      const config = TIER_CONFIG[tier];
      const contractsLimit = config.contractsLimit;
      const signaturesLimit = config.signaturesLimit;
      const chatMessagesLimit = config.chatMessagesLimit;
      const isUnlimited = contractsLimit === -1;
      const contractsUsed = userData?.ai_contracts_used ?? 0;
      const signaturesUsed = userData?.signatures_used ?? 0;
      const chatMessagesUsed = userData?.ai_chat_messages_used ?? 0;

      return NextResponse.json({
        tier,
        status: userData?.subscription_status || "active",
        source: "user",
        isUnlimited,
        // Usage
        contractsUsed,
        contractsLimit: contractsLimit === -1 ? 999999 : contractsLimit,
        signaturesUsed,
        signaturesLimit: signaturesLimit === -1 ? 999999 : signaturesLimit,
        chatMessagesUsed,
        chatMessagesLimit: chatMessagesLimit === -1 ? 999999 : chatMessagesLimit,
        usageResetAt: userData?.usage_reset_at || null,
        daysUntilReset: calculateDaysUntilReset(userData?.usage_reset_at),
        // Feature flags
        canCreateContract: isUnlimited || contractsUsed < contractsLimit,
        canSendSignature: signaturesLimit === -1 || signaturesUsed < signaturesLimit,
        canSendChatMessage: chatMessagesLimit === -1 || chatMessagesUsed < chatMessagesLimit,
        hasAIChat: config.hasAIChat,
        hasRiskAnalysis: config.hasRiskAnalysis,
        hasTemplateAccess: config.hasTemplateAccess,
        hasPremiumTemplates: config.hasPremiumTemplates,
        hasTeamFeatures: config.hasTeamFeatures,
        hasApiAccess: config.hasApiAccess,
        platformFeePercent: config.platformFeePercent,
        organizationName: null,
      });
    }

    if (rpcError) throw rpcError;

    // Get chat messages used (not in RPC yet)
    const { data: chatData } = await supabase
      .from("users")
      .select("ai_chat_messages_used")
      .eq("id", user.id)
      .single();
    const chatMessagesUsed = chatData?.ai_chat_messages_used ?? 0;

    // Use effective subscription data from RPC
    const tier = (effectiveData?.effective_tier || "free") as SubscriptionTier;
    const config = TIER_CONFIG[tier];
    const contractsLimit = config.contractsLimit;
    const signaturesLimit = config.signaturesLimit;
    const chatMessagesLimit = config.chatMessagesLimit;
    const isUnlimited = contractsLimit === -1;
    const contractsUsed = effectiveData?.contracts_used ?? 0;
    const signaturesUsed = effectiveData?.signatures_used ?? 0;

    return NextResponse.json({
      tier,
      status: effectiveData?.effective_status || "active",
      source: effectiveData?.source || "user",
      isUnlimited,
      // Usage
      contractsUsed,
      contractsLimit: contractsLimit === -1 ? 999999 : contractsLimit,
      signaturesUsed,
      signaturesLimit: signaturesLimit === -1 ? 999999 : signaturesLimit,
      chatMessagesUsed,
      chatMessagesLimit: chatMessagesLimit === -1 ? 999999 : chatMessagesLimit,
      usageResetAt: effectiveData?.usage_reset_at || null,
      daysUntilReset: calculateDaysUntilReset(effectiveData?.usage_reset_at),
      // Feature flags
      canCreateContract: isUnlimited || contractsUsed < contractsLimit,
      canSendSignature: signaturesLimit === -1 || signaturesUsed < signaturesLimit,
      canSendChatMessage: chatMessagesLimit === -1 || chatMessagesUsed < chatMessagesLimit,
      hasAIChat: config.hasAIChat,
      hasRiskAnalysis: config.hasRiskAnalysis,
      hasTemplateAccess: config.hasTemplateAccess,
      hasPremiumTemplates: config.hasPremiumTemplates,
      hasTeamFeatures: config.hasTeamFeatures,
      hasApiAccess: config.hasApiAccess,
      platformFeePercent: config.platformFeePercent,
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
