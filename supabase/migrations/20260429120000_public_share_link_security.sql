-- Public share link security: TTL, optional password (bcrypt), unlock sessions
-- Aligns gate logic across get_public_portfolio, branding, share owner, analytics.

CREATE EXTENSION IF NOT EXISTS pgcrypto;

-- -----------------------------------------------------------------------------
-- 1) Columns on shared_portfolios
-- -----------------------------------------------------------------------------
ALTER TABLE public.shared_portfolios
  ADD COLUMN IF NOT EXISTS expires_at timestamptz,
  ADD COLUMN IF NOT EXISTS password_hash text;

COMMENT ON COLUMN public.shared_portfolios.expires_at IS 'Optional UTC expiry; link stops serving content after this instant.';
COMMENT ON COLUMN public.shared_portfolios.password_hash IS 'Optional bcrypt hash (pgcrypto crypt/gen_salt). NULL = no password.';

-- -----------------------------------------------------------------------------
-- 2) Short-lived unlock sessions (opaque token, hashed at rest)
-- -----------------------------------------------------------------------------
CREATE TABLE IF NOT EXISTS public.portfolio_unlock_tokens (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  shared_portfolio_id uuid NOT NULL REFERENCES public.shared_portfolios(id) ON DELETE CASCADE,
  token_hash text NOT NULL,
  expires_at timestamptz NOT NULL,
  created_at timestamptz NOT NULL DEFAULT now()
);

CREATE INDEX IF NOT EXISTS idx_portfolio_unlock_tokens_lookup
  ON public.portfolio_unlock_tokens (shared_portfolio_id, token_hash);

ALTER TABLE public.portfolio_unlock_tokens ENABLE ROW LEVEL SECURITY;

-- No direct reads/writes; only SECURITY DEFINER RPCs touch this table.

-- -----------------------------------------------------------------------------
-- 3) Internal helpers (not granted to API roles)
-- -----------------------------------------------------------------------------
CREATE OR REPLACE FUNCTION public._portfolio_session_valid(
  p_portfolio_id uuid,
  p_token text
) RETURNS boolean
LANGUAGE sql
STABLE
SECURITY DEFINER
SET search_path = public, extensions
AS $$
  SELECT COALESCE(length(trim(p_token)), 0) > 0
    AND EXISTS (
      SELECT 1
      FROM public.portfolio_unlock_tokens t
      WHERE t.shared_portfolio_id = p_portfolio_id
        AND t.token_hash = encode(digest(trim(p_token), 'sha256'::text), 'hex')
        AND t.expires_at > now()
    );
$$;

CREATE OR REPLACE FUNCTION public._portfolio_public_access_state(
  p_row public.shared_portfolios,
  p_unlock_token text
) RETURNS text
LANGUAGE plpgsql
STABLE
SECURITY DEFINER
SET search_path = public, extensions
AS $$
BEGIN
  IF NOT p_row.is_active THEN
    RETURN 'inactive';
  END IF;
  IF p_row.expires_at IS NOT NULL AND p_row.expires_at < now() THEN
    RETURN 'expired';
  END IF;
  IF p_row.password_hash IS NULL THEN
    RETURN 'open';
  END IF;
  IF p_unlock_token IS NOT NULL AND public._portfolio_session_valid(p_row.id, p_unlock_token) THEN
    RETURN 'open';
  END IF;
  RETURN 'locked';
END;
$$;

-- Drop legacy 1-arg signatures (replaced by 2-arg with default on 2nd param)
DROP FUNCTION IF EXISTS public.get_public_portfolio(text);
DROP FUNCTION IF EXISTS public.get_public_portfolio_branding(text);
DROP FUNCTION IF EXISTS public.get_public_portfolio_share_owner(text);
DROP FUNCTION IF EXISTS public.increment_portfolio_views(text);
DROP FUNCTION IF EXISTS public.log_share_link_viewed(text);

