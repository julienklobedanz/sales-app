-- Stellt sicher, dass profiles.phone existiert (z. B. wenn 20260508120000 lokal fehlte)
-- und triggert PostgREST-Schema-Reload, damit die API die Spalte sofort sieht.

ALTER TABLE public.profiles
  ADD COLUMN IF NOT EXISTS phone text;

COMMENT ON COLUMN public.profiles.phone IS 'Erreichbarkeit für die öffentliche Kundenansicht; für Rolle sales Pflicht.';

NOTIFY pgrst, 'reload schema';
