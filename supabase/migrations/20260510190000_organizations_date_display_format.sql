-- Anzeigeformat für Datumsfelder (Referenzen, Dashboard) pro Organisation
ALTER TABLE public.organizations
  ADD COLUMN IF NOT EXISTS date_display_format text NOT NULL DEFAULT 'de-DE';

COMMENT ON COLUMN public.organizations.date_display_format IS
  'UI-Datum: de-DE (dd.mm.yyyy), en-US (mm/dd/yyyy), en-GB (dd/mm/yyyy), iso (yyyy-mm-dd)';

ALTER TABLE public.organizations
  DROP CONSTRAINT IF EXISTS organizations_date_display_format_check;

ALTER TABLE public.organizations
  ADD CONSTRAINT organizations_date_display_format_check
  CHECK (date_display_format IN ('de-DE', 'en-US', 'en-GB', 'iso'));
