-- Vertragsende aus CRM (getrennt vom Closing-Datum in expiry_date).

ALTER TABLE public.deals
  ADD COLUMN IF NOT EXISTS contract_end_date date;

COMMENT ON COLUMN public.deals.contract_end_date IS
  'Vertrags-/Renewal-Ende aus CRM (nicht Closing). Steuert At-Risk und Card Primary Line.';

ALTER TABLE public.organization_crm_connections
  ADD COLUMN IF NOT EXISTS hubspot_contract_end_property text;

COMMENT ON COLUMN public.organization_crm_connections.hubspot_contract_end_property IS
  'HubSpot Deal-Property Internal Name für Vertragsende; leer = Default contract_end_date.';
