-- Enhanced Audit Trail for Contracts
-- Adds comprehensive tracking fields for legal compliance and transparency

-- Add new columns to audit_logs table
ALTER TABLE "audit_logs"
  ADD COLUMN IF NOT EXISTS "actor_email" text,
  ADD COLUMN IF NOT EXISTS "actor_name" text,
  ADD COLUMN IF NOT EXISTS "geo_location" jsonb,
  ADD COLUMN IF NOT EXISTS "device_info" jsonb,
  ADD COLUMN IF NOT EXISTS "affected_fields" jsonb,
  ADD COLUMN IF NOT EXISTS "old_value" jsonb,
  ADD COLUMN IF NOT EXISTS "new_value" jsonb,
  ADD COLUMN IF NOT EXISTS "page_url" text,
  ADD COLUMN IF NOT EXISTS "session_id" text;

-- Create indexes for performance optimization
CREATE INDEX IF NOT EXISTS idx_audit_logs_contract_id ON audit_logs(contract_id);
CREATE INDEX IF NOT EXISTS idx_audit_logs_created_at ON audit_logs(created_at);
CREATE INDEX IF NOT EXISTS idx_audit_logs_event_type ON audit_logs(event_type);
CREATE INDEX IF NOT EXISTS idx_audit_logs_user_id ON audit_logs(user_id);
CREATE INDEX IF NOT EXISTS idx_audit_logs_actor_email ON audit_logs(actor_email);
CREATE INDEX IF NOT EXISTS idx_audit_logs_contract_created_at ON audit_logs(contract_id, created_at DESC);

-- Composite index for common query patterns (filtering by contract and event type)
CREATE INDEX IF NOT EXISTS idx_audit_logs_contract_event ON audit_logs(contract_id, event_type);

-- Comment on table for documentation
COMMENT ON TABLE audit_logs IS 'Comprehensive audit trail for contract lifecycle events';
COMMENT ON COLUMN audit_logs.actor_email IS 'Email of the actor who triggered the event';
COMMENT ON COLUMN audit_logs.actor_name IS 'Display name of the actor';
COMMENT ON COLUMN audit_logs.geo_location IS 'Geographic location data from IP (city, country, region)';
COMMENT ON COLUMN audit_logs.device_info IS 'Device/browser information parsed from user agent';
COMMENT ON COLUMN audit_logs.affected_fields IS 'List of field names that were affected by this event';
COMMENT ON COLUMN audit_logs.old_value IS 'Previous values before the change';
COMMENT ON COLUMN audit_logs.new_value IS 'New values after the change';
COMMENT ON COLUMN audit_logs.page_url IS 'URL of the page where the event was triggered';
COMMENT ON COLUMN audit_logs.session_id IS 'Session identifier for grouping related events';
