-- AM / Kundenansprechpartner für Freigabe-Workflow (intern + kundenseitig)
ALTER TABLE public.references
  ADD COLUMN IF NOT EXISTS approval_coordinator_email text,
  ADD COLUMN IF NOT EXISTS approval_coordinator_name text,
  ADD COLUMN IF NOT EXISTS approval_customer_facing_name text;

COMMENT ON COLUMN public.references.approval_coordinator_email IS
  'E-Mail des Account Managers bei Freigabe-Anfrage (Sales → AM).';
COMMENT ON COLUMN public.references.approval_coordinator_name IS
  'Anzeigename des AM für Kundenfreigabe (Snapshot beim Versand oder aus Formular).';
COMMENT ON COLUMN public.references.approval_customer_facing_name IS
  'Name des AM auf der Kunden-Freigabeseite („X bittet Sie um Freigabe“).';
