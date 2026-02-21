-- Alle Datensätze aller Tabellen löschen (zum Testen)
-- Im Supabase SQL Editor ausführen.
-- Reihenfolge beachten (Fremdschlüssel): zuerst abhängige Tabellen, zuletzt organisations.
-- auth.users wird nicht angetastet (Supabase-Accounts bleiben bestehen).

-- 1. Favoriten (abhängig: references, profiles)
DELETE FROM public.favorites;

-- 2. Freigaben (abhängig: references, profiles)
DELETE FROM public.approvals;

-- 3. Einladungen (abhängig: organizations)
DELETE FROM public.organization_invites;

-- 4. Referenzen (abhängig: companies)
DELETE FROM public.references;

-- 5. Kontaktpersonen (abhängig: organizations), falls Tabelle existiert
DO $$
BEGIN
  IF EXISTS (SELECT 1 FROM information_schema.tables WHERE table_schema = 'public' AND table_name = 'contact_persons') THEN
    DELETE FROM public.contact_persons;
  END IF;
END $$;

-- 6. Companies / Referenz-Firmen (abhängig: organizations)
DELETE FROM public.companies;

-- 7. Profile (abhängig: organizations; id verweist auf auth.users, wird nicht gelöscht)
DELETE FROM public.profiles;

-- 8. Organisationen
DELETE FROM public.organizations;

-- Optional: Sequenzen zurücksetzen (für Tabellen mit serial/identity), falls gewünscht:
-- SELECT setval(pg_get_serial_sequence('public.organizations', 'id'), 1);  -- nur wenn id serial
