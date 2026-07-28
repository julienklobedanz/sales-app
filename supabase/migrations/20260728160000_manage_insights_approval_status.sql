-- Manage-Insights: Freigabe-Status (seit / anonym) + optionale Referenz-ID

DROP FUNCTION IF EXISTS public.get_portfolio_manage_insights(text, text);

CREATE OR REPLACE FUNCTION public.get_portfolio_manage_insights(
  p_slug text,
  p_manage_token text,
  p_reference_id uuid DEFAULT NULL
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
  v_ref_id uuid;
  v_responded_at timestamptz;
  v_anon_mention boolean;
  v_named_mention boolean;
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

  v_ref_id := coalesce(p_reference_id, v_row.reference_ids[1]);
  IF v_ref_id IS NOT NULL AND NOT (v_ref_id = ANY (v_row.reference_ids)) THEN
    RETURN json_build_object('found', false);
  END IF;

  SELECT * INTO v_last
  FROM public.portfolio_view_sessions
  WHERE shared_portfolio_id = v_row.id
  ORDER BY started_at DESC
  LIMIT 1;

  IF v_ref_id IS NOT NULL THEN
    SELECT r.approval_responded_at,
           coalesce(r.approval_scope_anonymous_mention, false),
           coalesce(r.approval_scope_named_mention, false)
      INTO v_responded_at, v_anon_mention, v_named_mention
    FROM public.references r
    WHERE r.id = v_ref_id AND r.deleted_at IS NULL;
  END IF;

  RETURN json_build_object(
    'found', true,
    'view_count', v_row.view_count,
    'link_expires_at', v_row.expires_at,
    'approval_responded_at', v_responded_at,
    'is_anonymous', (v_anon_mention AND NOT v_named_mention),
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

GRANT EXECUTE ON FUNCTION public.get_portfolio_manage_insights(text, text, uuid) TO anon;
GRANT EXECUTE ON FUNCTION public.get_portfolio_manage_insights(text, text, uuid) TO authenticated;
