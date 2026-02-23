-- Migration: Add automatic signature reminder support
-- Purpose: Enable automatic reminders and deadline enforcement for signature requests

-- Add reminder tracking fields to signature_requests table
ALTER TABLE signature_requests ADD COLUMN IF NOT EXISTS reminder_enabled BOOLEAN DEFAULT true;
ALTER TABLE signature_requests ADD COLUMN IF NOT EXISTS reminder_count INTEGER DEFAULT 0;
ALTER TABLE signature_requests ADD COLUMN IF NOT EXISTS max_reminders INTEGER DEFAULT 5;
ALTER TABLE signature_requests ADD COLUMN IF NOT EXISTS next_reminder_at TIMESTAMPTZ;
ALTER TABLE signature_requests ADD COLUMN IF NOT EXISTS reminder_interval_days INTEGER DEFAULT 3;
ALTER TABLE signature_requests ADD COLUMN IF NOT EXISTS expired_processed BOOLEAN DEFAULT false;

-- Create signature_reminder_history table for tracking sent reminders
CREATE TABLE IF NOT EXISTS signature_reminder_history (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  signature_request_id UUID NOT NULL REFERENCES signature_requests(id) ON DELETE CASCADE,
  contract_id UUID NOT NULL REFERENCES contracts(id) ON DELETE CASCADE,
  reminder_type TEXT NOT NULL CHECK (reminder_type IN ('first', 'followup', 'final', 'expiration_warning')),
  sent_at TIMESTAMPTZ DEFAULT NOW(),
  recipient_email TEXT NOT NULL,
  recipient_name TEXT NOT NULL,
  email_id TEXT,
  days_until_expiration INTEGER,
  created_at TIMESTAMPTZ DEFAULT NOW()
);

-- Add indexes for performance
CREATE INDEX IF NOT EXISTS idx_signature_requests_next_reminder 
  ON signature_requests(next_reminder_at) 
  WHERE status = 'pending' AND reminder_enabled = true;

CREATE INDEX IF NOT EXISTS idx_signature_requests_expires_at 
  ON signature_requests(expires_at) 
  WHERE status = 'pending';

CREATE INDEX IF NOT EXISTS idx_signature_reminder_history_request 
  ON signature_reminder_history(signature_request_id, sent_at DESC);

-- Comments for documentation
COMMENT ON COLUMN signature_requests.reminder_enabled IS 'Whether automatic reminders are enabled for this signature request';
COMMENT ON COLUMN signature_requests.reminder_count IS 'Number of automatic reminders sent';
COMMENT ON COLUMN signature_requests.max_reminders IS 'Maximum number of reminders before stopping (default 5)';
COMMENT ON COLUMN signature_requests.next_reminder_at IS 'When the next automatic reminder should be sent';
COMMENT ON COLUMN signature_requests.reminder_interval_days IS 'Days between reminders (default 3)';
COMMENT ON COLUMN signature_requests.expired_processed IS 'Whether expiration processing has been completed';
COMMENT ON TABLE signature_reminder_history IS 'History of all automatic signature reminders sent';
