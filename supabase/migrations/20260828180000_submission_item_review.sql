-- Review neben dem Zustand. Herkunft überlebt das Löschen der Quelle.
-- Bei #137 trug die Position nur Extraktionsergebnis. Seit Teilschritt 2 trägt sie
-- not_applicable_at/by, review, reviewed_by und einen Beleg — Arbeit, die ein Mensch
-- geleistet hat. Deshalb ON DELETE SET NULL statt CASCADE.

ALTER TABLE public.submission_items
  ADD COLUMN IF NOT EXISTS review text
    CHECK (review IN ('confirmed', 'dismissed'));

ALTER TABLE public.submission_items
  ADD COLUMN IF NOT EXISTS reviewed_at timestamptz;

ALTER TABLE public.submission_items
  ADD COLUMN IF NOT EXISTS reviewed_by uuid
    REFERENCES auth.users(id) ON DELETE SET NULL;

ALTER TABLE public.submission_items
  ALTER COLUMN source_document_id DROP NOT NULL;

ALTER TABLE public.submission_items
  DROP CONSTRAINT IF EXISTS submission_items_source_document_id_fkey;

ALTER TABLE public.submission_items
  ADD CONSTRAINT submission_items_source_document_id_fkey
  FOREIGN KEY (source_document_id) REFERENCES public.deal_documents(id) ON DELETE SET NULL;

COMMENT ON COLUMN public.submission_items.review IS
  'Prüfung einer unsicheren Fundstelle; kein Zustand. dismissed überlebt die Re-Analyse.';

COMMENT ON COLUMN public.submission_items.source_document_id IS
  'Vergabeunterlage, aus der die Position gelesen wurde; NULL nach Löschen der Quelle.';

-- source = extracted sagt, wie die Zeile entstand — unveränderlich.
-- source_document_id sagt, wo sie herkam — kann durch Löschen der Quelle verschwinden.
-- Eine Tabellenbedingung kann „hatte ein Dokument" nicht ausdrücken; deshalb
-- verlangt upsert_extracted_submission_item das Dokument beim Insert.

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
  IF p_source_document_id IS NULL THEN
    RAISE EXCEPTION 'extracted submission items require a source document';
  END IF;

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

COMMENT ON FUNCTION public.upsert_extracted_submission_item(uuid, uuid, text, text, text, int, text, text) IS
  'source = extracted sagt, wie die Zeile entstand — unveränderlich. source_document_id sagt, wo sie herkam — kann durch Löschen der Quelle verschwinden. Eine Tabellenbedingung kann „hatte ein Dokument" nicht ausdrücken; deshalb steht die Anforderung hier und nicht im Schema. Insert verlangt p_source_document_id. DO UPDATE rührt review, reviewed_*, deadline_id, state, document_id, not_applicable_* nicht an.';

REVOKE ALL ON FUNCTION public.upsert_extracted_submission_item(uuid, uuid, text, text, text, int, text, text) FROM PUBLIC;
GRANT EXECUTE ON FUNCTION public.upsert_extracted_submission_item(uuid, uuid, text, text, text, int, text, text) TO authenticated;
GRANT EXECUTE ON FUNCTION public.upsert_extracted_submission_item(uuid, uuid, text, text, text, int, text, text) TO service_role;
