-- ============================================================
-- Fix recursive RLS evaluation between contracts and
-- signature_requests.
--
-- Legacy public-signing policies on contracts referenced
-- signature_requests directly. New owner-scoped policies on
-- signature_requests also reference contracts, which causes
-- Postgres to recurse while evaluating INSERT/SELECT policies.
-- ============================================================

-- SECURITY DEFINER helpers avoid evaluating child-table RLS while
-- checking whether a contract has signature requests.
CREATE OR REPLACE FUNCTION public.get_contract_owner(p_contract_id uuid)
RETURNS uuid
LANGUAGE sql
STABLE
SECURITY DEFINER
SET search_path TO 'public'
AS $function$
  SELECT user_id
  FROM public.contracts
  WHERE id = p_contract_id
  LIMIT 1;
$function$;

CREATE OR REPLACE FUNCTION public.contract_has_signature_requests(p_contract_id uuid)
RETURNS boolean
LANGUAGE sql
STABLE
SECURITY DEFINER
SET search_path TO 'public'
AS $function$
  SELECT EXISTS (
    SELECT 1
    FROM public.signature_requests
    WHERE contract_id = p_contract_id
  );
$function$;

CREATE OR REPLACE FUNCTION public.contract_all_signature_requests_signed(p_contract_id uuid)
RETURNS boolean
LANGUAGE sql
STABLE
SECURITY DEFINER
SET search_path TO 'public'
AS $function$
  SELECT NOT EXISTS (
    SELECT 1
    FROM public.signature_requests
    WHERE contract_id = p_contract_id
      AND status <> 'signed'
  );
$function$;

-- Remove duplicate legacy policies so contracts use a single canonical
-- owner-scoped policy set plus safe public-signing helpers.
DROP POLICY IF EXISTS "Users can view own contracts" ON public.contracts;
DROP POLICY IF EXISTS "Users can create contracts" ON public.contracts;
DROP POLICY IF EXISTS "Users can update own contracts" ON public.contracts;
DROP POLICY IF EXISTS "Users can delete own contracts" ON public.contracts;
DROP POLICY IF EXISTS "Allow public read of contracts for signing" ON public.contracts;
DROP POLICY IF EXISTS "Allow contract status update when fully signed" ON public.contracts;

CREATE POLICY "Allow public read of contracts for signing" ON public.contracts
FOR SELECT
USING (public.contract_has_signature_requests(id));

CREATE POLICY "Allow contract status update when fully signed" ON public.contracts
FOR UPDATE
USING (public.contract_has_signature_requests(id))
WITH CHECK (
  status = 'signed'
  AND public.contract_all_signature_requests_signed(id)
);

-- Rebuild signature_request owner policies to use the security-definer
-- owner helper instead of joining back through contracts under RLS.
DROP POLICY IF EXISTS "Contract owners can insert signature requests" ON public.signature_requests;
DROP POLICY IF EXISTS "Contract owners can update signature requests" ON public.signature_requests;
DROP POLICY IF EXISTS "Contract owners can delete signature requests" ON public.signature_requests;
DROP POLICY IF EXISTS "sig_requests_select_contract_owner" ON public.signature_requests;
DROP POLICY IF EXISTS "sig_requests_insert_contract_owner" ON public.signature_requests;
DROP POLICY IF EXISTS "sig_requests_update_contract_owner" ON public.signature_requests;
DROP POLICY IF EXISTS "sig_requests_delete_contract_owner" ON public.signature_requests;

CREATE POLICY "sig_requests_select_contract_owner" ON public.signature_requests
FOR SELECT
USING (public.get_contract_owner(contract_id) = auth.uid());

CREATE POLICY "sig_requests_insert_contract_owner" ON public.signature_requests
FOR INSERT
WITH CHECK (public.get_contract_owner(contract_id) = auth.uid());

CREATE POLICY "sig_requests_update_contract_owner" ON public.signature_requests
FOR UPDATE
USING (public.get_contract_owner(contract_id) = auth.uid());

CREATE POLICY "sig_requests_delete_contract_owner" ON public.signature_requests
FOR DELETE
USING (public.get_contract_owner(contract_id) = auth.uid());
