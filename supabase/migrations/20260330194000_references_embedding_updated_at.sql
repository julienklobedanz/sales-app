-- EPIC 3 / KAN-23 vorbereiten: Zeitstempel fürs letzte Embedding

ALTER TABLE public.references
  ADD COLUMN IF NOT EXISTS embedding_updated_at timestamptz,
  ADD COLUMN IF NOT EXISTS embedding_error text;

CREATE INDEX IF NOT EXISTS idx_references_embedding_updated_at
  ON public.references(embedding_updated_at);

