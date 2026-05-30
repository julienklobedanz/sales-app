-- Organisationsweite Compliance- & Security-Dokumente (ISO, SOC 2, Pen-Tests, …)

CREATE TABLE IF NOT EXISTS public.organization_compliance_documents (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  organization_id uuid NOT NULL REFERENCES public.organizations(id) ON DELETE CASCADE,
  document_type text NOT NULL,
  title text NOT NULL,
  valid_until date,
  file_storage_path text,
  file_name text,
  is_current boolean NOT NULL DEFAULT true,
  uploaded_by uuid REFERENCES public.profiles(id) ON DELETE SET NULL,
  created_at timestamptz NOT NULL DEFAULT now(),
  updated_at timestamptz NOT NULL DEFAULT now(),
  CONSTRAINT organization_compliance_documents_document_type_check
    CHECK (
      document_type IN (
        'iso_27001',
        'soc_2',
        'pen_test',
        'gdpr_dpa',
        'bsi_c5',
        'other'
      )
    )
);

CREATE INDEX IF NOT EXISTS idx_org_compliance_docs_org
  ON public.organization_compliance_documents(organization_id);

CREATE INDEX IF NOT EXISTS idx_org_compliance_docs_org_type
  ON public.organization_compliance_documents(organization_id, document_type);

CREATE UNIQUE INDEX IF NOT EXISTS idx_org_compliance_docs_one_current_per_type
  ON public.organization_compliance_documents(organization_id, document_type)
  WHERE is_current = true;

COMMENT ON TABLE public.organization_compliance_documents IS
  'Org-weite Nachweise (ISO, SOC 2, …); pro document_type höchstens ein is_current=true.';
COMMENT ON COLUMN public.organization_compliance_documents.file_storage_path IS
  'Pfad im Bucket compliance-documents: {org_id}/{doc_id}/…';

CREATE OR REPLACE FUNCTION public.enforce_single_current_compliance_document()
RETURNS TRIGGER
LANGUAGE plpgsql
AS $$
BEGIN
  IF NEW.is_current IS TRUE THEN
    UPDATE public.organization_compliance_documents
    SET is_current = false, updated_at = now()
    WHERE organization_id = NEW.organization_id
      AND document_type = NEW.document_type
      AND id IS DISTINCT FROM NEW.id
      AND is_current = true;
  END IF;
  NEW.updated_at := now();
  RETURN NEW;
END;
$$;

DROP TRIGGER IF EXISTS trg_org_compliance_single_current ON public.organization_compliance_documents;
CREATE TRIGGER trg_org_compliance_single_current
  BEFORE INSERT OR UPDATE ON public.organization_compliance_documents
  FOR EACH ROW
  EXECUTE FUNCTION public.enforce_single_current_compliance_document();

ALTER TABLE public.organization_compliance_documents ENABLE ROW LEVEL SECURITY;

DROP POLICY IF EXISTS "Org members read compliance documents" ON public.organization_compliance_documents;
CREATE POLICY "Org members read compliance documents"
  ON public.organization_compliance_documents FOR SELECT TO authenticated
  USING (organization_id = public.current_user_organization_id());

DROP POLICY IF EXISTS "Org admins manage compliance documents" ON public.organization_compliance_documents;
CREATE POLICY "Org admins manage compliance documents"
  ON public.organization_compliance_documents FOR ALL TO authenticated
  USING (
    organization_id = public.current_user_organization_id()
    AND EXISTS (
      SELECT 1 FROM public.profiles p
      WHERE p.id = auth.uid()
        AND p.organization_id = organization_compliance_documents.organization_id
        AND p.role = 'admin'
    )
  )
  WITH CHECK (
    organization_id = public.current_user_organization_id()
    AND EXISTS (
      SELECT 1 FROM public.profiles p
      WHERE p.id = auth.uid()
        AND p.organization_id = organization_compliance_documents.organization_id
        AND p.role = 'admin'
    )
  );

INSERT INTO storage.buckets (id, name, public, file_size_limit, allowed_mime_types)
VALUES (
  'compliance-documents',
  'compliance-documents',
  false,
  20971520,
  ARRAY['application/pdf']::text[]
)
ON CONFLICT (id) DO UPDATE SET
  file_size_limit = EXCLUDED.file_size_limit,
  allowed_mime_types = EXCLUDED.allowed_mime_types;

DROP POLICY IF EXISTS "compliance_documents_select_own_org" ON storage.objects;
DROP POLICY IF EXISTS "compliance_documents_insert_admin" ON storage.objects;
DROP POLICY IF EXISTS "compliance_documents_update_admin" ON storage.objects;
DROP POLICY IF EXISTS "compliance_documents_delete_admin" ON storage.objects;

CREATE POLICY "compliance_documents_select_own_org"
  ON storage.objects FOR SELECT TO authenticated
  USING (
    bucket_id = 'compliance-documents'
    AND split_part(name, '/', 1) = (
      SELECT organization_id::text FROM public.profiles WHERE id = auth.uid()
    )
  );

CREATE POLICY "compliance_documents_insert_admin"
  ON storage.objects FOR INSERT TO authenticated
  WITH CHECK (
    bucket_id = 'compliance-documents'
    AND split_part(name, '/', 1) = (
      SELECT organization_id::text FROM public.profiles WHERE id = auth.uid()
    )
    AND EXISTS (
      SELECT 1 FROM public.profiles p
      WHERE p.id = auth.uid() AND p.role = 'admin'
    )
  );

CREATE POLICY "compliance_documents_update_admin"
  ON storage.objects FOR UPDATE TO authenticated
  USING (
    bucket_id = 'compliance-documents'
    AND split_part(name, '/', 1) = (
      SELECT organization_id::text FROM public.profiles WHERE id = auth.uid()
    )
    AND EXISTS (
      SELECT 1 FROM public.profiles p
      WHERE p.id = auth.uid() AND p.role = 'admin'
    )
  );

CREATE POLICY "compliance_documents_delete_admin"
  ON storage.objects FOR DELETE TO authenticated
  USING (
    bucket_id = 'compliance-documents'
    AND split_part(name, '/', 1) = (
      SELECT organization_id::text FROM public.profiles WHERE id = auth.uid()
    )
    AND EXISTS (
      SELECT 1 FROM public.profiles p
      WHERE p.id = auth.uid() AND p.role = 'admin'
    )
  );
