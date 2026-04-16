-- EPIC 3 / KAN-23: Auto-Embedding via Trigger -> Edge Function
-- Robust:
-- - Endpoint: wenn `app.supabase_functions_url` gesetzt ist, davon ausgehend; sonst Fallback auf die bekannte Project-URL.
-- - Optionaler Authorization-Header, falls `app.supabase_service_role_key` gesetzt ist.
-- - Keine Blockierung für User: Trigger ist AFTER und ruft per pg_net net.http_post auf.

CREATE EXTENSION IF NOT EXISTS pg_net;

CREATE OR REPLACE FUNCTION public.trigger_generate_embedding()
RETURNS trigger
LANGUAGE plpgsql
AS $$
DECLARE
  functions_url text;
  service_role_key text;
  endpoint text;
  headers jsonb;
BEGIN
  functions_url := current_setting('app.supabase_functions_url', true);
  service_role_key := current_setting('app.supabase_service_role_key', true);

  -- Fallback: feste Supabase Project-URL (damit die Pipeline auch ohne DB-Settings läuft)
  endpoint := 'https://oxxzczmibzyusonwzdvc.supabase.co/functions/v1/generate-embedding';

  IF functions_url IS NOT NULL AND functions_url <> '' THEN
    endpoint := functions_url || '/generate-embedding';
  END IF;

  IF service_role_key IS NOT NULL AND service_role_key <> '' THEN
    headers := jsonb_build_object(
      'Authorization', 'Bearer ' || service_role_key,
      'Content-Type', 'application/json'
    );
  ELSE
    headers := jsonb_build_object('Content-Type', 'application/json');
  END IF;

  IF (TG_OP = 'INSERT')
     OR (NEW.title IS DISTINCT FROM OLD.title)
     OR (NEW.customer_challenge IS DISTINCT FROM OLD.customer_challenge)
     OR (NEW.our_solution IS DISTINCT FROM OLD.our_solution)
     OR (NEW.summary IS DISTINCT FROM OLD.summary)
     OR (NEW.industry IS DISTINCT FROM OLD.industry)
  THEN
    PERFORM net.http_post(
      url := endpoint,
      body := jsonb_build_object('reference_id', NEW.id),
      params := '{}'::jsonb,
      headers := headers
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