-- -----------------------------------------------------------------------------
-- 4) Replace get_public_portfolio (add optional unlock token)
-- -----------------------------------------------------------------------------
CREATE OR REPLACE FUNCTION public.get_public_portfolio(
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
  v_refs json;
BEGIN
  SELECT * INTO v_row FROM public.shared_portfolios WHERE slug = p_slug;
  IF NOT FOUND THEN
    RETURN json_build_object('access', 'denied', 'reason', 'not_found');
  END IF;

  v_state := public._portfolio_public_access_state(v_row, p_unlock_token);

  IF v_state = 'inactive' THEN
    RETURN json_build_object('access', 'denied', 'reason', 'not_found');
  END IF;
  IF v_state = 'expired' THEN
    RETURN json_build_object('access', 'denied', 'reason', 'expired');
  END IF;
  IF v_state = 'locked' THEN
    RETURN json_build_object('access', 'locked', 'slug', v_row.slug);
  END IF;

  SELECT json_agg(
    json_build_object(
      'id', r.id, 'title', r.title, 'summary', r.summary, 'industry', r.industry, 'country', r.country,
      'status', r.status, 'company_name', c.name, 'company_logo_url', c.logo_url,
      'website', r.website, 'employee_count', r.employee_count, 'volume_eur', r.volume_eur,
      'contract_type', r.contract_type, 'incumbent_provider', r.incumbent_provider, 'competitors', r.competitors,
      'customer_challenge', r.customer_challenge, 'our_solution', r.our_solution, 'tags', r.tags,
      'project_status', r.project_status, 'project_start', r.project_start, 'project_end', r.project_end,
      'duration_months', NULL
    )
  ) INTO v_refs
  FROM public.references r
  LEFT JOIN public.companies c ON c.id = r.company_id
  WHERE r.id = ANY(v_row.reference_ids) AND r.deleted_at IS NULL;

  RETURN json_build_object(
    'access', 'ok',
    'found', true,
    'slug', v_row.slug,
    'reference_ids', v_row.reference_ids,
    'view_count', v_row.view_count,
    'references', COALESCE(v_refs, '[]'::json)
  );
END;
$$;

-- -----------------------------------------------------------------------------
-- 5) Branding + share owner: only when access is open
-- -----------------------------------------------------------------------------
CREATE OR REPLACE FUNCTION public.get_public_portfolio_branding(
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
  v_org public.organizations%ROWTYPE;
  v_ref_id uuid;
BEGIN
  SELECT * INTO v_row FROM public.shared_portfolios WHERE slug = p_slug AND is_active = true;
  IF NOT FOUND THEN
    RETURN json_build_object('found', false);
  END IF;

  v_state := public._portfolio_public_access_state(v_row, p_unlock_token);
  IF v_state <> 'open' THEN
    RETURN json_build_object('found', false);
  END IF;

  IF array_length(v_row.reference_ids, 1) IS NULL THEN
    RETURN json_build_object('found', false);
  END IF;

  v_ref_id := v_row.reference_ids[1];

  SELECT o.* INTO v_org
  FROM public.references r
  JOIN public.organizations o ON o.id = r.organization_id
  WHERE r.id = v_ref_id;

  IF NOT FOUND THEN
    RETURN json_build_object('found', false);
  END IF;

  RETURN json_build_object(
    'found', true,
    'name', v_org.name,
    'logo_url', v_org.logo_url,
    'primary_color', coalesce(v_org.primary_color, '#2563EB'),
    'secondary_color', coalesce(v_org.secondary_color, '#1D4ED8')
  );
END;
$$;

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
    RETURN json_build_object('found', false);
  END IF;

  SELECT * INTO v_profile FROM public.profiles WHERE id = v_user_id LIMIT 1;
  IF NOT FOUND THEN
    RETURN json_build_object('found', false);
  END IF;

  v_name := nullif(trim(coalesce(v_profile.full_name, '')), '');
  v_role := nullif(trim(coalesce(to_jsonb(v_profile) ->> 'position', to_jsonb(v_profile) ->> 'role', '')), '');
  v_avatar_url := nullif(trim(coalesce(to_jsonb(v_profile) ->> 'avatar_url', '')), '');
  v_email := nullif(trim(coalesce(to_jsonb(v_profile) ->> 'email', '')), '');
  v_phone := nullif(trim(coalesce(to_jsonb(v_profile) ->> 'phone', to_jsonb(v_profile) ->> 'mobile', '')), '');

  RETURN json_build_object(
    'found', true,
    'name', coalesce(v_name, 'RefStack Team'),
    'position', coalesce(v_role, 'Sales Ansprechpartner'),
    'avatar_url', v_avatar_url,
    'email', v_email,
    'phone', v_phone
  );
END;
$$;

-- -----------------------------------------------------------------------------
-- 6) Analytics: only when session would allow viewing content
-- -----------------------------------------------------------------------------
CREATE OR REPLACE FUNCTION public.increment_portfolio_views(
  p_slug text,
  p_unlock_token text DEFAULT NULL
)
RETURNS void
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public, extensions
AS $$
DECLARE
  v_row public.shared_portfolios%ROWTYPE;
  v_state text;
