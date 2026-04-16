-- Fix für Epic 6 / Share-Links:
-- In einigen DB-Setups ist der RPC `public.get_public_portfolio(text)` nicht vorhanden,
-- weil die ursprüngliche Implementation beim Join auf die Tabelle `references`
-- aufgrund des reservierten Wortes "references" fehlschlagen kann.
-- Wir definieren die RPCs hier neu und quote'n `public."references"`.

CREATE OR REPLACE FUNCTION public.get_public_portfolio(p_slug text)
RETURNS json
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  v_row shared_portfolios%ROWTYPE;
  v_refs json;
BEGIN
  SELECT * INTO v_row FROM shared_portfolios WHERE slug = p_slug AND is_active = true;
  IF NOT FOUND THEN
    RETURN json_build_object('found', false);
  END IF;

  SELECT json_agg(
    json_build_object(
      'id', r.id,
      'title', r.title,
      'summary', r.summary,
      'industry', r.industry,
      'country', r.country,
      'status', r.status,
      'company_name', c.name,
      'company_logo_url', c.logo_url,
      'website', r.website,
      'employee_count', r.employee_count,
      'volume_eur', r.volume_eur,
      'contract_type', r.contract_type,
      'incumbent_provider', r.incumbent_provider,
      'competitors', r.competitors,
      'customer_challenge', r.customer_challenge,
      'our_solution', r.our_solution,
      'tags', r.tags,
      'project_status', r.project_status,
      'project_start', r.project_start,
      'project_end', r.project_end,
      'duration_months', NULL
    )
  ) INTO v_refs
  FROM public."references" r
  LEFT JOIN companies c ON c.id = r.company_id
  WHERE r.id = ANY(v_row.reference_ids) AND r.deleted_at IS NULL;

  RETURN json_build_object(
    'found', true,
    'slug', v_row.slug,
    'reference_ids', v_row.reference_ids,
    'view_count', v_row.view_count,
    'references', COALESCE(v_refs, '[]'::json)
  );
END;
$$;

-- Aufrufzähler erhöhen (anon ausführbar)
CREATE OR REPLACE FUNCTION public.increment_portfolio_views(p_slug text)
RETURNS void
LANGUAGE sql
SECURITY DEFINER
SET search_path = public
AS $$
  UPDATE shared_portfolios
  SET view_count = view_count + 1
  WHERE slug = p_slug AND is_active = true;
$$;

-- Kunden-Killswitch: Link sofort sperren (anon ausführbar)
CREATE OR REPLACE FUNCTION public.deactivate_portfolio(p_slug text)
RETURNS boolean
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
BEGIN
  UPDATE shared_portfolios SET is_active = false WHERE slug = p_slug;
  RETURN FOUND;
END;
$$;

