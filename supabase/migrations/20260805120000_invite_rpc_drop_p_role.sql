-- Invite-RPCs: p_role entfernen; system_role + function_role sind kanonisch.

DROP FUNCTION IF EXISTS public.create_organization_invite(text, text, text, timestamptz);
DROP FUNCTION IF EXISTS public.create_organization_invite(text, text, text, timestamptz, public.system_role, public.function_role);
DROP FUNCTION IF EXISTS public.update_organization_invite_role(uuid, text);
DROP FUNCTION IF EXISTS public.update_organization_invite_role(uuid, text, public.system_role, public.function_role);

CREATE FUNCTION public.create_organization_invite(
  p_email text,
  p_token text,
  p_expires_at timestamptz,
  p_system_role public.system_role,
  p_function_role public.function_role
)
RETURNS void
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  v_org uuid;
  v_uid uuid := auth.uid();
BEGIN
  IF v_uid IS NULL THEN
    RAISE EXCEPTION 'not authenticated';
  END IF;

  v_org := public.current_user_organization_id();
  IF v_org IS NULL THEN
    RAISE EXCEPTION 'no organization';
  END IF;

  IF NOT public.current_user_is_privileged() THEN
    RAISE EXCEPTION 'not authorized';
  END IF;

  IF p_system_role IS NULL OR p_function_role IS NULL THEN
    RAISE EXCEPTION 'system_role and function_role required';
  END IF;

  INSERT INTO public.organization_invites (
    organization_id,
    email,
    token,
    invited_by,
    system_role,
    function_role,
    expires_at
  )
  VALUES (
    v_org,
    lower(trim(p_email)),
    p_token,
    v_uid,
    p_system_role,
    p_function_role,
    p_expires_at
  );
END;
$$;

CREATE FUNCTION public.update_organization_invite_role(
  p_invite_id uuid,
  p_system_role public.system_role,
  p_function_role public.function_role
)
RETURNS void
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  v_org uuid;
  v_uid uuid := auth.uid();
BEGIN
  IF v_uid IS NULL THEN
    RAISE EXCEPTION 'not authenticated';
  END IF;

  IF NOT public.current_user_is_privileged() THEN
    RAISE EXCEPTION 'not authorized';
  END IF;

  v_org := public.current_user_organization_id();
  IF v_org IS NULL THEN
    RAISE EXCEPTION 'no organization';
  END IF;

  IF p_system_role IS NULL OR p_function_role IS NULL THEN
    RAISE EXCEPTION 'system_role and function_role required';
  END IF;

  UPDATE public.organization_invites
  SET
    system_role = p_system_role,
    function_role = p_function_role
  WHERE id = p_invite_id
    AND organization_id = v_org
    AND expires_at > now();
END;
$$;

REVOKE ALL ON FUNCTION public.create_organization_invite(text, text, timestamptz, public.system_role, public.function_role) FROM PUBLIC;
REVOKE ALL ON FUNCTION public.update_organization_invite_role(uuid, public.system_role, public.function_role) FROM PUBLIC;

GRANT EXECUTE ON FUNCTION public.create_organization_invite(text, text, timestamptz, public.system_role, public.function_role) TO authenticated;
GRANT EXECUTE ON FUNCTION public.update_organization_invite_role(uuid, public.system_role, public.function_role) TO authenticated;

DO $$
BEGIN
  PERFORM pg_catalog.pg_notify('pgrst', 'reload schema');
END $$;
