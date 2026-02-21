-- RLS für Referenzen & Companies erzwingen (Mandanten-Isolierung)
-- Wenn neue Accounts trotzdem alle Referenzen sehen: Diese Migration im Supabase SQL Editor ausführen.
-- Stellt sicher: Nur Daten der eigenen Organisation sind sichtbar.

-- =============================================================================
-- 0. Bestehende Daten: Companies ohne organization_id der Default-Org zuweisen
--    (damit RLS greift und alte Referenzen nur für Nutzer der Default-Org sichtbar sind)
-- =============================================================================
INSERT INTO public.organizations (id, name)
VALUES ('00000000-0000-0000-0000-000000000001'::uuid, 'Standard (Migration)')
ON CONFLICT (id) DO NOTHING;

UPDATE public.companies
SET organization_id = '00000000-0000-0000-0000-000000000001'::uuid
WHERE organization_id IS NULL;

-- =============================================================================
-- 1. RLS aktivieren (falls noch nicht)
-- =============================================================================
ALTER TABLE public.references ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.companies ENABLE ROW LEVEL SECURITY;

-- =============================================================================
-- 2. Alte „alle sehen alles“-Policies entfernen
-- =============================================================================
DROP POLICY IF EXISTS "Authenticated users can read references" ON public.references;
DROP POLICY IF EXISTS "Authenticated users can insert references" ON public.references;
DROP POLICY IF EXISTS "Authenticated users can update references" ON public.references;

DROP POLICY IF EXISTS "Authenticated users can read companies" ON public.companies;
DROP POLICY IF EXISTS "Authenticated users can insert companies" ON public.companies;
DROP POLICY IF EXISTS "Authenticated users can update companies" ON public.companies;

-- =============================================================================
-- 3. Referenzen: Nur Zeilen, deren Company zur eigenen Organisation gehört
-- =============================================================================
DROP POLICY IF EXISTS "Users see references of own org" ON public.references;
CREATE POLICY "Users see references of own org"
  ON public.references FOR SELECT
  TO authenticated
  USING (
    (SELECT organization_id FROM public.companies WHERE id = public.references.company_id) = public.current_user_organization_id()
  );

DROP POLICY IF EXISTS "Users insert references in own org" ON public.references;
CREATE POLICY "Users insert references in own org"
  ON public.references FOR INSERT
  TO authenticated
  WITH CHECK (
    (SELECT organization_id FROM public.companies WHERE id = company_id) = public.current_user_organization_id()
  );

DROP POLICY IF EXISTS "Users update references of own org" ON public.references;
CREATE POLICY "Users update references of own org"
  ON public.references FOR UPDATE
  TO authenticated
  USING (
    (SELECT organization_id FROM public.companies WHERE id = public.references.company_id) = public.current_user_organization_id()
  )
  WITH CHECK (
    (SELECT organization_id FROM public.companies WHERE id = company_id) = public.current_user_organization_id()
  );

DROP POLICY IF EXISTS "Users delete references of own org" ON public.references;
CREATE POLICY "Users delete references of own org"
  ON public.references FOR DELETE
  TO authenticated
  USING (
    (SELECT organization_id FROM public.companies WHERE id = public.references.company_id) = public.current_user_organization_id()
  );

-- Anon: nur Referenzen mit Freigabe-Token (für /approval/[token])
DROP POLICY IF EXISTS "Anon can read references with approval token" ON public.references;
CREATE POLICY "Anon can read references with approval token"
  ON public.references FOR SELECT
  TO anon
  USING (approval_token IS NOT NULL);

DROP POLICY IF EXISTS "Anon can update references with approval token" ON public.references;
CREATE POLICY "Anon can update references with approval token"
  ON public.references FOR UPDATE
  TO anon
  USING (approval_token IS NOT NULL);

-- =============================================================================
-- 4. Companies: Nur eigene Organisation
-- =============================================================================
DROP POLICY IF EXISTS "Users see own org companies" ON public.companies;
CREATE POLICY "Users see own org companies"
  ON public.companies FOR SELECT
  TO authenticated
  USING (organization_id = public.current_user_organization_id());

DROP POLICY IF EXISTS "Users insert companies in own org" ON public.companies;
CREATE POLICY "Users insert companies in own org"
  ON public.companies FOR INSERT
  TO authenticated
  WITH CHECK (organization_id = public.current_user_organization_id());

DROP POLICY IF EXISTS "Users update own org companies" ON public.companies;
CREATE POLICY "Users update own org companies"
  ON public.companies FOR UPDATE
  TO authenticated
  USING (organization_id = public.current_user_organization_id())
  WITH CHECK (organization_id = public.current_user_organization_id());

DROP POLICY IF EXISTS "Users delete own org companies" ON public.companies;
CREATE POLICY "Users delete own org companies"
  ON public.companies FOR DELETE
  TO authenticated
  USING (organization_id = public.current_user_organization_id());

-- Anon: Company nur lesbar, wenn Referenz mit approval_token existiert
DROP POLICY IF EXISTS "Anon can read companies linked to token reference" ON public.companies;
CREATE POLICY "Anon can read companies linked to token reference"
  ON public.companies FOR SELECT
  TO anon
  USING (
    EXISTS (
      SELECT 1 FROM public.references r
      WHERE r.company_id = companies.id AND r.approval_token IS NOT NULL
    )
  );
