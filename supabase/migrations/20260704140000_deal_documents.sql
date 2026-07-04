-- Deal-Cockpit: kanonische Dokumentenablage pro Deal (RFP, NDA, Vertrag, …)

CREATE TYPE public.deal_document_kind AS ENUM (
  'ausschreibung',
  'nda',
  'vertrag',
  'angebot',
  'praesentation',
  'spezifikation',
  'notiz',
  'sonstiges'
);

CREATE TABLE IF NOT EXISTS public.deal_documents (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  deal_id uuid NOT NULL REFERENCES public.deals(id) ON DELETE CASCADE,
  organization_id uuid NOT NULL REFERENCES public.organizations(id) ON DELETE CASCADE,
  file_name text NOT NULL,
  kind public.deal_document_kind NOT NULL DEFAULT 'sonstiges',
  storage_path text NOT NULL,
  mime_type text,
  size_bytes bigint,
  uploaded_by uuid REFERENCES public.profiles(id) ON DELETE SET NULL,
  created_at timestamptz NOT NULL DEFAULT now(),
  updated_at timestamptz NOT NULL DEFAULT now()
);

CREATE INDEX IF NOT EXISTS idx_deal_documents_deal_created
  ON public.deal_documents (deal_id, created_at DESC);

CREATE INDEX IF NOT EXISTS idx_deal_documents_organization_id
  ON public.deal_documents (organization_id);

COMMENT ON TABLE public.deal_documents IS
  'Dateien am Deal (Ausschreibung, NDA, Vertrag, …). Storage: Bucket deal-documents.';

-- ---------------------------------------------------------------------------
-- RLS: org-scoped read; write nur Org-Manager oder zugewiesener SM/AM des Deals
-- ---------------------------------------------------------------------------
ALTER TABLE public.deal_documents ENABLE ROW LEVEL SECURITY;

DROP POLICY IF EXISTS "deal_documents_select_own_org" ON public.deal_documents;
CREATE POLICY "deal_documents_select_own_org"
  ON public.deal_documents FOR SELECT TO authenticated
  USING (organization_id = public.current_user_organization_id());

DROP POLICY IF EXISTS "deal_documents_insert_manageable" ON public.deal_documents;
CREATE POLICY "deal_documents_insert_manageable"
  ON public.deal_documents FOR INSERT TO authenticated
  WITH CHECK (
    organization_id = public.current_user_organization_id()
    AND EXISTS (
      SELECT 1 FROM public.deals d
      WHERE d.id = deal_documents.deal_id
        AND d.organization_id = public.current_user_organization_id()
        AND (
          public.current_user_can_manage_org_data()
          OR d.sales_manager_id = auth.uid()
          OR d.account_manager_id = auth.uid()
        )
    )
  );

DROP POLICY IF EXISTS "deal_documents_update_manageable" ON public.deal_documents;
CREATE POLICY "deal_documents_update_manageable"
  ON public.deal_documents FOR UPDATE TO authenticated
  USING (
    organization_id = public.current_user_organization_id()
    AND EXISTS (
      SELECT 1 FROM public.deals d
      WHERE d.id = deal_documents.deal_id
        AND d.organization_id = public.current_user_organization_id()
        AND (
          public.current_user_can_manage_org_data()
          OR d.sales_manager_id = auth.uid()
          OR d.account_manager_id = auth.uid()
        )
    )
  )
  WITH CHECK (
    organization_id = public.current_user_organization_id()
    AND EXISTS (
      SELECT 1 FROM public.deals d
      WHERE d.id = deal_documents.deal_id
        AND d.organization_id = public.current_user_organization_id()
        AND (
          public.current_user_can_manage_org_data()
          OR d.sales_manager_id = auth.uid()
          OR d.account_manager_id = auth.uid()
        )
    )
  );

DROP POLICY IF EXISTS "deal_documents_delete_manageable" ON public.deal_documents;
CREATE POLICY "deal_documents_delete_manageable"
  ON public.deal_documents FOR DELETE TO authenticated
  USING (
    organization_id = public.current_user_organization_id()
    AND EXISTS (
      SELECT 1 FROM public.deals d
      WHERE d.id = deal_documents.deal_id
        AND d.organization_id = public.current_user_organization_id()
        AND (
          public.current_user_can_manage_org_data()
          OR d.sales_manager_id = auth.uid()
          OR d.account_manager_id = auth.uid()
        )
    )
  );

-- ---------------------------------------------------------------------------
-- Storage: privater Bucket deal-documents (Org-Prefix-Isolation)
-- ---------------------------------------------------------------------------
INSERT INTO storage.buckets (id, name, public, file_size_limit, allowed_mime_types)
VALUES (
  'deal-documents',
  'deal-documents',
  false,
  26214400,
  ARRAY[
    'application/pdf',
    'application/vnd.openxmlformats-officedocument.presentationml.presentation',
    'application/vnd.ms-powerpoint',
    'application/vnd.openxmlformats-officedocument.wordprocessingml.document',
    'application/msword',
    'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet',
    'application/vnd.ms-excel',
    'text/plain',
    'image/png',
    'image/jpeg'
  ]::text[]
)
ON CONFLICT (id) DO UPDATE SET
  public = EXCLUDED.public,
  file_size_limit = EXCLUDED.file_size_limit,
  allowed_mime_types = EXCLUDED.allowed_mime_types;

DROP POLICY IF EXISTS "deal_documents_storage_select_own_org" ON storage.objects;
CREATE POLICY "deal_documents_storage_select_own_org"
  ON storage.objects FOR SELECT TO authenticated
  USING (
    bucket_id = 'deal-documents'
    AND split_part(name, '/', 1) = public.current_user_organization_id()::text
  );

DROP POLICY IF EXISTS "deal_documents_storage_insert_own_org" ON storage.objects;
CREATE POLICY "deal_documents_storage_insert_own_org"
  ON storage.objects FOR INSERT TO authenticated
  WITH CHECK (
    bucket_id = 'deal-documents'
    AND split_part(name, '/', 1) = public.current_user_organization_id()::text
  );

DROP POLICY IF EXISTS "deal_documents_storage_update_own_org" ON storage.objects;
CREATE POLICY "deal_documents_storage_update_own_org"
  ON storage.objects FOR UPDATE TO authenticated
  USING (
    bucket_id = 'deal-documents'
    AND split_part(name, '/', 1) = public.current_user_organization_id()::text
  );

DROP POLICY IF EXISTS "deal_documents_storage_delete_own_org" ON storage.objects;
CREATE POLICY "deal_documents_storage_delete_own_org"
  ON storage.objects FOR DELETE TO authenticated
  USING (
    bucket_id = 'deal-documents'
    AND split_part(name, '/', 1) = public.current_user_organization_id()::text
  );
