-- EPIC 13 (Phase 1): Pending Invites – Rolle ändern + Resend-Daten via RPC
--
-- Motivation: `organization_invites` hat RLS; bisher existieren SELECT/INSERT/DELETE Policies,
-- aber keine UPDATE-Policy. Für "Rolle ändern" und "Resend" nutzen wir daher SECURITY DEFINER RPCs.

CREATE OR REPLACE FUNCTION public.update_organization_invite_role(
  p_invite_id uuid,
  p_role text
)
RETURNS void
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  v_org uuid;
  v_uid uuid := auth.uid();
  v_role text;
BEGIN
  IF v_uid IS NULL THEN
    RAISE EXCEPTION 'not authenticated';
  END IF;

  -- Nur Admins dürfen Rollen ändern
  IF (SELECT role FROM public.profiles WHERE id = v_uid) IS DISTINCT FROM 'admin' THEN
    RAISE EXCEPTION 'not authorized';
  END IF;

  v_org := public.current_user_organization_id();
  IF v_org IS NULL THEN
    RAISE EXCEPTION 'no organization';
  END IF;

  v_role :=
    CASE
      WHEN p_role IN ('admin', 'sales', 'account_manager') THEN p_role
      ELSE 'sales'
    END;

  UPDATE public.organization_invites
  SET role = v_role
  WHERE id = p_invite_id
    AND organization_id = v_org
    AND expires_at > now();
END;
$$;

CREATE OR REPLACE FUNCTION public.get_organization_invite_for_resend(
  p_invite_id uuid
)
RETURNS jsonb
LANGUAGE sql
STABLE
SECURITY DEFINER
SET search_path = public
AS $$
  SELECT jsonb_build_object(
    'email', i.email,
    'token', i.token,
    'role', coalesce(i.role, 'sales')
  )
  FROM public.organization_invites i
  WHERE i.id = p_invite_id
    AND i.organization_id = public.current_user_organization_id()
    AND i.expires_at > now();
$$;

REVOKE ALL ON FUNCTION public.update_organization_invite_role(uuid, text) FROM PUBLIC;
REVOKE ALL ON FUNCTION public.get_organization_invite_for_resend(uuid) FROM PUBLIC;

GRANT EXECUTE ON FUNCTION public.update_organization_invite_role(uuid, text) TO authenticated;
GRANT EXECUTE ON FUNCTION public.get_organization_invite_for_resend(uuid) TO authenticated;

