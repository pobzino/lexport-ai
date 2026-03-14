"use client";

import { useState, useEffect, useCallback } from "react";
import type { SubscriptionTier, SubscriptionStatus } from "@/db/types";

export interface SubscriptionData {
  // Core subscription info
  tier: SubscriptionTier;
  status: SubscriptionStatus;
  source: "user" | "organization";
  isUnlimited: boolean;

  // Usage tracking
  contractsUsed: number;
  contractsLimit: number;
  signaturesUsed: number;
  signaturesLimit: number;
  chatMessagesUsed: number;
  chatMessagesLimit: number;
  usageResetAt: string | null;
  daysUntilReset: number | null;

  // Feature flags
  canCreateContract: boolean;
  canSendSignature: boolean;
  canSendChatMessage: boolean;
  hasAIChat: boolean;
  hasRiskAnalysis: boolean;
  hasTemplateAccess: boolean; // Pro+ only - free tier has no template access
  hasPremiumTemplates: boolean;
  hasTeamFeatures: boolean;
  hasApiAccess: boolean;
  platformFeePercent: number;

  // Organization context
  organizationName: string | null;

  // Billing history
  hasSubscribedBefore: boolean;

  // Loading state
  isLoading: boolean;
  error: string | null;

  // Actions
  refetch: () => Promise<void>;
}

// Legacy field names for backwards compatibility
export interface LegacySubscriptionData extends SubscriptionData {
  aiContractsUsed: number;
  aiContractsLimit: number;
}

const DEFAULT_DATA: Omit<SubscriptionData, "refetch"> = {
  tier: "free",
  status: "active",
  source: "user",
  isUnlimited: false,
  contractsUsed: 0,
  contractsLimit: 1, // Free tier: 1 contract/month
  signaturesUsed: 0,
  signaturesLimit: 2, // Free tier: 2 signatures/month
  chatMessagesUsed: 0,
  chatMessagesLimit: 3, // Free tier: 3 chat messages/month
  usageResetAt: null,
  daysUntilReset: null,
  canCreateContract: true,
  canSendSignature: true,
  canSendChatMessage: true,
  hasAIChat: true, // Free users can access chat (with 5 msg limit)
  hasRiskAnalysis: false, // Risk analysis is Pro+ only
  hasTemplateAccess: true, // Free tier: basic templates
  hasPremiumTemplates: false,
  hasTeamFeatures: false,
  hasApiAccess: false,
  platformFeePercent: 0,
  organizationName: null,
  hasSubscribedBefore: false,
  isLoading: true,
  error: null,
};

export function useSubscription(): SubscriptionData & LegacySubscriptionData {
  const [data, setData] = useState<Omit<SubscriptionData, "refetch">>(DEFAULT_DATA);

  const fetchSubscription = useCallback(async () => {
    try {
      setData((prev) => ({ ...prev, isLoading: true, error: null }));

      const response = await fetch("/api/user/subscription");
      if (!response.ok) {
        throw new Error("Failed to fetch subscription");
      }
      const result = await response.json();

      setData({
        tier: result.tier || "free",
        status: result.status || "active",
        source: result.source || "user",
        isUnlimited: result.isUnlimited || false,
        // Usage tracking
        contractsUsed: result.contractsUsed ?? 0,
        contractsLimit: result.contractsLimit ?? 1, // Default: 1 for free tier
        signaturesUsed: result.signaturesUsed ?? 0,
        signaturesLimit: result.signaturesLimit ?? 2, // Default: 2 for free tier
        chatMessagesUsed: result.chatMessagesUsed ?? 0,
        chatMessagesLimit: result.chatMessagesLimit ?? 3, // Default: 3 for free tier
        usageResetAt: result.usageResetAt || null,
        daysUntilReset: result.daysUntilReset ?? null,
        // Feature flags
        canCreateContract: result.canCreateContract ?? true,
        canSendSignature: result.canSendSignature ?? true,
        canSendChatMessage: result.canSendChatMessage ?? true,
        hasAIChat: result.hasAIChat ?? true, // Free users can access chat
        hasRiskAnalysis: result.hasRiskAnalysis ?? false, // Pro+ only
        hasTemplateAccess: result.hasTemplateAccess ?? true, // Basic templates for all
        hasPremiumTemplates: result.hasPremiumTemplates ?? false,
        hasTeamFeatures: result.hasTeamFeatures ?? false,
        hasApiAccess: result.hasApiAccess ?? false,
        platformFeePercent: result.platformFeePercent ?? 0,
        // Organization
        organizationName: result.organizationName || null,
        // Billing history
        hasSubscribedBefore: result.hasSubscribedBefore ?? false,
        // State
        isLoading: false,
        error: null,
      });
    } catch (err) {
      setData((prev) => ({
        ...prev,
        isLoading: false,
        error: err instanceof Error ? err.message : "Unknown error",
      }));
    }
  }, []);

  useEffect(() => {
    fetchSubscription();
  }, [fetchSubscription]);

  // Return with legacy field aliases and refetch function
  return {
    ...data,
    // Legacy field names for backwards compatibility
    aiContractsUsed: data.contractsUsed,
    aiContractsLimit: data.contractsLimit,
    // Refetch function
    refetch: fetchSubscription,
  };
}

