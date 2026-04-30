-- Compliance audit trail + unlock brute-force protection primitives

CREATE TABLE IF NOT EXISTS public.audit_logs (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  org_id uuid REFERENCES public.organizations(id) ON DELETE SET NULL,
  user_id uuid REFERENCES auth.users(id) ON DELETE SET NULL,
  action text NOT NULL,
  entity_id text,
  action_details jsonb NOT NULL DEFAULT '{}'::jsonb,
  timestamp timestamptz NOT NULL DEFAULT now()
);

CREATE INDEX IF NOT EXISTS idx_audit_logs_org_time
  ON public.audit_logs (org_id, timestamp DESC);
CREATE INDEX IF NOT EXISTS idx_audit_logs_action_time
  ON public.audit_logs (action, timestamp DESC);

COMMENT ON TABLE public.audit_logs IS 'Compliance audit log (PII-minimized; only ids and technical metadata).';
COMMENT ON COLUMN public.audit_logs.action_details IS 'Only IDs/technical fields. No names/emails/plaintext secrets.';

ALTER TABLE public.audit_logs ENABLE ROW LEVEL SECURITY;

DROP POLICY IF EXISTS "audit_logs_select_own_org" ON public.audit_logs;
CREATE POLICY "audit_logs_select_own_org"
  ON public.audit_logs
  FOR SELECT
  TO authenticated
  USING (
    org_id IN (
      SELECT p.organization_id
      FROM public.profiles p
      WHERE p.id = auth.uid()
    )
  );

DROP POLICY IF EXISTS "audit_logs_insert_authenticated" ON public.audit_logs;
CREATE POLICY "audit_logs_insert_authenticated"
  ON public.audit_logs
  FOR INSERT
  TO authenticated
  WITH CHECK (true);

DROP POLICY IF EXISTS "audit_logs_insert_anon_unlock" ON public.audit_logs;
CREATE POLICY "audit_logs_insert_anon_unlock"
  ON public.audit_logs
  FOR INSERT
  TO anon
  WITH CHECK (action LIKE 'unlock_%');

-- Brute-force protection support table (IP hash + slug bucket)
CREATE TABLE IF NOT EXISTS public.portfolio_unlock_attempts (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  slug text NOT NULL,
  ip_hash text NOT NULL,
  attempted_at timestamptz NOT NULL DEFAULT now(),
  was_success boolean NOT NULL DEFAULT false
);

CREATE INDEX IF NOT EXISTS idx_portfolio_unlock_attempts_lookup
  ON public.portfolio_unlock_attempts (slug, ip_hash, attempted_at DESC);

ALTER TABLE public.portfolio_unlock_attempts ENABLE ROW LEVEL SECURITY;

DROP POLICY IF EXISTS "portfolio_unlock_attempts_anon_insert" ON public.portfolio_unlock_attempts;
CREATE POLICY "portfolio_unlock_attempts_anon_insert"
  ON public.portfolio_unlock_attempts
  FOR INSERT
  TO anon
  WITH CHECK (true);

DROP POLICY IF EXISTS "portfolio_unlock_attempts_anon_select" ON public.portfolio_unlock_attempts;
CREATE POLICY "portfolio_unlock_attempts_anon_select"
  ON public.portfolio_unlock_attempts
  FOR SELECT
  TO anon
  USING (true);
