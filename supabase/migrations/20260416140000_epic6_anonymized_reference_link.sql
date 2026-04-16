-- EPIC 6 follow-up: Link anonymized references to original
-- Allows UI toggle between full and anonymized versions.

ALTER TABLE public.references
  ADD COLUMN IF NOT EXISTS anonymized_from_id uuid REFERENCES public.references(id) ON DELETE SET NULL;

CREATE INDEX IF NOT EXISTS idx_references_anonymized_from_id
  ON public.references(anonymized_from_id);