// Feature-specific upgrade checks
export type FeatureType =
  | "ai_contract"
  | "signature"
  | "ai_chat"
  | "risk_analysis"
  | "templates" // All templates - Pro+ only
  | "premium_template"
  | "team_features"
  | "api_access";

export function requiresUpgrade(
  subscription: SubscriptionData | LegacySubscriptionData,
  feature: FeatureType
): boolean {
  // Pro and Team tiers have access to most features
  if (subscription.tier === "pro" || subscription.tier === "team") {
    // Only team features require Team tier specifically
    if (feature === "team_features" || feature === "api_access") {
      return subscription.tier !== "team";
    }
    return false;
  }

  // Free tier checks
  switch (feature) {
    case "ai_contract":
      return !subscription.canCreateContract;
    case "signature":
      return !subscription.canSendSignature;
    case "ai_chat":
      return !subscription.canSendChatMessage;
    case "risk_analysis":
      return !subscription.hasRiskAnalysis;
    case "templates":
      return !subscription.hasTemplateAccess; // Free tier has no template access
    case "premium_template":
      return !subscription.hasPremiumTemplates;
    case "team_features":
      return !subscription.hasTeamFeatures;
    case "api_access":
      return !subscription.hasApiAccess;
    default:
      return false;
  }
}

// Get upgrade message for a feature
export function getUpgradeMessage(feature: FeatureType): {
  title: string;
  description: string;
  ctaText: string;
} {
  switch (feature) {
    case "ai_contract":
      return {
        title: "Contract Limit Reached",
        description: "You've used all your AI contract generations this month. Upgrade to Pro for 50 contracts/month.",
        ctaText: "Upgrade to Pro",
      };
    case "signature":
      return {
        title: "Signature Limit Reached",
        description: "You've used all your signature requests this month. Upgrade to Pro for unlimited signatures.",
        ctaText: "Upgrade to Pro",
      };
    case "ai_chat":
      return {
        title: "AI Chat Limit Reached",
        description: "You've used all 3 free AI chat messages this month. Upgrade to Pro for unlimited chat.",
        ctaText: "Upgrade to Pro",
      };
    case "risk_analysis":
      return {
        title: "Risk Analysis is a Pro Feature",
        description: "Get AI-powered analysis of potential risks and issues in your contracts. Available on Pro and Business plans.",
        ctaText: "Upgrade to Pro",
      };
    case "templates":
      return {
        title: "Premium Templates",
        description: "Access our full library of premium legal templates. Upgrade to Pro for all templates.",
        ctaText: "Upgrade to Pro",
      };
    case "premium_template":
      return {
        title: "Premium Template",
        description: "This template is part of our premium collection. Upgrade to Pro for access to all premium templates.",
        ctaText: "Upgrade to Pro",
      };
    case "team_features":
      return {
        title: "Business Features",
        description: "Need more contracts? Upgrade to Business for 200 contracts/month.",
        ctaText: "Upgrade to Business",
      };
    case "api_access":
      return {
        title: "API Access Required",
        description: "Integrate Lexport with your systems using our API. Contact us for access.",
        ctaText: "Contact Us",
      };
    default:
      return {
        title: "Upgrade Required",
        description: "This feature requires an upgraded subscription.",
        ctaText: "View Plans",
      };
  }
}

// Calculate usage percentage for progress bars
export function getUsagePercentage(used: number, limit: number): number {
  if (limit <= 0) return 0; // Unlimited
  return Math.min(100, Math.round((used / limit) * 100));
}

// Get tier display name
export function getTierDisplayName(tier: SubscriptionTier): string {
  switch (tier) {
    case "free":
      return "Free";
    case "pro":
      return "Pro";
    case "team":
      return "Business";
    default:
      return "Free";
  }
}

// Get tier badge color
export function getTierBadgeColor(tier: SubscriptionTier): string {
  switch (tier) {
    case "free":
      return "bg-slate-100 text-slate-700";
    case "pro":
      return "bg-blue-100 text-blue-700";
    case "team":
      return "bg-purple-100 text-purple-700";
    default:
      return "bg-slate-100 text-slate-700";
  }
}
