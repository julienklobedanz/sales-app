-- Welle 1: system_role + function_role auf organization_invites; RPCs erweitern.

ALTER TABLE public.organization_invites
  ADD COLUMN IF NOT EXISTS system_role public.system_role,
  ADD COLUMN IF NOT EXISTS function_role public.function_role;

DO $$
BEGIN
  IF EXISTS (
    SELECT 1 FROM information_schema.columns
    WHERE table_schema = 'public' AND table_name = 'organization_invites' AND column_name = 'role'
  ) THEN
    UPDATE public.organization_invites
    SET
      system_role = CASE coalesce(role, 'sales')
        WHEN 'admin' THEN 'admin'::public.system_role
        ELSE 'member'::public.system_role
      END,
      function_role = CASE coalesce(role, 'sales')
        WHEN 'admin' THEN 'sales_leader'::public.function_role
        WHEN 'account_manager' THEN 'account_manager'::public.function_role
        ELSE 'sales_rep'::public.function_role
      END
    WHERE system_role IS NULL OR function_role IS NULL;
  END IF;
END $$;

ALTER TABLE public.organization_invites
  ALTER COLUMN system_role SET DEFAULT 'member'::public.system_role,
  ALTER COLUMN function_role SET DEFAULT 'sales_rep'::public.function_role;

UPDATE public.organization_invites
SET
  system_role = coalesce(system_role, 'member'::public.system_role),
  function_role = coalesce(function_role, 'sales_rep'::public.function_role)
WHERE system_role IS NULL OR function_role IS NULL;

ALTER TABLE public.organization_invites
  ALTER COLUMN system_role SET NOT NULL,
  ALTER COLUMN function_role SET NOT NULL;

DO $$
BEGIN
  IF EXISTS (
    SELECT 1 FROM information_schema.columns
    WHERE table_schema = 'public' AND table_name = 'organization_invites' AND column_name = 'role'
  ) THEN
    CREATE OR REPLACE FUNCTION public.sync_legacy_invite_role()
    RETURNS trigger
    LANGUAGE plpgsql
    AS $fn$
    BEGIN
      NEW.role := CASE
        WHEN NEW.function_role = 'account_manager'::public.function_role THEN 'account_manager'
        WHEN NEW.system_role IN ('owner'::public.system_role, 'admin'::public.system_role) THEN 'admin'
        ELSE 'sales'
      END;
      RETURN NEW;
    END;
    $fn$;

    DROP TRIGGER IF EXISTS trg_sync_legacy_invite_role ON public.organization_invites;
    CREATE TRIGGER trg_sync_legacy_invite_role
      BEFORE INSERT OR UPDATE OF system_role, function_role ON public.organization_invites
      FOR EACH ROW
      EXECUTE FUNCTION public.sync_legacy_invite_role();
  END IF;
END $$;

CREATE OR REPLACE FUNCTION public.resolve_invite_roles(
  p_role text,
  p_system_role public.system_role,
  p_function_role public.function_role,
  OUT o_system_role public.system_role,
  OUT o_function_role public.function_role,
  OUT o_legacy_role text
)
LANGUAGE plpgsql
IMMUTABLE
AS $$
BEGIN
  IF p_system_role IS NOT NULL AND p_function_role IS NOT NULL THEN
    o_system_role := p_system_role;
    o_function_role := p_function_role;
  ELSE
    o_system_role := CASE
      WHEN coalesce(p_role, 'sales') = 'admin' THEN 'admin'::public.system_role
      ELSE 'member'::public.system_role
    END;
    o_function_role := CASE coalesce(p_role, 'sales')
      WHEN 'admin' THEN 'sales_leader'::public.function_role
      WHEN 'account_manager' THEN 'account_manager'::public.function_role
      ELSE 'sales_rep'::public.function_role
    END;
  END IF;

  o_legacy_role := CASE
    WHEN o_function_role = 'account_manager'::public.function_role THEN 'account_manager'
    WHEN o_system_role IN ('owner'::public.system_role, 'admin'::public.system_role) THEN 'admin'
    ELSE 'sales'
  END;
END;
$$;

CREATE OR REPLACE FUNCTION public.legacy_role_from_dimensions(
  p_system_role public.system_role,
  p_function_role public.function_role
)
RETURNS text
LANGUAGE sql
IMMUTABLE
AS $$
  SELECT CASE
    WHEN p_function_role = 'account_manager'::public.function_role THEN 'account_manager'
    WHEN p_system_role IN ('owner'::public.system_role, 'admin'::public.system_role) THEN 'admin'
    ELSE 'sales'
  END
$$;

CREATE OR REPLACE FUNCTION public.create_organization_invite(
  p_email text,
  p_token text,
  p_role text,
  p_expires_at timestamptz,
  p_system_role public.system_role DEFAULT NULL,
  p_function_role public.function_role DEFAULT NULL
)
RETURNS void
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  v_org uuid;
  v_uid uuid := auth.uid();
  v_resolved record;
