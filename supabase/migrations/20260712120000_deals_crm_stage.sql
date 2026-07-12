-- CRM-Stage-Label beim Import (Snapshot, keine Live-Sync-Pipeline).

ALTER TABLE public.deals
  ADD COLUMN IF NOT EXISTS crm_stage text;

COMMENT ON COLUMN public.deals.crm_stage IS
  'Anzeige-Label der Opportunity-Stage im CRM zum Importzeitpunkt (z. B. HubSpot dealstage).';
