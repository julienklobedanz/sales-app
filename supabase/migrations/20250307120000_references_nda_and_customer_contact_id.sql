-- is_nda_deal: sicherstellen, dass Spalte existiert (Schema-Cache-Problem beheben)
ALTER TABLE public.references
  ADD COLUMN IF NOT EXISTS is_nda_deal boolean NOT NULL DEFAULT false;

COMMENT ON COLUMN public.references.is_nda_deal IS 'Vertraulicher NDA-Deal; Status bleibt auf „Nur Intern“.';

-- customer_contact_id: Kundenansprechpartner als Dropdown (wie contact_id)
ALTER TABLE public.references
  ADD COLUMN IF NOT EXISTS customer_contact_id uuid NULL REFERENCES public.contact_persons(id) ON DELETE SET NULL;

COMMENT ON COLUMN public.references.customer_contact_id IS 'Kundenansprechpartner (externer Kontakt); optional, Verknüpfung zu contact_persons.';
