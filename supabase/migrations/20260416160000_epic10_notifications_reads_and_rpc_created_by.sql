-- Epic 10: In-App-Benachrichtigungen (gelesen) + RPC: created_by für Zielperson (AM)

-- ---------------------------------------------------------------------------
-- 1) Gelesen-Markierung pro Nutzer und Event
-- ---------------------------------------------------------------------------
CREATE TABLE IF NOT EXISTS public.notification_reads (
  user_id uuid NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  evidence_event_id uuid NOT NULL REFERENCES public.evidence_events(id) ON DELETE CASCADE,
  read_at timestamptz NOT NULL DEFAULT now(),
  PRIMARY KEY (user_id, evidence_event_id)
);

CREATE INDEX IF NOT EXISTS idx_notification_reads_user
  ON public.notification_reads(user_id, read_at DESC);

ALTER TABLE public.notification_reads ENABLE ROW LEVEL SECURITY;

DROP POLICY IF EXISTS "Users read own notification_reads" ON public.notification_reads;
CREATE POLICY "Users read own notification_reads"
  ON public.notification_reads FOR SELECT TO authenticated
  USING (user_id = auth.uid());

DROP POLICY IF EXISTS "Users insert own notification_reads" ON public.notification_reads;
CREATE POLICY "Users insert own notification_reads"
  ON public.notification_reads FOR INSERT TO authenticated
  WITH CHECK (user_id = auth.uid());

DROP POLICY IF EXISTS "Users delete own notification_reads" ON public.notification_reads;
CREATE POLICY "Users delete own notification_reads"
  ON public.notification_reads FOR DELETE TO authenticated
  USING (user_id = auth.uid());

-- ---------------------------------------------------------------------------
-- 2) RPC: created_by = Anfragende(r) (profiles.id = auth.users.id)
-- ---------------------------------------------------------------------------
CREATE OR REPLACE FUNCTION public.complete_client_approval(
  p_token text,
  p_decision text,
  p_comment text
)
RETURNS json
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  v_ref public.references%ROWTYPE;
  v_org_id uuid;
  v_new_status text;
BEGIN
  IF p_decision IS NULL OR p_decision NOT IN ('approved', 'rejected') THEN
    RETURN json_build_object('success', false, 'error', 'invalid_decision');
  END IF;

  SELECT * INTO v_ref
  FROM public.references
  WHERE approval_token = p_token;
  IF NOT FOUND THEN
    RETURN json_build_object('success', false, 'error', 'invalid_token');
  END IF;

  IF v_ref.approval_token IS NULL THEN
    RETURN json_build_object('success', false, 'error', 'invalid_token');
  END IF;

  IF NOT (
    v_ref.customer_approval_status = 'pending'
    OR (
      v_ref.customer_approval_status IS NULL
      AND v_ref.status::text = 'pending'
    )
  ) THEN
    RETURN json_build_object('success', false, 'error', 'already_decided');
  END IF;

  SELECT organization_id INTO v_org_id
  FROM public.companies
  WHERE id = v_ref.company_id;

  IF v_org_id IS NULL THEN
    RETURN json_build_object('success', false, 'error', 'org_missing');
  END IF;

  IF p_decision = 'approved' THEN
    v_new_status := 'external';
  ELSE
    v_new_status := coalesce(nullif(v_ref.approval_reference_status_snapshot, ''), 'draft');
  END IF;

  UPDATE public.references
  SET
    customer_approval_status = p_decision,
    approval_comment = NULLIF(trim(p_comment), ''),
    approval_responded_at = now(),
    approval_token = NULL,
    status = v_new_status
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

-- ---------------------------------------------------------------------------
-- 3) Bestehende Events: created_by aus Referenz nachziehen (wo möglich)
-- ---------------------------------------------------------------------------
UPDATE public.evidence_events e
SET created_by = r.approval_requested_by
FROM public.references r
WHERE e.reference_id = r.id
  AND e.event_type = 'reference_approval_responded'
  AND e.created_by IS NULL
  AND r.approval_requested_by IS NOT NULL;
