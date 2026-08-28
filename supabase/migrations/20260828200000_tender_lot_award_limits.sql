-- Zuschlagslimitierung: zwei Zahlen, nicht eine.
-- Unbekannt (NULL) ist der häufigste ehrliche Zustand — kein DEFAULT.

ALTER TABLE public.tenders
  ADD COLUMN IF NOT EXISTS max_lots_bid int,
  ADD COLUMN IF NOT EXISTS max_lots_award int,
  ADD COLUMN IF NOT EXISTS lot_priority_required boolean;

ALTER TABLE public.tenders
  DROP CONSTRAINT IF EXISTS tenders_max_lots_bid_positive;
ALTER TABLE public.tenders
  ADD CONSTRAINT tenders_max_lots_bid_positive
  CHECK (max_lots_bid IS NULL OR max_lots_bid > 0);

ALTER TABLE public.tenders
  DROP CONSTRAINT IF EXISTS tenders_max_lots_award_positive;
ALTER TABLE public.tenders
  ADD CONSTRAINT tenders_max_lots_award_positive
  CHECK (max_lots_award IS NULL OR max_lots_award > 0);

-- Keine Prüfung gegeneinander: mehr Angebote als Zuschläge ist der interessante Fall.

COMMENT ON COLUMN public.tenders.max_lots_bid IS
  'Höchstzahl der Lose, für die ein Bieter Angebote einreichen kann. NULL = unbekannt.';

COMMENT ON COLUMN public.tenders.max_lots_award IS
  'Höchstzahl der Lose, für die Aufträge an einen Bieter vergeben werden können. NULL = unbekannt.';

COMMENT ON COLUMN public.tenders.lot_priority_required IS
  'true = Rangfolge verlangt, false = nicht verlangt, NULL = steht nicht in der Unterlage. Kein DEFAULT false.';
