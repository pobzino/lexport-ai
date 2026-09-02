-- Bind every signature to the immutable signing-document fingerprint and keep
-- the exact stored sealed artifact addressable for later verification.

ALTER TABLE public.signature_requests
  ADD COLUMN IF NOT EXISTS document_hash TEXT;

ALTER TABLE public.signatures
  ADD COLUMN IF NOT EXISTS document_hash TEXT;

ALTER TABLE public.contracts
  ADD COLUMN IF NOT EXISTS sealed_pdf_path TEXT;

UPDATE public.signature_requests AS signature_request
SET document_hash = contract.content_hash
FROM public.contracts AS contract
WHERE signature_request.contract_id = contract.id
  AND signature_request.document_hash IS NULL
  AND contract.content_hash IS NOT NULL;

CREATE INDEX IF NOT EXISTS idx_signature_requests_document_hash
  ON public.signature_requests(document_hash)
  WHERE document_hash IS NOT NULL;

CREATE INDEX IF NOT EXISTS idx_signatures_document_hash
  ON public.signatures(document_hash)
  WHERE document_hash IS NOT NULL;

COMMENT ON COLUMN public.signature_requests.document_hash IS
  'Immutable SHA-256 fingerprint of the document assigned to this signer.';
COMMENT ON COLUMN public.signatures.document_hash IS
  'SHA-256 fingerprint of the document this signature authenticated.';
COMMENT ON COLUMN public.contracts.sealed_pdf_path IS
  'Storage object path of the exact sealed PDF whose digest is sealed_document_hash.';

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
    c.content_hash AS contract_hash,
    COALESCE(sr.document_hash, c.content_hash) AS assigned_document_hash,
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

  IF p_document_hash IS NULL
     OR v_signature_request.contract_hash IS NULL
     OR v_signature_request.assigned_document_hash IS NULL
     OR p_document_hash <> v_signature_request.contract_hash
     OR p_document_hash <> v_signature_request.assigned_document_hash THEN
    RETURN jsonb_build_object(
      'success',
      false,
      'error',
      'Document has been modified since it was sent. Please contact the sender.'
    );
  END IF;

  UPDATE public.signature_requests
  SET document_hash = v_signature_request.assigned_document_hash,
      document_hash_verified = TRUE,
      document_hash_verified_at = NOW()
  WHERE id = v_signature_request.id;

  v_image_hash := encode(sha256(p_signature_data::bytea), 'hex');

  INSERT INTO public.signatures (
    signature_request_id,
    contract_id,
    type,
    signature_data,
    image_url,
    image_hash,
    document_hash,
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
    v_signature_request.assigned_document_hash,
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
    'documentHash', v_signature_request.assigned_document_hash,
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

-- Once invitations exist the contracting party must cancel/reissue them rather
-- than silently replacing the agreement or its cryptographic fingerprint.
CREATE OR REPLACE FUNCTION public.prevent_sent_contract_document_mutation()
RETURNS TRIGGER
LANGUAGE plpgsql
SET search_path = public, pg_temp
AS $$
BEGIN
  IF OLD.status IN ('pending_signature', 'partially_signed', 'completed', 'signed', 'sealed')
     AND (
       NEW.content IS DISTINCT FROM OLD.content
       OR NEW.source_type IS DISTINCT FROM OLD.source_type
       OR NEW.source_file_url IS DISTINCT FROM OLD.source_file_url
       OR NEW.source_file_type IS DISTINCT FROM OLD.source_file_type
       OR NEW.processing_mode IS DISTINCT FROM OLD.processing_mode
       OR NEW.content_hash IS DISTINCT FROM OLD.content_hash
       OR NEW.content_hash_algorithm IS DISTINCT FROM OLD.content_hash_algorithm
       OR NEW.content_hash_generated_at IS DISTINCT FROM OLD.content_hash_generated_at
     ) THEN
    RAISE EXCEPTION 'A sent signing document is immutable; cancel and reissue it to make changes';
  END IF;
  RETURN NEW;
END;
$$;

DROP TRIGGER IF EXISTS contracts_prevent_sent_document_mutation ON public.contracts;
CREATE TRIGGER contracts_prevent_sent_document_mutation
BEFORE UPDATE ON public.contracts
FOR EACH ROW
EXECUTE FUNCTION public.prevent_sent_contract_document_mutation();

CREATE OR REPLACE FUNCTION public.prevent_sent_signature_field_mutation()
RETURNS TRIGGER
LANGUAGE plpgsql
SET search_path = public, pg_temp
AS $$
DECLARE
  v_contract_id UUID;
BEGIN
  v_contract_id := COALESCE(NEW.contract_id, OLD.contract_id);
  IF EXISTS (
    SELECT 1
    FROM public.signature_requests
    WHERE contract_id = v_contract_id
  ) THEN
    RAISE EXCEPTION 'Signing fields are immutable after invitations are created';
  END IF;
  IF TG_OP = 'DELETE' THEN
    RETURN OLD;
  END IF;
  RETURN NEW;
END;
$$;

DROP TRIGGER IF EXISTS signature_fields_prevent_sent_mutation ON public.signature_fields;
CREATE TRIGGER signature_fields_prevent_sent_mutation
BEFORE INSERT OR UPDATE OR DELETE ON public.signature_fields
FOR EACH ROW
EXECUTE FUNCTION public.prevent_sent_signature_field_mutation();

CREATE OR REPLACE FUNCTION public.prevent_signature_request_hash_mutation()
RETURNS TRIGGER
LANGUAGE plpgsql
SET search_path = public, pg_temp
AS $$
BEGIN
  IF NEW.document_hash IS DISTINCT FROM OLD.document_hash
     AND OLD.document_hash IS NOT NULL THEN
    RAISE EXCEPTION 'A signer document fingerprint is immutable';
  END IF;
  RETURN NEW;
END;
$$;

DROP TRIGGER IF EXISTS signature_requests_prevent_hash_mutation
  ON public.signature_requests;
CREATE TRIGGER signature_requests_prevent_hash_mutation
BEFORE UPDATE ON public.signature_requests
FOR EACH ROW
EXECUTE FUNCTION public.prevent_signature_request_hash_mutation();
