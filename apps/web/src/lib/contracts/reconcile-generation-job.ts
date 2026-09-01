import type { SupabaseClient } from "@supabase/supabase-js";
import {
  hasContractGenerationJobTimedOut,
  isTerminalContractGenerationJobStatus,
  type ContractGenerationJobRecord,
  type ContractGenerationJobStatus,
} from "./generation-jobs";
import {
  parseGeneratedContractResponseContent,
  retrieveBackgroundContractGeneration,
} from "./generator-streaming";
import { persistGeneratedContract } from "./persist-generated-contract";
import type { ContractMetadata, ContractType, PaymentConfig } from "./schemas";

/**
 * Effective, post-reconciliation view of a generation job. Both the live poll
 * (GET /api/contracts/generate/[jobId]) and the server-side reconciler
 * (POST /api/contracts/generate/reconcile) project this onto their responses.
 */
export interface ReconciledJobState {
  status: ContractGenerationJobStatus;
  progressPercent: number;
  progressStatus: string;
  contractId: string | null;
  error: string | null;
  startedAt: string | null;
  completedAt: string | null;
}

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
    status: "Lexport is generating your contract...",
  };
}

function projectJob(job: ContractGenerationJobRecord): ReconciledJobState {
  return {
    status: job.status,
    progressPercent: job.progress_percent,
    progressStatus: job.progress_status,
    contractId: job.contract_id,
    error: job.error_message,
    startedAt: job.started_at,
    completedAt: job.completed_at,
  };
}

/**
 * Idempotently advance a single background generation job: apply the timeout
 * transition, retrieve the OpenAI background response, and — on completion —
 * atomically claim finalization (GEN-3) before persisting exactly one contract.
 *
 * This is the single shared persist/finalize path used by both the client poll
 * and the server-side cron reconciler (GEN-5), so a completed-but-unpolled job
 * (closed tab) is still saved within one reconcile cycle. Malformed/empty model
 * output is caught and the job is marked `failed` with a clear message (GEN-4).
 *
 * Safe to call concurrently for the same job: the conditional `finalizing_at`
 * claim guarantees only one caller persists; the others read back the winner's
 * result instead of inserting a duplicate contract.
 */
