-- Audit evidence must only be written by trusted server-side code and database
-- functions. Users retain read access to logs for contracts they own.

DROP POLICY IF EXISTS "audit_logs_insert" ON public.audit_logs;
DROP POLICY IF EXISTS "audit_logs_insert_own" ON public.audit_logs;

REVOKE INSERT, UPDATE, DELETE ON TABLE public.audit_logs FROM anon, authenticated;
GRANT ALL ON TABLE public.audit_logs TO service_role;
