import { NextRequest, NextResponse } from "next/server";
import { createClient } from "@/lib/supabase/server";
import { getRequestContextFromRequest } from "@/lib/audit";
import { generateContractStreaming } from "@/lib/contracts/generator-streaming";
import { GenerateContractRequestSchema } from "@/lib/contracts/generation-request";
import { persistGeneratedContract } from "@/lib/contracts/persist-generated-contract";
import { updateContractGenerationJob } from "@/lib/contracts/generation-jobs";
import { getUserTier } from "@/lib/usage-tracking";
import { TIER_LIMITS } from "@/lib/rate-limits";

export const dynamic = "force-dynamic";

function sendSSE(
  controller: ReadableStreamDefaultController<Uint8Array>,
  event: string,
  data: unknown
) {
  const payload = `event: ${event}\ndata: ${JSON.stringify(data)}\n\n`;
  controller.enqueue(new TextEncoder().encode(payload));
}

export async function POST(request: NextRequest) {
  if (process.env.NODE_ENV === "production") {
    return NextResponse.json(
      {
        error: "Streaming contract generation is only available in local development. Use /api/contracts/generate in production.",
      },
      { status: 410 }
    );
  }

  const stream = new ReadableStream<Uint8Array>({
    async start(controller) {
      let heartbeatInterval: NodeJS.Timeout | null = null;
      // Reserved job id (BILLING-5): the atomic quota reservation token. Marked
      // terminal below so it never lingers in the in-flight quota count.
      let reservedJobId: string | null = null;
      let supabaseClient: Awaited<ReturnType<typeof createClient>> | null = null;

      try {
        heartbeatInterval = setInterval(() => {
          sendSSE(controller, "heartbeat", { timestamp: Date.now() });
        }, 5000);

        sendSSE(controller, "progress", { status: "Authenticating...", percent: 5 });

        const supabase = await createClient();
        supabaseClient = supabase;
        const {
          data: { user },
          error: authError,
        } = await supabase.auth.getUser();

        if (authError || !user) {
          sendSSE(controller, "error", { message: "Unauthorized" });
          return;
        }

        sendSSE(controller, "progress", { status: "Validating request...", percent: 10 });

        const body = await request.json();
        const parseResult = GenerateContractRequestSchema.safeParse(body);
        if (!parseResult.success) {
          sendSSE(controller, "error", {
            message: "Invalid request",
            details: parseResult.error.flatten(),
          });
          return;
        }

        const { contractType, metadata, paymentConfig } = parseResult.data;

        sendSSE(controller, "progress", { status: "Checking usage limits...", percent: 15 });

        // BILLING-5: atomically check-and-reserve quota (same RPC as the prod job
        // route) so concurrent stream requests can't bypass the limit. Returns
        // NULL when over limit.
        const tier = await getUserTier(user.id);
        const monthlyLimit = TIER_LIMITS[tier].contractsPerMonth;
        const { data: jobId, error: reserveError } = await supabase.rpc(
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
          sendSSE(controller, "error", { message: "Failed to start contract generation" });
          return;
        }

        if (!jobId) {
          const tierLimits = TIER_LIMITS[tier];
          sendSSE(controller, "error", {
            message:
              tier === "free"
                ? `You've used your ${tierLimits.contractsPerMonth} free contract${tierLimits.contractsPerMonth > 1 ? "s" : ""} this month. Upgrade to Pro for 50 contracts/month.`
                : `You've reached your ${tierLimits.contractsPerMonth} contract limit for this month.`,
            upgradeUrl: "/settings/billing",
          });
          return;
        }

        reservedJobId = jobId as string;

        sendSSE(controller, "progress", {
          status: "Starting AI contract generation...",
          percent: 20,
        });

        const generated = await generateContractStreaming(
          contractType,
          metadata,
          (progress) => sendSSE(controller, "progress", progress),
          paymentConfig
        );

        sendSSE(controller, "progress", {
          status: "Saving contract to database...",
          percent: 92,
        });

        let saved;
        try {
          saved = await persistGeneratedContract({
            supabase,
            actor: {
              id: user.id,
              email: user.email || null,
              name:
                typeof user.user_metadata?.name === "string"
                  ? user.user_metadata.name
                  : typeof user.user_metadata?.full_name === "string"
                    ? user.user_metadata.full_name
                    : null,
            },
            contractType,
            metadata,
            paymentConfig,
            generated,
            context: getRequestContextFromRequest(request),
          });
        } catch (error) {
          const payload = error as {
            message?: string;
            code?: string;
            hint?: string;
            details?: string;
          };
          sendSSE(controller, "error", {
            message: "Failed to save contract",
            details: {
              reason: payload?.message || "Database insert failed",
              code: payload?.code,
              hint: payload?.hint,
              details: payload?.details,
            },
          });
          return;
        }

        // Resolve the reservation to its persisted contract so it leaves the
        // in-flight quota count and reflects the saved contract.
        await updateContractGenerationJob(supabase, reservedJobId, {
          status: "completed",
          progress_percent: 100,
          progress_status: "Contract ready",
          contract_id: saved.contractId,
          completed_at: new Date().toISOString(),
          error_message: null,
        }).catch((error) => {
          console.error("Failed to finalize streamed generation job:", error);
        });
        reservedJobId = null;

        sendSSE(controller, "complete", {
          contractId: saved.contractId,
          title: saved.title,
        });
      } catch (error) {
        console.error("Streaming contract generation error:", error);
        sendSSE(controller, "error", {
          message: "Failed to generate contract",
          details: {
            reason: error instanceof Error ? error.message : "Unknown error",
          },
        });
      } finally {
        // Release the quota reservation on any non-success exit so a failed/aborted
        // stream does not hold the user's slot until the freshness window expires.
        if (reservedJobId && supabaseClient) {
          await updateContractGenerationJob(supabaseClient, reservedJobId, {
            status: "failed",
            progress_status: "Generation failed",
            error_message: "Streaming contract generation did not complete",
            completed_at: new Date().toISOString(),
          }).catch((error) => {
            console.error("Failed to release streamed generation job:", error);
          });
        }
        if (heartbeatInterval) {
          clearInterval(heartbeatInterval);
        }
        controller.close();
      }
    },
  });

  return new Response(stream, {
    headers: {
      "Content-Type": "text/event-stream",
      "Cache-Control": "no-cache",
      Connection: "keep-alive",
      "X-Accel-Buffering": "no",
    },
  });
}
