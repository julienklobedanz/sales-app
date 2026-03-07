-- Nach neuen Tabellen/Änderungen: PostgREST Schema-Cache neu laden.
-- Verhindert Fehler wie "Could not find the table public.shared_portfolios".
SELECT pg_catalog.pg_notify('pgrst', 'reload schema');
