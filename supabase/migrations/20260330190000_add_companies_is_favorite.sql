-- EPIC Accounts: Favoriten-Flag für Accounts

ALTER TABLE public.companies
ADD COLUMN IF NOT EXISTS is_favorite boolean DEFAULT false;

CREATE INDEX IF NOT EXISTS idx_companies_is_favorite ON public.companies(is_favorite);

