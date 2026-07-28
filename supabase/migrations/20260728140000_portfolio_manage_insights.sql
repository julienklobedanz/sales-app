-- Manage-Ansicht: Insights für gültigen Sperrlink (Views + letzte Session)
-- Requires shared_portfolios; bootstraps tracking tables if 20260728130000_portfolio_tracking.sql was not applied yet.

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

CREATE INDEX IF NOT EXISTS idx_portfolio_view_sessions_portfolio_started
  ON public.portfolio_view_sessions(shared_portfolio_id, started_at DESC);

CREATE OR REPLACE FUNCTION public.get_portfolio_manage_insights(
  p_slug text,
  p_manage_token text
)
RETURNS json
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public, extensions
AS $$
DECLARE
  v_row public.shared_portfolios%ROWTYPE;
  v_manage_trim text;
  v_last public.portfolio_view_sessions%ROWTYPE;
BEGIN
  v_manage_trim := nullif(trim(coalesce(p_manage_token, '')), '');
  IF v_manage_trim IS NULL THEN
    RETURN json_build_object('found', false);
  END IF;

  SELECT * INTO v_row FROM public.shared_portfolios WHERE slug = p_slug AND is_active = true;
  IF NOT FOUND THEN
    RETURN json_build_object('found', false);
  END IF;

  IF v_row.customer_manage_token_hash IS NULL
     OR v_row.customer_manage_token_hash <> encode(digest(v_manage_trim, 'sha256'::text), 'hex') THEN
    RETURN json_build_object('found', false);
  END IF;

  SELECT * INTO v_last
  FROM public.portfolio_view_sessions
  WHERE shared_portfolio_id = v_row.id
  ORDER BY started_at DESC
  LIMIT 1;

  RETURN json_build_object(
    'found', true,
    'view_count', v_row.view_count,
    'link_expires_at', v_row.expires_at,
    'last_view', CASE
      WHEN v_last.id IS NULL THEN NULL
      ELSE json_build_object(
        'country_code', v_last.country_code,
        'active_seconds', v_last.active_seconds,
        'started_at', v_last.started_at
      )
    END
  );
END;
$$;

GRANT EXECUTE ON FUNCTION public.get_portfolio_manage_insights(text, text) TO anon;
GRANT EXECUTE ON FUNCTION public.get_portfolio_manage_insights(text, text) TO authenticated;
