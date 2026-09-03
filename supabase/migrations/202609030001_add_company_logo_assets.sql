-- Store customer-supplied company logos at immutable, content-addressed paths
-- and snapshot the chosen URL on each invoice so an issued invoice does not
-- silently change when settings change.

INSERT INTO storage.buckets (
  id,
  name,
  public,
  file_size_limit,
  allowed_mime_types
)
VALUES (
  'company-assets',
  'company-assets',
  TRUE,
  2097152,
  ARRAY['image/png', 'image/jpeg']
)
ON CONFLICT (id) DO UPDATE SET
  public = EXCLUDED.public,
  file_size_limit = EXCLUDED.file_size_limit,
  allowed_mime_types = EXCLUDED.allowed_mime_types;

DROP POLICY IF EXISTS "company_assets_insert_own" ON storage.objects;
CREATE POLICY "company_assets_insert_own"
ON storage.objects FOR INSERT TO authenticated
WITH CHECK (
  bucket_id = 'company-assets'
  AND (storage.foldername(name))[1] = auth.uid()::TEXT
);

DROP POLICY IF EXISTS "company_assets_select_own" ON storage.objects;
CREATE POLICY "company_assets_select_own"
ON storage.objects FOR SELECT TO authenticated
USING (
  bucket_id = 'company-assets'
  AND (storage.foldername(name))[1] = auth.uid()::TEXT
);

DROP POLICY IF EXISTS "company_assets_update_own" ON storage.objects;
CREATE POLICY "company_assets_update_own"
ON storage.objects FOR UPDATE TO authenticated
USING (
  bucket_id = 'company-assets'
  AND (storage.foldername(name))[1] = auth.uid()::TEXT
)
WITH CHECK (
  bucket_id = 'company-assets'
  AND (storage.foldername(name))[1] = auth.uid()::TEXT
);

DROP POLICY IF EXISTS "company_assets_delete_own" ON storage.objects;
CREATE POLICY "company_assets_delete_own"
ON storage.objects FOR DELETE TO authenticated
USING (
  bucket_id = 'company-assets'
  AND (storage.foldername(name))[1] = auth.uid()::TEXT
);

ALTER TABLE public.invoices
  ADD COLUMN IF NOT EXISTS sender_logo_url TEXT;

COMMENT ON COLUMN public.invoices.sender_logo_url IS
  'Logo URL snapshotted when the invoice is created.';
