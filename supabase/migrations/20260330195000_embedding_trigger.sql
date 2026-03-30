-- EPIC 3 / KAN-23: Auto-Embedding via Trigger -> Edge Function
-- HINWEIS: Diese Variante erwartete DB-Settings (app.supabase_functions_url / app.supabase_service_role_key).
-- In Supabase SQL Editor ist ALTER DATABASE ... SET häufig nicht erlaubt.
-- Nutze stattdessen die Migration `20260330195500_embedding_trigger_no_db_settings.sql`.

CREATE EXTENSION IF NOT EXISTS pg_net;

CREATE OR REPLACE FUNCTION public.trigger_generate_embedding()
RETURNS trigger
LANGUAGE plpgsql
AS $$
DECLARE
  functions_url text;
  service_role_key text;
BEGIN
  functions_url := current_setting('app.supabase_functions_url', true);
  service_role_key := current_setting('app.supabase_service_role_key', true);

  -- Wenn Settings fehlen, nicht blockieren, aber auch keinen Call versuchen
  IF functions_url IS NULL OR functions_url = '' OR service_role_key IS NULL OR service_role_key = '' THEN
    RETURN NEW;
  END IF;

  IF (TG_OP = 'INSERT')
     OR (NEW.title IS DISTINCT FROM OLD.title)
     OR (NEW.customer_challenge IS DISTINCT FROM OLD.customer_challenge)
     OR (NEW.our_solution IS DISTINCT FROM OLD.our_solution)
     OR (NEW.summary IS DISTINCT FROM OLD.summary)
     OR (NEW.industry IS DISTINCT FROM OLD.industry)
  THEN
    PERFORM net.http_post(
      url := functions_url || '/generate-embedding',
      headers := jsonb_build_object(
        'Authorization', 'Bearer ' || service_role_key,
        'Content-Type', 'application/json'
      ),
      body := jsonb_build_object('reference_id', NEW.id)::text
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

