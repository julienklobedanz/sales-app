-- Repair: Spalten waren in schema_migrations markiert, fehlten aber physisch auf Remote.
-- Idempotent (IF NOT EXISTS) — sicher bei erneutem Lauf.

ALTER TABLE public.company_roadmap_projects
  ADD COLUMN IF NOT EXISTS tags text;

ALTER TABLE public.deal_desk_projects
  ADD COLUMN IF NOT EXISTS archived_at timestamptz;

CREATE INDEX IF NOT EXISTS idx_deal_desk_projects_org_active
  ON public.deal_desk_projects (organization_id, created_at DESC)
  WHERE archived_at IS NULL;

CREATE INDEX IF NOT EXISTS idx_deal_desk_projects_org_archived
  ON public.deal_desk_projects (organization_id, archived_at DESC)
  WHERE archived_at IS NOT NULL;
