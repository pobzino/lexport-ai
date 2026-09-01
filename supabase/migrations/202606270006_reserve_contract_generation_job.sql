-- Atomic check-and-reserve for contract generation quota.
-- See LAUNCH-ISSUES.md -> GEN-1 and BILLING-5.
--
-- Previously the monthly contract limit was enforced in JS by counting only
-- committed `contracts` rows BEFORE the contract was created. The contract row
-- (and the usage increment) is only written when a background generation job
-- COMPLETES, long after the POST limit check, so N concurrent / rapid generate
-- requests all read the same pre-insertion count and all pass (TOCTOU race).
--
-- This RPC closes the race by doing the check-and-reserve in a single
-- transaction, serialized per-user via SELECT ... FOR UPDATE on the users row:
--   used = (contracts this month) + (in-flight queued/processing jobs this month)
-- and only inserting the queued job row when used < monthly_limit. Concurrent
-- callers for the same user serialize on the user row lock, so the second caller
-- sees the first caller's freshly-inserted job and is correctly rejected.
--
-- Only queued/processing jobs from the last 15 minutes are counted so that
-- stuck / not-yet-reconciled jobs cannot permanently consume a user's quota
-- (the job timeout is 10 minutes; 15 gives margin). Completed jobs are excluded
-- because their persisted `contracts` row already counts; failed/timed_out jobs
-- are excluded so a failed generation never permanently burns quota.

CREATE OR REPLACE FUNCTION public.reserve_contract_generation_job(
  p_user_id uuid,
  p_contract_type text,
  p_metadata jsonb,
  p_payment_config jsonb,
  p_monthly_limit integer
)
RETURNS uuid
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  v_used integer;
  v_job_id uuid;
BEGIN
  -- A caller may only reserve quota for themselves.
  IF auth.uid() IS NULL OR auth.uid() <> p_user_id THEN
    RAISE EXCEPTION 'Not authorized to reserve a generation job for this user';
  END IF;

  -- Serialize concurrent reservations for this user. The lock is held until
  -- this function's transaction commits, so a second concurrent reservation
  -- blocks here and then observes the first reservation's inserted job below.
  PERFORM 1 FROM public.users WHERE id = p_user_id FOR UPDATE;

  v_used := (
    SELECT count(*)
    FROM public.contracts c
    WHERE c.user_id = p_user_id
      AND c.created_at >= date_trunc('month', now())
  ) + (
    SELECT count(*)
    FROM public.contract_generation_jobs j
    WHERE j.user_id = p_user_id
      AND j.status IN ('queued', 'processing')
      AND j.created_at >= date_trunc('month', now())
      AND j.created_at > now() - interval '15 minutes'
  );

  IF v_used >= p_monthly_limit THEN
    RETURN NULL;
  END IF;

  INSERT INTO public.contract_generation_jobs (
    user_id,
    contract_type,
    metadata,
    payment_config,
    status,
    progress_percent,
    progress_status
  )
  VALUES (
    p_user_id,
    p_contract_type,
    p_metadata,
    p_payment_config,
    'queued',
    5,
    'Queued for generation'
  )
  RETURNING id INTO v_job_id;

  RETURN v_job_id;
END;
$$;

GRANT EXECUTE ON FUNCTION public.reserve_contract_generation_job(uuid, text, jsonb, jsonb, integer) TO authenticated;
