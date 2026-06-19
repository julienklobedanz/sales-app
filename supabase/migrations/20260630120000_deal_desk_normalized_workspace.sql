-- Deal Desk: normalisierte Workspace-Daten für Reporting/Insights (Welle 4a / H2)

-- SME-Routings (Anforderung → Zuständige:r)
CREATE TABLE IF NOT EXISTS public.deal_desk_sme_routes (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  project_id uuid NOT NULL REFERENCES public.deal_desk_projects(id) ON DELETE CASCADE,
  organization_id uuid NOT NULL REFERENCES public.organizations(id) ON DELETE CASCADE,
  requirement_key text NOT NULL,
  assignee_profile_id uuid REFERENCES public.profiles(id) ON DELETE SET NULL,
  status text NOT NULL DEFAULT 'open',
  created_at timestamptz NOT NULL DEFAULT now(),
  updated_at timestamptz NOT NULL DEFAULT now()
);

CREATE INDEX IF NOT EXISTS idx_deal_desk_sme_routes_project
  ON public.deal_desk_sme_routes(project_id);

CREATE UNIQUE INDEX IF NOT EXISTS idx_deal_desk_sme_routes_project_requirement
  ON public.deal_desk_sme_routes(project_id, requirement_key);

-- Bid-Team-Zuordnung
CREATE TABLE IF NOT EXISTS public.deal_desk_bid_team (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  project_id uuid NOT NULL REFERENCES public.deal_desk_projects(id) ON DELETE CASCADE,
  organization_id uuid NOT NULL REFERENCES public.organizations(id) ON DELETE CASCADE,
  profile_id uuid REFERENCES public.profiles(id) ON DELETE SET NULL,
  email text,
  role text,
  created_at timestamptz NOT NULL DEFAULT now()
);

CREATE INDEX IF NOT EXISTS idx_deal_desk_bid_team_project
  ON public.deal_desk_bid_team(project_id);

-- Red Flags (für Auswertung: an Legal? Status?)
CREATE TABLE IF NOT EXISTS public.deal_desk_red_flags (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  project_id uuid NOT NULL REFERENCES public.deal_desk_projects(id) ON DELETE CASCADE,
  organization_id uuid NOT NULL REFERENCES public.organizations(id) ON DELETE CASCADE,
  flag_key text,
  label text NOT NULL,
  severity text,
  sent_to_legal boolean NOT NULL DEFAULT false,
  status text NOT NULL DEFAULT 'open',
  created_at timestamptz NOT NULL DEFAULT now()
);

CREATE INDEX IF NOT EXISTS idx_deal_desk_red_flags_project
  ON public.deal_desk_red_flags(project_id);

CREATE INDEX IF NOT EXISTS idx_deal_desk_red_flags_legal_sent
  ON public.deal_desk_red_flags(organization_id, sent_to_legal, created_at DESC);

CREATE UNIQUE INDEX IF NOT EXISTS idx_deal_desk_red_flags_project_flag_key
  ON public.deal_desk_red_flags(project_id, flag_key)
  WHERE flag_key IS NOT NULL;

-- Go/No-Bid auf Projekt
ALTER TABLE public.deal_desk_projects
  ADD COLUMN IF NOT EXISTS bid_decision text;

ALTER TABLE public.deal_desk_projects
  DROP CONSTRAINT IF EXISTS deal_desk_projects_bid_decision_check;

ALTER TABLE public.deal_desk_projects
  ADD CONSTRAINT deal_desk_projects_bid_decision_check
  CHECK (bid_decision IS NULL OR bid_decision IN ('go', 'no_bid'));

-- updated_at für SME-Routes
CREATE OR REPLACE FUNCTION public.set_deal_desk_sme_routes_updated_at()
RETURNS trigger
LANGUAGE plpgsql
AS $$
BEGIN
  NEW.updated_at = now();
  RETURN NEW;
END;
$$;

