import { NextRequest, NextResponse } from "next/server";
import { createAdminClient } from "@/lib/supabase/admin";
import { reconcileContractGenerationJob } from "@/lib/contracts/reconcile-generation-job";
import type { ContractGenerationJobRecord } from "@/lib/contracts/generation-jobs";

export const dynamic = "force-dynamic";

// Don't reconcile jobs younger than this — give the live client poll the first
// chance to persist, and avoid racing a POST that is still attaching its
// openai_response_id.
const RECONCILE_MIN_AGE_MS = 30_000;
// Cap per run so a backlog can't exceed the Netlify function wall-clock limit.
const RECONCILE_BATCH_LIMIT = 25;

/**
 * Server-side reconciler (GEN-5): persist completed-but-unpolled generation jobs
 * and flip stuck jobs to timed_out, so closing the tab no longer loses the
 * generated contract. Intended to be invoked on a schedule (e.g. a Netlify
 * scheduled function or cron) with the CRON_SECRET bearer token.
 *
 * Uses the shared, idempotent reconcileContractGenerationJob helper — the same
 * retrieve/persist/finalize path as the live poll — whose atomic finalization
 * claim guarantees a racing live poll can never double-insert a contract.
 */
export async function POST(request: NextRequest) {
  // Fail closed: a missing secret rejects rather than exposing the endpoint.
  const cronSecret = process.env.CRON_SECRET;
  const authHeader = request.headers.get("authorization");
  if (!cronSecret || authHeader !== `Bearer ${cronSecret}`) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  try {
    const supabase = createAdminClient();
    const cutoff = new Date(Date.now() - RECONCILE_MIN_AGE_MS).toISOString();

    const { data: jobs, error } = await supabase
      .from("contract_generation_jobs")
      .select("*")
      .in("status", ["queued", "processing"])
      .not("openai_response_id", "is", null)
      .is("contract_id", null)
      .lt("created_at", cutoff)
      .order("created_at", { ascending: true })
      .limit(RECONCILE_BATCH_LIMIT);

    if (error) {
      console.error("Failed to load jobs for reconciliation:", error);
      return NextResponse.json(
        { error: "Failed to load generation jobs" },
        { status: 500 }
      );
    }

    const results = { processed: 0, persisted: 0, failed: 0, timedOut: 0, pending: 0 };

    for (const row of (jobs ?? []) as ContractGenerationJobRecord[]) {
      results.processed += 1;
      try {
        const reconciled = await reconcileContractGenerationJob({ supabase, job: row });
        if (reconciled.status === "completed") results.persisted += 1;
        else if (reconciled.status === "failed") results.failed += 1;
        else if (reconciled.status === "timed_out") results.timedOut += 1;
        else results.pending += 1;
      } catch (jobError) {
        console.error(`Failed to reconcile generation job ${row.id}:`, jobError);
      }
    }

    return NextResponse.json(results, { headers: { "Cache-Control": "no-store" } });
  } catch (error) {
    console.error("Contract generation reconcile error:", error);
    return NextResponse.json(
      { error: "Failed to reconcile generation jobs" },
      { status: 500 }
    );
  }
}
