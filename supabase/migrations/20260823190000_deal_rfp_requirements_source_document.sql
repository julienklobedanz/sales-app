-- Anforderungen gehören zum Dokument, nicht zum Analyselauf.
-- Testdaten von heute (Verknüpfungstabelle leer) werden verworfen.

DELETE FROM public.deal_rfp_requirement_documents;
DELETE FROM public.deal_rfp_requirements;

DROP INDEX IF EXISTS public.deal_rfp_requirements_deal_normalized_text_idx;
DROP INDEX IF EXISTS public.idx_deal_rfp_requirements_deal_status;

ALTER TABLE public.deal_rfp_requirements
  DROP CONSTRAINT IF EXISTS deal_rfp_requirements_status_check;

ALTER TABLE public.deal_rfp_requirements
  DROP COLUMN IF EXISTS status,
  DROP COLUMN IF EXISTS first_seen_at,
  DROP COLUMN IF EXISTS last_seen_at;

ALTER TABLE public.deal_rfp_requirements
  ADD COLUMN source_document_id uuid NOT NULL
    REFERENCES public.deal_documents(id) ON DELETE CASCADE;

CREATE UNIQUE INDEX deal_rfp_requirements_source_document_normalized_text_idx
  ON public.deal_rfp_requirements (source_document_id, normalized_text);

CREATE INDEX idx_deal_rfp_requirements_deal_id
  ON public.deal_rfp_requirements (deal_id);

COMMENT ON TABLE public.deal_rfp_requirements IS
  'RFP-Anforderungen je Deal-Dokument; Schlüssel (source_document_id, normalized_text), id ist die Zeilen-UUID.';

COMMENT ON COLUMN public.deal_rfp_requirements.source_document_id IS
  'Unveränderliche deal_documents-Zeile, aus der die Anforderung stammt.';
