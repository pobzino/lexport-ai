-- Restore notification preferences schema that exists in hosted Supabase
-- but was missing from tracked local migrations.

CREATE TABLE IF NOT EXISTS public.notification_preferences (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id UUID NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  notification_type TEXT NOT NULL CHECK (
    notification_type IN (
      'contract_signed',
      'signature_requested',
      'signature_completed',
      'signature_declined',
      'payment_received',
      'payment_failed',
      'contract_expired',
      'contract_expiring_soon',
      'review_submitted',
      'comment_added',
      'signature_reminder_sent',
      'invoice_reminder_sent',
      'signature_expiring_soon',
      'signature_request_viewed',
      'invoice_overdue'
    )
  ),
  email_enabled BOOLEAN NOT NULL DEFAULT TRUE,
  in_app_enabled BOOLEAN NOT NULL DEFAULT TRUE,
  created_at TIMESTAMPTZ DEFAULT NOW(),
  updated_at TIMESTAMPTZ DEFAULT NOW()
);

CREATE UNIQUE INDEX IF NOT EXISTS notification_preferences_user_type_unique
  ON public.notification_preferences(user_id, notification_type);

CREATE INDEX IF NOT EXISTS idx_notification_preferences_user_id
  ON public.notification_preferences(user_id);

ALTER TABLE public.notification_preferences ENABLE ROW LEVEL SECURITY;

DROP POLICY IF EXISTS "Users can view own notification preferences" ON public.notification_preferences;
DROP POLICY IF EXISTS "Users can insert own notification preferences" ON public.notification_preferences;
DROP POLICY IF EXISTS "Users can update own notification preferences" ON public.notification_preferences;
DROP POLICY IF EXISTS "Users can delete own notification preferences" ON public.notification_preferences;

CREATE POLICY "Users can view own notification preferences"
  ON public.notification_preferences
  FOR SELECT
  USING (auth.uid() = user_id);

CREATE POLICY "Users can insert own notification preferences"
  ON public.notification_preferences
  FOR INSERT
  WITH CHECK (auth.uid() = user_id);

CREATE POLICY "Users can update own notification preferences"
  ON public.notification_preferences
  FOR UPDATE
  USING (auth.uid() = user_id)
  WITH CHECK (auth.uid() = user_id);

CREATE POLICY "Users can delete own notification preferences"
  ON public.notification_preferences
  FOR DELETE
  USING (auth.uid() = user_id);
