-- Idempotent: Spalte role, RPC und PostgREST-Cache-Reload.
-- Behebt u. a. „Could not find the 'role' column of 'organization_invites' in the schema cache“,
-- falls eine ältere Migration fehlte oder der Cache nicht neu geladen wurde.

ALTER TABLE public.organization_invites
ADD COLUMN IF NOT EXISTS role text;

UPDATE public.organization_invites
SET role = 'sales'
WHERE role IS NULL;

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
    'organization_name', o.name,
    'role', i.role
  ) INTO result
  FROM public.organization_invites i
  JOIN public.organizations o ON o.id = i.organization_id
  WHERE i.token = invite_token
    AND i.expires_at > now();
  RETURN result;
END;
$$;

SELECT pg_catalog.pg_notify('pgrst', 'reload schema');
