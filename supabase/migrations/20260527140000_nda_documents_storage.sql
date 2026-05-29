-- NDA-PDFs pro Vereinbarung + privater Storage-Bucket

ALTER TABLE public.nda_agreements
  ADD COLUMN IF NOT EXISTS file_storage_path text,
  ADD COLUMN IF NOT EXISTS file_name text,
  ADD COLUMN IF NOT EXISTS document_version text,
  ADD COLUMN IF NOT EXISTS signed_at date;

COMMENT ON COLUMN public.nda_agreements.file_storage_path IS 'Pfad im Bucket nda-documents: {org_id}/{company_id}/{nda_id}/…';
COMMENT ON COLUMN public.nda_agreements.document_version IS 'Optionale Versionsbezeichnung, z. B. v2 oder 2024-03';
COMMENT ON COLUMN public.nda_agreements.signed_at IS 'Unterzeichnungs- bzw. Dokumentdatum';

INSERT INTO storage.buckets (id, name, public, file_size_limit, allowed_mime_types)
VALUES (
  'nda-documents',
  'nda-documents',
  false,
  20971520,
  ARRAY['application/pdf']::text[]
)
ON CONFLICT (id) DO UPDATE SET
  file_size_limit = EXCLUDED.file_size_limit,
  allowed_mime_types = EXCLUDED.allowed_mime_types;

DROP POLICY IF EXISTS "nda_documents_select_own_org" ON storage.objects;
DROP POLICY IF EXISTS "nda_documents_insert_staff" ON storage.objects;
DROP POLICY IF EXISTS "nda_documents_update_staff" ON storage.objects;
DROP POLICY IF EXISTS "nda_documents_delete_staff" ON storage.objects;

CREATE POLICY "nda_documents_select_own_org"
  ON storage.objects FOR SELECT TO authenticated
  USING (
    bucket_id = 'nda-documents'
    AND split_part(name, '/', 1) = (
      SELECT organization_id::text FROM public.profiles WHERE id = auth.uid()
    )
  );

CREATE POLICY "nda_documents_insert_staff"
  ON storage.objects FOR INSERT TO authenticated
  WITH CHECK (
    bucket_id = 'nda-documents'
    AND split_part(name, '/', 1) = (
      SELECT organization_id::text FROM public.profiles WHERE id = auth.uid()
    )
    AND EXISTS (
      SELECT 1 FROM public.profiles p
      WHERE p.id = auth.uid()
        AND p.role IN ('admin', 'account_manager')
    )
  );

CREATE POLICY "nda_documents_update_staff"
  ON storage.objects FOR UPDATE TO authenticated
  USING (
    bucket_id = 'nda-documents'
    AND split_part(name, '/', 1) = (
      SELECT organization_id::text FROM public.profiles WHERE id = auth.uid()
    )
    AND EXISTS (
      SELECT 1 FROM public.profiles p
      WHERE p.id = auth.uid()
        AND p.role IN ('admin', 'account_manager')
    )
  );

CREATE POLICY "nda_documents_delete_staff"
  ON storage.objects FOR DELETE TO authenticated
  USING (
    bucket_id = 'nda-documents'
    AND split_part(name, '/', 1) = (
      SELECT organization_id::text FROM public.profiles WHERE id = auth.uid()
    )
    AND EXISTS (
      SELECT 1 FROM public.profiles p
      WHERE p.id = auth.uid()
        AND p.role IN ('admin', 'account_manager')
    )
  );
