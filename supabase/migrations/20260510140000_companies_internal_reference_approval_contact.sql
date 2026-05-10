-- Optional: welcher interne Kontakt (Kollege) koordiniert Referenzfreigaben für diesen Account.

ALTER TABLE public.companies
  ADD COLUMN IF NOT EXISTS internal_reference_approval_contact_id uuid
    REFERENCES public.contact_persons(id) ON DELETE SET NULL;

CREATE INDEX IF NOT EXISTS idx_companies_internal_ref_approval_contact
  ON public.companies(internal_reference_approval_contact_id)
  WHERE internal_reference_approval_contact_id IS NOT NULL;

COMMENT ON COLUMN public.companies.internal_reference_approval_contact_id IS
  'Interner Kontakt (contact_persons) als Ansprechpartner für Koordination der Kunden-Referenzfreigabe.';
