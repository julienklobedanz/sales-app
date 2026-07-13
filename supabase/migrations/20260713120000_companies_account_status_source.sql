-- Quelle des Account-Status: manuell gesetzt vs. CRM-/Regel-basiert.
ALTER TABLE public.companies
  ADD COLUMN IF NOT EXISTS account_status_source text;

ALTER TABLE public.companies
  DROP CONSTRAINT IF EXISTS companies_account_status_source_check;

ALTER TABLE public.companies
  ADD CONSTRAINT companies_account_status_source_check
  CHECK (
    account_status_source IS NULL
    OR account_status_source IN ('manual', 'crm')
  );

COMMENT ON COLUMN public.companies.account_status_source IS
  'manual = Nutzer-Override; crm = automatisch aus Deals/Referenzen berechnet.';
