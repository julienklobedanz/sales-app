-- Einladungen: Teammitglieder per Link zur Organisation hinzufügen
-- Im Supabase SQL Editor ausführen.

CREATE TABLE IF NOT EXISTS public.organization_invites (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  organization_id uuid NOT NULL REFERENCES public.organizations(id) ON DELETE CASCADE,
  email text,
  token text NOT NULL UNIQUE,
  invited_by uuid NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  expires_at timestamptz NOT NULL,
  created_at timestamptz DEFAULT now()
);

CREATE INDEX IF NOT EXISTS idx_organization_invites_token ON public.organization_invites(token);
CREATE INDEX IF NOT EXISTS idx_organization_invites_organization_id ON public.organization_invites(organization_id);
CREATE INDEX IF NOT EXISTS idx_organization_invites_expires_at ON public.organization_invites(expires_at);

ALTER TABLE public.organization_invites ENABLE ROW LEVEL SECURITY;

-- Nur Mitglieder derselben Organisation dürfen Einladungen lesen und erstellen
CREATE POLICY "Users see invites of own org"
  ON public.organization_invites FOR SELECT
  TO authenticated
  USING (
    organization_id = public.current_user_organization_id()
  );

CREATE POLICY "Users create invites for own org"
  ON public.organization_invites FOR INSERT
  TO authenticated
  WITH CHECK (
    organization_id = public.current_user_organization_id()
    AND invited_by = auth.uid()
  );

-- Kein anon-SELECT: Token-Validierung nur über sichere Funktion

-- Gibt Organisations-Infos zurück, wenn Token gültig und nicht abgelaufen ist (für Register/Onboarding)
CREATE OR REPLACE FUNCTION public.get_invite_by_token(invite_token text)
RETURNS jsonb
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  result jsonb;
BEGIN
  SELECT jsonb_build_object(
    'organization_id', i.organization_id,
    'organization_name', o.name
  ) INTO result
  FROM public.organization_invites i
  JOIN public.organizations o ON o.id = i.organization_id
  WHERE i.token = invite_token
    AND i.expires_at > now();
  RETURN result;
END;
$$;

COMMENT ON TABLE public.organization_invites IS 'Einladungslinks für Teammitglieder; Token in URL /register?invite=TOKEN';
