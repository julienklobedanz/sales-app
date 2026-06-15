-- Mandanten-Isolierung: references strikt über organization_id (+ Company-Konsistenz).
-- Mehrere Organisationen können gleichnamige Accounts (z. B. „Apple“) haben — jede sieht nur eigene Zeilen.

-- Legacy-Policies entfernen (falls auf Live-DB noch vorhanden)
DROP POLICY IF EXISTS "Authenticated users can read references" ON public.references;
DROP POLICY IF EXISTS "Authenticated users can insert references" ON public.references;
DROP POLICY IF EXISTS "Authenticated users can update references" ON public.references;

-- organization_id aus Company nachziehen (Epic 15)
UPDATE public.references r
SET organization_id = c.organization_id
FROM public.companies c
WHERE r.company_id = c.id
  AND (r.organization_id IS NULL OR r.organization_id IS DISTINCT FROM c.organization_id);

DROP POLICY IF EXISTS "Users see references of own org" ON public.references;
CREATE POLICY "Users see references of own org"
  ON public.references FOR SELECT
  TO authenticated
  USING (
    organization_id = public.current_user_organization_id()
    AND (
      company_id IS NULL
      OR (
        SELECT c.organization_id
        FROM public.companies c
        WHERE c.id = public.references.company_id
      ) = public.current_user_organization_id()
    )
  );

DROP POLICY IF EXISTS "Users insert references in own org" ON public.references;
CREATE POLICY "Users insert references in own org"
  ON public.references FOR INSERT
  TO authenticated
  WITH CHECK (
    organization_id = public.current_user_organization_id()
    AND (
      company_id IS NULL
      OR (
        SELECT c.organization_id
        FROM public.companies c
        WHERE c.id = company_id
      ) = public.current_user_organization_id()
    )
  );

DROP POLICY IF EXISTS "Users update references of own org" ON public.references;
CREATE POLICY "Users update references of own org"
  ON public.references FOR UPDATE
  TO authenticated
  USING (
    organization_id = public.current_user_organization_id()
    AND (
      company_id IS NULL
      OR (
        SELECT c.organization_id
        FROM public.companies c
        WHERE c.id = public.references.company_id
      ) = public.current_user_organization_id()
    )
  )
  WITH CHECK (
    organization_id = public.current_user_organization_id()
    AND (
      company_id IS NULL
      OR (
        SELECT c.organization_id
        FROM public.companies c
        WHERE c.id = company_id
      ) = public.current_user_organization_id()
    )
  );

DROP POLICY IF EXISTS "Users delete references of own org" ON public.references;
CREATE POLICY "Users delete references of own org"
  ON public.references FOR DELETE
  TO authenticated
  USING (
    organization_id = public.current_user_organization_id()
    AND (
      company_id IS NULL
      OR (
        SELECT c.organization_id
        FROM public.companies c
        WHERE c.id = public.references.company_id
      ) = public.current_user_organization_id()
    )
  );
