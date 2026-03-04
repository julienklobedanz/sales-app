-- Referenzen: Incumbent/Wettbewerber + Storytelling-Felder

ALTER TABLE public.references
  ADD COLUMN IF NOT EXISTS incumbent_provider text;

ALTER TABLE public.references
  ADD COLUMN IF NOT EXISTS competitors text;

ALTER TABLE public.references
  ADD COLUMN IF NOT EXISTS customer_challenge text;

ALTER TABLE public.references
  ADD COLUMN IF NOT EXISTS our_solution text;

COMMENT ON COLUMN public.references.incumbent_provider IS 'Aktueller Dienstleister (Incumbent)';
COMMENT ON COLUMN public.references.competitors IS 'Weitere beteiligte Wettbewerber';
COMMENT ON COLUMN public.references.customer_challenge IS 'Herausforderung des Kunden (Storytelling)';
COMMENT ON COLUMN public.references.our_solution IS 'Unsere Lösung (Storytelling)';
