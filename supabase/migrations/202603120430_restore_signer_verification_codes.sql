-- Restore signer verification code storage used by public signing flow.

CREATE TABLE IF NOT EXISTS public.signer_verification_codes (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  signature_request_id UUID NOT NULL REFERENCES public.signature_requests(id) ON DELETE CASCADE,
  email TEXT NOT NULL,
  code TEXT NOT NULL,
  verified_at TIMESTAMPTZ,
  expires_at TIMESTAMPTZ NOT NULL,
  attempts INTEGER DEFAULT 0,
  created_at TIMESTAMPTZ DEFAULT NOW()
);

CREATE INDEX IF NOT EXISTS idx_signer_verification_request
  ON public.signer_verification_codes(signature_request_id);

CREATE INDEX IF NOT EXISTS idx_signer_verification_email
  ON public.signer_verification_codes(email, code);

CREATE INDEX IF NOT EXISTS idx_signer_verification_expires
  ON public.signer_verification_codes(expires_at);

ALTER TABLE public.signer_verification_codes ENABLE ROW LEVEL SECURITY;

DROP POLICY IF EXISTS "Allow reading verification codes" ON public.signer_verification_codes;
DROP POLICY IF EXISTS "Allow inserting verification codes" ON public.signer_verification_codes;
DROP POLICY IF EXISTS "Allow updating verification codes" ON public.signer_verification_codes;

CREATE POLICY "Allow reading verification codes"
  ON public.signer_verification_codes
  FOR SELECT
  USING (TRUE);

CREATE POLICY "Allow inserting verification codes"
  ON public.signer_verification_codes
  FOR INSERT
  WITH CHECK (TRUE);

CREATE POLICY "Allow updating verification codes"
  ON public.signer_verification_codes
  FOR UPDATE
  USING (TRUE)
  WITH CHECK (TRUE);
