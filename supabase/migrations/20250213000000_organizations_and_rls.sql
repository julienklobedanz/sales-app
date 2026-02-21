-- Mandanten-Isolierung: Organisationen (Firmen) und RLS
-- Jede Firma sieht nur ihre eigenen Daten (Companies, Referenzen, Kontakte).
-- Im Supabase SQL Editor ausführen.

-- =============================================================================
-- 1. Tabelle: organizations (Mandant = Firma mit eigenem Account)
-- =============================================================================
CREATE TABLE IF NOT EXISTS public.organizations (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  name text NOT NULL,
  created_at timestamptz DEFAULT now(),
  updated_at timestamptz DEFAULT now()
);

-- =============================================================================
-- 2. organization_id zu bestehenden Tabellen
-- =============================================================================
-- profiles: Nutzer gehört zu einer Organisation
ALTER TABLE public.profiles
  ADD COLUMN IF NOT EXISTS organization_id uuid REFERENCES public.organizations(id) ON DELETE SET NULL;

CREATE INDEX IF NOT EXISTS idx_profiles_organization_id ON public.profiles(organization_id);

-- companies: Referenz-Firmen gehören zu einer Organisation
ALTER TABLE public.companies
  ADD COLUMN IF NOT EXISTS organization_id uuid REFERENCES public.organizations(id) ON DELETE CASCADE;

CREATE INDEX IF NOT EXISTS idx_companies_organization_id ON public.companies(organization_id);

-- contact_persons: Kontakte gehören zu einer Organisation (falls Tabelle existiert)
DO $$
BEGIN
  IF EXISTS (SELECT 1 FROM information_schema.tables WHERE table_schema = 'public' AND table_name = 'contact_persons') THEN
    ALTER TABLE public.contact_persons
      ADD COLUMN IF NOT EXISTS organization_id uuid REFERENCES public.organizations(id) ON DELETE CASCADE;
    CREATE INDEX IF NOT EXISTS idx_contact_persons_organization_id ON public.contact_persons(organization_id);
  END IF;
END $$;

-- =============================================================================
-- 3. Hilfsfunktion: organization_id des aktuellen Users
-- =============================================================================
CREATE OR REPLACE FUNCTION public.current_user_organization_id()
RETURNS uuid
LANGUAGE sql
STABLE
SECURITY DEFINER
SET search_path = public
AS $$
  SELECT organization_id FROM public.profiles WHERE id = auth.uid()
$$;

-- =============================================================================
-- 4. Bestehende Daten: Default-Organisation für Migration
-- =============================================================================
INSERT INTO public.organizations (id, name)
VALUES ('00000000-0000-0000-0000-000000000001'::uuid, 'Standard (Migration)')
ON CONFLICT (id) DO NOTHING;

-- Alle Profile ohne Organisation der Default-Org zuweisen
UPDATE public.profiles
SET organization_id = '00000000-0000-0000-0000-000000000001'::uuid
WHERE organization_id IS NULL;

-- Alle Companies ohne Organisation der Default-Org zuweisen
UPDATE public.companies
SET organization_id = '00000000-0000-0000-0000-000000000001'::uuid
WHERE organization_id IS NULL;

-- contact_persons: falls vorhanden
DO $$
BEGIN
  IF EXISTS (SELECT 1 FROM information_schema.tables WHERE table_schema = 'public' AND table_name = 'contact_persons') THEN
    UPDATE public.contact_persons
    SET organization_id = '00000000-0000-0000-0000-000000000001'::uuid
    WHERE organization_id IS NULL;
  END IF;
END $$;

-- =============================================================================
-- 5. RLS: Alte Policies entfernen, neue org-scoped Policies
-- =============================================================================
ALTER TABLE public.organizations ENABLE ROW LEVEL SECURITY;

-- Organizations: User sieht nur die eigene Organisation
CREATE POLICY "Users see own organization"
  ON public.organizations FOR SELECT
  TO authenticated
  USING (id = public.current_user_organization_id());

