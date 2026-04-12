-- Nach neuen Tabellen/Änderungen: PostgREST Schema-Cache neu laden.
-- Verhindert Fehler wie "Could not find the table public.shared_portfolios".
DO $$
BEGIN
  PERFORM pg_catalog.pg_notify('pgrst', 'reload schema');
END $$;
