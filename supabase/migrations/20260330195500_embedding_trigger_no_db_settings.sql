-- EPIC 3 / KAN-23: Auto-Embedding ohne DB-Settings
-- Motivation: Supabase SQL Editor erlaubt kein ALTER DATABASE ... SET app.*
-- Lösung:
-- - Edge Function wird public (verify_jwt = false)
-- - Trigger callt feste Functions-URL (Project Ref ist konstant)
-- - Auth passiert innerhalb der Edge Function via SUPABASE_SERVICE_ROLE_KEY Secret

CREATE EXTENSION IF NOT EXISTS pg_net;

CREATE OR REPLACE FUNCTION public.trigger_generate_embedding()
RETURNS trigger
LANGUAGE plpgsql
AS $$
DECLARE
  -- Offizielles Invoke-Format (Supabase Docs / pg_net-Beispiele):
  -- https://<PROJECT_REF>.supabase.co/functions/v1/<function-name>
  -- NICHT https://<PROJECT_REF>.functions.supabase.co/... (liefert i.d.R. keinen Function-Hit).
  endpoint text := 'https://oxxzczmibzyusonwzdvc.supabase.co/functions/v1/generate-embedding';
BEGIN
  IF (TG_OP = 'INSERT')
     OR (NEW.title IS DISTINCT FROM OLD.title)
     OR (NEW.customer_challenge IS DISTINCT FROM OLD.customer_challenge)
     OR (NEW.our_solution IS DISTINCT FROM OLD.our_solution)
     OR (NEW.summary IS DISTINCT FROM OLD.summary)
     OR (NEW.industry IS DISTINCT FROM OLD.industry)
  THEN
    -- pg_net: body ist jsonb (nicht text); Reihenfolge url → body → params → headers
    PERFORM net.http_post(
      url := endpoint,
      body := jsonb_build_object('reference_id', NEW.id),
      params := '{}'::jsonb,
      headers := jsonb_build_object('Content-Type', 'application/json')
    );
  END IF;

  RETURN NEW;
END;
$$;

DROP TRIGGER IF EXISTS after_reference_upsert ON public.references;

CREATE TRIGGER after_reference_upsert
AFTER INSERT OR UPDATE ON public.references
FOR EACH ROW
EXECUTE FUNCTION public.trigger_generate_embedding();