CREATE POLICY "Users can insert organization"
  ON public.organizations FOR INSERT
  TO authenticated
  WITH CHECK (true);

CREATE POLICY "Users can update own organization"
  ON public.organizations FOR UPDATE
  TO authenticated
  USING (id = public.current_user_organization_id())
  WITH CHECK (id = public.current_user_organization_id());

-- Companies: nur eigene Organisation
DROP POLICY IF EXISTS "Authenticated users can read companies" ON public.companies;
DROP POLICY IF EXISTS "Authenticated users can insert companies" ON public.companies;
DROP POLICY IF EXISTS "Authenticated users can update companies" ON public.companies;

CREATE POLICY "Users see own org companies"
  ON public.companies FOR SELECT
  TO authenticated
  USING (organization_id = public.current_user_organization_id());

CREATE POLICY "Users insert companies in own org"
  ON public.companies FOR INSERT
  TO authenticated
  WITH CHECK (organization_id = public.current_user_organization_id());

CREATE POLICY "Users update own org companies"
  ON public.companies FOR UPDATE
  TO authenticated
  USING (organization_id = public.current_user_organization_id())
  WITH CHECK (organization_id = public.current_user_organization_id());

CREATE POLICY "Users delete own org companies"
  ON public.companies FOR DELETE
  TO authenticated
  USING (organization_id = public.current_user_organization_id());

-- Companies: Anon darf Company lesen, wenn eine Referenz mit approval_token darauf verweist (Freigabe-Seite)
CREATE POLICY "Anon can read companies linked to token reference"
  ON public.companies FOR SELECT
  TO anon
  USING (
    EXISTS (
      SELECT 1 FROM public.references r
      WHERE r.company_id = companies.id AND r.approval_token IS NOT NULL
    )
  );

-- References: nur über company der eigenen Organisation
DROP POLICY IF EXISTS "Authenticated users can read references" ON public.references;
DROP POLICY IF EXISTS "Authenticated users can insert references" ON public.references;
DROP POLICY IF EXISTS "Authenticated users can update references" ON public.references;

CREATE POLICY "Users see references of own org"
  ON public.references FOR SELECT
  TO authenticated
  USING (
    (SELECT organization_id FROM public.companies WHERE id = public.references.company_id) = public.current_user_organization_id()
  );

CREATE POLICY "Users insert references in own org"
  ON public.references FOR INSERT
  TO authenticated
  WITH CHECK (
    (SELECT organization_id FROM public.companies WHERE id = company_id) = public.current_user_organization_id()
  );

CREATE POLICY "Users update references of own org"
  ON public.references FOR UPDATE
  TO authenticated
  USING (
    (SELECT organization_id FROM public.companies WHERE id = public.references.company_id) = public.current_user_organization_id()
  )
  WITH CHECK (
    (SELECT organization_id FROM public.companies WHERE id = company_id) = public.current_user_organization_id()
  );

CREATE POLICY "Users delete references of own org"
  ON public.references FOR DELETE
  TO authenticated
  USING (
    (SELECT organization_id FROM public.companies WHERE id = public.references.company_id) = public.current_user_organization_id()
  );

-- Referenzen mit Freigabe-Token: Anonyme (z. B. Kontaktperson per Link) dürfen lesen/aktualisieren
CREATE POLICY "Anon can read references with approval token"
  ON public.references FOR SELECT
  TO anon
  USING (approval_token IS NOT NULL);

CREATE POLICY "Anon can update references with approval token"
  ON public.references FOR UPDATE
  TO anon
  USING (approval_token IS NOT NULL);

-- Approvals: nur Referenzen der eigenen Organisation
DROP POLICY IF EXISTS "Authenticated users can read approvals" ON public.approvals;
DROP POLICY IF EXISTS "Authenticated users can insert approvals" ON public.approvals;
DROP POLICY IF EXISTS "Authenticated users can update approvals" ON public.approvals;

CREATE POLICY "Users see approvals of own org"
  ON public.approvals FOR SELECT
  TO authenticated
  USING (
    EXISTS (
      SELECT 1 FROM public.references r
      JOIN public.companies c ON c.id = r.company_id
      WHERE r.id = approvals.reference_id
        AND c.organization_id = public.current_user_organization_id()
    )
  );

