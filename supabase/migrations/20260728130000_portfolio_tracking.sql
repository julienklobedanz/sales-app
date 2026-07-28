-- Portfolio: personalisierte Links, E-Mail-Gate, Session-Tracking

ALTER TABLE public.shared_portfolios
  ADD COLUMN IF NOT EXISTS gate_mode text NOT NULL DEFAULT 'none';

COMMENT ON COLUMN public.shared_portfolios.gate_mode IS
  'none | password (password_hash) | email (Name+E-Mail vor Ansicht)';

CREATE TABLE IF NOT EXISTS public.shared_portfolio_recipients (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  shared_portfolio_id uuid NOT NULL REFERENCES public.shared_portfolios(id) ON DELETE CASCADE,
  token text NOT NULL UNIQUE,
  label text NOT NULL DEFAULT '',
  visitor_email text,
  external_contact_id uuid REFERENCES public.external_contacts(id) ON DELETE SET NULL,
  company_id uuid REFERENCES public.companies(id) ON DELETE SET NULL,
  created_by uuid REFERENCES auth.users(id) ON DELETE SET NULL,
  created_at timestamptz NOT NULL DEFAULT now()
);

CREATE INDEX IF NOT EXISTS idx_shared_portfolio_recipients_portfolio
  ON public.shared_portfolio_recipients(shared_portfolio_id);

CREATE TABLE IF NOT EXISTS public.portfolio_view_sessions (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  shared_portfolio_id uuid NOT NULL REFERENCES public.shared_portfolios(id) ON DELETE CASCADE,
  recipient_id uuid REFERENCES public.shared_portfolio_recipients(id) ON DELETE SET NULL,
  slug text NOT NULL,
  country_code text,
  visitor_name text,
  visitor_email text,
  active_seconds integer NOT NULL DEFAULT 0,
  started_at timestamptz NOT NULL DEFAULT now(),
  ended_at timestamptz,
  last_heartbeat_at timestamptz NOT NULL DEFAULT now()
);

CREATE INDEX IF NOT EXISTS idx_portfolio_view_sessions_slug_started
  ON public.portfolio_view_sessions(slug, started_at DESC);

CREATE TABLE IF NOT EXISTS public.portfolio_view_events (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  session_id uuid NOT NULL REFERENCES public.portfolio_view_sessions(id) ON DELETE CASCADE,
  event_type text NOT NULL,
  payload jsonb NOT NULL DEFAULT '{}'::jsonb,
  created_at timestamptz NOT NULL DEFAULT now()
);

ALTER TABLE public.shared_portfolio_recipients ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.portfolio_view_sessions ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.portfolio_view_events ENABLE ROW LEVEL SECURITY;

-- Org-Mitglieder lesen Recipients/Sessions ihrer Referenzen
CREATE POLICY shared_portfolio_recipients_org_read ON public.shared_portfolio_recipients
  FOR SELECT
  USING (
    EXISTS (
      SELECT 1
      FROM public.shared_portfolios sp
      JOIN public.references r ON r.id = sp.reference_ids[1]
      JOIN public.profiles p ON p.organization_id = r.organization_id AND p.id = auth.uid()
      WHERE sp.id = shared_portfolio_recipients.shared_portfolio_id
    )
  );

CREATE POLICY portfolio_view_sessions_org_read ON public.portfolio_view_sessions
  FOR SELECT
  USING (
    EXISTS (
      SELECT 1
      FROM public.shared_portfolios sp
      JOIN public.references r ON r.id = sp.reference_ids[1]
      JOIN public.profiles p ON p.organization_id = r.organization_id AND p.id = auth.uid()
      WHERE sp.id = portfolio_view_sessions.shared_portfolio_id
    )
  );

-- Inserts für Sessions/Events nur via service role / API (kein anon insert policy)

CREATE OR REPLACE FUNCTION public.resolve_shared_portfolio_recipient(
  p_slug text,
  p_token text
)
RETURNS json
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public, extensions
AS $$
DECLARE
  v_sp_id uuid;
  v_row public.shared_portfolio_recipients%ROWTYPE;
  v_company_name text;
  v_company_logo text;
