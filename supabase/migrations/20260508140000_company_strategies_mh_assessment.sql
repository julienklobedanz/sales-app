-- Account Mission Control: MH Assessment + MEDDPICC Erweiterungen (persistiert in company_strategies)

ALTER TABLE public.company_strategies
  ADD COLUMN IF NOT EXISTS mh_assessment jsonb NOT NULL DEFAULT '{}'::jsonb;

COMMENT ON COLUMN public.company_strategies.mh_assessment IS
  'MH Assessment pro Strategiefeld (UI): z. B. {"company_goals":{"risk":"high","relationship":"weak"}}';

-- Optionales MEDDPICC Feld (falls später genutzt)
ALTER TABLE public.company_strategies
  ADD COLUMN IF NOT EXISTS metrics_pain text;

COMMENT ON COLUMN public.company_strategies.metrics_pain IS
  'MEDDPICC: Metrics & Pain (messbare Ziele + Schmerz) – Mission Control.';

