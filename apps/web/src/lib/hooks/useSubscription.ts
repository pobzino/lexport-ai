"use client";

import { useState, useEffect } from "react";

export interface SubscriptionData {
  tier: "free" | "pro" | "team";
  status: "active" | "past_due" | "canceled" | "trialing";
  aiContractsUsed: number;
  aiContractsLimit: number;
  signaturesUsed: number;
  signaturesLimit: number;
  isLoading: boolean;
  error: string | null;
  // Computed helpers
  canCreateContract: boolean;
  canSendSignature: boolean;
  isUnlimited: boolean;
}

export function useSubscription(): SubscriptionData {
  const [data, setData] = useState<SubscriptionData>({
    tier: "free",
    status: "active",
    aiContractsUsed: 0,
    aiContractsLimit: 1,
    signaturesUsed: 0,
    signaturesLimit: 3,
    isLoading: true,
    error: null,
    canCreateContract: true,
    canSendSignature: true,
    isUnlimited: false,
  });

  useEffect(() => {
    async function fetchSubscription() {
      try {
        const response = await fetch("/api/user/subscription");
        if (!response.ok) {
          throw new Error("Failed to fetch subscription");
        }
        const result = await response.json();

        const isUnlimited = result.tier !== "free";
        const canCreateContract =
          isUnlimited || result.aiContractsUsed < result.aiContractsLimit;
        const canSendSignature =
          isUnlimited || result.signaturesUsed < result.signaturesLimit;

        setData({
          tier: result.tier || "free",
          status: result.status || "active",
          aiContractsUsed: result.aiContractsUsed || 0,
          aiContractsLimit: result.aiContractsLimit || 1,
          signaturesUsed: result.signaturesUsed || 0,
          signaturesLimit: result.signaturesLimit || 3,
          isLoading: false,
          error: null,
          canCreateContract,
          canSendSignature,
          isUnlimited,
        });
      } catch (err) {
        setData((prev) => ({
          ...prev,
          isLoading: false,
          error: err instanceof Error ? err.message : "Unknown error",
        }));
      }
    }

    fetchSubscription();
  }, []);

  return data;
}

// Check if a feature requires upgrade
export function requiresUpgrade(
  subscription: SubscriptionData,
  feature: "ai_contract" | "signature" | "template" | "ai_chat"
): boolean {
  if (subscription.tier !== "free") {
    return false;
  }

  switch (feature) {
    case "ai_contract":
      return subscription.aiContractsUsed >= subscription.aiContractsLimit;
    case "signature":
      return subscription.signaturesUsed >= subscription.signaturesLimit;
    case "ai_chat":
      return true; // AI chat is Pro+ only
    case "template":
      return false; // Templates can be purchased individually
    default:
      return false;
  }
}
