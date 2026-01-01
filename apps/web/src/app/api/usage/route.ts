import { NextResponse } from "next/server";
import { createClient } from "@/lib/supabase/server";
import { getUsageStats, checkContractLimit, checkSignatureLimit } from "@/lib/usage-tracking";
import { TIER_LIMITS, formatLimit, getUsagePercentage } from "@/lib/rate-limits";

/**
 * GET /api/usage - Get current user's usage stats and limits
 */
export async function GET() {
    try {
        const supabase = await createClient();
        const { data: { user }, error: authError } = await supabase.auth.getUser();

        if (authError || !user) {
            return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
        }

        const [stats, contractCheck, signatureCheck] = await Promise.all([
            getUsageStats(user.id),
            checkContractLimit(user.id),
            checkSignatureLimit(user.id),
        ]);

        const tierLimits = TIER_LIMITS[stats.tier];

        return NextResponse.json({
            tier: stats.tier,
            periodStart: stats.periodStart,
            periodEnd: stats.periodEnd,
            usage: {
                contracts: {
                    current: stats.contractsThisMonth,
                    limit: tierLimits.contractsPerMonth,
                    remaining: contractCheck.remaining,
                    percentage: getUsagePercentage(stats.contractsThisMonth, stats.tier, "contractsPerMonth"),
                    displayLimit: formatLimit(stats.tier, "contractsPerMonth"),
                    allowed: contractCheck.allowed,
                },
                signatures: {
                    current: stats.signaturesThisMonth,
                    limit: tierLimits.signaturesPerMonth,
                    remaining: signatureCheck.remaining,
                    percentage: getUsagePercentage(stats.signaturesThisMonth, stats.tier, "signaturesPerMonth"),
                    displayLimit: formatLimit(stats.tier, "signaturesPerMonth"),
                    allowed: signatureCheck.allowed,
                },
            },
            limits: tierLimits,
        });
    } catch (error) {
        console.error("Error fetching usage stats:", error);
        return NextResponse.json(
            { error: "Failed to fetch usage stats" },
            { status: 500 }
        );
    }
}