BEGIN
  SELECT id INTO v_sp_id FROM public.shared_portfolios WHERE slug = p_slug AND is_active = true LIMIT 1;
  IF v_sp_id IS NULL OR p_token IS NULL OR trim(p_token) = '' THEN
    RETURN json_build_object('found', false);
  END IF;

  SELECT * INTO v_row
  FROM public.shared_portfolio_recipients
  WHERE shared_portfolio_id = v_sp_id AND token = trim(p_token)
  LIMIT 1;

  IF NOT FOUND THEN
    RETURN json_build_object('found', false);
  END IF;

  IF v_row.company_id IS NOT NULL THEN
    SELECT c.name, c.logo_url INTO v_company_name, v_company_logo
    FROM public.companies c WHERE c.id = v_row.company_id LIMIT 1;
  END IF;

  RETURN json_build_object(
    'found', true,
    'recipient_id', v_row.id,
    'label', v_row.label,
    'company_id', v_row.company_id,
    'company_name', v_company_name,
    'company_logo_url', v_company_logo
  );
END;
$$;

GRANT EXECUTE ON FUNCTION public.resolve_shared_portfolio_recipient(text, text) TO anon;
GRANT EXECUTE ON FUNCTION public.resolve_shared_portfolio_recipient(text, text) TO authenticated;

-- Fix RLS: reference_ids ist ein Array
DROP POLICY IF EXISTS shared_portfolio_recipients_org_read ON public.shared_portfolio_recipients;
CREATE POLICY shared_portfolio_recipients_org_read ON public.shared_portfolio_recipients
  FOR SELECT
  USING (
    EXISTS (
      SELECT 1
      FROM public.shared_portfolios sp
      JOIN public.references r ON r.id = ANY(sp.reference_ids)
      JOIN public.profiles p ON p.organization_id = r.organization_id AND p.id = auth.uid()
      WHERE sp.id = shared_portfolio_recipients.shared_portfolio_id
    )
  );

DROP POLICY IF EXISTS portfolio_view_sessions_org_read ON public.portfolio_view_sessions;
CREATE POLICY portfolio_view_sessions_org_read ON public.portfolio_view_sessions
  FOR SELECT
  USING (
    EXISTS (
      SELECT 1
      FROM public.shared_portfolios sp
      JOIN public.references r ON r.id = ANY(sp.reference_ids)
      JOIN public.profiles p ON p.organization_id = r.organization_id AND p.id = auth.uid()
      WHERE sp.id = portfolio_view_sessions.shared_portfolio_id
    )
  );

CREATE POLICY portfolio_view_events_org_read ON public.portfolio_view_events
  FOR SELECT
  USING (
    EXISTS (
      SELECT 1
      FROM public.portfolio_view_sessions s
      JOIN public.shared_portfolios sp ON sp.id = s.shared_portfolio_id
      JOIN public.references r ON r.id = ANY(sp.reference_ids)
      JOIN public.profiles p ON p.organization_id = r.organization_id AND p.id = auth.uid()
      WHERE s.id = portfolio_view_events.session_id
    )
  );

-- E-Mail-Gate: gleiche Unlock-Session wie Passwort
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
  IF coalesce(p_row.gate_mode, 'none') = 'email' THEN
    IF p_unlock_token IS NOT NULL AND public._portfolio_session_valid(p_row.id, p_unlock_token) THEN
      RETURN 'open';
    END IF;
    RETURN 'locked';
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

