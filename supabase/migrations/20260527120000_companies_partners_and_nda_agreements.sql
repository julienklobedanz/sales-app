-- Accounts vs. Partner auf companies; optionale Verknüpfung; NDA-Register pro Organisation.

ALTER TABLE public.companies
  ADD COLUMN IF NOT EXISTS entity_kind text NOT NULL DEFAULT 'account';

ALTER TABLE public.companies
  DROP CONSTRAINT IF EXISTS companies_entity_kind_check;

ALTER TABLE public.companies
  ADD CONSTRAINT companies_entity_kind_check
  CHECK (entity_kind IN ('account', 'partner'));

ALTER TABLE public.companies
  ADD COLUMN IF NOT EXISTS partner_category text;

ALTER TABLE public.companies
  DROP CONSTRAINT IF EXISTS companies_partner_category_check;

ALTER TABLE public.companies
  ADD CONSTRAINT companies_partner_category_check
  CHECK (
    partner_category IS NULL
    OR partner_category IN ('sub', 'tech', 'legal', 'other')
  );

ALTER TABLE public.companies
  ADD COLUMN IF NOT EXISTS linked_account_id uuid REFERENCES public.companies(id) ON DELETE SET NULL;

CREATE INDEX IF NOT EXISTS idx_companies_entity_kind ON public.companies(organization_id, entity_kind);
CREATE INDEX IF NOT EXISTS idx_companies_linked_account ON public.companies(linked_account_id)
  WHERE linked_account_id IS NOT NULL;

COMMENT ON COLUMN public.companies.entity_kind IS 'account = Kunden-Account; partner = Partner/Sub ohne volles Account-Cockpit.';
COMMENT ON COLUMN public.companies.partner_category IS 'sub | tech | legal | other — nur bei entity_kind=partner.';
COMMENT ON COLUMN public.companies.linked_account_id IS 'Optional: verknüpfter Account, wenn Partner auch als Kunde geführt wird.';

CREATE TABLE IF NOT EXISTS public.nda_agreements (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  organization_id uuid NOT NULL REFERENCES public.organizations(id) ON DELETE CASCADE,
  company_id uuid NOT NULL REFERENCES public.companies(id) ON DELETE CASCADE,
  status text NOT NULL DEFAULT 'active' CHECK (status IN ('active', 'expired', 'pending')),
  valid_until date,
  notes text,
  created_at timestamptz NOT NULL DEFAULT now(),
  updated_at timestamptz NOT NULL DEFAULT now()
);

CREATE INDEX IF NOT EXISTS idx_nda_agreements_company ON public.nda_agreements(company_id);
CREATE INDEX IF NOT EXISTS idx_nda_agreements_org ON public.nda_agreements(organization_id);

ALTER TABLE public.nda_agreements ENABLE ROW LEVEL SECURITY;

DROP POLICY IF EXISTS "Org members read nda_agreements" ON public.nda_agreements;
CREATE POLICY "Org members read nda_agreements"
  ON public.nda_agreements FOR SELECT TO authenticated
  USING (organization_id = public.current_user_organization_id());

DROP POLICY IF EXISTS "Org staff manage nda_agreements" ON public.nda_agreements;
CREATE POLICY "Org staff manage nda_agreements"
  ON public.nda_agreements FOR ALL TO authenticated
  USING (
    organization_id = public.current_user_organization_id()
    AND EXISTS (
      SELECT 1 FROM public.profiles p
      WHERE p.id = auth.uid()
        AND p.organization_id = nda_agreements.organization_id
        AND p.role IN ('admin', 'account_manager')
    )
  )
  WITH CHECK (
    organization_id = public.current_user_organization_id()
    AND EXISTS (
      SELECT 1 FROM public.profiles p
      WHERE p.id = auth.uid()
        AND p.organization_id = nda_agreements.organization_id
        AND p.role IN ('admin', 'account_manager')
    )
  );
