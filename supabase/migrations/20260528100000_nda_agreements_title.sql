-- Anzeigetitel pro NDA-Vereinbarung (eigener Dokumentname)

ALTER TABLE public.nda_agreements
  ADD COLUMN IF NOT EXISTS title text;

COMMENT ON COLUMN public.nda_agreements.title IS 'Benutzerdefinierter Titel / Dokumentname in der NDA-Liste.';