CREATE OR REPLACE FUNCTION public.try_unlock_shared_portfolio_email(
  p_slug text,
  p_name text,
  p_email text
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

  IF coalesce(v_row.gate_mode, 'none') <> 'email' THEN
    RETURN json_build_object('success', false, 'error', 'email_gate_not_required');
  END IF;

  IF length(trim(coalesce(p_name, ''))) < 1 OR length(trim(coalesce(p_email, ''))) < 3 THEN
    RETURN json_build_object('success', false, 'error', 'invalid_input');
  END IF;

  v_token := encode(gen_random_bytes(32), 'hex');
  v_token_hash := encode(digest(v_token, 'sha256'::text), 'hex');
  v_sess_exp := now() + interval '7 days';

  INSERT INTO public.portfolio_unlock_tokens (shared_portfolio_id, token_hash, expires_at)
  VALUES (v_row.id, v_token_hash, v_sess_exp);

  RETURN json_build_object(
    'success', true,
    'token', v_token,
    'max_age_seconds', 604800,
    'visitor_name', trim(p_name),
    'visitor_email', trim(p_email)
  );
END;
$$;

GRANT EXECUTE ON FUNCTION public.try_unlock_shared_portfolio_email(text, text, text) TO anon;
GRANT EXECUTE ON FUNCTION public.try_unlock_shared_portfolio_email(text, text, text) TO authenticated;

CREATE OR REPLACE FUNCTION public.get_public_portfolio(
  p_slug text,
  p_unlock_token text DEFAULT NULL,
  p_manage_token text DEFAULT NULL
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
  v_can_deactivate boolean := false;
  v_manage_trim text;
  v_gate text;
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
    v_gate := CASE
      WHEN coalesce(v_row.gate_mode, 'none') = 'email' THEN 'email'
      WHEN v_row.password_hash IS NOT NULL THEN 'password'
      ELSE 'none'
    END;
    RETURN json_build_object('access', 'locked', 'slug', v_row.slug, 'gate_mode', v_gate);
  END IF;

  v_manage_trim := nullif(trim(coalesce(p_manage_token, '')), '');
  IF v_row.customer_manage_token_hash IS NOT NULL
     AND v_manage_trim IS NOT NULL
     AND v_row.customer_manage_token_hash = encode(digest(v_manage_trim, 'sha256'::text), 'hex') THEN
    v_can_deactivate := true;
  END IF;

  SELECT json_agg(
    json_build_object(
      'id', r.id, 'title', r.title, 'summary', r.summary, 'industry', r.industry, 'country', r.country,
      'status', r.status, 'company_name', c.name, 'company_logo_url', c.logo_url,
      'website', r.website, 'employee_count', r.employee_count, 'volume_eur', r.volume_eur,
      'contract_type', r.contract_type, 'incumbent_provider', r.incumbent_provider, 'competitors', r.competitors,
      'customer_challenge', r.customer_challenge, 'our_solution', r.our_solution, 'tags', r.tags,
      'project_status', r.project_status, 'project_start', r.project_start, 'project_end', r.project_end,
      'duration_months',
      CASE
        WHEN r.project_start IS NOT NULL AND r.project_end IS NOT NULL THEN
          GREATEST(
            0,
            (EXTRACT(YEAR FROM (r.project_end::date)) - EXTRACT(YEAR FROM (r.project_start::date)))::int * 12
            + (EXTRACT(MONTH FROM (r.project_end::date)) - EXTRACT(MONTH FROM (r.project_start::date)))::int
          )
        WHEN r.project_status = 'active' AND r.project_start IS NOT NULL THEN
          GREATEST(
            0,
            (EXTRACT(YEAR FROM CURRENT_DATE) - EXTRACT(YEAR FROM (r.project_start::date)))::int * 12
            + (EXTRACT(MONTH FROM CURRENT_DATE) - EXTRACT(MONTH FROM (r.project_start::date)))::int
          )
        ELSE NULL
      END,
      'approval_quote_approved', r.approval_quote_approved,
      'approval_reference_giver_name', r.approval_reference_giver_name,
      'approval_token',
      CASE
        WHEN v_can_deactivate AND r.approval_token IS NOT NULL THEN r.approval_token::text
        ELSE NULL
      END
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
    'can_deactivate', v_can_deactivate,
    'references', COALESCE(v_refs, '[]'::json)
  );
END;
$$;

DROP FUNCTION IF EXISTS public.set_shared_portfolio_security(text, text, boolean, timestamptz, boolean);

CREATE OR REPLACE FUNCTION public.set_shared_portfolio_security(
  p_slug text,
  p_password_plain text,
  p_password_remove boolean DEFAULT false,
  p_expires_at timestamptz DEFAULT NULL,
  p_clear_expires boolean DEFAULT false,
  p_gate_mode text DEFAULT NULL
)
RETURNS json
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public, extensions
AS $$
DECLARE
  v_row public.shared_portfolios%ROWTYPE;
  v_mode text;
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

  v_mode := nullif(trim(coalesce(p_gate_mode, '')), '');
  IF v_mode IS NOT NULL AND v_mode NOT IN ('none', 'password', 'email') THEN
    RETURN json_build_object('success', false, 'error', 'invalid_gate_mode');
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
    END,
    gate_mode = CASE
      WHEN v_mode = 'email' THEN 'email'
      WHEN v_mode = 'none' THEN 'none'
      WHEN v_mode = 'password' THEN 'password'
      WHEN p_password_remove AND v_mode IS NULL THEN coalesce(gate_mode, 'none')
      ELSE gate_mode
    END
  WHERE id = v_row.id;

  IF v_mode = 'email' THEN
    UPDATE public.shared_portfolios SET password_hash = NULL WHERE id = v_row.id;
  END IF;

  DELETE FROM public.portfolio_unlock_tokens WHERE shared_portfolio_id = v_row.id;

  RETURN json_build_object('success', true);
END;
$$;

GRANT EXECUTE ON FUNCTION public.set_shared_portfolio_security(text, text, boolean, timestamptz, boolean, text) TO authenticated;
