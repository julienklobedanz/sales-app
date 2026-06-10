-- Erweiterte Embedding-Felder (Apply): Trigger bei Volumen, Tags, Kunde (company_id), etc.
-- Duplikat von 20260610120000_reference_embedding_extended_trigger.sql für sauberen Remote-Push.

CREATE OR REPLACE FUNCTION public.trigger_generate_embedding()
RETURNS trigger
LANGUAGE plpgsql
AS $$
DECLARE
  functions_url text;
  service_role_key text;
  endpoint text;
  headers jsonb;
  should_embed boolean := false;
BEGIN
  functions_url := current_setting('app.supabase_functions_url', true);
  service_role_key := current_setting('app.supabase_service_role_key', true);

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

  IF TG_OP = 'INSERT' THEN
    should_embed := true;
  ELSE
    should_embed :=
      (NEW.title IS DISTINCT FROM OLD.title)
      OR (NEW.customer_challenge IS DISTINCT FROM OLD.customer_challenge)
      OR (NEW.our_solution IS DISTINCT FROM OLD.our_solution)
      OR (NEW.summary IS DISTINCT FROM OLD.summary)
      OR (NEW.industry IS DISTINCT FROM OLD.industry)
      OR (NEW.volume_eur IS DISTINCT FROM OLD.volume_eur)
      OR (NEW.tags IS DISTINCT FROM OLD.tags)
      OR (NEW.country IS DISTINCT FROM OLD.country)
      OR (NEW.contract_type IS DISTINCT FROM OLD.contract_type)
      OR (NEW.incumbent_provider IS DISTINCT FROM OLD.incumbent_provider)
      OR (NEW.competitors IS DISTINCT FROM OLD.competitors)
      OR (NEW.project_status IS DISTINCT FROM OLD.project_status)
      OR (NEW.company_id IS DISTINCT FROM OLD.company_id);
  END IF;

  IF should_embed THEN
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
