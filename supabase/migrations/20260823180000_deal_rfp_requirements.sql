-- RFP-Anforderungen am Deal + Verknüpfung zu Org-Nachweisen.
-- Kein Backfill: Bestand entsteht über denselben Analyse-Pfad wie Neu-Analysen.

CREATE TABLE IF NOT EXISTS public.deal_rfp_requirements (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  deal_id uuid NOT NULL REFERENCES public.deals(id) ON DELETE CASCADE,
  organization_id uuid NOT NULL REFERENCES public.organizations(id) ON DELETE CASCADE,
  text text NOT NULL,
  normalized_text text NOT NULL,
  category text,
  status text NOT NULL DEFAULT 'aktiv'
    CHECK (status IN ('aktiv', 'entfallen')),
  first_seen_at timestamptz NOT NULL DEFAULT now(),
  last_seen_at timestamptz NOT NULL DEFAULT now(),
  created_at timestamptz NOT NULL DEFAULT now(),
  CONSTRAINT deal_rfp_requirements_normalized_text_not_empty
    CHECK (char_length(normalized_text) > 0)
);

CREATE UNIQUE INDEX IF NOT EXISTS deal_rfp_requirements_deal_normalized_text_idx
  ON public.deal_rfp_requirements (deal_id, normalized_text);

CREATE INDEX IF NOT EXISTS idx_deal_rfp_requirements_organization_id
  ON public.deal_rfp_requirements (organization_id);

CREATE INDEX IF NOT EXISTS idx_deal_rfp_requirements_deal_status
  ON public.deal_rfp_requirements (deal_id, status);

COMMENT ON TABLE public.deal_rfp_requirements IS
  'Stabile RFP-Anforderungen am Deal; Abgleich über normalized_text, nicht über LLM-IDs.';

CREATE TABLE IF NOT EXISTS public.deal_rfp_requirement_documents (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  requirement_id uuid NOT NULL REFERENCES public.deal_rfp_requirements(id) ON DELETE CASCADE,
  document_id uuid NOT NULL REFERENCES public.organization_compliance_documents(id) ON DELETE CASCADE,
  organization_id uuid NOT NULL REFERENCES public.organizations(id) ON DELETE CASCADE,
  linked_by uuid REFERENCES public.profiles(id) ON DELETE SET NULL,
  created_at timestamptz NOT NULL DEFAULT now()
);

CREATE UNIQUE INDEX IF NOT EXISTS deal_rfp_requirement_documents_requirement_document_idx
  ON public.deal_rfp_requirement_documents (requirement_id, document_id);

CREATE INDEX IF NOT EXISTS idx_deal_rfp_requirement_documents_organization_id
  ON public.deal_rfp_requirement_documents (organization_id);

COMMENT ON TABLE public.deal_rfp_requirement_documents IS
  'Verknüpfung einer Deal-RFP-Anforderung mit einem Organisations-Nachweis.';

ALTER TABLE public.deal_rfp_requirements ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.deal_rfp_requirement_documents ENABLE ROW LEVEL SECURITY;

DROP POLICY IF EXISTS "deal_rfp_requirements_select_own_org" ON public.deal_rfp_requirements;
CREATE POLICY "deal_rfp_requirements_select_own_org"
  ON public.deal_rfp_requirements FOR SELECT
  TO authenticated
  USING (organization_id = public.current_user_organization_id());

DROP POLICY IF EXISTS "deal_rfp_requirements_insert_own_org" ON public.deal_rfp_requirements;
CREATE POLICY "deal_rfp_requirements_insert_own_org"
  ON public.deal_rfp_requirements FOR INSERT
  TO authenticated
  WITH CHECK (organization_id = public.current_user_organization_id());

DROP POLICY IF EXISTS "deal_rfp_requirements_update_own_org" ON public.deal_rfp_requirements;
CREATE POLICY "deal_rfp_requirements_update_own_org"
  ON public.deal_rfp_requirements FOR UPDATE
  TO authenticated
  USING (organization_id = public.current_user_organization_id())
  WITH CHECK (organization_id = public.current_user_organization_id());

DROP POLICY IF EXISTS "deal_rfp_requirements_delete_own_org" ON public.deal_rfp_requirements;
CREATE POLICY "deal_rfp_requirements_delete_own_org"
  ON public.deal_rfp_requirements FOR DELETE
  TO authenticated
  USING (organization_id = public.current_user_organization_id());

DROP POLICY IF EXISTS "deal_rfp_requirement_documents_select_own_org"
  ON public.deal_rfp_requirement_documents;
CREATE POLICY "deal_rfp_requirement_documents_select_own_org"
  ON public.deal_rfp_requirement_documents FOR SELECT
  TO authenticated
  USING (organization_id = public.current_user_organization_id());

DROP POLICY IF EXISTS "deal_rfp_requirement_documents_insert_own_org"
  ON public.deal_rfp_requirement_documents;
CREATE POLICY "deal_rfp_requirement_documents_insert_own_org"
  ON public.deal_rfp_requirement_documents FOR INSERT
  TO authenticated
  WITH CHECK (organization_id = public.current_user_organization_id());

DROP POLICY IF EXISTS "deal_rfp_requirement_documents_update_own_org"
  ON public.deal_rfp_requirement_documents;
CREATE POLICY "deal_rfp_requirement_documents_update_own_org"
  ON public.deal_rfp_requirement_documents FOR UPDATE
  TO authenticated
  USING (organization_id = public.current_user_organization_id())
  WITH CHECK (organization_id = public.current_user_organization_id());

DROP POLICY IF EXISTS "deal_rfp_requirement_documents_delete_own_org"
  ON public.deal_rfp_requirement_documents;
CREATE POLICY "deal_rfp_requirement_documents_delete_own_org"
  ON public.deal_rfp_requirement_documents FOR DELETE
  TO authenticated
  USING (organization_id = public.current_user_organization_id());
