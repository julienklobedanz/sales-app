-- Epic 10: Kunden-Freigabe per Token (E-Mail-Link ohne Login)
-- Spalten auf references, RLS für Anon-Updates ersetzt durch RPC (SECURITY DEFINER),
-- Org-Branding für Anon-Lesezugriff, evidence_events-Typ.

-- ---------------------------------------------------------------------------
-- 1) references: Kunden-Freigabe-Metadaten (getrennt von references.status / Freigabestufe)
-- ---------------------------------------------------------------------------
ALTER TABLE public.references
  ADD COLUMN IF NOT EXISTS customer_approval_status text
    CHECK (
      customer_approval_status IS NULL
      OR customer_approval_status IN ('pending', 'approved', 'rejected')
    );

ALTER TABLE public.references
  ADD COLUMN IF NOT EXISTS approval_message text,
  ADD COLUMN IF NOT EXISTS approval_contact_id uuid REFERENCES public.contact_persons(id) ON DELETE SET NULL,
  ADD COLUMN IF NOT EXISTS approval_comment text,
  ADD COLUMN IF NOT EXISTS approval_requested_at timestamptz,
  ADD COLUMN IF NOT EXISTS approval_requested_by uuid REFERENCES public.profiles(id) ON DELETE SET NULL,
  ADD COLUMN IF NOT EXISTS approval_responded_at timestamptz,
  ADD COLUMN IF NOT EXISTS approval_requester_name text,
  ADD COLUMN IF NOT EXISTS approval_reference_status_snapshot text;

COMMENT ON COLUMN public.references.customer_approval_status IS 'Kundenentscheidung zum Freigabe-Link (pending/approved/rejected); unabhängig von der Freigabestufe (status).';
COMMENT ON COLUMN public.references.approval_reference_status_snapshot IS 'Snapshot von references.status vor dem Versand der Freigabe-Anfrage (für Ablehnung: Zurücksetzen).';

-- reference_status-Enum: gängige Freigabestufen (idempotent, falls noch fehlt)
DO $$
BEGIN
  IF NOT EXISTS (SELECT 1 FROM pg_enum e JOIN pg_type t ON e.enumtypid = t.oid WHERE t.typname = 'reference_status' AND e.enumlabel = 'external') THEN
    ALTER TYPE public.reference_status ADD VALUE 'external';
  END IF;
EXCEPTION WHEN duplicate_object THEN NULL;
END $$;
DO $$
BEGIN
  IF NOT EXISTS (SELECT 1 FROM pg_enum e JOIN pg_type t ON e.enumtypid = t.oid WHERE t.typname = 'reference_status' AND e.enumlabel = 'internal_only') THEN
    ALTER TYPE public.reference_status ADD VALUE 'internal_only';
  END IF;
EXCEPTION WHEN duplicate_object THEN NULL;
END $$;
DO $$
BEGIN
  IF NOT EXISTS (SELECT 1 FROM pg_enum e JOIN pg_type t ON e.enumtypid = t.oid WHERE t.typname = 'reference_status' AND e.enumlabel = 'anonymized') THEN
    ALTER TYPE public.reference_status ADD VALUE 'anonymized';
  END IF;
EXCEPTION WHEN duplicate_object THEN NULL;
END $$;
DO $$
BEGIN
  IF NOT EXISTS (SELECT 1 FROM pg_enum e JOIN pg_type t ON e.enumtypid = t.oid WHERE t.typname = 'reference_status' AND e.enumlabel = 'restricted') THEN
    ALTER TYPE public.reference_status ADD VALUE 'restricted';
  END IF;
EXCEPTION WHEN duplicate_object THEN NULL;
END $$;

-- Legacy: status=pending + Token → customer_approval_status
UPDATE public.references
SET customer_approval_status = 'pending'
WHERE status::text = 'pending'
  AND approval_token IS NOT NULL
  AND customer_approval_status IS NULL;

UPDATE public.references
SET approval_reference_status_snapshot = 'draft'
WHERE status::text = 'pending'
  AND approval_token IS NOT NULL
  AND approval_reference_status_snapshot IS NULL;

CREATE INDEX IF NOT EXISTS idx_references_approval_token ON public.references(approval_token)
  WHERE approval_token IS NOT NULL;

-- ---------------------------------------------------------------------------
-- 2) evidence_events: Event nach Kundenentscheidung
-- ---------------------------------------------------------------------------
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
      'reference_approval_responded'
    )
  );

-- ---------------------------------------------------------------------------
-- 3) RLS: Anon darf Referenzen nicht mehr direkt updaten (Token-Completion nur per RPC)
-- ---------------------------------------------------------------------------
DROP POLICY IF EXISTS "Anon can update references with approval token" ON public.references;

-- ---------------------------------------------------------------------------
-- 4) RLS: Organisation für Freigabe-Seite (Branding) lesbar, wenn Token-Referenz
-- ---------------------------------------------------------------------------
DROP POLICY IF EXISTS "Anon can read org for approval reference" ON public.organizations;
CREATE POLICY "Anon can read org for approval reference"
  ON public.organizations FOR SELECT
  TO anon
  USING (
    EXISTS (
      SELECT 1
      FROM public.companies c
      JOIN public.references r ON r.company_id = c.id
      WHERE c.organization_id = organizations.id
        AND r.approval_token IS NOT NULL
    )
  );

-- ---------------------------------------------------------------------------
-- 5) RPC: Kundenentscheidung (validiert Token, aktualisiert Referenz + approvals, Event)
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
    NULL
  );

  RETURN json_build_object('success', true);
END;
$$;

REVOKE ALL ON FUNCTION public.complete_client_approval(text, text, text) FROM PUBLIC;
GRANT EXECUTE ON FUNCTION public.complete_client_approval(text, text, text) TO anon, authenticated;
