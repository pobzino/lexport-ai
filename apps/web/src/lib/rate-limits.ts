/**
 * Rate Limiting Configuration
 *
 * Defines usage limits per subscription tier to protect margins
 * while maintaining a generous experience for legitimate users.
 */

export type SubscriptionTier = "free" | "pro" | "team" | "enterprise";

export interface TierLimits {
    /** AI contract generations per month */
    contractsPerMonth: number;
    /** Signature requests per month */
    signaturesPerMonth: number;
    /** AI chat messages per contract */
    chatMessagesPerContract: number;
    /** Templates user can save */
    templatesPerMonth: number;
    /** Team members (for team/enterprise) */
    teamMembers: number;
}

/**
 * Rate limits by subscription tier
 *
 * Designed to:
 * - Free: Let users experience the product
 * - Pro: Generous limits that 99% won't hit (~$7.50 max AI cost at 50 contracts)
 * - Team: Higher limits for agencies/businesses
 * - Enterprise: Effectively unlimited
 */
export const TIER_LIMITS: Record<SubscriptionTier, TierLimits> = {
    free: {
        contractsPerMonth: 3,
        signaturesPerMonth: 5,
        chatMessagesPerContract: 5,
        templatesPerMonth: 1,
        teamMembers: 1,
    },
    pro: {
        contractsPerMonth: 50,
        signaturesPerMonth: 500, // Effectively unlimited for most
        chatMessagesPerContract: 50,
        templatesPerMonth: 25,
        teamMembers: 1,
    },
    team: {
        contractsPerMonth: 200,
        signaturesPerMonth: 2000,
        chatMessagesPerContract: 100,
        templatesPerMonth: 100,
        teamMembers: 10,
    },
    enterprise: {
        contractsPerMonth: 10000, // Effectively unlimited
        signaturesPerMonth: 100000,
        chatMessagesPerContract: 1000,
        templatesPerMonth: 1000,
        teamMembers: 1000,
    },
};

/**
 * Check if a limit has been exceeded
 */
export function isLimitExceeded(
    current: number,
    tier: SubscriptionTier,
    limitType: keyof TierLimits
): boolean {
    return current >= TIER_LIMITS[tier][limitType];
}

/**
 * Get remaining quota
 */
export function getRemainingQuota(
    current: number,
    tier: SubscriptionTier,
    limitType: keyof TierLimits
): number {
    const limit = TIER_LIMITS[tier][limitType];
    return Math.max(0, limit - current);
}

/**
 * Get usage percentage (for progress bars)
 */
export function getUsagePercentage(
    current: number,
    tier: SubscriptionTier,
    limitType: keyof TierLimits
): number {
    const limit = TIER_LIMITS[tier][limitType];
    return Math.min(100, Math.round((current / limit) * 100));
}

/**
 * Format limit for display
 */
export function formatLimit(tier: SubscriptionTier, limitType: keyof TierLimits): string {
    const limit = TIER_LIMITS[tier][limitType];
    if (limit >= 10000) return "Unlimited";
    return limit.toLocaleString();
}
