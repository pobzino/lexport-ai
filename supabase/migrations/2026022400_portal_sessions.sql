-- Portal Sessions table for magic-link authentication
-- Run this in Supabase SQL Editor or via Supabase CLI

CREATE TABLE IF NOT EXISTS portal_sessions (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  email TEXT NOT NULL,
  token TEXT NOT NULL UNIQUE,
  expires_at TIMESTAMPTZ NOT NULL,
  verified_at TIMESTAMPTZ,
  created_at TIMESTAMPTZ DEFAULT NOW()
);

-- Index for token lookups
CREATE INDEX IF NOT EXISTS idx_portal_sessions_token ON portal_sessions(token);

-- Index for email lookups
CREATE INDEX IF NOT EXISTS idx_portal_sessions_email ON portal_sessions(email);

-- Enable RLS (Row Level Security)
ALTER TABLE portal_sessions ENABLE ROW LEVEL SECURITY;

-- Allow service role to manage sessions (your backend)
CREATE POLICY "Service role can manage portal_sessions"
  ON portal_sessions
  FOR ALL
  USING (true)
  WITH CHECK (true);
