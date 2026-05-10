-- Kunden-Sperrlink: separates Geheimnis (manage-Token), öffentlicher Slug bleibt weitergabefähig.

ALTER TABLE public.shared_portfolios
  ADD COLUMN IF NOT EXISTS customer_manage_token_hash text;

COMMENT ON COLUMN public.shared_portfolios.customer_manage_token_hash IS
  'SHA-256 (hex) eines Geheimnisses; Killswitch nur mit ?manage=… oder authentifiziert (Org).';

-- Ersetzt 2-Arg-Variante durch eine Signatur mit Defaults (PostgREST: ein RPC pro Name empfohlen).
DROP FUNCTION IF EXISTS public.get_public_portfolio(text, text);

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
      'approval_reference_giver_name', r.approval_reference_giver_name
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

GRANT EXECUTE ON FUNCTION public.get_public_portfolio(text, text, text) TO anon;
GRANT EXECUTE ON FUNCTION public.get_public_portfolio(text, text, text) TO authenticated;

-- Öffentliches Deaktivieren: Manage-Token nötig; intern (auth + Org) ohne Token.
DROP FUNCTION IF EXISTS public.deactivate_portfolio(text);

CREATE OR REPLACE FUNCTION public.deactivate_portfolio(
  p_slug text,
  p_manage_token text DEFAULT NULL
)
RETURNS boolean
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public, extensions
AS $$
DECLARE
  v_row public.shared_portfolios%ROWTYPE;
  v_ok boolean := false;
  v_manage_trim text;
BEGIN
  SELECT * INTO v_row FROM public.shared_portfolios WHERE slug = p_slug;
  IF NOT FOUND THEN
    RETURN false;
  END IF;

  IF auth.uid() IS NOT NULL AND EXISTS (
    SELECT 1
    FROM public.references r
    JOIN public.profiles p ON p.id = auth.uid() AND p.organization_id = r.organization_id
    WHERE r.id = ANY(v_row.reference_ids) AND r.deleted_at IS NULL
  ) THEN
    v_ok := true;
  ELSE
    v_manage_trim := nullif(trim(coalesce(p_manage_token, '')), '');
    IF v_row.customer_manage_token_hash IS NOT NULL
       AND v_manage_trim IS NOT NULL
       AND v_row.customer_manage_token_hash = encode(digest(v_manage_trim, 'sha256'::text), 'hex') THEN
      v_ok := true;
    END IF;
  END IF;

  IF NOT v_ok THEN
    RETURN false;
  END IF;

  UPDATE public.shared_portfolios SET is_active = false WHERE id = v_row.id;
  RETURN true;
END;
$$;

GRANT EXECUTE ON FUNCTION public.deactivate_portfolio(text, text) TO anon;
GRANT EXECUTE ON FUNCTION public.deactivate_portfolio(text, text) TO authenticated;

-- Neues Manage-Geheimnis (nur Dashboard); invalidiert alten Sperr-Link.
CREATE OR REPLACE FUNCTION public.reset_shared_portfolio_manage_token(p_reference_id uuid)
RETURNS json
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public, extensions
AS $$
DECLARE
  v_row public.shared_portfolios%ROWTYPE;
  v_token text;
  v_hash text;
BEGIN
  IF auth.uid() IS NULL THEN
    RETURN json_build_object('success', false, 'error', 'unauthorized');
  END IF;

  SELECT * INTO v_row
  FROM public.shared_portfolios
  WHERE is_active = true
    AND p_reference_id = ANY(reference_ids)
  ORDER BY created_at DESC
  LIMIT 1;

  IF NOT FOUND THEN
    RETURN json_build_object('success', false, 'error', 'not_found');
  END IF;

  IF NOT EXISTS (
    SELECT 1
    FROM public.references r
    JOIN public.profiles p ON p.id = auth.uid() AND p.organization_id = r.organization_id
    WHERE r.id = p_reference_id AND r.deleted_at IS NULL
  ) THEN
    RETURN json_build_object('success', false, 'error', 'forbidden');
  END IF;

  v_token := encode(gen_random_bytes(32), 'hex');
  v_hash := encode(digest(v_token, 'sha256'::text), 'hex');

  UPDATE public.shared_portfolios
  SET customer_manage_token_hash = v_hash
  WHERE id = v_row.id;

  RETURN json_build_object('success', true, 'token', v_token);
END;
$$;

GRANT EXECUTE ON FUNCTION public.reset_shared_portfolio_manage_token(uuid) TO authenticated;
