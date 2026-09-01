-- BILLING-4: Stripe webhook idempotency / event de-duplication.
--
-- Records the id of every Stripe webhook event we have started processing so
-- that retried or replayed deliveries (Stripe retries on any slow or non-2xx
-- response) become 200 no-ops. The webhook handler in
-- apps/web/src/app/api/webhooks/stripe/route.ts CLAIMS the event id (INSERT)
-- before running any side effects (receipt emails, subscription writes, audit
-- logs) and RELEASES the claim (DELETE) if processing throws, so genuine
-- failures are still retried by Stripe rather than permanently de-duped.
--
-- Idempotent: safe to run multiple times.

create table if not exists public.stripe_webhook_events (
  event_id     text primary key,
  event_type   text,
  processed_at timestamptz not null default now()
);

comment on table public.stripe_webhook_events is
  'De-dup ledger of Stripe webhook event ids (BILLING-4). A row is claimed before an event is handled; duplicate deliveries short-circuit to a 200 no-op.';

-- Supports pruning old rows by age if a retention job is added later.
create index if not exists stripe_webhook_events_processed_at_idx
  on public.stripe_webhook_events (processed_at);

-- Only the service-role webhook handler (createAdminClient) should touch this
-- table. Enabling RLS with no policies denies anon/authenticated entirely;
-- the service role bypasses RLS.
alter table public.stripe_webhook_events enable row level security;
