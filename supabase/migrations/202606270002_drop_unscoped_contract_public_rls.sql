-- DATA-1 (P0): Remove the unscoped public RLS policies on public.contracts.
--
-- "Allow public read of contracts for signing" granted SELECT on ANY contract
-- that has a signature_request to EVERY role (including anon). Because the anon
-- key ships in the client bundle, anyone could read every sent/signed contract's
-- full content directly via the Supabase REST API
--   (GET /rest/v1/contracts?select=*). "Allow contract status update when fully
-- signed" likewise granted public UPDATE of contract status.
--
-- The signing, review, and portal flows read/write contracts server-side via the
-- service-role admin client (src/lib/supabase/admin.ts -> createAdminClient),
-- which BYPASSES RLS, so these public policies are unnecessary for the product to
-- work and only widen the attack surface. Authenticated owners continue to read
-- their own contracts via the "contracts_select_own" owner-scoped policy
-- (2026031102_rls_and_indexes.sql). See LAUNCH-ISSUES.md -> DATA-1.

DROP POLICY IF EXISTS "Allow public read of contracts for signing" ON public.contracts;
DROP POLICY IF EXISTS "Allow contract status update when fully signed" ON public.contracts;

-- The SECURITY DEFINER helpers contract_has_signature_requests() /
-- contract_all_signature_requests_signed() are left in place: they are harmless
-- and may be referenced by other objects. get_contract_owner() remains in use by
-- the signature_requests owner policies.
