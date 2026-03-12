-- Add standalone invoice reminder tracking and restore hosted user/onboarding
-- schema objects that were missing from tracked local migrations.

ALTER TABLE public.payment_reminders
  ADD COLUMN IF NOT EXISTS invoice_id UUID REFERENCES public.invoices(id) ON DELETE CASCADE;

ALTER TABLE public.payment_reminders
  ALTER COLUMN contract_id DROP NOT NULL;

ALTER TABLE public.payment_reminders
  DROP CONSTRAINT IF EXISTS payment_reminders_reference_check;

ALTER TABLE public.payment_reminders
  ADD CONSTRAINT payment_reminders_reference_check CHECK (
    contract_id IS NOT NULL OR invoice_id IS NOT NULL
  );

CREATE INDEX IF NOT EXISTS idx_payment_reminders_invoice_sent_at
  ON public.payment_reminders(invoice_id, sent_at DESC)
  WHERE invoice_id IS NOT NULL;

DROP POLICY IF EXISTS "Users can create reminders for their contracts" ON public.payment_reminders;
DROP POLICY IF EXISTS "Users can view their contract reminders" ON public.payment_reminders;

CREATE POLICY "Users can create owned payment reminders"
  ON public.payment_reminders
  FOR INSERT
  WITH CHECK (
    EXISTS (
      SELECT 1
      FROM public.contracts
      WHERE public.contracts.id = public.payment_reminders.contract_id
        AND public.contracts.user_id = auth.uid()
    )
    OR EXISTS (
      SELECT 1
      FROM public.invoices
      WHERE public.invoices.id = public.payment_reminders.invoice_id
        AND public.invoices.user_id = auth.uid()
    )
  );

CREATE POLICY "Users can view owned payment reminders"
  ON public.payment_reminders
  FOR SELECT
  USING (
    EXISTS (
      SELECT 1
      FROM public.contracts
      WHERE public.contracts.id = public.payment_reminders.contract_id
        AND public.contracts.user_id = auth.uid()
    )
    OR EXISTS (
      SELECT 1
      FROM public.invoices
      WHERE public.invoices.id = public.payment_reminders.invoice_id
        AND public.invoices.user_id = auth.uid()
    )
  );

ALTER TABLE public.users
  ADD COLUMN IF NOT EXISTS user_type TEXT,
  ADD COLUMN IF NOT EXISTS onboarding_completed_at TIMESTAMPTZ,
  ADD COLUMN IF NOT EXISTS ai_chat_messages_used INTEGER NOT NULL DEFAULT 0;

CREATE TABLE IF NOT EXISTS public.onboarding_progress (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id UUID NOT NULL REFERENCES public.users(id) ON DELETE CASCADE,
  step TEXT NOT NULL,
  completed_at TIMESTAMPTZ DEFAULT NOW(),
  metadata JSONB,
  created_at TIMESTAMPTZ DEFAULT NOW(),
  CONSTRAINT onboarding_progress_user_id_step_key UNIQUE (user_id, step)
);

CREATE INDEX IF NOT EXISTS idx_onboarding_progress_user_id
  ON public.onboarding_progress(user_id);

ALTER TABLE public.onboarding_progress ENABLE ROW LEVEL SECURITY;

DROP POLICY IF EXISTS "Users can view own onboarding progress" ON public.onboarding_progress;
DROP POLICY IF EXISTS "Users can insert own onboarding progress" ON public.onboarding_progress;
DROP POLICY IF EXISTS "Users can update own onboarding progress" ON public.onboarding_progress;

CREATE POLICY "Users can view own onboarding progress"
  ON public.onboarding_progress
  FOR SELECT
  USING (auth.uid() = user_id);

CREATE POLICY "Users can insert own onboarding progress"
  ON public.onboarding_progress
  FOR INSERT
  WITH CHECK (auth.uid() = user_id);

CREATE POLICY "Users can update own onboarding progress"
  ON public.onboarding_progress
  FOR UPDATE
  USING (auth.uid() = user_id);

CREATE TABLE IF NOT EXISTS public.dismissed_tips (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id UUID NOT NULL REFERENCES public.users(id) ON DELETE CASCADE,
  tip_id TEXT NOT NULL,
  dismissed_at TIMESTAMPTZ DEFAULT NOW(),
  CONSTRAINT dismissed_tips_user_id_tip_id_key UNIQUE (user_id, tip_id)
);

CREATE INDEX IF NOT EXISTS idx_dismissed_tips_user_id
  ON public.dismissed_tips(user_id);

ALTER TABLE public.dismissed_tips ENABLE ROW LEVEL SECURITY;

DROP POLICY IF EXISTS "Users can view own dismissed tips" ON public.dismissed_tips;
DROP POLICY IF EXISTS "Users can insert own dismissed tips" ON public.dismissed_tips;
DROP POLICY IF EXISTS "Users can update own dismissed tips" ON public.dismissed_tips;

CREATE POLICY "Users can view own dismissed tips"
  ON public.dismissed_tips
  FOR SELECT
  USING (auth.uid() = user_id);

CREATE POLICY "Users can insert own dismissed tips"
  ON public.dismissed_tips
  FOR INSERT
  WITH CHECK (auth.uid() = user_id);

CREATE POLICY "Users can update own dismissed tips"
  ON public.dismissed_tips
  FOR UPDATE
  USING (auth.uid() = user_id);

CREATE OR REPLACE FUNCTION public.handle_new_user()
RETURNS trigger
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
BEGIN
  INSERT INTO public.users (
    id,
    email,
    name,
    created_at,
    updated_at
  )
  VALUES (
    NEW.id,
    NEW.email,
    COALESCE(
      NEW.raw_user_meta_data->>'full_name',
      NEW.raw_user_meta_data->>'name',
      split_part(NEW.email, '@', 1)
    ),
    NOW(),
    NOW()
  )
  ON CONFLICT (id) DO UPDATE
  SET
    email = EXCLUDED.email,
    name = COALESCE(public.users.name, EXCLUDED.name),
    updated_at = NOW();

  RETURN NEW;
END;
$$;

DO $$
BEGIN
  INSERT INTO public.users (
    id,
    email,
    name,
    created_at,
    updated_at
  )
  SELECT
    au.id,
    au.email,
    COALESCE(
      au.raw_user_meta_data->>'full_name',
      au.raw_user_meta_data->>'name',
      split_part(au.email, '@', 1)
    ),
    COALESCE(au.created_at, NOW()),
    NOW()
  FROM auth.users au
  LEFT JOIN public.users pu ON pu.id = au.id
  WHERE pu.id IS NULL;
EXCEPTION
  WHEN undefined_table THEN
    RAISE NOTICE 'Skipping auth.users backfill because auth.users is unavailable in this context.';
END;
$$;

DO $$
BEGIN
  DROP TRIGGER IF EXISTS on_auth_user_created ON auth.users;
  CREATE TRIGGER on_auth_user_created
    AFTER INSERT ON auth.users
    FOR EACH ROW
    EXECUTE FUNCTION public.handle_new_user();
EXCEPTION
  WHEN insufficient_privilege THEN
    RAISE NOTICE 'Skipping on_auth_user_created trigger creation due to insufficient privileges.';
END;
$$;