export async function reconcileContractGenerationJob(params: {
  supabase: SupabaseClient;
  job: ContractGenerationJobRecord;
  actorEmailFallback?: string | null;
  actorNameFallback?: string | null;
}): Promise<ReconciledJobState> {
  const { supabase, job, actorEmailFallback, actorNameFallback } = params;
  const jobId = job.id;

  // 1) Timeout transition (does not require an OpenAI response id).
  if (hasContractGenerationJobTimedOut(job)) {
    const completedAt = job.completed_at || new Date().toISOString();
    const error =
      job.error_message ||
      "Contract generation took too long to complete. Please retry the generation job.";

    await supabase
      .from("contract_generation_jobs")
      .update({
        status: "timed_out",
        progress_status: "Generation timed out",
        error_message: error,
        completed_at: completedAt,
        updated_at: new Date().toISOString(),
      })
      .eq("id", jobId)
      .in("status", ["queued", "processing"]);

    return {
      status: "timed_out",
      progressPercent: job.progress_percent,
      progressStatus: "Generation timed out",
      contractId: job.contract_id,
      error,
      startedAt: job.started_at,
      completedAt,
    };
  }

  // 2) Nothing to reconcile against OpenAI for dev jobs, terminal jobs, jobs that
  //    never started a background response, or jobs already persisted.
  if (
    process.env.NODE_ENV !== "production" ||
    !job.openai_response_id ||
    isTerminalContractGenerationJobStatus(job.status) ||
    job.contract_id
  ) {
    return projectJob(job);
  }

  const remoteResponse = await retrieveBackgroundContractGeneration(job.openai_response_id);
  const remoteStatus = remoteResponse.status || "queued";

  if (remoteStatus === "completed") {
    // GEN-3: atomically claim finalization. Exactly one concurrent caller wins
    // the conditional UPDATE; the loser(s) read back the authoritative row.
    const nowIso = new Date().toISOString();
    const { data: claimed } = await supabase
      .from("contract_generation_jobs")
      .update({ finalizing_at: nowIso, updated_at: nowIso })
      .eq("id", jobId)
      .is("contract_id", null)
      .is("finalizing_at", null)
      .in("status", ["queued", "processing"])
      .select("id");

    if (!claimed || claimed.length === 0) {
      const { data: fresh } = await supabase
        .from("contract_generation_jobs")
        .select("*")
        .eq("id", jobId)
        .single();
      return fresh ? projectJob(fresh as ContractGenerationJobRecord) : projectJob(job);
    }

    let saved;
    try {
      // GEN-4: validate + parse the model output. A malformed/empty response
      // throws a descriptive error here instead of persisting a degraded contract.
      const generated = parseGeneratedContractResponseContent(
        job.contract_type as ContractType,
        remoteResponse.output_text || ""
      );

      const { data: actor } = await supabase
        .from("users")
        .select("id, email, name")
        .eq("id", job.user_id)
        .maybeSingle();

      saved = await persistGeneratedContract({
        supabase,
        actor: {
          id: job.user_id,
          email: actor?.email ?? actorEmailFallback ?? null,
          name: actor?.name ?? actorNameFallback ?? null,
        },
        contractType: job.contract_type as ContractType,
        metadata: job.metadata as ContractMetadata,
        paymentConfig: (job.payment_config as PaymentConfig | null) ?? undefined,
        generated,
        context: createGenerationJobContext(job.user_id),
      });
    } catch (persistError) {
      // GEN-4: parse failed (deterministic — re-parsing the same output would
      // fail identically, so we never retry) or the contracts insert failed.
      // persistGeneratedContract throws only on that initial insert, so no
      // contract row was created and marking the job failed cannot duplicate or
      // orphan a contract. Surface a terminal `failed` with a real message
      // instead of an opaque 500 + stuck `processing` job.
      const error =
        persistError instanceof Error
          ? persistError.message
          : "Generated contract could not be parsed";
      const completedAt = new Date().toISOString();

      await supabase
        .from("contract_generation_jobs")
        .update({
          status: "failed",
          progress_status: "Generation failed",
          error_message: error,
          completed_at: completedAt,
          finalizing_at: null,
          updated_at: completedAt,
        })
        .eq("id", jobId);

      return {
        status: "failed",
        progressPercent: job.progress_percent,
        progressStatus: "Generation failed",
        contractId: null,
        error,
        startedAt: job.started_at,
        completedAt,
      };
    }

    // Persisted exactly once. Record completion (PostgREST returns errors rather
    // than throwing, so this never re-marks a saved contract as failed).
    const completedAt = new Date().toISOString();
    await supabase
      .from("contract_generation_jobs")
      .update({
        status: "completed",
        progress_percent: 100,
        progress_status: "Contract ready",
        contract_id: saved.contractId,
        completed_at: completedAt,
        error_message: null,
        updated_at: completedAt,
      })
      .eq("id", jobId);

    return {
      status: "completed",
      progressPercent: 100,
      progressStatus: "Contract ready",
      contractId: saved.contractId,
      error: null,
      startedAt: job.started_at,
      completedAt,
    };
  }

  if (remoteStatus === "failed" || remoteStatus === "cancelled" || remoteStatus === "incomplete") {
    const error =
      typeof remoteResponse.error === "string"
        ? remoteResponse.error
        : remoteResponse.error?.message || "OpenAI background generation failed";
    const completedAt = new Date().toISOString();

    await supabase
      .from("contract_generation_jobs")
      .update({
        status: "failed",
        progress_status: "Generation failed",
        error_message: error,
        completed_at: completedAt,
        updated_at: completedAt,
      })
      .eq("id", jobId);

    return {
      status: "failed",
      progressPercent: job.progress_percent,
      progressStatus: "Generation failed",
      contractId: null,
      error,
      startedAt: job.started_at,
      completedAt,
    };
  }

  // Still queued/in-progress at OpenAI — advance the progress estimate only.
  const progress = getOpenAIProgress(job, remoteStatus);
  const startedAt = job.started_at || new Date().toISOString();

  await supabase
    .from("contract_generation_jobs")
    .update({
      status: "processing",
      progress_percent: progress.percent,
      progress_status: progress.status,
      started_at: startedAt,
      updated_at: new Date().toISOString(),
    })
    .eq("id", jobId);

  return {
    status: "processing",
    progressPercent: progress.percent,
    progressStatus: progress.status,
    contractId: job.contract_id,
    error: job.error_message,
    startedAt,
    completedAt: job.completed_at,
  };
}
