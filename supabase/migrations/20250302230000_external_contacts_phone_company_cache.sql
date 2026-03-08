-- Phone für externe Kontakte (Kundenansprechpartner)
ALTER TABLE public.external_contacts
  ADD COLUMN IF NOT EXISTS phone text;

COMMENT ON COLUMN public.external_contacts.phone IS 'Telefonnummer des Kundenansprechpartners.';

-- Optionale Cache-Tabelle für Firmensuche (blitzschnelle Vorschläge)
CREATE TABLE IF NOT EXISTS public.company_cache (
  id uuid NOT NULL DEFAULT uuid_generate_v4(),
  organization_id uuid NOT NULL REFERENCES public.organizations(id) ON DELETE CASCADE,
  company_id uuid NOT NULL REFERENCES public.companies(id) ON DELETE CASCADE,
  name text NOT NULL,
  last_used_at timestamptz NOT NULL DEFAULT now(),
  CONSTRAINT company_cache_pkey PRIMARY KEY (id),
  CONSTRAINT company_cache_org_company_unique UNIQUE (organization_id, company_id)
);

CREATE INDEX IF NOT EXISTS idx_company_cache_org ON public.company_cache(organization_id);
CREATE INDEX IF NOT EXISTS idx_company_cache_last_used ON public.company_cache(last_used_at DESC);

ALTER TABLE public.company_cache ENABLE ROW LEVEL SECURITY;

DROP POLICY IF EXISTS "Users see own org company_cache" ON public.company_cache;
CREATE POLICY "Users see own org company_cache"
  ON public.company_cache FOR SELECT
  USING (organization_id = public.current_user_organization_id());

DROP POLICY IF EXISTS "Users insert own org company_cache" ON public.company_cache;
CREATE POLICY "Users insert own org company_cache"
  ON public.company_cache FOR INSERT
  WITH CHECK (organization_id = public.current_user_organization_id());

DROP POLICY IF EXISTS "Users update own org company_cache" ON public.company_cache;
CREATE POLICY "Users update own org company_cache"
  ON public.company_cache FOR UPDATE
  USING (organization_id = public.current_user_organization_id());
