-- Storage-Bucket für Referenz-PDFs/DOCX (Pfad: {organization_id}/{reference_id}/{filename})
-- Wird u. a. von Bulk-Import, Referenz erstellen und Onboarding genutzt.

INSERT INTO storage.buckets (id, name, public, file_size_limit, allowed_mime_types)
VALUES (
  'references',
  'references',
  true,
  52428800,
  ARRAY[
    'application/pdf',
    'application/vnd.openxmlformats-officedocument.presentationml.presentation',
    'application/vnd.ms-powerpoint',
    'application/vnd.openxmlformats-officedocument.wordprocessingml.document',
    'application/msword'
  ]::text[]
)
ON CONFLICT (id) DO UPDATE SET
  public = EXCLUDED.public,
  file_size_limit = EXCLUDED.file_size_limit,
  allowed_mime_types = EXCLUDED.allowed_mime_types;

DROP POLICY IF EXISTS "references_storage_select_own_org" ON storage.objects;
DROP POLICY IF EXISTS "references_storage_insert_own_org" ON storage.objects;
DROP POLICY IF EXISTS "references_storage_update_own_org" ON storage.objects;
DROP POLICY IF EXISTS "references_storage_delete_own_org" ON storage.objects;

-- Erstes Pfadsegment = organization_id des eingeloggten Users
CREATE POLICY "references_storage_select_own_org"
  ON storage.objects FOR SELECT TO authenticated
  USING (
    bucket_id = 'references'
    AND split_part(name, '/', 1) = public.current_user_organization_id()::text
  );

CREATE POLICY "references_storage_insert_own_org"
  ON storage.objects FOR INSERT TO authenticated
  WITH CHECK (
    bucket_id = 'references'
    AND split_part(name, '/', 1) = public.current_user_organization_id()::text
  );

CREATE POLICY "references_storage_update_own_org"
  ON storage.objects FOR UPDATE TO authenticated
  USING (
    bucket_id = 'references'
    AND split_part(name, '/', 1) = public.current_user_organization_id()::text
  )
  WITH CHECK (
    bucket_id = 'references'
    AND split_part(name, '/', 1) = public.current_user_organization_id()::text
  );

CREATE POLICY "references_storage_delete_own_org"
  ON storage.objects FOR DELETE TO authenticated
  USING (
    bucket_id = 'references'
    AND split_part(name, '/', 1) = public.current_user_organization_id()::text
  );
