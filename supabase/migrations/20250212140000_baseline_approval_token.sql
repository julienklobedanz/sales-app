-- Historisch: approval-token-and-status.sql (ohne Timestamp, wurde von der CLI übersprungen)
ALTER TABLE public.references
  ADD COLUMN IF NOT EXISTS approval_token text UNIQUE;
