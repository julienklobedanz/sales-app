-- Account-Gedächtnis T1: Outcome-Capture beim Deal-Abschluss

ALTER TABLE public.deals
  ADD COLUMN IF NOT EXISTS outcome_reason text,
  ADD COLUMN IF NOT EXISTS decisive_reference_id uuid
    REFERENCES public.references(id) ON DELETE SET NULL;

CREATE INDEX IF NOT EXISTS idx_deals_decisive_reference_id
  ON public.deals(decisive_reference_id)
  WHERE decisive_reference_id IS NOT NULL;

COMMENT ON COLUMN public.deals.outcome_reason IS
  'Freitext beim Abschluss (gewonnen/verloren), optional.';
COMMENT ON COLUMN public.deals.decisive_reference_id IS
  'Verknüpfte Referenz, die zum Abschluss entscheidend war (muss in deal_references liegen).';
