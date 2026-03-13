-- Companies: Account Status (at_risk, warmup, expansion) mit explizitem CHECK-Constraint

-- Spalte hinzufügen, falls sie noch nicht existiert (einige Deployments haben sie evtl. schon)
ALTER TABLE public.companies
  ADD COLUMN IF NOT EXISTS account_status text;

-- Bestehenden Constraint entfernen, falls es bereits einen gibt
ALTER TABLE public.companies
  DROP CONSTRAINT IF EXISTS companies_account_status_check;

-- Neuen Constraint mit zulässigen Werten setzen
ALTER TABLE public.companies
  ADD CONSTRAINT companies_account_status_check
  CHECK (account_status IN ('at_risk', 'warmup', 'expansion') OR account_status IS NULL);

COMMENT ON COLUMN public.companies.account_status IS 'Account Status: at_risk, warmup, expansion';

