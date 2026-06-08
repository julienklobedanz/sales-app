-- Sperr-Link-Ansicht: Freigabe-Token für „Meine Freigabe bearbeiten“ (nur mit gültigem manage-Token).

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

GRANT EXECUTE ON FUNCTION public.get_public_portfolio(text, text, text) TO anon;
GRANT EXECUTE ON FUNCTION public.get_public_portfolio(text, text, text) TO authenticated;
