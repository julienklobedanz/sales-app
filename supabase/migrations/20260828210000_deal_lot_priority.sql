-- Rang gilt nur im Verhältnis zu den anderen Losen derselben Ausschreibung.
-- NULL beim Verlassen der Menge (Zuordnen und Abhängen).

ALTER TABLE public.deals
  ADD COLUMN IF NOT EXISTS lot_priority int;

ALTER TABLE public.deals
  DROP CONSTRAINT IF EXISTS deals_lot_priority_positive;
ALTER TABLE public.deals
  ADD CONSTRAINT deals_lot_priority_positive
  CHECK (lot_priority IS NULL OR lot_priority > 0);

COMMENT ON COLUMN public.deals.lot_priority IS
  'Rang des Loses innerhalb der Ausschreibung. NULL = kein Rang gesetzt bzw. Los hat die Menge verlassen.';
