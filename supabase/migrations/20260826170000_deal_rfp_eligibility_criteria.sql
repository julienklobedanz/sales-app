-- RFP-Eignungskriterien am Deal + Verknüpfung zu Org-Nachweisen.
-- Anker ist source_document_id, nicht der Analyselauf (Lehre aus #120).
-- Kein Backfill: Bestand entsteht über denselben Analyse-Pfad wie Neu-Analysen.
-- Snapshot bleibt zusätzlich bestehen, bis die Zeilen bewiesen sind.

CREATE TABLE IF NOT EXISTS public.deal_rfp_eligibility_criteria (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  deal_id uuid NOT NULL REFERENCES public.deals(id) ON DELETE CASCADE,
  organization_id uuid NOT NULL REFERENCES public.organizations(id) ON DELETE CASCADE,
  source_document_id uuid NOT NULL REFERENCES public.deal_documents(id) ON DELETE CASCADE,
  dimension text NOT NULL
    CHECK (dimension IN (
      'employee_count',
      'annual_revenue',
      'reference_count',
      'certification',
      'region',
      'other'
    )),
  label text NOT NULL,
  operator text NOT NULL
    CHECK (operator IN ('gte', 'lte', 'eq', 'contains')),
  value jsonb NOT NULL
    CHECK (jsonb_typeof(value) IN ('number', 'string')),
  unit text,
  mandatory boolean NOT NULL DEFAULT true,
  confidence text NOT NULL DEFAULT 'medium'
    CHECK (confidence IN ('high', 'medium', 'low')),
  evidence text,
  no_matching_evidence_at timestamptz,
  no_matching_evidence_by uuid REFERENCES public.profiles(id) ON DELETE SET NULL,
  created_at timestamptz NOT NULL DEFAULT now()
);

CREATE INDEX IF NOT EXISTS idx_deal_rfp_eligibility_criteria_organization_id
  ON public.deal_rfp_eligibility_criteria (organization_id);

CREATE INDEX IF NOT EXISTS idx_deal_rfp_eligibility_criteria_deal_id
  ON public.deal_rfp_eligibility_criteria (deal_id);

CREATE INDEX IF NOT EXISTS idx_deal_rfp_eligibility_criteria_source_document_id
  ON public.deal_rfp_eligibility_criteria (source_document_id);

COMMENT ON TABLE public.deal_rfp_eligibility_criteria IS
  'RFP-Eignungskriterien je Deal-Dokument; Schlüssel ist source_document_id, id ist die Zeilen-UUID.';

COMMENT ON COLUMN public.deal_rfp_eligibility_criteria.source_document_id IS
  'Unveränderliche deal_documents-Zeile, aus der das Kriterium stammt.';

COMMENT ON COLUMN public.deal_rfp_eligibility_criteria.value IS
  'jsonb number oder string — Round-Trip ohne Rateregel, Typ entscheidet über numeric vs. text.';

COMMENT ON COLUMN public.deal_rfp_eligibility_criteria.no_matching_evidence_at IS
  'Menschliche Bestätigung, dass kein passender Nachweis existiert; altert sichtbar, verfällt nicht automatisch.';

CREATE TABLE IF NOT EXISTS public.deal_rfp_eligibility_criterion_documents (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  criterion_id uuid NOT NULL
    REFERENCES public.deal_rfp_eligibility_criteria(id) ON DELETE CASCADE,
  document_id uuid NOT NULL
    REFERENCES public.organization_compliance_documents(id) ON DELETE CASCADE,
  organization_id uuid NOT NULL REFERENCES public.organizations(id) ON DELETE CASCADE,
  linked_by uuid REFERENCES public.profiles(id) ON DELETE SET NULL,
  created_at timestamptz NOT NULL DEFAULT now()
);

CREATE UNIQUE INDEX IF NOT EXISTS
  deal_rfp_eligibility_criterion_documents_criterion_document_idx
  ON public.deal_rfp_eligibility_criterion_documents (criterion_id, document_id);

CREATE INDEX IF NOT EXISTS idx_deal_rfp_eligibility_criterion_documents_organization_id
  ON public.deal_rfp_eligibility_criterion_documents (organization_id);

COMMENT ON TABLE public.deal_rfp_eligibility_criterion_documents IS
  'Verknüpfung eines Deal-RFP-Eignungskriteriums mit einem Organisations-Nachweis.';

ALTER TABLE public.deal_rfp_eligibility_criteria ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.deal_rfp_eligibility_criterion_documents ENABLE ROW LEVEL SECURITY;

DROP POLICY IF EXISTS "deal_rfp_eligibility_criteria_select_own_org"
  ON public.deal_rfp_eligibility_criteria;
CREATE POLICY "deal_rfp_eligibility_criteria_select_own_org"
  ON public.deal_rfp_eligibility_criteria FOR SELECT
  TO authenticated
  USING (organization_id = public.current_user_organization_id());

DROP POLICY IF EXISTS "deal_rfp_eligibility_criteria_insert_own_org"
  ON public.deal_rfp_eligibility_criteria;
CREATE POLICY "deal_rfp_eligibility_criteria_insert_own_org"
  ON public.deal_rfp_eligibility_criteria FOR INSERT
  TO authenticated
  WITH CHECK (organization_id = public.current_user_organization_id());

DROP POLICY IF EXISTS "deal_rfp_eligibility_criteria_update_own_org"
  ON public.deal_rfp_eligibility_criteria;
CREATE POLICY "deal_rfp_eligibility_criteria_update_own_org"
  ON public.deal_rfp_eligibility_criteria FOR UPDATE
  TO authenticated
  USING (organization_id = public.current_user_organization_id())
  WITH CHECK (organization_id = public.current_user_organization_id());

DROP POLICY IF EXISTS "deal_rfp_eligibility_criteria_delete_own_org"
  ON public.deal_rfp_eligibility_criteria;
CREATE POLICY "deal_rfp_eligibility_criteria_delete_own_org"
  ON public.deal_rfp_eligibility_criteria FOR DELETE
  TO authenticated
  USING (organization_id = public.current_user_organization_id());

DROP POLICY IF EXISTS "deal_rfp_eligibility_criterion_documents_select_own_org"
  ON public.deal_rfp_eligibility_criterion_documents;
CREATE POLICY "deal_rfp_eligibility_criterion_documents_select_own_org"
  ON public.deal_rfp_eligibility_criterion_documents FOR SELECT
  TO authenticated
  USING (organization_id = public.current_user_organization_id());

DROP POLICY IF EXISTS "deal_rfp_eligibility_criterion_documents_insert_own_org"
  ON public.deal_rfp_eligibility_criterion_documents;
CREATE POLICY "deal_rfp_eligibility_criterion_documents_insert_own_org"
  ON public.deal_rfp_eligibility_criterion_documents FOR INSERT
  TO authenticated
  WITH CHECK (organization_id = public.current_user_organization_id());

DROP POLICY IF EXISTS "deal_rfp_eligibility_criterion_documents_update_own_org"
  ON public.deal_rfp_eligibility_criterion_documents;
CREATE POLICY "deal_rfp_eligibility_criterion_documents_update_own_org"
  ON public.deal_rfp_eligibility_criterion_documents FOR UPDATE
  TO authenticated
  USING (organization_id = public.current_user_organization_id())
  WITH CHECK (organization_id = public.current_user_organization_id());

DROP POLICY IF EXISTS "deal_rfp_eligibility_criterion_documents_delete_own_org"
  ON public.deal_rfp_eligibility_criterion_documents;
CREATE POLICY "deal_rfp_eligibility_criterion_documents_delete_own_org"
  ON public.deal_rfp_eligibility_criterion_documents FOR DELETE
  TO authenticated
  USING (organization_id = public.current_user_organization_id());
