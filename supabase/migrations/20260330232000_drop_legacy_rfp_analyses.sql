-- Legacy-Tabelle `rfp_analyses` (org/company, ohne Deal) – unbenutzt und leer.
-- Kanonisches Modell: `deal_rfp_analyses` (Epic 4 / RFP-Pipeline).
-- CASCADE: Policies, Trigger, abhängige Objekte an der Tabelle.

DROP TABLE IF EXISTS public.rfp_analyses CASCADE;
