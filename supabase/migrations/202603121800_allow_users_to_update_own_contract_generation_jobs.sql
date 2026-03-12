DROP POLICY IF EXISTS "contract_generation_jobs_update_own" ON public.contract_generation_jobs;
CREATE POLICY "contract_generation_jobs_update_own"
  ON public.contract_generation_jobs
  FOR UPDATE
  USING (user_id = auth.uid())
  WITH CHECK (user_id = auth.uid());
