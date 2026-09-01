ALTER TABLE public.invoices
  ADD COLUMN IF NOT EXISTS stripe_payment_intent_id TEXT;

CREATE INDEX IF NOT EXISTS idx_invoices_stripe_payment_intent_id
  ON public.invoices(stripe_payment_intent_id)
  WHERE stripe_payment_intent_id IS NOT NULL;

COMMENT ON COLUMN public.invoices.stripe_payment_intent_id IS
  'Stripe PaymentIntent used by the public invoice checkout.';
