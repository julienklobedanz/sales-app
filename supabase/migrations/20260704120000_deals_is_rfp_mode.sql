-- Deal-Cockpit: explizites RFP-Gate (billige Sichtbarkeits-Wahrheit für konditionalen Block)

ALTER TABLE public.deals
  ADD COLUMN IF NOT EXISTS is_rfp_mode boolean NOT NULL DEFAULT false;

COMMENT ON COLUMN public.deals.is_rfp_mode IS
  'True wenn Deal als Ausschreibung bearbeitet wird (Cockpit RFP-Block). Unabhängig vom Pipeline-Status.';

-- Bestands-Deals mit abgeschlossener Desk-Analyse
UPDATE public.deals d
SET is_rfp_mode = true
WHERE EXISTS (
  SELECT 1
  FROM public.deal_desk_projects p
  WHERE p.deal_id = d.id
    AND p.analysis_status = 'completed'
);

-- Pipeline-Status RFP impliziert RFP-Modus
UPDATE public.deals
SET is_rfp_mode = true
WHERE status = 'rfp';
