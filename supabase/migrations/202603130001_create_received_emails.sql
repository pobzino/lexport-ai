-- Received emails table for Resend inbound email handling
CREATE TABLE IF NOT EXISTS received_emails (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  resend_email_id TEXT NOT NULL UNIQUE,
  user_id UUID REFERENCES users(id) ON DELETE CASCADE,
  from_address TEXT NOT NULL,
  to_addresses TEXT[] NOT NULL,
  cc TEXT[],
  bcc TEXT[],
  subject TEXT,
  message_id TEXT,
  has_attachments BOOLEAN DEFAULT FALSE,
  attachment_count INTEGER DEFAULT 0,
  status TEXT DEFAULT 'received',
  read BOOLEAN DEFAULT FALSE,
  read_at TIMESTAMPTZ,
  created_at TIMESTAMPTZ DEFAULT NOW(),
  updated_at TIMESTAMPTZ DEFAULT NOW()
);

-- Indexes for efficient lookups
CREATE INDEX IF NOT EXISTS idx_received_emails_user_id ON received_emails(user_id);
CREATE INDEX IF NOT EXISTS idx_received_emails_resend_email_id ON received_emails(resend_email_id);
CREATE INDEX IF NOT EXISTS idx_received_emails_created_at ON received_emails(created_at DESC);

-- Row Level Security
ALTER TABLE received_emails ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Users can view their own received emails"
  ON received_emails FOR SELECT
  USING (auth.uid() = user_id);

CREATE POLICY "Users can update their own received emails"
  ON received_emails FOR UPDATE
  USING (auth.uid() = user_id);

-- Service role needs insert access (webhook handler uses admin client)
CREATE POLICY "Service role can insert received emails"
  ON received_emails FOR INSERT
  WITH CHECK (true);
