import { NextRequest, NextResponse } from "next/server";
import { createClient } from "@/lib/supabase/server";
import {
  hasContractGenerationJobTimedOut,
  isTerminalContractGenerationJobStatus,
  type ContractGenerationJobRecord,
} from "@/lib/contracts/generation-jobs";
import {
  parseGeneratedContractResponseContent,
  retrieveBackgroundContractGeneration,
} from "@/lib/contracts/generator-streaming";
import { persistGeneratedContract } from "@/lib/contracts/persist-generated-contract";
import type { ContractMetadata, ContractType, PaymentConfig } from "@/lib/contracts/schemas";

export const dynamic = "force-dynamic";

function createGenerationJobContext(userId: string) {
  return {
    ipAddress: null,
    userAgent: "Lexport Server",
    pageUrl: null,
    sessionId: `server-${userId}`,
  };
}

function getOpenAIProgress(job: ContractGenerationJobRecord, remoteStatus: string) {
  const startedAtMs = Date.parse(job.started_at || job.created_at);
  const elapsedMs = Number.isFinite(startedAtMs) ? Math.max(0, Date.now() - startedAtMs) : 0;

  if (remoteStatus === "queued") {
    return {
      percent: Math.max(job.progress_percent, 12),
      status: "Queued with OpenAI",
    };
  }

  const estimatedPercent = Math.min(85, 35 + Math.floor(elapsedMs / 4000) * 4);
  return {
    percent: Math.max(job.progress_percent, estimatedPercent),
    status: "AI is drafting your contract...",
  };
}

export async function GET(
  _request: NextRequest,
  { params }: { params: Promise<{ jobId: string }> }
) {
  const { jobId } = await params;

  try {
    const supabase = await createClient();
    const {
      data: { user },
      error: authError,
    } = await supabase.auth.getUser();

    if (authError || !user) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    }

    const { data, error } = await supabase
      .from("contract_generation_jobs")
      .select("*")
      .eq("id", jobId)
      .single();

    if (error || !data) {
      return NextResponse.json({ error: "Generation job not found" }, { status: 404 });
    }

    const job = data as ContractGenerationJobRecord;
    let effectiveStatus = job.status;
    let effectiveProgressPercent = job.progress_percent;
    let effectiveProgressStatus = job.progress_status;
    let effectiveError = job.error_message;
    let effectiveContractId = job.contract_id;
    let effectiveStartedAt = job.started_at;
    let effectiveCompletedAt = job.completed_at;

    if (hasContractGenerationJobTimedOut(job)) {
      effectiveStatus = "timed_out";
      effectiveProgressStatus = "Generation timed out";
      effectiveError =
        effectiveError ||
        "Contract generation took too long to complete. Please retry the generation job.";

      await supabase
        .from("contract_generation_jobs")
        .update({
          status: "timed_out",
          progress_status: effectiveProgressStatus,
          error_message: effectiveError,
          completed_at: job.completed_at || new Date().toISOString(),
          updated_at: new Date().toISOString(),
        })
        .eq("id", jobId)
        .in("status", ["queued", "processing"]);
      effectiveCompletedAt = job.completed_at || new Date().toISOString();
    }

    if (
      process.env.NODE_ENV === "production" &&
      job.openai_response_id &&
      !isTerminalContractGenerationJobStatus(effectiveStatus) &&
      !effectiveContractId
    ) {
      const remoteResponse = await retrieveBackgroundContractGeneration(job.openai_response_id);
      const remoteStatus = remoteResponse.status || "queued";

      if (remoteStatus === "completed") {
        const generated = parseGeneratedContractResponseContent(
          job.contract_type as ContractType,
          remoteResponse.output_text || ""
        );

        const { data: actor } = await supabase
          .from("users")
          .select("id, email, name")
          .eq("id", job.user_id)
          .maybeSingle();

        const saved = await persistGeneratedContract({
          supabase,
          actor: {
            id: job.user_id,
            email: actor?.email ?? user.email ?? null,
            name: actor?.name ?? user.user_metadata?.full_name ?? null,
          },
          contractType: job.contract_type as ContractType,
          metadata: job.metadata as ContractMetadata,
          paymentConfig: (job.payment_config as PaymentConfig | null) ?? undefined,
          generated,
          context: createGenerationJobContext(job.user_id),
        });

        effectiveStatus = "completed";
        effectiveProgressPercent = 100;
        effectiveProgressStatus = "Contract ready";
        effectiveContractId = saved.contractId;
        effectiveError = null;
        effectiveCompletedAt = new Date().toISOString();

        await supabase
          .from("contract_generation_jobs")
          .update({
            status: effectiveStatus,
            progress_percent: effectiveProgressPercent,
            progress_status: effectiveProgressStatus,
            contract_id: effectiveContractId,
            completed_at: effectiveCompletedAt,
            error_message: null,
            updated_at: new Date().toISOString(),
          })
          .eq("id", jobId);
      } else if (remoteStatus === "failed" || remoteStatus === "cancelled" || remoteStatus === "incomplete") {
        effectiveStatus = "failed";
        effectiveProgressStatus = "Generation failed";
        effectiveError =
          typeof remoteResponse.error === "string"
            ? remoteResponse.error
            : remoteResponse.error?.message || "OpenAI background generation failed";
        effectiveCompletedAt = new Date().toISOString();

        await supabase
          .from("contract_generation_jobs")
          .update({
            status: effectiveStatus,
            progress_status: effectiveProgressStatus,
            error_message: effectiveError,
            completed_at: effectiveCompletedAt,
            updated_at: new Date().toISOString(),
          })
          .eq("id", jobId);
      } else {
        const progress = getOpenAIProgress(job, remoteStatus);
        effectiveStatus = "processing";
        effectiveProgressPercent = progress.percent;
        effectiveProgressStatus = progress.status;
        effectiveStartedAt = job.started_at || new Date().toISOString();

        await supabase
          .from("contract_generation_jobs")
          .update({
            status: effectiveStatus,
            progress_percent: effectiveProgressPercent,
            progress_status: effectiveProgressStatus,
            started_at: effectiveStartedAt,
            updated_at: new Date().toISOString(),
          })
          .eq("id", jobId);
      }
    }

    return NextResponse.json(
      {
        jobId: job.id,
        status: effectiveStatus,
        progressPercent: effectiveProgressPercent,
        progressStatus: effectiveProgressStatus,
        contractId: effectiveContractId,
        error: effectiveError,
        attemptCount: job.attempt_count,
        startedAt: effectiveStartedAt,
        completedAt: effectiveCompletedAt,
        terminal: isTerminalContractGenerationJobStatus(effectiveStatus),
      },
      {
        headers: {
          "Cache-Control": "no-store",
        },
      }
    );
  } catch (error) {
    console.error("Failed to fetch generation job:", error);
    return NextResponse.json(
      { error: "Failed to fetch generation job" },
      { status: 500 }
    );
  }
}
