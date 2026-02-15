-- No-Login Approval Workflow
-- Im Supabase SQL Editor ausführen, falls approval_token noch fehlt.

ALTER TABLE public.references
ADD COLUMN IF NOT EXISTS approval_token TEXT UNIQUE;

-- Freigabe-Status: Falls Ihr reference_status-Enum erweitert werden soll,
-- z. B.: ALTER TYPE reference_status ADD VALUE 'external'; (analog internal, anonymous, restricted)
