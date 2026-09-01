ALTER TABLE public.signature_requests
  ADD COLUMN IF NOT EXISTS email_verified_at TIMESTAMPTZ;

-- Verification codes are accessed only through the server-side token routes.
DROP POLICY IF EXISTS "Allow reading verification codes"
  ON public.signer_verification_codes;
DROP POLICY IF EXISTS "Allow inserting verification codes"
  ON public.signer_verification_codes;
DROP POLICY IF EXISTS "Allow updating verification codes"
  ON public.signer_verification_codes;

REVOKE ALL ON TABLE public.signer_verification_codes FROM anon, authenticated;
GRANT ALL ON TABLE public.signer_verification_codes TO service_role;

CREATE OR REPLACE FUNCTION public.submit_signature(
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
SET search_path = public, pg_temp
AS $$
DECLARE
  v_signature_request RECORD;
  v_signature_id UUID;
  v_all_signed BOOLEAN;
  v_image_hash TEXT;
BEGIN
  SELECT
    sr.*,
    c.content_hash AS stored_hash,
    c.require_sequential_signing
  INTO v_signature_request
  FROM public.signature_requests sr
  JOIN public.contracts c ON c.id = sr.contract_id
  WHERE sr.token = p_token
  FOR UPDATE OF sr;

  IF NOT FOUND THEN
    RETURN jsonb_build_object('success', false, 'error', 'Signature request not found');
  END IF;

  IF v_signature_request.expires_at IS NOT NULL
     AND v_signature_request.expires_at < NOW() THEN
    RETURN jsonb_build_object('success', false, 'error', 'Signature request has expired');
  END IF;

  IF v_signature_request.status = 'signed' THEN
    RETURN jsonb_build_object('success', false, 'error', 'Contract has already been signed');
  END IF;

  IF v_signature_request.email_verified_at IS NULL THEN
    RETURN jsonb_build_object('success', false, 'error', 'Email verification is required');
  END IF;

  IF v_signature_request.require_sequential_signing
     AND EXISTS (
       SELECT 1
       FROM public.signature_requests previous_request
       WHERE previous_request.contract_id = v_signature_request.contract_id
         AND previous_request."order" < v_signature_request."order"
         AND previous_request.status <> 'signed'
     ) THEN
    RETURN jsonb_build_object('success', false, 'error', 'Waiting for previous signers');
  END IF;

  IF p_document_hash IS NOT NULL
     AND v_signature_request.stored_hash IS NOT NULL THEN
    IF p_document_hash <> v_signature_request.stored_hash THEN
      RETURN jsonb_build_object(
        'success',
        false,
        'error',
        'Document has been modified since it was sent. Please contact the sender.'
      );
    END IF;

    UPDATE public.signature_requests
    SET document_hash_verified = TRUE,
        document_hash_verified_at = NOW()
    WHERE id = v_signature_request.id;
  END IF;

  v_image_hash := encode(sha256(p_signature_data::bytea), 'hex');

  INSERT INTO public.signatures (
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
  ) VALUES (
    v_signature_request.id,
    v_signature_request.contract_id,
    p_signature_type::signature_type,
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

  UPDATE public.signature_requests
  SET status = 'signed',
      signed_at = NOW()
  WHERE id = v_signature_request.id;

  SELECT NOT EXISTS (
    SELECT 1
    FROM public.signature_requests
    WHERE contract_id = v_signature_request.contract_id
      AND status <> 'signed'
  ) INTO v_all_signed;

  IF v_all_signed THEN
    UPDATE public.contracts
    SET status = 'completed',
        completed_at = NOW()
    WHERE id = v_signature_request.contract_id;
  END IF;

  RETURN jsonb_build_object(
    'success', true,
    'signatureId', v_signature_id,
    'allSigned', v_all_signed,
    'message', CASE
      WHEN v_all_signed THEN 'All parties have signed. Contract is complete.'
      ELSE 'Signature recorded successfully.'
    END
  );
END;
$$;

REVOKE ALL ON FUNCTION public.submit_signature(
  TEXT, TEXT, TEXT, TEXT, TEXT, BOOLEAN, TEXT, TEXT
) FROM PUBLIC, anon, authenticated;

GRANT EXECUTE ON FUNCTION public.submit_signature(
  TEXT, TEXT, TEXT, TEXT, TEXT, BOOLEAN, TEXT, TEXT
) TO service_role;
