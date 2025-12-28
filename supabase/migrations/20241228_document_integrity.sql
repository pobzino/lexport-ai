-- Migration: Add document integrity and identity confirmation
-- Purpose: Tamper-proof document signing with identity verification

-- Add content hash to contracts table
-- This stores a SHA-256 hash of the contract content at the time of sending
ALTER TABLE contracts ADD COLUMN IF NOT EXISTS content_hash TEXT;
ALTER TABLE contracts ADD COLUMN IF NOT EXISTS content_hash_algorithm TEXT DEFAULT 'SHA-256';
ALTER TABLE contracts ADD COLUMN IF NOT EXISTS content_hash_generated_at TIMESTAMPTZ;

-- Add identity confirmation to signatures table
ALTER TABLE signatures ADD COLUMN IF NOT EXISTS identity_confirmed BOOLEAN DEFAULT FALSE;
ALTER TABLE signatures ADD COLUMN IF NOT EXISTS identity_confirmed_at TIMESTAMPTZ;
ALTER TABLE signatures ADD COLUMN IF NOT EXISTS identity_confirmation_text TEXT;

-- Add content hash verification to signature requests
-- Stores whether the document was verified against hash before signing
ALTER TABLE signature_requests ADD COLUMN IF NOT EXISTS document_hash_verified BOOLEAN DEFAULT FALSE;
ALTER TABLE signature_requests ADD COLUMN IF NOT EXISTS document_hash_verified_at TIMESTAMPTZ;

-- Update the submit_signature function to accept identity confirmation
CREATE OR REPLACE FUNCTION submit_signature(
  p_token TEXT,
  p_signature_data TEXT,
  p_signature_type TEXT,
  p_ip_address TEXT,
  p_user_agent TEXT,
  p_identity_confirmed BOOLEAN DEFAULT FALSE,
  p_identity_confirmation_text TEXT DEFAULT NULL,
  p_document_hash TEXT DEFAULT NULL
)
RETURNS JSONB
LANGUAGE plpgsql
SECURITY DEFINER
AS $$
DECLARE
  v_signature_request RECORD;
  v_contract RECORD;
  v_signature_id UUID;
  v_all_signed BOOLEAN;
  v_image_hash TEXT;
BEGIN
  -- Find the signature request
  SELECT sr.*, c.id as contract_id, c.content_hash as stored_hash
  INTO v_signature_request
  FROM signature_requests sr
  JOIN contracts c ON c.id = sr.contract_id
  WHERE sr.token = p_token;

  IF NOT FOUND THEN
    RETURN jsonb_build_object('success', false, 'error', 'Signature request not found');
  END IF;

  -- Check if expired
  IF v_signature_request.expires_at < NOW() THEN
    RETURN jsonb_build_object('success', false, 'error', 'Signature request has expired');
  END IF;

  -- Check if already signed
  IF v_signature_request.status = 'signed' THEN
    RETURN jsonb_build_object('success', false, 'error', 'Contract has already been signed');
  END IF;

  -- Verify document hash if provided (tamper detection)
  IF p_document_hash IS NOT NULL AND v_signature_request.stored_hash IS NOT NULL THEN
    IF p_document_hash != v_signature_request.stored_hash THEN
      RETURN jsonb_build_object('success', false, 'error', 'Document has been modified since it was sent. Please contact the sender.');
    END IF;

    -- Mark hash as verified
    UPDATE signature_requests
    SET document_hash_verified = TRUE,
        document_hash_verified_at = NOW()
    WHERE id = v_signature_request.id;
  END IF;

  -- Generate hash of the signature image
  v_image_hash := encode(sha256(p_signature_data::bytea), 'hex');

  -- Create the signature record
  INSERT INTO signatures (
    signature_request_id,
    contract_id,
    type,
    signature_data,
    image_url,
    image_hash,
    ip_address,
    user_agent,
    identity_confirmed,
    identity_confirmed_at,
    identity_confirmation_text,
    signed_at
  )
  VALUES (
    v_signature_request.id,
    v_signature_request.contract_id,
    p_signature_type,
    p_signature_data,
    '', -- image_url will be updated if we store to storage
    v_image_hash,
    p_ip_address,
    p_user_agent,
    p_identity_confirmed,
    CASE WHEN p_identity_confirmed THEN NOW() ELSE NULL END,
    p_identity_confirmation_text,
    NOW()
  )
  RETURNING id INTO v_signature_id;

  -- Update signature request status
  UPDATE signature_requests
  SET status = 'signed',
      signed_at = NOW()
  WHERE id = v_signature_request.id;

  -- Check if all signatures are complete
  SELECT NOT EXISTS (
    SELECT 1 FROM signature_requests
    WHERE contract_id = v_signature_request.contract_id
    AND status != 'signed'
  ) INTO v_all_signed;

  -- If all signed, update contract status
  IF v_all_signed THEN
    UPDATE contracts
    SET status = 'completed',
        completed_at = NOW()
    WHERE id = v_signature_request.contract_id;
  END IF;

  RETURN jsonb_build_object(
    'success', true,
    'signatureId', v_signature_id,
    'allSigned', v_all_signed,
    'message', CASE WHEN v_all_signed
      THEN 'All parties have signed. Contract is complete.'
      ELSE 'Signature recorded successfully.'
    END
  );
END;
$$;

-- Add index for content hash lookups
CREATE INDEX IF NOT EXISTS idx_contracts_content_hash ON contracts(content_hash) WHERE content_hash IS NOT NULL;

-- Update audit event types to include new events
-- (These are just comments for reference, actual enum updates would need more care)
-- New events: 'document_hash_verified', 'identity_confirmed'

COMMENT ON COLUMN contracts.content_hash IS 'SHA-256 hash of the contract content at time of sending for signature';
COMMENT ON COLUMN signatures.identity_confirmed IS 'Whether the signer confirmed their identity before signing';
COMMENT ON COLUMN signatures.identity_confirmation_text IS 'The exact text the signer confirmed (e.g., "I confirm I am John Smith and am authorized to sign")';
