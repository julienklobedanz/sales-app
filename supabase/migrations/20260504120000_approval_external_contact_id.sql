-- Freigabe-Empfänger kann external_contacts sein (customer_contact_id zeigt dorthin).
-- approval_contact_id bleibt FK auf contact_persons; externes Pendant separat.
ALTER TABLE public.references
  ADD COLUMN IF NOT EXISTS approval_external_contact_id uuid REFERENCES public.external_contacts(id) ON DELETE SET NULL;

CREATE INDEX IF NOT EXISTS idx_references_approval_external_contact_id
  ON public.references(approval_external_contact_id)
  WHERE approval_external_contact_id IS NOT NULL;

COMMENT ON COLUMN public.references.approval_external_contact_id IS 'Kundenfreigabe: Empfänger aus external_contacts, wenn kein contact_persons-Eintrag.';
