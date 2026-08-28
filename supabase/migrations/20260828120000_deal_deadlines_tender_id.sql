-- Fristen gehören dem Eigentümer: Ausschreibung oder Los.
-- Eine Tabelle, zwei Eltern, CHECK genau eines, zwei partielle Unique-Indizes.
-- Kein Backfill, kein Rename, kein DROP der Tabelle.

ALTER TABLE public.deal_deadlines
  ADD COLUMN IF NOT EXISTS tender_id uuid REFERENCES public.tenders(id) ON DELETE CASCADE;

ALTER TABLE public.deal_deadlines
  ALTER COLUMN deal_id DROP NOT NULL;

ALTER TABLE public.deal_deadlines
  ADD CONSTRAINT deal_deadlines_one_owner
  CHECK (num_nonnulls(deal_id, tender_id) = 1);

DROP INDEX IF EXISTS public.deal_deadlines_rfp_source_key_idx;

CREATE UNIQUE INDEX deal_deadlines_rfp_source_key_idx
  ON public.deal_deadlines (deal_id, source_key)
  WHERE source = 'rfp' AND deal_id IS NOT NULL;

CREATE UNIQUE INDEX deal_deadlines_tender_rfp_source_key_idx
  ON public.deal_deadlines (tender_id, source_key)
  WHERE source = 'rfp' AND tender_id IS NOT NULL;

CREATE INDEX IF NOT EXISTS idx_deal_deadlines_tender_due_active
  ON public.deal_deadlines (tender_id, due_at)
  WHERE suppressed_at IS NULL;

COMMENT ON COLUMN public.deal_deadlines.tender_id IS
  'Eigentümer Ausschreibung; genau eines von deal_id und tender_id ist gesetzt.';

COMMENT ON TABLE public.deal_deadlines IS
  'Fristen aus RFP-Analyse (idempotent per source_key) und manuelle Termine; Eigentümer ist Los oder Ausschreibung.';

-- Identische Parameter, ON CONFLICT-Prädikat an den neuen Index.
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
  ON CONFLICT (deal_id, source_key) WHERE source = 'rfp' AND deal_id IS NOT NULL
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

CREATE OR REPLACE FUNCTION public.upsert_tender_rfp_deadline(
  p_tender_id uuid,
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
    tender_id,
    organization_id,
    kind,
    label,
    due_at,
    due_text,
    is_approximate,
    source,
    source_key
  ) VALUES (
    p_tender_id,
    p_organization_id,
    p_kind,
    p_label,
    p_due_at,
    p_due_text,
    COALESCE(p_is_approximate, false),
    'rfp',
    p_source_key
  )
  ON CONFLICT (tender_id, source_key) WHERE source = 'rfp' AND tender_id IS NOT NULL
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

REVOKE ALL ON FUNCTION public.upsert_tender_rfp_deadline(uuid, uuid, public.deal_deadline_kind, text, timestamptz, text, boolean, text) FROM PUBLIC;
GRANT EXECUTE ON FUNCTION public.upsert_tender_rfp_deadline(uuid, uuid, public.deal_deadline_kind, text, timestamptz, text, boolean, text) TO authenticated;
