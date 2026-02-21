-- Fix: Organisation per RPC anlegen (umgeht RLS beim ersten Onboarding)
-- Wenn ein neuer Nutzer noch keine Organisation hat, blockiert RLS das direkte INSERT.
-- Diese Funktion läuft mit SECURITY DEFINER und legt die Zeile an.

CREATE OR REPLACE FUNCTION public.create_organization(org_name text)
RETURNS uuid
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  new_id uuid;
BEGIN
  IF org_name IS NULL OR trim(org_name) = '' THEN
    org_name := 'Mein Unternehmen';
  END IF;
  INSERT INTO public.organizations (name)
  VALUES (trim(org_name))
  RETURNING id INTO new_id;
  RETURN new_id;
END;
$$;

COMMENT ON FUNCTION public.create_organization(text) IS 'Legt eine neue Organisation an (Onboarding). Nur für authentifizierte Aufrufer nutzen.';

-- Optional: INSERT-Policy explizit setzen (falls sie fehlt oder fehlschlug)
DROP POLICY IF EXISTS "Users can insert organization" ON public.organizations;
CREATE POLICY "Users can insert organization"
  ON public.organizations FOR INSERT
  TO authenticated
  WITH CHECK (true);
