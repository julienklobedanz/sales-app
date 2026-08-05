-- Invite-JSON-RPCs: abgeleitetes Legacy-Feld `role` entfernen (Dims reichen).

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
    'system_role', i.system_role::text,
    'function_role', i.function_role::text
  ) INTO result
  FROM public.organization_invites i
  JOIN public.organizations o ON o.id = i.organization_id
  WHERE i.token = invite_token
    AND i.expires_at > now();
  RETURN result;
END;
$$;

CREATE OR REPLACE FUNCTION public.list_organization_pending_invites()
RETURNS jsonb
LANGUAGE sql
STABLE
SECURITY DEFINER
SET search_path = public
AS $$
  SELECT coalesce(
    jsonb_agg(
      jsonb_build_object(
        'id', i.id,
        'email', i.email,
        'system_role', i.system_role::text,
        'function_role', i.function_role::text
      )
      ORDER BY i.created_at DESC NULLS LAST
    ),
    '[]'::jsonb
  )
  FROM public.organization_invites i
  WHERE i.organization_id = public.current_user_organization_id()
    AND i.expires_at > now();
$$;

CREATE OR REPLACE FUNCTION public.get_organization_invite_for_resend(p_invite_id uuid)
RETURNS jsonb
LANGUAGE sql
STABLE
SECURITY DEFINER
SET search_path = public
AS $$
  SELECT jsonb_build_object(
    'email', i.email,
    'token', i.token,
    'system_role', i.system_role::text,
    'function_role', i.function_role::text
  )
  FROM public.organization_invites i
  WHERE i.id = p_invite_id
    AND i.organization_id = public.current_user_organization_id()
    AND i.expires_at > now();
$$;

DO $$
BEGIN
  PERFORM pg_catalog.pg_notify('pgrst', 'reload schema');
END $$;
