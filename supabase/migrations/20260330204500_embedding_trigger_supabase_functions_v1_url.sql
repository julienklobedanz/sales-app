-- Edge Functions werden offiziell unter
--   https://<PROJECT_REF>.supabase.co/functions/v1/<function-name>
-- aufgerufen (siehe Supabase Docs / pg_net-Beispiele).
-- Die Variante https://<PROJECT_REF>.functions.supabase.co/<name> trifft die deployte Function
-- typischerweise nicht → keine Logs, kein Embedding.

CREATE OR REPLACE FUNCTION public.trigger_generate_embedding()
RETURNS trigger
LANGUAGE plpgsql
AS $$
DECLARE
  endpoint text := 'https://oxxzczmibzyusonwzdvc.supabase.co/functions/v1/generate-embedding';
BEGIN
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
      headers := jsonb_build_object('Content-Type', 'application/json')
    );
  END IF;

  RETURN NEW;
END;
$$;
