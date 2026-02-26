-- Deals: Tabelle + Verknüpfung zu Referenzen (deal_references)
-- Organisation-Scoping für RLS.

-- =============================================================================
-- 1. Tabelle: deals
-- =============================================================================
CREATE TABLE IF NOT EXISTS public.deals (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  organization_id uuid NOT NULL REFERENCES public.organizations(id) ON DELETE CASCADE,
  title text NOT NULL,
  company_id uuid REFERENCES public.companies(id) ON DELETE SET NULL,
  industry text,
  volume text,
  is_public boolean NOT NULL DEFAULT true,
  account_manager_id uuid REFERENCES auth.users(id) ON DELETE SET NULL,
  sales_manager_id uuid REFERENCES auth.users(id) ON DELETE SET NULL,
  status text NOT NULL DEFAULT 'in_negotiation',
  expiry_date date,
  created_at timestamptz DEFAULT now(),
  updated_at timestamptz DEFAULT now(),
  CONSTRAINT deals_status_check CHECK (
    status IN (
      'in_negotiation',
      'rfp_phase',
      'won',
      'lost',
      'on_hold'
    )
  )
);

CREATE INDEX IF NOT EXISTS idx_deals_organization_id ON public.deals(organization_id);
CREATE INDEX IF NOT EXISTS idx_deals_company_id ON public.deals(company_id);
CREATE INDEX IF NOT EXISTS idx_deals_expiry_date ON public.deals(expiry_date);
CREATE INDEX IF NOT EXISTS idx_deals_account_manager_id ON public.deals(account_manager_id);
CREATE INDEX IF NOT EXISTS idx_deals_sales_manager_id ON public.deals(sales_manager_id);

-- =============================================================================
-- 2. Junction: deal_references (Deal ↔ Referenzen, n:m)
-- =============================================================================
CREATE TABLE IF NOT EXISTS public.deal_references (
  deal_id uuid NOT NULL REFERENCES public.deals(id) ON DELETE CASCADE,
  reference_id uuid NOT NULL REFERENCES public.references(id) ON DELETE CASCADE,
  PRIMARY KEY (deal_id, reference_id)
);

CREATE INDEX IF NOT EXISTS idx_deal_references_reference_id ON public.deal_references(reference_id);

-- =============================================================================
-- 3. RLS: deals
-- =============================================================================
ALTER TABLE public.deals ENABLE ROW LEVEL SECURITY;

DROP POLICY IF EXISTS "Users see own org deals" ON public.deals;
CREATE POLICY "Users see own org deals"
  ON public.deals FOR SELECT
  TO authenticated
  USING (organization_id = public.current_user_organization_id());

DROP POLICY IF EXISTS "Users insert own org deals" ON public.deals;
CREATE POLICY "Users insert own org deals"
  ON public.deals FOR INSERT
  TO authenticated
  WITH CHECK (organization_id = public.current_user_organization_id());

DROP POLICY IF EXISTS "Users update own org deals" ON public.deals;
CREATE POLICY "Users update own org deals"
  ON public.deals FOR UPDATE
  TO authenticated
  USING (organization_id = public.current_user_organization_id())
  WITH CHECK (organization_id = public.current_user_organization_id());

DROP POLICY IF EXISTS "Users delete own org deals" ON public.deals;
CREATE POLICY "Users delete own org deals"
  ON public.deals FOR DELETE
  TO authenticated
  USING (organization_id = public.current_user_organization_id());

-- =============================================================================
-- 4. RLS: deal_references (über Deal-Zugehörigkeit zur Org)
-- =============================================================================
ALTER TABLE public.deal_references ENABLE ROW LEVEL SECURITY;

DROP POLICY IF EXISTS "Users see deal_references of own org" ON public.deal_references;
CREATE POLICY "Users see deal_references of own org"
  ON public.deal_references FOR SELECT
  TO authenticated
  USING (
    (SELECT organization_id FROM public.deals WHERE id = deal_id) = public.current_user_organization_id()
  );

DROP POLICY IF EXISTS "Users insert deal_references in own org" ON public.deal_references;
CREATE POLICY "Users insert deal_references in own org"
  ON public.deal_references FOR INSERT
  TO authenticated
  WITH CHECK (
    (SELECT organization_id FROM public.deals WHERE id = deal_id) = public.current_user_organization_id()
  );

DROP POLICY IF EXISTS "Users delete deal_references of own org" ON public.deal_references;
CREATE POLICY "Users delete deal_references of own org"
  ON public.deal_references FOR DELETE
  TO authenticated
  USING (
    (SELECT organization_id FROM public.deals WHERE id = deal_id) = public.current_user_organization_id()
  );

-- =============================================================================
-- 5. updated_at Trigger für deals
-- =============================================================================
CREATE OR REPLACE FUNCTION public.set_deals_updated_at()
RETURNS trigger
LANGUAGE plpgsql
AS $$
BEGIN
  NEW.updated_at = now();
  RETURN NEW;
END;
$$;

DROP TRIGGER IF EXISTS deals_updated_at ON public.deals;
CREATE TRIGGER deals_updated_at
  BEFORE UPDATE ON public.deals
  FOR EACH ROW
  EXECUTE FUNCTION public.set_deals_updated_at();

COMMENT ON TABLE public.deals IS 'Verkaufsdeals mit Ablaufdatum; verknüpft mit Referenzen über deal_references.';
COMMENT ON TABLE public.deal_references IS 'n:m Verknüpfung Deal ↔ Referenz.';
