-- Telefon für Profil / Kundenansicht (Share-Owner-Kontakt)

ALTER TABLE public.profiles
  ADD COLUMN IF NOT EXISTS phone text;

COMMENT ON COLUMN public.profiles.phone IS 'Erreichbarkeit für die öffentliche Kundenansicht; für Rolle sales Pflicht.';
