import { describe, it, expect } from "vitest";
import {
  TIER_LIMITS,
  isLimitExceeded,
  getRemainingQuota,
  getUsagePercentage,
  formatLimit,
  type SubscriptionTier,
} from "@/lib/rate-limits";

describe("Rate Limits", () => {
  describe("TIER_LIMITS configuration", () => {
    it("should have correct limits for free tier", () => {
      expect(TIER_LIMITS.free.contractsPerMonth).toBe(3);
      expect(TIER_LIMITS.free.signaturesPerMonth).toBe(5);
      expect(TIER_LIMITS.free.chatMessagesPerContract).toBe(5);
    });

    it("should have correct limits for pro tier", () => {
      expect(TIER_LIMITS.pro.contractsPerMonth).toBe(50);
      expect(TIER_LIMITS.pro.signaturesPerMonth).toBe(500);
    });

    it("should have higher limits for higher tiers", () => {
      expect(TIER_LIMITS.pro.contractsPerMonth).toBeGreaterThan(TIER_LIMITS.free.contractsPerMonth);
      expect(TIER_LIMITS.team.contractsPerMonth).toBeGreaterThan(TIER_LIMITS.pro.contractsPerMonth);
      expect(TIER_LIMITS.enterprise.contractsPerMonth).toBeGreaterThan(TIER_LIMITS.team.contractsPerMonth);
    });
  });

  describe("isLimitExceeded", () => {
    it("should return false when under limit", () => {
      expect(isLimitExceeded(1, "free", "contractsPerMonth")).toBe(false);
      expect(isLimitExceeded(0, "free", "contractsPerMonth")).toBe(false);
    });

    it("should return true when at limit", () => {
      expect(isLimitExceeded(2, "free", "contractsPerMonth")).toBe(true);
    });

    it("should return true when over limit", () => {
      expect(isLimitExceeded(10, "free", "contractsPerMonth")).toBe(true);
    });

    it("should respect different tier limits", () => {
      expect(isLimitExceeded(10, "free", "contractsPerMonth")).toBe(true);
      expect(isLimitExceeded(10, "pro", "contractsPerMonth")).toBe(false);
    });
  });

  describe("getRemainingQuota", () => {
    it("should return correct remaining quota", () => {
      expect(getRemainingQuota(0, "free", "contractsPerMonth")).toBe(3);
      expect(getRemainingQuota(1, "free", "contractsPerMonth")).toBe(1);
      expect(getRemainingQuota(2, "free", "contractsPerMonth")).toBe(0);
    });

    it("should never return negative values", () => {
      expect(getRemainingQuota(100, "free", "contractsPerMonth")).toBe(0);
      expect(getRemainingQuota(1000, "pro", "contractsPerMonth")).toBe(0);
    });
  });

  describe("getUsagePercentage", () => {
    it("should return 0% for no usage", () => {
      expect(getUsagePercentage(0, "free", "contractsPerMonth")).toBe(0);
    });

    it("should return 50% for half usage", () => {
      expect(getUsagePercentage(1, "free", "contractsPerMonth")).toBe(50);
    });

    it("should return 100% at limit", () => {
      expect(getUsagePercentage(2, "free", "contractsPerMonth")).toBe(100);
    });

    it("should cap at 100% when over limit", () => {
      expect(getUsagePercentage(10, "free", "contractsPerMonth")).toBe(100);
    });
  });

  describe("formatLimit", () => {
    it("should format normal numbers with locale string", () => {
      expect(formatLimit("pro", "signaturesPerMonth")).toBe("500");
    });

    it("should return 'Unlimited' for very high limits", () => {
      expect(formatLimit("enterprise", "contractsPerMonth")).toBe("Unlimited");
      expect(formatLimit("enterprise", "signaturesPerMonth")).toBe("Unlimited");
    });
  });
});
