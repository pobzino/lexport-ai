-- Keep the individual sender and company identity separate and snapshot bank
-- transfer instructions on each invoice at creation time.
ALTER TABLE public.invoices
  ADD COLUMN IF NOT EXISTS sender_company TEXT,
  ADD COLUMN IF NOT EXISTS bank_details JSONB;

COMMENT ON COLUMN public.invoices.sender_company IS
  'Company or trading name shown separately from the individual sender_name.';
COMMENT ON COLUMN public.invoices.bank_details IS
  'Bank transfer instructions snapshotted when the invoice is created.';
