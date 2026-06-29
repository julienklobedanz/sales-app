-- Proof-Linse: strukturierte Entscheidungskriterien je Deal (Account Coverage-Matrix)

CREATE TABLE IF NOT EXISTS public.deal_requirements (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  deal_id uuid NOT NULL REFERENCES public.deals(id) ON DELETE CASCADE,
  organization_id uuid NOT NULL REFERENCES public.organizations(id) ON DELETE CASCADE,
  label text NOT NULL,
  sort_order int NOT NULL DEFAULT 0,
  created_at timestamptz NOT NULL DEFAULT now(),
  CONSTRAINT deal_requirements_label_not_empty CHECK (char_length(trim(label)) > 0)
);

CREATE INDEX IF NOT EXISTS idx_deal_requirements_deal_id ON public.deal_requirements(deal_id);
CREATE INDEX IF NOT EXISTS idx_deal_requirements_org_id ON public.deal_requirements(organization_id);

ALTER TABLE public.deal_requirements ENABLE ROW LEVEL SECURITY;

DROP POLICY IF EXISTS "deal_requirements_select_own_org" ON public.deal_requirements;
CREATE POLICY "deal_requirements_select_own_org"
  ON public.deal_requirements FOR SELECT TO authenticated
  USING (organization_id = public.current_user_organization_id());

DROP POLICY IF EXISTS "deal_requirements_insert_own_org" ON public.deal_requirements;
CREATE POLICY "deal_requirements_insert_own_org"
  ON public.deal_requirements FOR INSERT TO authenticated
  WITH CHECK (
    organization_id = public.current_user_organization_id()
    AND EXISTS (
      SELECT 1 FROM public.deals d
      WHERE d.id = deal_id AND d.organization_id = public.current_user_organization_id()
    )
  );

DROP POLICY IF EXISTS "deal_requirements_update_own_org" ON public.deal_requirements;
CREATE POLICY "deal_requirements_update_own_org"
  ON public.deal_requirements FOR UPDATE TO authenticated
  USING (organization_id = public.current_user_organization_id())
  WITH CHECK (organization_id = public.current_user_organization_id());

DROP POLICY IF EXISTS "deal_requirements_delete_own_org" ON public.deal_requirements;
CREATE POLICY "deal_requirements_delete_own_org"
  ON public.deal_requirements FOR DELETE TO authenticated
  USING (organization_id = public.current_user_organization_id());
