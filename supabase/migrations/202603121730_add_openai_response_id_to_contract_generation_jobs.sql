ALTER TABLE public.contract_generation_jobs
ADD COLUMN IF NOT EXISTS openai_response_id TEXT;

CREATE INDEX IF NOT EXISTS idx_contract_generation_jobs_openai_response_id
  ON public.contract_generation_jobs(openai_response_id);
