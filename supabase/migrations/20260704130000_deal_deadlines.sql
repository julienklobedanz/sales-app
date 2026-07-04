-- Deal-Cockpit Phase 3: persistierte Deadlines pro Deal (RFP-Sync + manuelle Termine)

CREATE TYPE public.deal_deadline_kind AS ENUM (
  'submission',
  'questions',
  'presentation',
  'award_expected',
  'custom',
  'internal_review'
);

CREATE TYPE public.deal_deadline_source AS ENUM ('rfp', 'manual');

CREATE TABLE IF NOT EXISTS public.deal_deadlines (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  deal_id uuid NOT NULL REFERENCES public.deals(id) ON DELETE CASCADE,
  organization_id uuid NOT NULL REFERENCES public.organizations(id) ON DELETE CASCADE,
  kind public.deal_deadline_kind NOT NULL DEFAULT 'custom',
  label text NOT NULL,
  due_at timestamptz NULL,
  due_text text NULL,
  is_approximate boolean NOT NULL DEFAULT false,
  source public.deal_deadline_source NOT NULL,
  source_key text NOT NULL,
  suppressed_at timestamptz NULL,
  pinned boolean NOT NULL DEFAULT false,
  created_by uuid REFERENCES auth.users(id) ON DELETE SET NULL,
  created_at timestamptz NOT NULL DEFAULT now(),
  updated_at timestamptz NOT NULL DEFAULT now()
);

CREATE INDEX IF NOT EXISTS idx_deal_deadlines_deal_due_active
  ON public.deal_deadlines (deal_id, due_at)
  WHERE suppressed_at IS NULL;

CREATE UNIQUE INDEX IF NOT EXISTS deal_deadlines_rfp_source_key_idx
  ON public.deal_deadlines (deal_id, source_key)
  WHERE source = 'rfp';

CREATE INDEX IF NOT EXISTS idx_deal_deadlines_organization_id
  ON public.deal_deadlines (organization_id);

COMMENT ON TABLE public.deal_deadlines IS
  'Deal-Fristen aus RFP-Analyse (idempotent per source_key) und manuelle Termine.';

-- RFP-Upsert: ON CONFLICT-Prädikat muss exakt zum partiellen Unique-Index passen.
CREATE OR REPLACE FUNCTION public.upsert_deal_rfp_deadline(
  p_deal_id uuid,
  p_organization_id uuid,
  p_kind public.deal_deadline_kind,
  p_label text,
  p_due_at timestamptz,
  p_due_text text,
  p_is_approximate boolean,
  p_source_key text
) RETURNS void
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
BEGIN
  INSERT INTO public.deal_deadlines (
    deal_id,
    organization_id,
    kind,
    label,
    due_at,
    due_text,
    is_approximate,
    source,
    source_key
  ) VALUES (
    p_deal_id,
    p_organization_id,
    p_kind,
    p_label,
    p_due_at,
    p_due_text,
    COALESCE(p_is_approximate, false),
    'rfp',
    p_source_key
  )
  ON CONFLICT (deal_id, source_key) WHERE source = 'rfp'
  DO UPDATE SET
    kind = EXCLUDED.kind,
    label = EXCLUDED.label,
    due_at = EXCLUDED.due_at,
    due_text = EXCLUDED.due_text,
    is_approximate = EXCLUDED.is_approximate,
    updated_at = now()
  WHERE deal_deadlines.pinned = false
    AND deal_deadlines.suppressed_at IS NULL;
END;
$$;

REVOKE ALL ON FUNCTION public.upsert_deal_rfp_deadline(uuid, uuid, public.deal_deadline_kind, text, timestamptz, text, boolean, text) FROM PUBLIC;
GRANT EXECUTE ON FUNCTION public.upsert_deal_rfp_deadline(uuid, uuid, public.deal_deadline_kind, text, timestamptz, text, boolean, text) TO authenticated;

ALTER TABLE public.deal_deadlines ENABLE ROW LEVEL SECURITY;

DROP POLICY IF EXISTS "Users see own org deal deadlines" ON public.deal_deadlines;
CREATE POLICY "Users see own org deal deadlines"
  ON public.deal_deadlines FOR SELECT
  TO authenticated
  USING (organization_id = public.current_user_organization_id());

DROP POLICY IF EXISTS "Users insert own org deal deadlines" ON public.deal_deadlines;
CREATE POLICY "Users insert own org deal deadlines"
  ON public.deal_deadlines FOR INSERT
  TO authenticated
  WITH CHECK (organization_id = public.current_user_organization_id());

DROP POLICY IF EXISTS "Users update own org deal deadlines" ON public.deal_deadlines;
CREATE POLICY "Users update own org deal deadlines"
  ON public.deal_deadlines FOR UPDATE
  TO authenticated
  USING (organization_id = public.current_user_organization_id())
  WITH CHECK (organization_id = public.current_user_organization_id());

DROP POLICY IF EXISTS "Users delete own org deal deadlines" ON public.deal_deadlines;
CREATE POLICY "Users delete own org deal deadlines"
  ON public.deal_deadlines FOR DELETE
  TO authenticated
  USING (organization_id = public.current_user_organization_id());
