-- Welle 5 T4: JSON workspace_state entfernen (normalisierte Tabellen sind Quelle der Wahrheit).

ALTER TABLE public.deal_desk_projects
  DROP COLUMN IF EXISTS workspace_state;

DO $$
BEGIN
  PERFORM pg_catalog.pg_notify('pgrst', 'reload schema');
END $$;