DROP TRIGGER IF EXISTS deal_desk_sme_routes_updated_at ON public.deal_desk_sme_routes;
CREATE TRIGGER deal_desk_sme_routes_updated_at
  BEFORE UPDATE ON public.deal_desk_sme_routes
  FOR EACH ROW
  EXECUTE FUNCTION public.set_deal_desk_sme_routes_updated_at();

-- ---------------------------------------------------------------------------
-- Backfill aus workspace_state (verlustfrei, idempotent)
-- Mock-/Legacy-IDs (z. B. "self", "lena") sind keine UUIDs → sicher parsen.
-- ---------------------------------------------------------------------------

CREATE OR REPLACE FUNCTION public.try_uuid_from_text(raw text)
RETURNS uuid
LANGUAGE sql
IMMUTABLE
AS $$
  SELECT CASE
    WHEN raw IS NULL OR btrim(raw) = '' THEN NULL::uuid
    WHEN raw ~* '^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$' THEN raw::uuid
    ELSE NULL::uuid
  END;
$$;

UPDATE public.deal_desk_projects p
SET bid_decision = CASE
  WHEN p.workspace_state->>'decision' = 'go' THEN 'go'
  WHEN p.workspace_state->>'decision' = 'no-bid' THEN 'no_bid'
  ELSE p.bid_decision
END
WHERE p.workspace_state ? 'decision'
  AND p.bid_decision IS NULL;

INSERT INTO public.deal_desk_red_flags (
  project_id, organization_id, flag_key, label, severity, sent_to_legal, status
)
SELECT
  p.id,
  p.organization_id,
  f->>'id',
  COALESCE(NULLIF(trim(f->>'title'), ''), 'Red Flag'),
  f->>'severity',
  COALESCE((f->>'markedForLegal')::boolean, false),
  'open'
FROM public.deal_desk_projects p
CROSS JOIN LATERAL jsonb_array_elements(
  CASE
    WHEN jsonb_typeof(p.workspace_state->'redFlags') = 'array' THEN p.workspace_state->'redFlags'
    ELSE '[]'::jsonb
  END
) AS f
WHERE NOT EXISTS (
  SELECT 1 FROM public.deal_desk_red_flags rf WHERE rf.project_id = p.id
);

INSERT INTO public.deal_desk_bid_team (project_id, organization_id, profile_id, email, role)
SELECT
  p.id,
  p.organization_id,
  public.try_uuid_from_text(b->>'assigneeId'),
  NULL,
  COALESCE(b->>'role', b->>'label')
FROM public.deal_desk_projects p
CROSS JOIN LATERAL jsonb_array_elements(
  CASE
    WHEN jsonb_typeof(p.workspace_state->'bidTeam') = 'array' THEN p.workspace_state->'bidTeam'
    ELSE '[]'::jsonb
  END
) AS b
WHERE NOT EXISTS (
  SELECT 1 FROM public.deal_desk_bid_team bt WHERE bt.project_id = p.id
);

INSERT INTO public.deal_desk_sme_routes (
  project_id, organization_id, requirement_key, assignee_profile_id, status
)
SELECT
  p.id,
  p.organization_id,
  a.key,
  public.try_uuid_from_text(a.value->>'assigneeId'),
  'open'
FROM public.deal_desk_projects p
CROSS JOIN LATERAL jsonb_each(
  CASE
    WHEN jsonb_typeof(p.workspace_state->'smeAssignments') = 'object' THEN p.workspace_state->'smeAssignments'
    ELSE '{}'::jsonb
  END
) AS a
WHERE NOT EXISTS (
  SELECT 1 FROM public.deal_desk_sme_routes sr WHERE sr.project_id = p.id
);

-- ---------------------------------------------------------------------------
-- RLS (Sichtbarkeit über Parent-Projekt, analog deal_desk_documents)
-- ---------------------------------------------------------------------------

ALTER TABLE public.deal_desk_sme_routes ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.deal_desk_bid_team ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.deal_desk_red_flags ENABLE ROW LEVEL SECURITY;

