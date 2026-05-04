-- Account-Status: neue Lifecycle-Werte; Legacy warmup/expansion migrieren.
-- WICHTIG: Zuerst CHECK entfernen – sonst schlagen UPDATEs auf 'target' / 'active_customer'
-- mit 23514 fehl, solange die alte Regel nur warmup|expansion|at_risk erlaubt.

ALTER TABLE public.companies
  DROP CONSTRAINT IF EXISTS companies_account_status_check;

UPDATE public.companies
SET account_status = 'target'
WHERE account_status = 'warmup';

UPDATE public.companies
SET account_status = 'active_customer'
WHERE account_status = 'expansion';

ALTER TABLE public.companies
  ADD CONSTRAINT companies_account_status_check
  CHECK (
    account_status IN ('target', 'active_customer', 'former_customer', 'at_risk')
    OR account_status IS NULL
  );

COMMENT ON COLUMN public.companies.account_status IS 'target | active_customer | former_customer | at_risk';
