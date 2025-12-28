-- Fix the submit_signature function to properly cast signature_type from TEXT to enum
-- This fixes the error: column "type" is of type signature_type but expression is of type text

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
  v_signature_request signature_requests%ROWTYPE;
  v_contract contracts%ROWTYPE;
  v_signature_id UUID;
  v_all_signed BOOLEAN;
  v_image_hash TEXT;
BEGIN
  -- Find the signature request
  SELECT * INTO v_signature_request
  FROM signature_requests
  WHERE token = p_token;

  IF v_signature_request IS NULL THEN
    RETURN jsonb_build_object('success', false, 'error', 'Signature request not found');
  END IF;

  -- Check if expired
  IF v_signature_request.expires_at IS NOT NULL AND v_signature_request.expires_at < NOW() THEN
    RETURN jsonb_build_object('success', false, 'error', 'Signature request has expired');
  END IF;

  -- Check if already signed
  IF v_signature_request.status = 'signed' THEN
    RETURN jsonb_build_object('success', false, 'error', 'Contract has already been signed');
  END IF;

  -- Get contract
  SELECT * INTO v_contract
  FROM contracts
  WHERE id = v_signature_request.contract_id;

  -- Verify document hash if provided
  IF p_document_hash IS NOT NULL AND v_contract.content_hash IS NOT NULL THEN
    IF p_document_hash != v_contract.content_hash THEN
      RETURN jsonb_build_object('success', false, 'error', 'Document has been modified');
    END IF;

    -- Mark as hash verified
    UPDATE signature_requests
    SET document_hash_verified = TRUE,
        document_hash_verified_at = NOW()
    WHERE id = v_signature_request.id;
  END IF;

  -- Generate image hash from signature data
  v_image_hash := encode(sha256(p_signature_data::bytea), 'hex');

  -- Insert signature with proper type casting
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
    p_signature_type::signature_type,  -- Cast TEXT to signature_type enum
    p_signature_data,
    '',
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
    'message', CASE WHEN v_all_signed THEN 'All parties have signed' ELSE 'Signature recorded successfully' END
  );
END;
$$;
