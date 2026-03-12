-- Restore tracked schema objects that exist in hosted production but were
-- never captured in migrations, and align reminder tracking with current app code.

ALTER TABLE public.contracts
  ADD COLUMN IF NOT EXISTS balance_due_date TIMESTAMPTZ,
  ADD COLUMN IF NOT EXISTS last_reminder_sent TIMESTAMPTZ;

CREATE TABLE IF NOT EXISTS public.review_requests (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  contract_id UUID NOT NULL REFERENCES public.contracts(id) ON DELETE CASCADE,
  token TEXT NOT NULL UNIQUE,
  reviewer_email TEXT NOT NULL,
  reviewer_name TEXT NOT NULL,
  message TEXT,
  status TEXT NOT NULL DEFAULT 'pending',
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  expires_at TIMESTAMPTZ,
  viewed_at TIMESTAMPTZ,
  responded_at TIMESTAMPTZ,
  response_message TEXT,
  created_by UUID REFERENCES auth.users(id),
  CONSTRAINT review_requests_status_check CHECK (
    status = ANY (
      ARRAY[
        'pending'::TEXT,
        'viewed'::TEXT,
        'approved'::TEXT,
        'changes_requested'::TEXT,
        'expired'::TEXT,
        'cancelled'::TEXT
      ]
    )
  )
);

CREATE INDEX IF NOT EXISTS idx_review_requests_contract_id
  ON public.review_requests(contract_id);

ALTER TABLE public.review_requests ENABLE ROW LEVEL SECURITY;

DROP POLICY IF EXISTS "Anyone can view review request by token" ON public.review_requests;
DROP POLICY IF EXISTS "Users can manage review requests for their contracts" ON public.review_requests;

CREATE POLICY "Anyone can view review request by token"
  ON public.review_requests
  FOR SELECT
  USING (true);

CREATE POLICY "Users can manage review requests for their contracts"
  ON public.review_requests
  FOR ALL
  USING (
    EXISTS (
      SELECT 1
      FROM public.contracts
      WHERE public.contracts.id = public.review_requests.contract_id
        AND public.contracts.user_id = auth.uid()
    )
  );

CREATE TABLE IF NOT EXISTS public.payment_reminders (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  contract_id UUID NOT NULL REFERENCES public.contracts(id) ON DELETE CASCADE,
  payment_id UUID REFERENCES public.payments(id) ON DELETE SET NULL,
  recipient_email TEXT NOT NULL,
  recipient_name TEXT,
  reminder_type TEXT NOT NULL,
  amount INTEGER NOT NULL,
  currency TEXT NOT NULL DEFAULT 'usd',
  sent_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  email_id TEXT,
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  CONSTRAINT payment_reminders_reminder_type_check CHECK (
    reminder_type = ANY (ARRAY['first'::TEXT, 'second'::TEXT, 'final'::TEXT])
  )
);

CREATE INDEX IF NOT EXISTS idx_payment_reminders_contract_sent_at
  ON public.payment_reminders(contract_id, sent_at DESC);

ALTER TABLE public.payment_reminders ENABLE ROW LEVEL SECURITY;

DROP POLICY IF EXISTS "Users can create reminders for their contracts" ON public.payment_reminders;
DROP POLICY IF EXISTS "Users can view their contract reminders" ON public.payment_reminders;

CREATE POLICY "Users can create reminders for their contracts"
  ON public.payment_reminders
  FOR INSERT
  WITH CHECK (
    EXISTS (
      SELECT 1
      FROM public.contracts
      WHERE public.contracts.id = public.payment_reminders.contract_id
        AND public.contracts.user_id = auth.uid()
    )
  );

CREATE POLICY "Users can view their contract reminders"
  ON public.payment_reminders
  FOR SELECT
  USING (
    EXISTS (
      SELECT 1
      FROM public.contracts
      WHERE public.contracts.id = public.payment_reminders.contract_id
        AND public.contracts.user_id = auth.uid()
    )
  );

ALTER TABLE public.signature_reminder_history
  ADD COLUMN IF NOT EXISTS sent_by UUID REFERENCES auth.users(id) ON DELETE SET NULL,
  ADD COLUMN IF NOT EXISTS status TEXT;

ALTER TABLE public.signature_reminder_history
  ALTER COLUMN sent_at SET DEFAULT NOW(),
  ALTER COLUMN reminder_type SET DEFAULT 'manual',
  ALTER COLUMN status SET DEFAULT 'sent';

UPDATE public.signature_reminder_history
SET reminder_type = CASE
  WHEN reminder_type IN ('manual', 'auto') THEN reminder_type
  ELSE 'auto'
END;

UPDATE public.signature_reminder_history
SET status = COALESCE(status, 'sent');

ALTER TABLE public.signature_reminder_history
  ALTER COLUMN status SET NOT NULL;

ALTER TABLE public.signature_reminder_history
  DROP CONSTRAINT IF EXISTS signature_reminder_history_reminder_type_check,
  DROP CONSTRAINT IF EXISTS signature_reminder_history_status_check;

ALTER TABLE public.signature_reminder_history
  ADD CONSTRAINT signature_reminder_history_reminder_type_check CHECK (
    reminder_type = ANY (ARRAY['manual'::TEXT, 'auto'::TEXT])
  ),
  ADD CONSTRAINT signature_reminder_history_status_check CHECK (
    status = ANY (
      ARRAY[
        'sent'::TEXT,
        'delivered'::TEXT,
        'opened'::TEXT,
        'clicked'::TEXT,
        'bounced'::TEXT,
        'failed'::TEXT
      ]
    )
  );

ALTER TABLE public.signature_reminder_history
  DROP COLUMN IF EXISTS recipient_email,
  DROP COLUMN IF EXISTS recipient_name,
  DROP COLUMN IF EXISTS days_until_expiration;

ALTER TABLE public.signature_reminder_history ENABLE ROW LEVEL SECURITY;

DROP POLICY IF EXISTS "Users can insert reminder history for their contracts" ON public.signature_reminder_history;
DROP POLICY IF EXISTS "Users can view reminder history for their contracts" ON public.signature_reminder_history;

CREATE POLICY "Users can insert reminder history for their contracts"
  ON public.signature_reminder_history
  FOR INSERT
  WITH CHECK (
    contract_id IN (
      SELECT public.contracts.id
      FROM public.contracts
      WHERE public.contracts.user_id = auth.uid()
    )
  );

CREATE POLICY "Users can view reminder history for their contracts"
  ON public.signature_reminder_history
  FOR SELECT
  USING (
    contract_id IN (
      SELECT public.contracts.id
      FROM public.contracts
      WHERE public.contracts.user_id = auth.uid()
    )
  );
