import type { SupabaseClient } from "@supabase/supabase-js";
import type { RequestContext } from "../audit/logger";
import { createAdminClient } from "../supabase/admin";
import { generateContractStreaming } from "./generator-streaming";
import { GenerateContractRequestSchema, type GenerateContractRequest } from "./generation-request";
import { persistGeneratedContract } from "./persist-generated-contract";

export const CONTRACT_GENERATION_JOB_STATUSES = [
  "queued",
  "processing",
  "completed",
  "failed",
  "timed_out",
] as const;

export type ContractGenerationJobStatus = typeof CONTRACT_GENERATION_JOB_STATUSES[number];

export interface ContractGenerationJobRecord {
  id: string;
  user_id: string;
  contract_type: GenerateContractRequest["contractType"];
  metadata: GenerateContractRequest["metadata"];
  payment_config: GenerateContractRequest["paymentConfig"] | null;
  status: ContractGenerationJobStatus;
  progress_percent: number;
  progress_status: string;
  error_message: string | null;
  openai_response_id: string | null;
  contract_id: string | null;
  attempt_count: number;
  started_at: string | null;
  completed_at: string | null;
  created_at: string;
  updated_at: string;
}

export const DEFAULT_CONTRACT_GENERATION_JOB_TIMEOUT_MS = Number.parseInt(
  process.env.OPENAI_CONTRACT_GENERATION_JOB_TIMEOUT_MS || "600000",
  10
);

function createGenerationJobContext(userId: string): RequestContext {
  return {
    ipAddress: null,
    userAgent: "Lexport Server",
    pageUrl: null,
    sessionId: `server-${userId}`,
  };
}

export function isTerminalContractGenerationJobStatus(status: string): boolean {
  return status === "completed" || status === "failed" || status === "timed_out";
}

export function hasContractGenerationJobTimedOut(
  job: Pick<ContractGenerationJobRecord, "status" | "started_at" | "created_at">
): boolean {
  if (isTerminalContractGenerationJobStatus(job.status)) {
    return false;
  }

  const startedAt = job.started_at || job.created_at;
  const startedAtMs = Date.parse(startedAt);
  if (!Number.isFinite(startedAtMs)) {
    return false;
  }

  return Date.now() - startedAtMs > DEFAULT_CONTRACT_GENERATION_JOB_TIMEOUT_MS;
}

export async function updateContractGenerationJob(
  supabase: SupabaseClient,
  jobId: string,
  updates: Partial<ContractGenerationJobRecord>
): Promise<void> {
  const payload: Record<string, unknown> = {
    ...updates,
    updated_at: new Date().toISOString(),
  };

  const { error } = await supabase
    .from("contract_generation_jobs")
    .update(payload)
    .eq("id", jobId);

  if (error) {
    throw error;
  }
}

export async function processContractGenerationJob(
  jobId: string,
  providedSupabase?: SupabaseClient
): Promise<{ contractId: string; title: string }> {
  const supabase = providedSupabase ?? createAdminClient();
  const { data: job, error: jobError } = await supabase
    .from("contract_generation_jobs")
    .select("*")
    .eq("id", jobId)
    .single();

  if (jobError || !job) {
    throw jobError ?? new Error("Generation job not found");
  }

  const typedJob = job as ContractGenerationJobRecord;
  if (typedJob.status === "completed" && typedJob.contract_id) {
    return {
      contractId: typedJob.contract_id,
      title: typedJob.progress_status || "Generated contract",
    };
  }

  await updateContractGenerationJob(supabase, jobId, {
    status: "processing",
    progress_percent: 10,
    progress_status: "Preparing contract generation...",
    started_at: typedJob.started_at || new Date().toISOString(),
    attempt_count: typedJob.attempt_count + 1,
    completed_at: null,
    error_message: null,
  });

  const parsedJob = GenerateContractRequestSchema.safeParse({
    contractType: typedJob.contract_type,
    metadata: typedJob.metadata,
    paymentConfig: typedJob.payment_config ?? undefined,
  });

  if (!parsedJob.success) {
    const message = parsedJob.error.issues[0]?.message || "Invalid generation job payload";
    await updateContractGenerationJob(supabase, jobId, {
      status: "failed",
      progress_status: "Invalid generation request",
      error_message: message,
      completed_at: new Date().toISOString(),
    });
    throw new Error(message);
  }

  const { data: actor } = await supabase
    .from("users")
    .select("id, email, name")
    .eq("id", typedJob.user_id)
    .maybeSingle();

  let lastPersistedPercent = 0;
  let lastPersistedStatus = "";
  let lastPersistedAt = 0;

  try {
    const generated = await generateContractStreaming(
      parsedJob.data.contractType,
      parsedJob.data.metadata,
      async (progress) => {
        const now = Date.now();
        const shouldPersist =
          progress.percent >= 90 ||
          progress.percent - lastPersistedPercent >= 5 ||
          progress.status !== lastPersistedStatus ||
          now - lastPersistedAt >= 1500;

        if (!shouldPersist) {
          return;
        }

        lastPersistedPercent = progress.percent;
        lastPersistedStatus = progress.status;
        lastPersistedAt = now;

        await updateContractGenerationJob(supabase, jobId, {
          status: "processing",
          progress_percent: progress.percent,
          progress_status: progress.status,
          error_message: null,
        });
      }
    );

    await updateContractGenerationJob(supabase, jobId, {
      status: "processing",
      progress_percent: 92,
      progress_status: "Saving contract...",
    });

    const saved = await persistGeneratedContract({
      supabase,
      actor: {
        id: typedJob.user_id,
        email: actor?.email ?? null,
        name: actor?.name ?? null,
      },
      contractType: parsedJob.data.contractType,
      metadata: parsedJob.data.metadata,
      paymentConfig: parsedJob.data.paymentConfig,
      generated,
      context: createGenerationJobContext(typedJob.user_id),
    });

    await updateContractGenerationJob(supabase, jobId, {
      status: "completed",
      progress_percent: 100,
      progress_status: "Contract ready",
      contract_id: saved.contractId,
      completed_at: new Date().toISOString(),
      error_message: null,
    });

    return saved;
  } catch (error) {
    const message = error instanceof Error ? error.message : "Contract generation failed";
    const timedOut =
      error instanceof Error &&
      (error.name === "AbortError" || /timed?\s*out/i.test(error.message));

    await updateContractGenerationJob(supabase, jobId, {
      status: timedOut ? "timed_out" : "failed",
      progress_status: timedOut ? "Generation timed out" : "Generation failed",
      error_message: message,
      completed_at: new Date().toISOString(),
    });

    throw error;
  }
}
