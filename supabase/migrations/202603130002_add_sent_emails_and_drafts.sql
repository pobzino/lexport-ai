-- sent_emails: stores outgoing emails (replies, composed messages)
CREATE TABLE IF NOT EXISTS sent_emails (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id UUID REFERENCES users(id) ON DELETE CASCADE,
  resend_email_id TEXT,
  from_address TEXT NOT NULL,
  to_addresses TEXT[] NOT NULL,
  cc TEXT[],
  bcc TEXT[],
  subject TEXT,
  html TEXT,
  text_body TEXT,
  in_reply_to TEXT,
  reply_to_received_email_id UUID REFERENCES received_emails(id),
  thread_id TEXT,
  status TEXT DEFAULT 'sent',
  created_at TIMESTAMPTZ DEFAULT NOW(),
  updated_at TIMESTAMPTZ DEFAULT NOW()
);

CREATE INDEX IF NOT EXISTS idx_sent_emails_user_id ON sent_emails(user_id);
CREATE INDEX IF NOT EXISTS idx_sent_emails_thread_id ON sent_emails(thread_id);
CREATE INDEX IF NOT EXISTS idx_sent_emails_created_at ON sent_emails(created_at DESC);

ALTER TABLE sent_emails ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Users can view their own sent emails"
  ON sent_emails FOR SELECT
  USING (auth.uid() = user_id);

CREATE POLICY "Service role can manage sent emails"
  ON sent_emails FOR ALL
  USING (true)
  WITH CHECK (true);

-- email_drafts: unsent drafts
CREATE TABLE IF NOT EXISTS email_drafts (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id UUID REFERENCES users(id) ON DELETE CASCADE,
  to_addresses TEXT[],
  subject TEXT,
  body TEXT,
  reply_to_received_email_id UUID REFERENCES received_emails(id),
  thread_id TEXT,
  created_at TIMESTAMPTZ DEFAULT NOW(),
  updated_at TIMESTAMPTZ DEFAULT NOW()
);

CREATE INDEX IF NOT EXISTS idx_email_drafts_user_id ON email_drafts(user_id);
CREATE INDEX IF NOT EXISTS idx_email_drafts_updated_at ON email_drafts(updated_at DESC);

ALTER TABLE email_drafts ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Users can manage their own drafts"
  ON email_drafts FOR ALL
  USING (auth.uid() = user_id)
  WITH CHECK (auth.uid() = user_id);

-- Add thread_id to received_emails for threading
ALTER TABLE received_emails ADD COLUMN IF NOT EXISTS thread_id TEXT;
CREATE INDEX IF NOT EXISTS idx_received_emails_thread_id ON received_emails(thread_id);
CREATE INDEX IF NOT EXISTS idx_received_emails_message_id ON received_emails(message_id);

-- Backfill thread_id on existing received_emails using normalized subject
UPDATE received_emails
SET thread_id = lower(trim(regexp_replace(
  regexp_replace(
    regexp_replace(subject, '^(Re|Fwd|FW|Fw):\s*', '', 'i'),
    '^(Re|Fwd|FW|Fw):\s*', '', 'i'
  ),
  '^(Re|Fwd|FW|Fw):\s*', '', 'i'
)))
WHERE thread_id IS NULL;
