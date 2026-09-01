/**
 * Usage Tracking Service
 *
 * Tracks user usage of rate-limited resources (contracts, signatures, etc.)
 * Resets monthly on billing cycle.
 */

import { createClient } from "@/lib/supabase/server";
import {
    type SubscriptionTier,
    type TierLimits,
    TIER_LIMITS,
    isLimitExceeded,
    getRemainingQuota,
} from "./rate-limits";

export interface UsageStats {
    contractsThisMonth: number;
    signaturesThisMonth: number;
    chatMessagesThisContract: number;
    templatesThisMonth: number;
    tier: SubscriptionTier;
    periodStart: string;
    periodEnd: string;
}

export interface UsageCheckResult {
    allowed: boolean;
    current: number;
    limit: number;
    remaining: number;
    tier: SubscriptionTier;
    upgradeRequired?: boolean;
}

/**
 * Get user's subscription tier from their profile
 */
export async function getUserTier(userId: string): Promise<SubscriptionTier> {
    const supabase = await createClient();

    // Check user's subscription tier
    const { data: user } = await supabase
        .from("users")
        .select("subscription_tier, subscription_status, organization_id")
        .eq("id", userId)
        .single();

    if (!user) return "free";

    // Check for organization-level subscription
    if (user.organization_id) {
        const { data: org } = await supabase
            .from("organizations")
            .select("plan")
            .eq("id", user.organization_id)
            .single();

        if (org?.plan === "team") return "team";
        if (org?.plan === "enterprise") return "enterprise";
    }

    // Individual subscription - check tier (with active status)
    if (user.subscription_status === "active") {
        if (user.subscription_tier === "team") return "team";
        if (user.subscription_tier === "pro") return "pro";
    }

    return "free";
}

/**
 * Get contract count for current billing period
 */
export async function getContractCountThisMonth(userId: string): Promise<number> {
    const supabase = await createClient();

    // Get start of current month
    const now = new Date();
    const monthStart = new Date(now.getFullYear(), now.getMonth(), 1);

    const { count, error } = await supabase
        .from("contracts")
        .select("*", { count: "exact", head: true })
        .eq("user_id", userId)
        .gte("created_at", monthStart.toISOString());

    if (error) {
        console.error("Error getting contract count:", error);
        return 0;
    }

    return count || 0;
}

/**
 * Get the number of in-flight (queued/processing) generation jobs for the
 * current billing period.
 *
 * The persisted `contracts` row is only written when a generation job COMPLETES,
 * so counting committed contracts alone lets concurrent/rapid generate requests
 * all pass the limit check before any row exists (GEN-1 / BILLING-5). Folding
 * active jobs into the count reserves quota for work that is already in flight.
 *
 * Only recently-created queued/processing jobs are counted (matching the
 * reserve_contract_generation_job RPC's 15-minute window) so a stuck or
 * not-yet-reconciled job cannot permanently consume the user's quota; completed
 * jobs are excluded because their persisted contract already counts, and
 * failed/timed_out jobs never count.
 */
export async function getActiveGenerationJobCountThisMonth(userId: string): Promise<number> {
    const supabase = await createClient();

    const now = new Date();
    const monthStart = new Date(now.getFullYear(), now.getMonth(), 1);
    const freshnessCutoff = new Date(now.getTime() - 15 * 60 * 1000);

    const { count, error } = await supabase
        .from("contract_generation_jobs")
        .select("*", { count: "exact", head: true })
        .eq("user_id", userId)
        .in("status", ["queued", "processing"])
        .gte("created_at", monthStart.toISOString())
        .gt("created_at", freshnessCutoff.toISOString());

    if (error) {
        console.error("Error getting active generation job count:", error);
        return 0;
    }

    return count || 0;
}

/**
 * Check if user can create a new contract
 */
export async function checkContractLimit(userId: string): Promise<UsageCheckResult> {
    const tier = await getUserTier(userId);
    const contractsThisMonth = await getContractCountThisMonth(userId);
    const activeJobs = await getActiveGenerationJobCountThisMonth(userId);
    const current = contractsThisMonth + activeJobs;
    const limit = TIER_LIMITS[tier].contractsPerMonth;
    const remaining = getRemainingQuota(current, tier, "contractsPerMonth");

    return {
        allowed: !isLimitExceeded(current, tier, "contractsPerMonth"),
        current,
        limit,
        remaining,
        tier,
        upgradeRequired: tier === "free" && current >= limit,
    };
}

/**
 * Get signature count for current billing period
 */
export async function getSignatureCountThisMonth(userId: string): Promise<number> {
    const supabase = await createClient();

    const now = new Date();
    const monthStart = new Date(now.getFullYear(), now.getMonth(), 1);

    const { count, error } = await supabase
        .from("signature_requests")
        .select("*, contracts!inner(user_id)", { count: "exact", head: true })
        .eq("contracts.user_id", userId)
        .gte("created_at", monthStart.toISOString());

    if (error) {
        console.error("Error getting signature count:", error);
        return 0;
    }

    return count || 0;
}

/**
 * Check if user can send a signature request
 */
export async function checkSignatureLimit(userId: string): Promise<UsageCheckResult> {
    const tier = await getUserTier(userId);
    const current = await getSignatureCountThisMonth(userId);
    const limit = TIER_LIMITS[tier].signaturesPerMonth;
    const remaining = getRemainingQuota(current, tier, "signaturesPerMonth");

    return {
        allowed: !isLimitExceeded(current, tier, "signaturesPerMonth"),
        current,
        limit,
        remaining,
        tier,
        upgradeRequired: tier === "free" && current >= limit,
    };
}

/**
 * Get full usage stats for dashboard display
 */
export async function getUsageStats(userId: string): Promise<UsageStats> {
    const tier = await getUserTier(userId);
    const contractsThisMonth = await getContractCountThisMonth(userId);
    const signaturesThisMonth = await getSignatureCountThisMonth(userId);

    // Calculate billing period
    const now = new Date();
    const periodStart = new Date(now.getFullYear(), now.getMonth(), 1);
    const periodEnd = new Date(now.getFullYear(), now.getMonth() + 1, 0);

    return {
        contractsThisMonth,
        signaturesThisMonth,
        chatMessagesThisContract: 0, // Tracked per-contract, not globally
        templatesThisMonth: 0, // TODO: Implement if needed
        tier,
        periodStart: periodStart.toISOString(),
        periodEnd: periodEnd.toISOString(),
    };
}
