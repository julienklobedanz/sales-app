-- Epic 7: Deal-Anforderungen (manuell gepflegt)
-- UI: großes Textfeld in Deal-Detail; Eingabe bereits bei Deal-Erstellung.

ALTER TABLE public.deals
  ADD COLUMN IF NOT EXISTS requirements_text text;

