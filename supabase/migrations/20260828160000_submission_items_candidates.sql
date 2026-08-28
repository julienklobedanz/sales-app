-- Kandidaten statt Treffer: Abgabe wird markiert, Positionen hängen am Dokument.
-- Kein DELETE — die Tabelle ist leer; eine Migration darf keine Zeilen vernichten.

ALTER TABLE public.deal_deadlines
  ADD COLUMN IF NOT EXISTS is_submission_target boolean NOT NULL DEFAULT false;

COMMENT ON COLUMN public.deal_deadlines.is_submission_target IS
  'Von einer Person benannte Abgabe dieses Eigentümers; reist nicht mit beim Wandern.';

CREATE UNIQUE INDEX IF NOT EXISTS deal_deadlines_one_submission_target_deal_idx
  ON public.deal_deadlines (deal_id)
  WHERE is_submission_target AND deal_id IS NOT NULL;

CREATE UNIQUE INDEX IF NOT EXISTS deal_deadlines_one_submission_target_tender_idx
  ON public.deal_deadlines (tender_id)
  WHERE is_submission_target AND tender_id IS NOT NULL;

ALTER TABLE public.submission_items
  ALTER COLUMN deadline_id DROP NOT NULL;

ALTER TABLE public.submission_items
  DROP CONSTRAINT IF EXISTS submission_items_deadline_id_fkey;

ALTER TABLE public.submission_items
  ADD CONSTRAINT submission_items_deadline_id_fkey
  FOREIGN KEY (deadline_id) REFERENCES public.deal_deadlines(id) ON DELETE SET NULL;

ALTER TABLE public.submission_items
  ADD COLUMN IF NOT EXISTS source_document_id uuid NOT NULL
    REFERENCES public.deal_documents(id) ON DELETE CASCADE;

ALTER TABLE public.submission_items
  ADD COLUMN IF NOT EXISTS confidence text NOT NULL
    CHECK (confidence IN ('high', 'low'));

ALTER TABLE public.submission_items
  ADD COLUMN IF NOT EXISTS match_source text
    CHECK (match_source IN ('pattern', 'model'));

DROP INDEX IF EXISTS public.submission_items_extracted_source_key_idx;

CREATE UNIQUE INDEX submission_items_extracted_source_key_idx
  ON public.submission_items (source_document_id, source_key)
  WHERE source = 'extracted';

CREATE INDEX IF NOT EXISTS idx_submission_items_source_document_id
  ON public.submission_items (source_document_id);

COMMENT ON TABLE public.submission_items IS
  'Soll-Kandidaten einer Einreichung; Ursprung ist das Dokument, die Abgabe ist optional.';

COMMENT ON COLUMN public.submission_items.source_document_id IS
  'Vergabeunterlage, aus der die Position gelesen wurde.';

COMMENT ON COLUMN public.submission_items.deadline_id IS
  'Zugeordnete Abgabe; NULL, bis jemand eine Frist als Abgabe benennt.';

DROP FUNCTION IF EXISTS public.upsert_extracted_submission_item(uuid, uuid, text, text, text, integer);

CREATE OR REPLACE FUNCTION public.upsert_extracted_submission_item(
  p_organization_id uuid,
  p_source_document_id uuid,
  p_identifier text,
  p_title text,
  p_source_key text,
  p_sort_order int,
  p_confidence text,
  p_match_source text
) RETURNS void
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
BEGIN
  INSERT INTO public.submission_items (
    organization_id,
    source_document_id,
    identifier,
    title,
    state,
    source,
    source_key,
    sort_order,
    confidence,
    match_source
  ) VALUES (
    p_organization_id,
    p_source_document_id,
    NULLIF(btrim(p_identifier), ''),
    p_title,
    'open',
    'extracted',
    p_source_key,
    COALESCE(p_sort_order, 0),
    p_confidence,
    NULLIF(btrim(p_match_source), '')
  )
  ON CONFLICT (source_document_id, source_key) WHERE source = 'extracted'
  DO UPDATE SET
    title = EXCLUDED.title,
    identifier = EXCLUDED.identifier,
    sort_order = EXCLUDED.sort_order,
    confidence = EXCLUDED.confidence,
    match_source = EXCLUDED.match_source,
    updated_at = now();
END;
$$;

REVOKE ALL ON FUNCTION public.upsert_extracted_submission_item(uuid, uuid, text, text, text, int, text, text) FROM PUBLIC;
GRANT EXECUTE ON FUNCTION public.upsert_extracted_submission_item(uuid, uuid, text, text, text, int, text, text) TO authenticated;
GRANT EXECUTE ON FUNCTION public.upsert_extracted_submission_item(uuid, uuid, text, text, text, int, text, text) TO service_role;
