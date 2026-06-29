-- Rollback: Proof-Linse (deal_requirements) + Account-Gedächtnis (outcome_capture)

ALTER TABLE public.deals
  DROP COLUMN IF EXISTS outcome_reason,
  DROP COLUMN IF EXISTS decisive_reference_id;

DROP TABLE IF EXISTS public.deal_requirements;
