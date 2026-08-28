-- Integration und Admin-Clients rufen die Fristen-RPCs als service_role auf.
-- REVOKE FROM PUBLIC in den Erzeuger-Migrationen nimmt PUBLIC die Rechte;
-- ohne expliziten Grant sieht PostgREST die Funktionen für service_role nicht.

GRANT EXECUTE ON FUNCTION public.upsert_deal_rfp_deadline(
  uuid, uuid, public.deal_deadline_kind, text, timestamptz, text, boolean, text
) TO service_role;

GRANT EXECUTE ON FUNCTION public.upsert_tender_rfp_deadline(
  uuid, uuid, public.deal_deadline_kind, text, timestamptz, text, boolean, text
) TO service_role;
