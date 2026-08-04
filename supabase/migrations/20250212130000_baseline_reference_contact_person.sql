-- Historisch: add-contact-person.sql (ohne Timestamp, wurde von der CLI übersprungen)
ALTER TABLE public.references
  ADD COLUMN IF NOT EXISTS contact_person text;
