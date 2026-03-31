-- Epic 7: Deal-Cockpit Statusmodell + Event-Tracking + Reference Requests
-- Ziel:
-- - deals.status: neues, klares Statusmodell (open/rfp/negotiation/won/lost/withdrawn/archived)
-- - deal_references: similarity_score speichern (für Match-Score in Deal-Detail)
-- - evidence_events: einfache Activity-/Feedback-Events (z. B. Win/Loss, Referenz hat geholfen)
-- - deal_reference_requests: persistierte Referenzanfragen (statt nur E-Mail)

-- ---------------------------------------------------------------------------
-- 1) deals.status: Werte migrieren + Constraint aktualisieren
-- ---------------------------------------------------------------------------
ALTER TABLE public.deals DROP CONSTRAINT IF EXISTS deals_status_check;

-- Legacy → neu (best effort)
UPDATE public.deals SET status = 'negotiation' WHERE status IN ('in_negotiation');
UPDATE public.deals SET status = 'rfp' WHERE status IN ('rfp_phase');
UPDATE public.deals SET status = 'open' WHERE status IN ('on_hold', 'reference_sought', 'in_approval', 'reference_found');
UPDATE public.deals SET status = 'open' WHERE status IS NULL OR btrim(status) = '';

ALTER TABLE public.deals ALTER COLUMN status SET DEFAULT 'open';

ALTER TABLE public.deals
  ADD CONSTRAINT deals_status_check CHECK (
    status IN ('open', 'rfp', 'negotiation', 'won', 'lost', 'withdrawn', 'archived')
  );

-- ---------------------------------------------------------------------------
-- 2) deal_references: similarity_score (optional)
-- ---------------------------------------------------------------------------
ALTER TABLE public.deal_references
  ADD COLUMN IF NOT EXISTS similarity_score double precision;

-- ---------------------------------------------------------------------------
-- 3) evidence_events: Event-Tracking (Org-scope)
-- ---------------------------------------------------------------------------
CREATE TABLE IF NOT EXISTS public.evidence_events (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  organization_id uuid NOT NULL REFERENCES public.organizations(id) ON DELETE CASCADE,
  deal_id uuid REFERENCES public.deals(id) ON DELETE CASCADE,
  reference_id uuid REFERENCES public.references(id) ON DELETE SET NULL,
  event_type text NOT NULL CHECK (
    event_type IN (
      'deal_won',
      'deal_lost',
      'deal_withdrawn',
      'reference_helped'
    )
  ),
  payload jsonb NOT NULL DEFAULT '{}'::jsonb,
  created_by uuid REFERENCES auth.users(id) ON DELETE SET NULL,
  created_at timestamptz NOT NULL DEFAULT now()
);

CREATE INDEX IF NOT EXISTS idx_evidence_events_org_created
  ON public.evidence_events(organization_id, created_at DESC);
CREATE INDEX IF NOT EXISTS idx_evidence_events_deal_created
  ON public.evidence_events(deal_id, created_at DESC);

ALTER TABLE public.evidence_events ENABLE ROW LEVEL SECURITY;

DROP POLICY IF EXISTS "Users see evidence_events of own org" ON public.evidence_events;
CREATE POLICY "Users see evidence_events of own org"
  ON public.evidence_events FOR SELECT TO authenticated
  USING (organization_id = public.current_user_organization_id());

DROP POLICY IF EXISTS "Users insert evidence_events in own org" ON public.evidence_events;
CREATE POLICY "Users insert evidence_events in own org"
  ON public.evidence_events FOR INSERT TO authenticated
  WITH CHECK (organization_id = public.current_user_organization_id());

-- ---------------------------------------------------------------------------
-- 4) deal_reference_requests: persistierte Referenzanfragen
-- ---------------------------------------------------------------------------
CREATE TABLE IF NOT EXISTS public.deal_reference_requests (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  organization_id uuid NOT NULL REFERENCES public.organizations(id) ON DELETE CASCADE,
  deal_id uuid NOT NULL REFERENCES public.deals(id) ON DELETE CASCADE,
  message text NOT NULL,
  status text NOT NULL DEFAULT 'open' CHECK (status IN ('open', 'closed')),
  created_by uuid REFERENCES auth.users(id) ON DELETE SET NULL,
  created_at timestamptz NOT NULL DEFAULT now()
);

CREATE INDEX IF NOT EXISTS idx_deal_reference_requests_org_created
  ON public.deal_reference_requests(organization_id, created_at DESC);
CREATE INDEX IF NOT EXISTS idx_deal_reference_requests_deal_created
  ON public.deal_reference_requests(deal_id, created_at DESC);

ALTER TABLE public.deal_reference_requests ENABLE ROW LEVEL SECURITY;

DROP POLICY IF EXISTS "Users see deal_reference_requests of own org" ON public.deal_reference_requests;
CREATE POLICY "Users see deal_reference_requests of own org"
  ON public.deal_reference_requests FOR SELECT TO authenticated
  USING (organization_id = public.current_user_organization_id());

DROP POLICY IF EXISTS "Users insert deal_reference_requests in own org" ON public.deal_reference_requests;
CREATE POLICY "Users insert deal_reference_requests in own org"
  ON public.deal_reference_requests FOR INSERT TO authenticated
  WITH CHECK (organization_id = public.current_user_organization_id());

