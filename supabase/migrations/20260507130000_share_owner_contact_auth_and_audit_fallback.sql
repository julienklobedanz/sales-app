-- Kundenansicht: E-Mail aus auth.users (nicht in public.profiles), Namens-Fallback aus User-Metadata,
-- sowie Fallback user_id aus audit_logs(link_created), falls reference_shared-Payload den Slug nicht trifft.

CREATE OR REPLACE FUNCTION public.get_public_portfolio_share_owner(
  p_slug text,
  p_unlock_token text DEFAULT NULL
)
RETURNS json
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public, extensions
AS $$
DECLARE
  v_row public.shared_portfolios%ROWTYPE;
  v_state text;
  v_user_id uuid;
  v_profile public.profiles%ROWTYPE;
  v_name text;
  v_role text;
  v_avatar_url text;
  v_email text;
  v_phone text;
  v_booking_url text;
  v_auth_email text;
  v_meta_full_name text;
BEGIN
  SELECT * INTO v_row FROM public.shared_portfolios WHERE slug = p_slug AND is_active = true;
  IF NOT FOUND THEN
    RETURN json_build_object('found', false);
  END IF;

  v_state := public._portfolio_public_access_state(v_row, p_unlock_token);
  IF v_state <> 'open' THEN
    RETURN json_build_object('found', false);
  END IF;

  SELECT e.created_by
  INTO v_user_id
  FROM public.evidence_events e
  WHERE e.event_type = 'reference_shared'
    AND (e.payload ->> 'slug') = p_slug
    AND e.created_by IS NOT NULL
  ORDER BY e.created_at ASC
  LIMIT 1;

  IF v_user_id IS NULL THEN
    SELECT al.user_id
    INTO v_user_id
    FROM public.audit_logs al
    WHERE al.action = 'link_created'
      AND al.entity_id = p_slug
      AND al.user_id IS NOT NULL
    ORDER BY al.timestamp ASC
    LIMIT 1;
  END IF;

  IF v_user_id IS NULL THEN
    RETURN json_build_object('found', false);
  END IF;

  SELECT * INTO v_profile FROM public.profiles WHERE id = v_user_id LIMIT 1;
  IF NOT FOUND THEN
    RETURN json_build_object('found', false);
  END IF;

  SELECT u.email::text, u.raw_user_meta_data->>'full_name'
  INTO v_auth_email, v_meta_full_name
  FROM auth.users u
  WHERE u.id = v_user_id
  LIMIT 1;

  v_name := nullif(trim(coalesce(v_profile.full_name, '')), '');
  IF v_name IS NULL THEN
    v_name := nullif(trim(coalesce(v_meta_full_name, '')), '');
  END IF;
  IF v_name IS NULL THEN
    v_name := nullif(trim(coalesce(split_part(v_auth_email, '@', 1), '')), '');
  END IF;

  v_role := nullif(trim(coalesce(to_jsonb(v_profile) ->> 'position', to_jsonb(v_profile) ->> 'role', '')), '');
  v_avatar_url := nullif(trim(coalesce(to_jsonb(v_profile) ->> 'avatar_url', '')), '');
  v_email := nullif(trim(coalesce(v_auth_email, '')), '');
  v_phone := nullif(trim(coalesce(to_jsonb(v_profile) ->> 'phone', to_jsonb(v_profile) ->> 'mobile', '')), '');
  v_booking_url := nullif(trim(coalesce(v_profile.booking_url, '')), '');

  RETURN json_build_object(
    'found', true,
    'name', coalesce(v_name, 'RefStack Team'),
    'position', coalesce(v_role, 'Sales Ansprechpartner'),
    'avatar_url', v_avatar_url,
    'email', v_email,
    'phone', v_phone,
    'booking_url', v_booking_url
  );
END;
$$;
