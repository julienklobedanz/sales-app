-- Referenz-Detail: aggregierte Zählung aus evidence_events (inkl. Payload-Arrays)

CREATE OR REPLACE FUNCTION public.get_reference_usage_event_counts(p_reference_id uuid)
RETURNS jsonb
LANGUAGE plpgsql
STABLE
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  v_org_id uuid;
  result jsonb := '{}'::jsonb;
BEGIN
  SELECT r.organization_id INTO v_org_id
  FROM public.references r
  WHERE r.id = p_reference_id;

  IF v_org_id IS NULL OR v_org_id IS DISTINCT FROM public.current_user_organization_id() THEN
    RETURN '{}'::jsonb;
  END IF;

  SELECT coalesce(jsonb_object_agg(x.event_type, x.n), '{}'::jsonb) INTO result
  FROM (
    SELECT e.event_type, COUNT(*)::bigint AS n
    FROM public.evidence_events e
    WHERE e.organization_id = v_org_id
      AND (
        e.reference_id = p_reference_id
        OR (
          e.event_type = 'share_link_viewed'
          AND EXISTS (
            SELECT 1
            FROM jsonb_array_elements_text(coalesce(e.payload->'reference_ids', '[]'::jsonb)) x
            WHERE x = p_reference_id::text
          )
        )
        OR (
          e.event_type = 'reference_matched'
          AND EXISTS (
            SELECT 1
            FROM jsonb_array_elements_text(coalesce(e.payload->'matched_reference_ids', '[]'::jsonb)) x
            WHERE x = p_reference_id::text
          )
        )
      )
    GROUP BY e.event_type
  ) x;

  RETURN result;
END;
$$;

COMMENT ON FUNCTION public.get_reference_usage_event_counts(uuid) IS
  'Aggregiert evidence_events pro Referenz (reference_id, share_link_viewed.reference_ids, reference_matched.matched_reference_ids). Nur für die Org des aktuellen Users.';

GRANT EXECUTE ON FUNCTION public.get_reference_usage_event_counts(uuid) TO authenticated;