DROP POLICY IF EXISTS "deal_desk_sme_routes_select_visible" ON public.deal_desk_sme_routes;
CREATE POLICY "deal_desk_sme_routes_select_visible"
  ON public.deal_desk_sme_routes FOR SELECT TO authenticated
  USING (
    organization_id = public.current_user_organization_id()
    AND EXISTS (
      SELECT 1 FROM public.deal_desk_projects p
      WHERE p.id = deal_desk_sme_routes.project_id
        AND (p.analysis_source = 'mock' OR p.created_by = auth.uid())
    )
  );

DROP POLICY IF EXISTS "deal_desk_sme_routes_mutate_own" ON public.deal_desk_sme_routes;
CREATE POLICY "deal_desk_sme_routes_mutate_own"
  ON public.deal_desk_sme_routes FOR ALL TO authenticated
  USING (
    organization_id = public.current_user_organization_id()
    AND EXISTS (
      SELECT 1 FROM public.deal_desk_projects p
      WHERE p.id = deal_desk_sme_routes.project_id AND p.created_by = auth.uid()
    )
  )
  WITH CHECK (
    organization_id = public.current_user_organization_id()
    AND EXISTS (
      SELECT 1 FROM public.deal_desk_projects p
      WHERE p.id = deal_desk_sme_routes.project_id AND p.created_by = auth.uid()
    )
  );

DROP POLICY IF EXISTS "deal_desk_bid_team_select_visible" ON public.deal_desk_bid_team;
CREATE POLICY "deal_desk_bid_team_select_visible"
  ON public.deal_desk_bid_team FOR SELECT TO authenticated
  USING (
    organization_id = public.current_user_organization_id()
    AND EXISTS (
      SELECT 1 FROM public.deal_desk_projects p
      WHERE p.id = deal_desk_bid_team.project_id
        AND (p.analysis_source = 'mock' OR p.created_by = auth.uid())
    )
  );

DROP POLICY IF EXISTS "deal_desk_bid_team_mutate_own" ON public.deal_desk_bid_team;
CREATE POLICY "deal_desk_bid_team_mutate_own"
  ON public.deal_desk_bid_team FOR ALL TO authenticated
  USING (
    organization_id = public.current_user_organization_id()
    AND EXISTS (
      SELECT 1 FROM public.deal_desk_projects p
      WHERE p.id = deal_desk_bid_team.project_id AND p.created_by = auth.uid()
    )
  )
  WITH CHECK (
    organization_id = public.current_user_organization_id()
    AND EXISTS (
      SELECT 1 FROM public.deal_desk_projects p
      WHERE p.id = deal_desk_bid_team.project_id AND p.created_by = auth.uid()
    )
  );

DROP POLICY IF EXISTS "deal_desk_red_flags_select_visible" ON public.deal_desk_red_flags;
CREATE POLICY "deal_desk_red_flags_select_visible"
  ON public.deal_desk_red_flags FOR SELECT TO authenticated
  USING (
    organization_id = public.current_user_organization_id()
    AND EXISTS (
      SELECT 1 FROM public.deal_desk_projects p
      WHERE p.id = deal_desk_red_flags.project_id
        AND (p.analysis_source = 'mock' OR p.created_by = auth.uid())
    )
  );

DROP POLICY IF EXISTS "deal_desk_red_flags_mutate_own" ON public.deal_desk_red_flags;
CREATE POLICY "deal_desk_red_flags_mutate_own"
  ON public.deal_desk_red_flags FOR ALL TO authenticated
  USING (
    organization_id = public.current_user_organization_id()
    AND EXISTS (
      SELECT 1 FROM public.deal_desk_projects p
      WHERE p.id = deal_desk_red_flags.project_id AND p.created_by = auth.uid()
    )
  )
  WITH CHECK (
    organization_id = public.current_user_organization_id()
    AND EXISTS (
      SELECT 1 FROM public.deal_desk_projects p
      WHERE p.id = deal_desk_red_flags.project_id AND p.created_by = auth.uid()
    )
  );
