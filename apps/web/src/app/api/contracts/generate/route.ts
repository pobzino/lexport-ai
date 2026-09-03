import { NextRequest, NextResponse } from "next/server";
import { createClient } from "@/lib/supabase/server";
import { GenerateContractRequestSchema } from "@/lib/contracts/generation-request";
import { processContractGenerationJob } from "@/lib/contracts/generation-jobs";
import { createBackgroundContractGeneration } from "@/lib/contracts/generator-streaming";
import { checkContractLimit, getUserTier } from "@/lib/usage-tracking";
import { TIER_LIMITS } from "@/lib/rate-limits";
import { sendContractLimitEmail } from "@/lib/email";

export const dynamic = "force-dynamic";

export async function POST(request: NextRequest) {
  try {
    const supabase = await createClient();
    const {
      data: { user },
      error: authError,
    } = await supabase.auth.getUser();

    if (authError || !user) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    }

    const body = await request.json();
    const parseResult = GenerateContractRequestSchema.safeParse(body);
    if (!parseResult.success) {
      return NextResponse.json(
        { error: "Invalid request", details: parseResult.error.flatten() },
        { status: 400 }
      );
    }

    const { contractType, metadata, paymentConfig } = parseResult.data;

    // GEN-1 / BILLING-5: atomically check-and-reserve the monthly quota. The RPC
    // counts committed contracts PLUS in-flight jobs in one transaction
    // serialized per user, then inserts the queued job, so concurrent/rapid
    // requests can never exceed the tier limit. Returns NULL when over limit.
    const tier = await getUserTier(user.id);
    const monthlyLimit = TIER_LIMITS[tier].contractsPerMonth;

    const { data: reservedJobId, error: reserveError } = await supabase.rpc(
      "reserve_contract_generation_job",
      {
        p_user_id: user.id,
        p_contract_type: contractType,
        p_metadata: metadata,
        p_payment_config: paymentConfig ?? null,
        p_monthly_limit: monthlyLimit,
      }
    );

    if (reserveError) {
      console.error("Failed to reserve contract generation job:", reserveError);
      return NextResponse.json(
        { error: "Failed to queue contract generation" },
        { status: 500 }
      );
    }

    if (!reservedJobId) {
      // Over the monthly limit — recompute the user-facing usage numbers.
      const limitCheck = await checkContractLimit(user.id);

      // Send upgrade email (fire-and-forget, don't block the response)
      if (user.email && tier === "free") {
        sendContractLimitEmail({
          to: user.email,
          name: user.user_metadata?.name || "",
          used: limitCheck.current,
          limit: limitCheck.limit,
        }).catch(() => {}); // Swallow errors — email is best-effort
      }

      const tierLimits = TIER_LIMITS[tier];
      return NextResponse.json(
        {
          error: "Contract limit reached",
          message:
            tier === "free"
              ? `You've used your ${tierLimits.contractsPerMonth} free contract${tierLimits.contractsPerMonth > 1 ? "s" : ""} this month. Upgrade to Pro for 50 contracts/month.`
              : `You've reached your ${tierLimits.contractsPerMonth} contract limit for this month. Your limit resets at the start of next month.`,
          upgradeUrl: "/settings/billing",
          current: limitCheck.current,
          limit: limitCheck.limit,
          tier,
        },
        { status: 403 }
      );
    }

    const jobId = reservedJobId as string;

    if (process.env.NODE_ENV !== "production") {
      void processContractGenerationJob(jobId).catch((error) => {
        console.error("Background contract generation failed:", error);
      });
    } else {
      try {
        const backgroundResponse = await createBackgroundContractGeneration(
          contractType,
          metadata,
          paymentConfig
        );

        const { error: updateError } = await supabase
          .from("contract_generation_jobs")
          .update({
            status: "processing",
            progress_percent: 10,
            progress_status:
              backgroundResponse.status === "queued"
                ? "Queued with OpenAI"
                : "Lexport is generating your contract...",
            openai_response_id: backgroundResponse.responseId,
            started_at: new Date().toISOString(),
            error_message: null,
            updated_at: new Date().toISOString(),
          })
          .eq("id", jobId);

        if (updateError) {
          throw updateError;
        }
      } catch (error) {
        console.error("Failed to start OpenAI background generation:", error);
        await supabase
          .from("contract_generation_jobs")
          .update({
            status: "failed",
            progress_status: "Failed to start background generation",
            error_message:
              error instanceof Error ? error.message : "OpenAI background request failed",
            completed_at: new Date().toISOString(),
            updated_at: new Date().toISOString(),
          })
          .eq("id", jobId);

        return NextResponse.json(
          { error: "Failed to start background contract generation" },
          { status: 500 }
        );
      }
    }

    return NextResponse.json({
      success: true,
      jobId,
      status: "queued",
      progressPercent: 5,
      progressStatus: "Queued for generation",
    });
  } catch (error) {
    console.error("Contract generation job creation error:", error);
    return NextResponse.json(
      { error: "Failed to queue contract generation" },
      { status: 500 }
    );
  }
}