CREATE POLICY "Users insert approvals for own org refs"
  ON public.approvals FOR INSERT
  TO authenticated
  WITH CHECK (
    EXISTS (
      SELECT 1 FROM public.references r
      JOIN public.companies c ON c.id = r.company_id
      WHERE r.id = approvals.reference_id
        AND c.organization_id = public.current_user_organization_id()
    )
  );

CREATE POLICY "Users update approvals of own org"
  ON public.approvals FOR UPDATE
  TO authenticated
  USING (
    EXISTS (
      SELECT 1 FROM public.references r
      JOIN public.companies c ON c.id = r.company_id
      WHERE r.id = approvals.reference_id
        AND c.organization_id = public.current_user_organization_id()
    )
  );

-- Profiles: eigenes Profil + gleiche Organisation (für Teammitglieder)
ALTER TABLE public.profiles ENABLE ROW LEVEL SECURITY;

DROP POLICY IF EXISTS "Users see own or same org profiles" ON public.profiles;
CREATE POLICY "Users see own or same org profiles"
  ON public.profiles FOR SELECT
  TO authenticated
  USING (
    id = auth.uid()
    OR organization_id = public.current_user_organization_id()
  );

DROP POLICY IF EXISTS "Users update own profile" ON public.profiles;
CREATE POLICY "Users update own profile"
  ON public.profiles FOR UPDATE
  TO authenticated
  USING (id = auth.uid())
  WITH CHECK (id = auth.uid());

-- Profile-Insert: nur eigenes Profil (für Onboarding/Registrierung)
DROP POLICY IF EXISTS "Users insert own profile" ON public.profiles;
CREATE POLICY "Users insert own profile"
  ON public.profiles FOR INSERT
  TO authenticated
  WITH CHECK (id = auth.uid());

-- Favorites: User nur eigene (user_id = auth.uid()); Referenzen sind schon org-gefiltert
DO $$
BEGIN
  IF EXISTS (SELECT 1 FROM information_schema.tables WHERE table_schema = 'public' AND table_name = 'favorites') THEN
    ALTER TABLE public.favorites ENABLE ROW LEVEL SECURITY;
    DROP POLICY IF EXISTS "Users own favorites" ON public.favorites;
    CREATE POLICY "Users own favorites"
      ON public.favorites FOR ALL
      TO authenticated
      USING (user_id = auth.uid())
      WITH CHECK (user_id = auth.uid());
  END IF;
END $$;

-- contact_persons: nur eigene Organisation
DO $$
BEGIN
  IF EXISTS (SELECT 1 FROM information_schema.tables WHERE table_schema = 'public' AND table_name = 'contact_persons') THEN
    ALTER TABLE public.contact_persons ENABLE ROW LEVEL SECURITY;
    DROP POLICY IF EXISTS "Users see own org contact_persons" ON public.contact_persons;
    CREATE POLICY "Users see own org contact_persons"
      ON public.contact_persons FOR SELECT
      TO authenticated
      USING (organization_id = public.current_user_organization_id());
    DROP POLICY IF EXISTS "Users insert contact_persons in own org" ON public.contact_persons;
    CREATE POLICY "Users insert contact_persons in own org"
      ON public.contact_persons FOR INSERT
      TO authenticated
      WITH CHECK (organization_id = public.current_user_organization_id());
    DROP POLICY IF EXISTS "Users update own org contact_persons" ON public.contact_persons;
    CREATE POLICY "Users update own org contact_persons"
      ON public.contact_persons FOR UPDATE
      TO authenticated
      USING (organization_id = public.current_user_organization_id());
    DROP POLICY IF EXISTS "Users delete own org contact_persons" ON public.contact_persons;
    CREATE POLICY "Users delete own org contact_persons"
      ON public.contact_persons FOR DELETE
      TO authenticated
      USING (organization_id = public.current_user_organization_id());
  END IF;
END $$;
