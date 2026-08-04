-- Historisch: approvals-requester-and-rejected.sql (ohne Timestamp, wurde von der CLI übersprungen)
DO $$
BEGIN
  IF NOT EXISTS (
    SELECT 1
    FROM pg_enum
    WHERE enumlabel = 'rejected'
      AND enumtypid = (SELECT oid FROM pg_type WHERE typname = 'approval_status')
  ) THEN
    ALTER TYPE public.approval_status ADD VALUE 'rejected';
  END IF;
END
$$;

ALTER TABLE public.approvals
  ADD COLUMN IF NOT EXISTS requester_id uuid REFERENCES public.profiles (id);

CREATE INDEX IF NOT EXISTS idx_approvals_requester_id ON public.approvals (requester_id);
