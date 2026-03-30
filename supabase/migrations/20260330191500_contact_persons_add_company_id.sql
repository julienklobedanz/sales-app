-- Epic Accounts: Kontakte einem Account zuordnen

ALTER TABLE public.contact_persons
ADD COLUMN IF NOT EXISTS company_id uuid REFERENCES public.companies(id) ON DELETE SET NULL;

CREATE INDEX IF NOT EXISTS idx_contact_persons_company_id ON public.contact_persons(company_id);

