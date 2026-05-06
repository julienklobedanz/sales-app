-- Engagement status (einheitlich): letzte Interaktion pro Person
-- + Salesforce Sync Metadaten für Pipeline (Deals + Companies)

-- 1) Interne Kontakte
ALTER TABLE public.contact_persons
  ADD COLUMN IF NOT EXISTS last_interaction_at date;

COMMENT ON COLUMN public.contact_persons.last_interaction_at IS
  'Letzte dokumentierte Interaktion (für Buying Center / Power Map).';

-- 2) Externe Kontakte
ALTER TABLE public.external_contacts
  ADD COLUMN IF NOT EXISTS last_interaction_at date;

COMMENT ON COLUMN public.external_contacts.last_interaction_at IS
  'Letzte dokumentierte Interaktion (für Buying Center / Power Map).';

-- 3) Stakeholder (Buying Center Rollen)
ALTER TABLE public.stakeholders
  ADD COLUMN IF NOT EXISTS last_interaction_at date;

COMMENT ON COLUMN public.stakeholders.last_interaction_at IS
  'Letzte dokumentierte Interaktion (für Buying Center / Power Map).';

-- Backfill: falls früher last_contact_at existiert (optional in älteren Schemas)
DO $$
BEGIN
  IF EXISTS (
    SELECT 1
    FROM information_schema.columns
    WHERE table_schema = 'public' AND table_name = 'stakeholders' AND column_name = 'last_contact_at'
  ) THEN
    UPDATE public.stakeholders
      SET last_interaction_at = COALESCE(last_interaction_at, (last_contact_at::date))
      WHERE last_contact_at IS NOT NULL;
  END IF;
END $$;

-- Salesforce Sync: Company + Deal IDs (optional)
ALTER TABLE public.companies
  ADD COLUMN IF NOT EXISTS salesforce_account_id text;

COMMENT ON COLUMN public.companies.salesforce_account_id IS
  'Optional: Salesforce Account ID (für CRM Sync).';

ALTER TABLE public.deals
  ADD COLUMN IF NOT EXISTS salesforce_opportunity_id text,
  ADD COLUMN IF NOT EXISTS crm_source text,
  ADD COLUMN IF NOT EXISTS crm_synced_at timestamptz;

COMMENT ON COLUMN public.deals.salesforce_opportunity_id IS
  'Optional: Salesforce Opportunity ID (wenn Deal aus CRM gespiegelt wird).';
COMMENT ON COLUMN public.deals.crm_source IS
  'Quelle der Deal-Daten: z. B. \"salesforce\" oder NULL für lokal.';
COMMENT ON COLUMN public.deals.crm_synced_at IS
  'Zeitpunkt des letzten CRM Sync für diesen Deal.';

