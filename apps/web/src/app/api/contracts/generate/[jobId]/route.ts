import { NextRequest, NextResponse } from "next/server";
import { createClient } from "@/lib/supabase/server";
import {
  isTerminalContractGenerationJobStatus,
  type ContractGenerationJobRecord,
} from "@/lib/contracts/generation-jobs";
import { reconcileContractGenerationJob } from "@/lib/contracts/reconcile-generation-job";

export const dynamic = "force-dynamic";

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

    // Shared, idempotent retrieve/persist/finalize path (GEN-3/GEN-4/GEN-5):
    // identical to the server-side reconciler, so a malformed response fails the
    // job with a real message instead of a 500, and concurrent polls/retries can
    // never duplicate the contract or double-count usage.
    const reconciled = await reconcileContractGenerationJob({
      supabase,
      job,
      actorEmailFallback: user.email ?? null,
      actorNameFallback:
        typeof user.user_metadata?.full_name === "string"
          ? user.user_metadata.full_name
          : null,
    });

    return NextResponse.json(
      {
        jobId: job.id,
        status: reconciled.status,
        progressPercent: reconciled.progressPercent,
        progressStatus: reconciled.progressStatus,
        contractId: reconciled.contractId,
        error: reconciled.error,
        attemptCount: job.attempt_count,
        startedAt: reconciled.startedAt,
        completedAt: reconciled.completedAt,
        terminal: isTerminalContractGenerationJobStatus(reconciled.status),
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
