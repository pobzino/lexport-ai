-- Add an atomic finalization claim column so the completion/persist path is
-- idempotent. See LAUNCH-ISSUES.md -> GEN-3 (and GEN-5).
--
-- Persisting a completed OpenAI background response (insert the `contracts` row +
-- increment usage) used to be guarded only by an in-handler read of
-- job.contract_id. Two concurrent polls (e.g. the same job open in two tabs), a
-- client retry, or a live poll racing the server-side reconciler could both see
-- contract_id = null and both persist -> duplicate contract + double usage count.
--
-- `finalizing_at` is claimed with a single conditional UPDATE
--   ... WHERE contract_id IS NULL AND finalizing_at IS NULL
--       AND status IN ('queued','processing') RETURNING id
-- which is atomic at the Postgres row level, so exactly one concurrent worker
-- wins the right to parse + persist; everyone else observes the claim and reads
-- back the winner's result instead of inserting a second contract.

ALTER TABLE public.contract_generation_jobs
  ADD COLUMN IF NOT EXISTS finalizing_at TIMESTAMPTZ;
