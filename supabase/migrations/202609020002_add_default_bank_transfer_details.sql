ALTER TABLE public.invoice_settings
  ADD COLUMN IF NOT EXISTS bank_details JSONB;

COMMENT ON COLUMN public.invoice_settings.bank_details IS
  'Default bank transfer instructions copied to new invoices and contract payment pages.';
