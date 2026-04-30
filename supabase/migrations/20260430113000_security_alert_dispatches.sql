-- Prevent duplicate security alert mails (cooldown per org + alert key)
CREATE TABLE IF NOT EXISTS public.security_alert_dispatches (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  org_id uuid NOT NULL REFERENCES public.organizations(id) ON DELETE CASCADE,
  alert_key text NOT NULL,
  last_sent_at timestamptz NOT NULL DEFAULT now(),
  created_at timestamptz NOT NULL DEFAULT now(),
  UNIQUE (org_id, alert_key)
);

CREATE INDEX IF NOT EXISTS idx_security_alert_dispatches_org_key
  ON public.security_alert_dispatches (org_id, alert_key);

ALTER TABLE public.security_alert_dispatches ENABLE ROW LEVEL SECURITY;
