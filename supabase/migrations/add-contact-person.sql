-- Account-Owner-E-Mail für Einzelfreigabe-Anfragen (z. B. Resend)
-- Im Supabase SQL Editor ausführen, falls contact_person noch fehlt.

ALTER TABLE public.references
ADD COLUMN IF NOT EXISTS contact_person TEXT;
