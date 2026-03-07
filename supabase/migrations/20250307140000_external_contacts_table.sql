-- Externe Kontakte (Kundenansprechpartner) von internen Kontakten (contact_persons) trennen.
-- Externe Kontakte sind einem Unternehmen (Kunde) zugeordnet.

CREATE TABLE IF NOT EXISTS public.external_contacts (
  id uuid NOT NULL DEFAULT uuid_generate_v4(),
  organization_id uuid NOT NULL REFERENCES public.organizations(id) ON DELETE CASCADE,
  company_id uuid NOT NULL REFERENCES public.companies(id) ON DELETE CASCADE,
  first_name text NOT NULL,
  last_name text NOT NULL,
  email text NOT NULL,
  role text,
  created_at timestamp with time zone DEFAULT now(),
  updated_at timestamp with time zone DEFAULT now(),
  CONSTRAINT external_contacts_pkey PRIMARY KEY (id)
);

CREATE INDEX IF NOT EXISTS idx_external_contacts_organization_id ON public.external_contacts(organization_id);
CREATE INDEX IF NOT EXISTS idx_external_contacts_company_id ON public.external_contacts(company_id);

COMMENT ON TABLE public.external_contacts IS 'Externe Kontakte (Kundenansprechpartner), einem Kundenunternehmen zugeordnet.';

-- Bestehende Verknüpfungen auf contact_persons aufheben (Anzeige bleibt über customer_contact-Text)
UPDATE public.references SET customer_contact_id = NULL WHERE customer_contact_id IS NOT NULL;

ALTER TABLE public.references
  DROP CONSTRAINT IF EXISTS references_customer_contact_id_fkey;

ALTER TABLE public.references
  ADD CONSTRAINT references_customer_contact_id_fkey
  FOREIGN KEY (customer_contact_id) REFERENCES public.external_contacts(id) ON DELETE SET NULL;

-- RLS
ALTER TABLE public.external_contacts ENABLE ROW LEVEL SECURITY;

DROP POLICY IF EXISTS "Users see own org external_contacts" ON public.external_contacts;
CREATE POLICY "Users see own org external_contacts"
  ON public.external_contacts FOR SELECT
  USING (organization_id = public.current_user_organization_id());

DROP POLICY IF EXISTS "Users insert external_contacts in own org" ON public.external_contacts;
CREATE POLICY "Users insert external_contacts in own org"
  ON public.external_contacts FOR INSERT
  WITH CHECK (organization_id = public.current_user_organization_id());

DROP POLICY IF EXISTS "Users update own org external_contacts" ON public.external_contacts;
CREATE POLICY "Users update own org external_contacts"
  ON public.external_contacts FOR UPDATE
  USING (organization_id = public.current_user_organization_id());

DROP POLICY IF EXISTS "Users delete own org external_contacts" ON public.external_contacts;
CREATE POLICY "Users delete own org external_contacts"
  ON public.external_contacts FOR DELETE
  USING (organization_id = public.current_user_organization_id());
