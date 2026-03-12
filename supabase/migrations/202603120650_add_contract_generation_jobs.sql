CREATE TABLE IF NOT EXISTS public.contract_generation_jobs (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id UUID NOT NULL REFERENCES public.users(id) ON DELETE CASCADE,
  contract_type TEXT NOT NULL,
  metadata JSONB NOT NULL,
  payment_config JSONB,
  status TEXT NOT NULL DEFAULT 'queued'
    CHECK (status IN ('queued', 'processing', 'completed', 'failed', 'timed_out')),
  progress_percent INTEGER NOT NULL DEFAULT 0
    CHECK (progress_percent >= 0 AND progress_percent <= 100),
  progress_status TEXT NOT NULL DEFAULT 'Queued for generation',
  error_message TEXT,
  contract_id UUID REFERENCES public.contracts(id) ON DELETE SET NULL,
  attempt_count INTEGER NOT NULL DEFAULT 0,
  started_at TIMESTAMPTZ,
  completed_at TIMESTAMPTZ,
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

ALTER TABLE public.contract_generation_jobs ENABLE ROW LEVEL SECURITY;

DROP POLICY IF EXISTS "contract_generation_jobs_select_own" ON public.contract_generation_jobs;
CREATE POLICY "contract_generation_jobs_select_own"
  ON public.contract_generation_jobs
  FOR SELECT
  USING (user_id = auth.uid());

DROP POLICY IF EXISTS "contract_generation_jobs_insert_own" ON public.contract_generation_jobs;
CREATE POLICY "contract_generation_jobs_insert_own"
  ON public.contract_generation_jobs
  FOR INSERT
  WITH CHECK (user_id = auth.uid());

CREATE INDEX IF NOT EXISTS idx_contract_generation_jobs_user_id
  ON public.contract_generation_jobs(user_id);

CREATE INDEX IF NOT EXISTS idx_contract_generation_jobs_status_created_at
  ON public.contract_generation_jobs(status, created_at DESC);

CREATE INDEX IF NOT EXISTS idx_contract_generation_jobs_contract_id
  ON public.contract_generation_jobs(contract_id);
