-- Buchungslink (Calendly/Teams) pro Nutzerprofil; öffentliche Portfolio-RPCs erweitert.

ALTER TABLE public.profiles
  ADD COLUMN IF NOT EXISTS booking_url text;

COMMENT ON COLUMN public.profiles.booking_url IS 'HTTPS-Link zur Terminbuchung (Kundenansicht), z. B. Calendly.';

-- Öffentliche Referenz: freigegebenes Zitat + Geber (Social Proof in Kundenansicht)
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
    'references', COALESCE(v_refs, '[]'::json)
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
  v_booking_url text;
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
