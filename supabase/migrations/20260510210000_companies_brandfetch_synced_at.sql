-- Zeitpunkt des letzten erfolgreichen Brandfetch-Abgleichs (Cron / zuvor manuell).
ALTER TABLE public.companies
ADD COLUMN IF NOT EXISTS brandfetch_synced_at timestamptz;

COMMENT ON COLUMN public.companies.brandfetch_synced_at IS
  'Letzter erfolgreicher Brandfetch-Abgleich (HQ, Logo, Mitarbeiterzahl u. a.); gesteuert über geplanten Cron.';
