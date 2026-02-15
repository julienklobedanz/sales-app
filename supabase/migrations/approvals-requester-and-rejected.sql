-- Requests Center: approvals um requester_id und Status 'rejected' erweitern
-- Im Supabase SQL Editor ausführen, falls noch nicht vorhanden.

-- Option 1: Neues Enum-Wert (PostgreSQL 10+)
DO $$
BEGIN
  IF NOT EXISTS (
    SELECT 1 FROM pg_enum
    WHERE enumlabel = 'rejected'
    AND enumtypid = (SELECT oid FROM pg_type WHERE typname = 'approval_status')
  ) THEN
    ALTER TYPE approval_status ADD VALUE 'rejected';
  END IF;
END
$$;

-- Option 2: Spalte requester_id (User, der den Antrag gestellt hat)
ALTER TABLE public.approvals
ADD COLUMN IF NOT EXISTS requester_id uuid REFERENCES public.profiles(id);

CREATE INDEX IF NOT EXISTS idx_approvals_requester_id ON public.approvals(requester_id);

-- RLS für approvals (optional, damit User nur eigene bzw. Admin alle sieht)
-- ALTER TABLE public.approvals ENABLE ROW LEVEL SECURITY;
-- CREATE POLICY "Users see own requests" ON public.approvals FOR SELECT
--   USING (requester_id = auth.uid());
-- CREATE POLICY "Admins see all" ON public.approvals FOR SELECT
--   USING ((SELECT role FROM public.profiles WHERE id = auth.uid()) = 'admin');
