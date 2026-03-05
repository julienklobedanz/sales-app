-- Soft-Delete für Referenzen
-- Fügt eine Spalte deleted_at hinzu, um Referenzen in den Papierkorb zu verschieben,
-- statt sie hart zu löschen.

ALTER TABLE public.references
  ADD COLUMN IF NOT EXISTS deleted_at timestamptz;

CREATE INDEX IF NOT EXISTS idx_references_deleted_at
  ON public.references(deleted_at);