BEGIN
  SELECT * INTO v_row FROM public.shared_portfolios WHERE slug = p_slug AND is_active = true;
  IF NOT FOUND THEN
    RETURN;
  END IF;
  v_state := public._portfolio_public_access_state(v_row, p_unlock_token);
  IF v_state <> 'open' THEN
    RETURN;
  END IF;
  UPDATE public.shared_portfolios SET view_count = view_count + 1 WHERE id = v_row.id;
END;
$$;

CREATE OR REPLACE FUNCTION public.log_share_link_viewed(
  p_slug text,
  p_unlock_token text DEFAULT NULL
)
RETURNS void
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public, extensions
AS $$
DECLARE
  v_row public.shared_portfolios%ROWTYPE;
  v_state text;
  v_ref_id uuid;
  v_org_id uuid;
BEGIN
  SELECT * INTO v_row FROM public.shared_portfolios WHERE slug = p_slug AND is_active = true;
  IF NOT FOUND OR array_length(v_row.reference_ids, 1) IS NULL THEN
    RETURN;
  END IF;
  v_state := public._portfolio_public_access_state(v_row, p_unlock_token);
  IF v_state <> 'open' THEN
    RETURN;
  END IF;

  v_ref_id := v_row.reference_ids[1];
  SELECT organization_id INTO v_org_id FROM public.references WHERE id = v_ref_id;
  IF v_org_id IS NULL THEN
    RETURN;
  END IF;

  INSERT INTO public.evidence_events (
    organization_id,
    reference_id,
    event_type,
    payload,
    created_by
  ) VALUES (
    v_org_id,
    v_ref_id,
    'share_link_viewed',
    jsonb_build_object(
      'slug', p_slug,
      'reference_ids', v_row.reference_ids
    ),
    NULL
  );
END;
$$;

-- -----------------------------------------------------------------------------
-- 7) Unlock: verify bcrypt password, mint opaque session token
-- -----------------------------------------------------------------------------
CREATE OR REPLACE FUNCTION public.try_unlock_shared_portfolio(
  p_slug text,
  p_password text
)
RETURNS json
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public, extensions
AS $$
DECLARE
  v_row public.shared_portfolios%ROWTYPE;
  v_token text;
  v_token_hash text;
  v_sess_exp timestamptz;
BEGIN
  SELECT * INTO v_row FROM public.shared_portfolios WHERE slug = p_slug AND is_active = true;
  IF NOT FOUND THEN
    RETURN json_build_object('success', false, 'error', 'not_found');
  END IF;

  IF v_row.expires_at IS NOT NULL AND v_row.expires_at < now() THEN
    RETURN json_build_object('success', false, 'error', 'expired');
  END IF;

  IF v_row.password_hash IS NULL THEN
    RETURN json_build_object('success', false, 'error', 'no_password_required');
  END IF;

  IF crypt(coalesce(trim(p_password), ''), v_row.password_hash) IS DISTINCT FROM v_row.password_hash THEN
    RETURN json_build_object('success', false, 'error', 'invalid_password');
  END IF;

  v_token := encode(gen_random_bytes(32), 'hex');
  v_token_hash := encode(digest(v_token, 'sha256'::text), 'hex');
  v_sess_exp := least(
    coalesce(v_row.expires_at, now() + interval '365 days'),
    now() + interval '30 days'
  );
  INSERT INTO public.portfolio_unlock_tokens (shared_portfolio_id, token_hash, expires_at)
  VALUES (v_row.id, v_token_hash, v_sess_exp);

  RETURN json_build_object(
    'success', true,
    'token', v_token,
    'max_age_seconds',
    greatest(60, least(2592000, floor(extract(epoch from (v_sess_exp - now())))::int))
  );
