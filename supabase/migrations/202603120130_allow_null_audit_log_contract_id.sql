-- Allow standalone invoice events to be recorded in audit_logs without a contract.
ALTER TABLE public.audit_logs
ALTER COLUMN contract_id DROP NOT NULL;