BEGIN
  IF v_uid IS NULL THEN
    RAISE EXCEPTION 'not authenticated';
  END IF;

  v_org := public.current_user_organization_id();
  IF v_org IS NULL THEN
    RAISE EXCEPTION 'no organization';
  END IF;

  IF NOT EXISTS (
    SELECT 1
    FROM public.profiles p
    WHERE p.id = v_uid
      AND p.system_role IN ('owner'::public.system_role, 'admin'::public.system_role)
  ) THEN
    RAISE EXCEPTION 'not authorized';
  END IF;

  SELECT * INTO v_resolved
  FROM public.resolve_invite_roles(p_role, p_system_role, p_function_role) AS t(
    o_system_role public.system_role,
    o_function_role public.function_role,
    o_legacy_role text
  );

  IF EXISTS (
    SELECT 1 FROM information_schema.columns
    WHERE table_schema = 'public' AND table_name = 'organization_invites' AND column_name = 'role'
  ) THEN
    EXECUTE '
      INSERT INTO public.organization_invites (
        organization_id, email, token, invited_by, role, system_role, function_role, expires_at
      ) VALUES ($1, $2, $3, $4, $5, $6, $7, $8)'
    USING
      v_org,
      lower(trim(p_email)),
      p_token,
      v_uid,
      v_resolved.o_legacy_role,
      v_resolved.o_system_role,
      v_resolved.o_function_role,
      p_expires_at;
  ELSE
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
      v_resolved.o_system_role,
      v_resolved.o_function_role,
      p_expires_at
    );
  END IF;
END;
$$;

CREATE OR REPLACE FUNCTION public.update_organization_invite_role(
  p_invite_id uuid,
  p_role text,
  p_system_role public.system_role DEFAULT NULL,
  p_function_role public.function_role DEFAULT NULL
)
RETURNS void
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  v_org uuid;
  v_uid uuid := auth.uid();
  v_resolved record;
BEGIN
  IF v_uid IS NULL THEN
    RAISE EXCEPTION 'not authenticated';
  END IF;

  IF NOT EXISTS (
    SELECT 1
    FROM public.profiles p
    WHERE p.id = v_uid
      AND p.system_role IN ('owner'::public.system_role, 'admin'::public.system_role)
  ) THEN
    RAISE EXCEPTION 'not authorized';
  END IF;

  v_org := public.current_user_organization_id();
  IF v_org IS NULL THEN
    RAISE EXCEPTION 'no organization';
  END IF;

  SELECT * INTO v_resolved
  FROM public.resolve_invite_roles(p_role, p_system_role, p_function_role) AS t(
    o_system_role public.system_role,
    o_function_role public.function_role,
    o_legacy_role text
  );

  IF EXISTS (
    SELECT 1 FROM information_schema.columns
    WHERE table_schema = 'public' AND table_name = 'organization_invites' AND column_name = 'role'
  ) THEN
    EXECUTE '
      UPDATE public.organization_invites
      SET role = $1, system_role = $2, function_role = $3
      WHERE id = $4 AND organization_id = $5 AND expires_at > now()'
    USING
      v_resolved.o_legacy_role,
      v_resolved.o_system_role,
      v_resolved.o_function_role,
      p_invite_id,
      v_org;
  ELSE
    UPDATE public.organization_invites
    SET
      system_role = v_resolved.o_system_role,
      function_role = v_resolved.o_function_role
    WHERE id = p_invite_id
      AND organization_id = v_org
      AND expires_at > now();
  END IF;
END;
$$;

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
    'role', public.legacy_role_from_dimensions(i.system_role, i.function_role),
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
        'role', public.legacy_role_from_dimensions(i.system_role, i.function_role),
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
    'role', public.legacy_role_from_dimensions(i.system_role, i.function_role),
    'system_role', i.system_role::text,
    'function_role', i.function_role::text
  )
  FROM public.organization_invites i
  WHERE i.id = p_invite_id
    AND i.organization_id = public.current_user_organization_id()
    AND i.expires_at > now();
$$;

REVOKE ALL ON FUNCTION public.create_organization_invite(text, text, text, timestamptz, public.system_role, public.function_role) FROM PUBLIC;
REVOKE ALL ON FUNCTION public.update_organization_invite_role(uuid, text, public.system_role, public.function_role) FROM PUBLIC;

GRANT EXECUTE ON FUNCTION public.create_organization_invite(text, text, text, timestamptz, public.system_role, public.function_role) TO authenticated;
GRANT EXECUTE ON FUNCTION public.update_organization_invite_role(uuid, text, public.system_role, public.function_role) TO authenticated;

DO $$
BEGIN
  PERFORM pg_catalog.pg_notify('pgrst', 'reload schema');
END $$;
