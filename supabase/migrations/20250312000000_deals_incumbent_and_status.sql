-- Deals: incumbent_provider (Aktueller Anbieter für Marktchancen) + erweiterte Status-Werte für Referenz-Bedarfe

ALTER TABLE public.deals
  ADD COLUMN IF NOT EXISTS incumbent_provider text;

COMMENT ON COLUMN public.deals.incumbent_provider IS 'Aktueller Anbieter / Incumbent (Ziel für Angriff bei Marktlisten).';

-- Status-Constraint erweitern: Referenz-Bedarfe (reference_sought, in_approval, reference_found)
ALTER TABLE public.deals DROP CONSTRAINT IF EXISTS deals_status_check;

ALTER TABLE public.deals ADD CONSTRAINT deals_status_check CHECK (
  status IN (
    'in_negotiation',
    'rfp_phase',
    'won',
    'lost',
    'on_hold',
    'reference_sought',
    'in_approval',
    'reference_found'
  )
);
