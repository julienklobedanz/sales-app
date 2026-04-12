-- Team-Einladungen: Inserts/Reads mit Spalte role ohne PostgREST-Tabellen-Schema-Cache.
-- Behebt „Could not find the 'role' column of 'organization_invites' in the schema cache“,
-- solange die Spalte in Postgres existiert (Cache kann veraltet sein).

ALTER TABLE public.organization_invites
ADD COLUMN IF NOT EXISTS role text;

UPDATE public.organization_invites
SET role = 'sales'
WHERE role IS NULL;

CREATE OR REPLACE FUNCTION public.create_organization_invite(
  p_email text,
  p_token text,
  p_role text,
  p_expires_at timestamptz
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

  v_org := public.current_user_organization_id();
  IF v_org IS NULL THEN
    RAISE EXCEPTION 'no organization';
  END IF;

  v_role :=
    CASE
      WHEN p_role IN ('admin', 'sales', 'account_manager') THEN p_role
      ELSE 'sales'
    END;

  INSERT INTO public.organization_invites (
    organization_id,
    email,
    token,
    invited_by,
    role,
    expires_at
  )
  VALUES (
    v_org,
    lower(trim(p_email)),
    p_token,
    v_uid,
    v_role,
    p_expires_at
  );
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
        'role', coalesce(i.role, 'sales')
      )
      ORDER BY i.created_at DESC NULLS LAST
    ),
    '[]'::jsonb
  )
  FROM public.organization_invites i
  WHERE i.organization_id = public.current_user_organization_id()
    AND i.expires_at > now();
$$;

REVOKE ALL ON FUNCTION public.create_organization_invite(text, text, text, timestamptz) FROM PUBLIC;
REVOKE ALL ON FUNCTION public.list_organization_pending_invites() FROM PUBLIC;

GRANT EXECUTE ON FUNCTION public.create_organization_invite(text, text, text, timestamptz) TO authenticated;
GRANT EXECUTE ON FUNCTION public.list_organization_pending_invites() TO authenticated;

-- Kein SELECT: sonst liefert Supabase / der SQL-Editor eine sichtbare Result-Zeile zu pg_notify.
DO $$
BEGIN
  PERFORM pg_catalog.pg_notify('pgrst', 'reload schema');
END $$;