END;
$$;

GRANT EXECUTE ON FUNCTION public.try_unlock_shared_portfolio(text, text) TO anon;
GRANT EXECUTE ON FUNCTION public.try_unlock_shared_portfolio(text, text) TO authenticated;

-- -----------------------------------------------------------------------------
-- 8) Authenticated: set password + expiry (dashboard)
-- -----------------------------------------------------------------------------
CREATE OR REPLACE FUNCTION public.set_shared_portfolio_security(
  p_slug text,
  p_password_plain text,
  p_password_remove boolean DEFAULT false,
  p_expires_at timestamptz DEFAULT NULL,
  p_clear_expires boolean DEFAULT false
)
RETURNS json
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public, extensions
AS $$
DECLARE
  v_row public.shared_portfolios%ROWTYPE;
BEGIN
  IF auth.uid() IS NULL THEN
    RETURN json_build_object('success', false, 'error', 'unauthorized');
  END IF;

  SELECT * INTO v_row FROM public.shared_portfolios WHERE slug = p_slug AND is_active = true;
  IF NOT FOUND THEN
    RETURN json_build_object('success', false, 'error', 'not_found');
  END IF;

  IF NOT EXISTS (
    SELECT 1
    FROM public.references r
    JOIN public.profiles p ON p.id = auth.uid() AND p.organization_id = r.organization_id
    WHERE r.id = ANY(v_row.reference_ids) AND r.deleted_at IS NULL
  ) THEN
    RETURN json_build_object('success', false, 'error', 'forbidden');
  END IF;

  UPDATE public.shared_portfolios
  SET
    password_hash = CASE
      WHEN p_password_remove THEN NULL
      WHEN p_password_plain IS NOT NULL AND length(trim(p_password_plain)) > 0
        THEN crypt(trim(p_password_plain), gen_salt('bf'::text))
      ELSE password_hash
    END,
    expires_at = CASE
      WHEN p_clear_expires THEN NULL
      WHEN p_expires_at IS NOT NULL THEN p_expires_at
      ELSE expires_at
    END
  WHERE id = v_row.id;

  DELETE FROM public.portfolio_unlock_tokens WHERE shared_portfolio_id = v_row.id;

  RETURN json_build_object('success', true);
END;
$$;

GRANT EXECUTE ON FUNCTION public.set_shared_portfolio_security(text, text, boolean, timestamptz, boolean) TO authenticated;

-- -----------------------------------------------------------------------------
-- Grants (signatures changed: re-grant)
-- -----------------------------------------------------------------------------
GRANT EXECUTE ON FUNCTION public.get_public_portfolio(text, text) TO anon;
GRANT EXECUTE ON FUNCTION public.get_public_portfolio(text, text) TO authenticated;

GRANT EXECUTE ON FUNCTION public.get_public_portfolio_branding(text, text) TO anon;
GRANT EXECUTE ON FUNCTION public.get_public_portfolio_branding(text, text) TO authenticated;

GRANT EXECUTE ON FUNCTION public.get_public_portfolio_share_owner(text, text) TO anon;
GRANT EXECUTE ON FUNCTION public.get_public_portfolio_share_owner(text, text) TO authenticated;

GRANT EXECUTE ON FUNCTION public.increment_portfolio_views(text, text) TO anon;
GRANT EXECUTE ON FUNCTION public.increment_portfolio_views(text, text) TO authenticated;

GRANT EXECUTE ON FUNCTION public.log_share_link_viewed(text, text) TO anon;
GRANT EXECUTE ON FUNCTION public.log_share_link_viewed(text, text) TO authenticated;

-- Anon must not read shared_portfolios directly (password_hash). Access only via SECURITY DEFINER RPCs.
DROP POLICY IF EXISTS "shared_portfolios_anon_select_active" ON public.shared_portfolios;
