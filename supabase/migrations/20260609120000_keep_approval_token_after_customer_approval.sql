-- Kunden-Freigabe: Magic Link bleibt nach Freigabe aktiv (Anmerkungen ändern).
-- Ablehnung invalidiert den Token weiterhin.

ALTER TABLE public.evidence_events
  DROP CONSTRAINT IF EXISTS evidence_events_event_type_check;

ALTER TABLE public.evidence_events
  ADD CONSTRAINT evidence_events_event_type_check
  CHECK (
    event_type IN (
      'deal_won',
      'deal_lost',
      'deal_withdrawn',
      'reference_helped',
      'share_link_viewed',
      'reference_approval_responded',
      'reference_approval_updated',
      'reference_viewed',
      'reference_matched',
      'reference_exported',
      'reference_shared',
      'ki_entwurf_generated',
      'customer_approval_requested',
      'internal_approval_decided',
      'internal_approval_requested'
    )
  );

CREATE OR REPLACE FUNCTION public.complete_client_approval(
  p_token text,
  p_decision text,
  p_comment text,
  p_approved_quote text DEFAULT NULL,
  p_consent_file_url text DEFAULT NULL,
  p_reference_giver_name text DEFAULT NULL,
  p_reference_giver_title text DEFAULT NULL
)
RETURNS json
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  v_ref public.references%ROWTYPE;
  v_org_id uuid;
  v_new_status public.reference_status;
  v_is_update boolean;
BEGIN
  IF p_decision IS NULL OR p_decision NOT IN ('approved', 'rejected') THEN
    RETURN json_build_object('success', false, 'error', 'invalid_decision');
  END IF;

  SELECT * INTO v_ref
  FROM public.references
  WHERE approval_token::text = trim(p_token);
  IF NOT FOUND THEN
    RETURN json_build_object('success', false, 'error', 'invalid_token');
  END IF;

  IF v_ref.approval_token IS NULL THEN
    RETURN json_build_object('success', false, 'error', 'invalid_token');
  END IF;

  v_is_update := v_ref.customer_approval_status = 'approved' AND p_decision = 'approved';

  IF NOT v_is_update AND NOT (
    v_ref.customer_approval_status = 'pending'
    OR (
      v_ref.customer_approval_status IS NULL
      AND v_ref.status::text = 'pending'
    )
  ) THEN
    RETURN json_build_object('success', false, 'error', 'already_decided');
  END IF;

  v_org_id := v_ref.organization_id;
  IF v_org_id IS NULL THEN
    SELECT organization_id INTO v_org_id
    FROM public.companies
    WHERE id = v_ref.company_id;
  END IF;

  IF v_org_id IS NULL THEN
    RETURN json_build_object('success', false, 'error', 'org_missing');
  END IF;

  IF v_is_update THEN
    UPDATE public.references
    SET
      approval_comment = NULLIF(trim(p_comment), ''),
      approval_responded_at = now(),
      approval_quote_approved = NULLIF(trim(p_approved_quote), ''),
      approval_consent_file_url = NULLIF(trim(p_consent_file_url), ''),
      approval_reference_giver_name = NULLIF(trim(p_reference_giver_name), ''),
      approval_reference_giver_title = NULLIF(trim(p_reference_giver_title), '')
    WHERE id = v_ref.id;

    INSERT INTO public.evidence_events (
      organization_id,
      reference_id,
      event_type,
      payload,
      created_by
    )
    VALUES (
      v_org_id,
      v_ref.id,
      'reference_approval_updated',
      jsonb_build_object(
        'decision', p_decision,
        'comment', NULLIF(trim(p_comment), ''),
        'is_update', true
      ),
      v_ref.approval_requested_by
    );

    RETURN json_build_object('success', true);
  END IF;

  IF p_decision = 'approved' THEN
    v_new_status := 'external';
  ELSE
    v_new_status := coalesce(
      nullif(v_ref.approval_reference_status_snapshot, '')::public.reference_status,
      'draft'::public.reference_status
    );
  END IF;

  UPDATE public.references
  SET
    customer_approval_status = p_decision,
    approval_comment = NULLIF(trim(p_comment), ''),
    approval_responded_at = now(),
    approval_token = CASE WHEN p_decision = 'approved' THEN v_ref.approval_token ELSE NULL END,
    status = v_new_status,
    approval_quote_approved = NULLIF(trim(p_approved_quote), ''),
    approval_consent_file_url = NULLIF(trim(p_consent_file_url), ''),
    approval_reference_giver_name = NULLIF(trim(p_reference_giver_name), ''),
    approval_reference_giver_title = NULLIF(trim(p_reference_giver_title), '')
  WHERE id = v_ref.id;

  UPDATE public.approvals
  SET
    status = CASE
      WHEN p_decision = 'approved' THEN 'approved'::approval_status
      ELSE 'rejected'::approval_status
    END
  WHERE reference_id = v_ref.id
    AND status = 'pending';

  INSERT INTO public.evidence_events (
    organization_id,
    reference_id,
    event_type,
    payload,
    created_by
  )
  VALUES (
    v_org_id,
    v_ref.id,
    'reference_approval_responded',
    jsonb_build_object(
      'decision', p_decision,
      'comment', NULLIF(trim(p_comment), '')
    ),
    v_ref.approval_requested_by
  );

  RETURN json_build_object('success', true);
END;
$$;

REVOKE ALL ON FUNCTION public.complete_client_approval(text, text, text, text, text, text, text) FROM PUBLIC;
GRANT EXECUTE ON FUNCTION public.complete_client_approval(text, text, text, text, text, text, text) TO anon, authenticated;
