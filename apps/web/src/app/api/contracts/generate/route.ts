import { NextRequest, NextResponse } from "next/server";
import { createClient } from "@/lib/supabase/server";
import { GenerateContractRequestSchema } from "@/lib/contracts/generation-request";
import { processContractGenerationJob } from "@/lib/contracts/generation-jobs";
import { createBackgroundContractGeneration } from "@/lib/contracts/generator-streaming";
import { checkContractLimit } from "@/lib/usage-tracking";
import { TIER_LIMITS } from "@/lib/rate-limits";

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

    const limitCheck = await checkContractLimit(user.id);
    if (!limitCheck.allowed) {
      const tierLimits = TIER_LIMITS[limitCheck.tier];
      return NextResponse.json(
        {
          error: "Contract limit reached",
          message:
            limitCheck.tier === "free"
              ? `You've used your ${tierLimits.contractsPerMonth} free contract${tierLimits.contractsPerMonth > 1 ? "s" : ""} this month. Upgrade to Pro for 50 contracts/month.`
              : `You've reached your ${tierLimits.contractsPerMonth} contract limit for this month. Your limit resets at the start of next month.`,
          upgradeUrl: "/settings/billing",
          current: limitCheck.current,
          limit: limitCheck.limit,
          tier: limitCheck.tier,
        },
        { status: 403 }
      );
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
    const { data: job, error: insertError } = await supabase
      .from("contract_generation_jobs")
      .insert({
        user_id: user.id,
        contract_type: contractType,
        metadata,
        payment_config: paymentConfig ?? null,
        status: "queued",
        progress_percent: 5,
        progress_status: "Queued for generation",
      })
      .select("id")
      .single();

    if (insertError || !job) {
      console.error("Failed to create contract generation job:", insertError);
      return NextResponse.json(
        { error: "Failed to queue contract generation" },
        { status: 500 }
      );
    }

    if (process.env.NODE_ENV !== "production") {
      void processContractGenerationJob(job.id).catch((error) => {
        console.error("Background contract generation failed:", error);
      });
    } else {
      try {
        const backgroundResponse = await createBackgroundContractGeneration(
          contractType,
          metadata
        );

        const { error: updateError } = await supabase
          .from("contract_generation_jobs")
          .update({
            status: "processing",
            progress_percent: 10,
            progress_status:
              backgroundResponse.status === "queued"
                ? "Queued with OpenAI"
                : "AI is drafting your contract...",
            openai_response_id: backgroundResponse.responseId,
            started_at: new Date().toISOString(),
            error_message: null,
            updated_at: new Date().toISOString(),
          })
          .eq("id", job.id);

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
          .eq("id", job.id);

        return NextResponse.json(
          { error: "Failed to start background contract generation" },
          { status: 500 }
        );
      }
    }

    return NextResponse.json({
      success: true,
      jobId: job.id,
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
