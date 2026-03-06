-- Referenz-Warenkorb & NDA: is_nda_deal für exakte Steuerung unabhängig vom Status
ALTER TABLE references
  ADD COLUMN IF NOT EXISTS is_nda_deal boolean NOT NULL DEFAULT false;

COMMENT ON COLUMN references.is_nda_deal IS 'Vertraulicher NDA-Deal; Anzeige NDA-geschützt-Badge und Einschränkung externer Freigaben.';
