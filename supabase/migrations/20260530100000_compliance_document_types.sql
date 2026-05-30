-- Eigene Dokumenttypen pro Organisation; document_type als freier Slug (System + custom_*).

ALTER TABLE public.organization_compliance_documents
  DROP CONSTRAINT IF EXISTS organization_compliance_documents_document_type_check;

CREATE TABLE IF NOT EXISTS public.organization_compliance_document_types (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  organization_id uuid NOT NULL REFERENCES public.organizations(id) ON DELETE CASCADE,
  slug text NOT NULL,
  label text NOT NULL,
  created_at timestamptz NOT NULL DEFAULT now(),
  updated_at timestamptz NOT NULL DEFAULT now(),
  CONSTRAINT organization_compliance_document_types_slug_check
    CHECK (slug ~ '^[a-z0-9_]+$' AND length(slug) >= 2 AND length(slug) <= 64),
  CONSTRAINT organization_compliance_document_types_custom_slug_check
    CHECK (slug LIKE 'custom_%'),
  UNIQUE (organization_id, slug)
);

CREATE INDEX IF NOT EXISTS idx_org_compliance_doc_types_org
  ON public.organization_compliance_document_types(organization_id);

COMMENT ON TABLE public.organization_compliance_document_types IS
  'Org-spezifische Zertifikats-/Compliance-Dokumenttypen (slug mit Prefix custom_).';

ALTER TABLE public.organization_compliance_document_types ENABLE ROW LEVEL SECURITY;

DROP POLICY IF EXISTS "Org members read compliance document types" ON public.organization_compliance_document_types;
CREATE POLICY "Org members read compliance document types"
  ON public.organization_compliance_document_types FOR SELECT TO authenticated
  USING (organization_id = public.current_user_organization_id());

DROP POLICY IF EXISTS "Org admins manage compliance document types" ON public.organization_compliance_document_types;
CREATE POLICY "Org admins manage compliance document types"
  ON public.organization_compliance_document_types FOR ALL TO authenticated
  USING (
    organization_id = public.current_user_organization_id()
    AND EXISTS (
      SELECT 1 FROM public.profiles p
      WHERE p.id = auth.uid()
        AND p.organization_id = organization_compliance_document_types.organization_id
        AND p.role = 'admin'
    )
  )
  WITH CHECK (
    organization_id = public.current_user_organization_id()
    AND EXISTS (
      SELECT 1 FROM public.profiles p
      WHERE p.id = auth.uid()
        AND p.organization_id = organization_compliance_document_types.organization_id
        AND p.role = 'admin'
    )
  );
