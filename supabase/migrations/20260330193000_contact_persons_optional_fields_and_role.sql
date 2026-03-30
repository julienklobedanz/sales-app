-- Epic Accounts: Kontaktfelder optional + Rolle/Telefon/LinkedIn ergänzen

ALTER TABLE public.contact_persons
  ADD COLUMN IF NOT EXISTS phone text,
  ADD COLUMN IF NOT EXISTS linkedin_url text,
  ADD COLUMN IF NOT EXISTS role text;

-- Pflichtfelder im bisherigen Schema lockern (alles optional, wie im UI gewünscht)
ALTER TABLE public.contact_persons
  ALTER COLUMN first_name DROP NOT NULL,
  ALTER COLUMN last_name DROP NOT NULL,
  ALTER COLUMN email DROP NOT NULL;

CREATE INDEX IF NOT EXISTS idx_contact_persons_email ON public.contact_persons(email);

