-- Repair migration for hosted projects that missed reminder columns on signature_requests

ALTER TABLE public.signature_requests
  ADD COLUMN IF NOT EXISTS reminder_interval_days INTEGER DEFAULT 3;

ALTER TABLE public.signature_requests
  ADD COLUMN IF NOT EXISTS expired_processed BOOLEAN DEFAULT false;

COMMENT ON COLUMN public.signature_requests.reminder_interval_days IS
  'Days between reminders (default 3)';

COMMENT ON COLUMN public.signature_requests.expired_processed IS
  'Whether expiration processing has been completed';
