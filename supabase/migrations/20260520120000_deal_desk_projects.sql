-- Deal Desk: eigenständige RFP-Projekte (ohne Pflicht-Deal)

CREATE TABLE IF NOT EXISTS public.deal_desk_projects (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  organization_id uuid NOT NULL REFERENCES public.organizations(id) ON DELETE CASCADE,
  created_by uuid REFERENCES auth.users(id) ON DELETE SET NULL,
  deal_id uuid REFERENCES public.deals(id) ON DELETE SET NULL,
  project_name text NOT NULL DEFAULT 'Neues Projekt',
  customer_name text,
  analysis_status text NOT NULL DEFAULT 'pending'
    CHECK (analysis_status IN ('pending', 'processing', 'completed', 'failed')),
  analysis_snapshot jsonb,
  analysis_source text,
  workspace_state jsonb NOT NULL DEFAULT '{}'::jsonb,
  win_probability int,
  error_message text,
  created_at timestamptz NOT NULL DEFAULT now(),
  updated_at timestamptz NOT NULL DEFAULT now()
);

CREATE INDEX IF NOT EXISTS idx_deal_desk_projects_org_created
  ON public.deal_desk_projects(organization_id, created_at DESC);

CREATE TABLE IF NOT EXISTS public.deal_desk_documents (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  project_id uuid NOT NULL REFERENCES public.deal_desk_projects(id) ON DELETE CASCADE,
  organization_id uuid NOT NULL REFERENCES public.organizations(id) ON DELETE CASCADE,
  file_name text NOT NULL,
  storage_path text,
  mime_type text,
  size_bytes bigint,
  extract_status text NOT NULL DEFAULT 'pending'
    CHECK (extract_status IN ('pending', 'completed', 'failed', 'skipped')),
  sort_order int NOT NULL DEFAULT 0,
  created_at timestamptz NOT NULL DEFAULT now()
);

CREATE INDEX IF NOT EXISTS idx_deal_desk_documents_project
  ON public.deal_desk_documents(project_id, sort_order);

CREATE OR REPLACE FUNCTION public.set_deal_desk_projects_updated_at()
RETURNS trigger
LANGUAGE plpgsql
AS $$
BEGIN
  NEW.updated_at = now();
  RETURN NEW;
END;
$$;

DROP TRIGGER IF EXISTS deal_desk_projects_updated_at ON public.deal_desk_projects;
CREATE TRIGGER deal_desk_projects_updated_at
  BEFORE UPDATE ON public.deal_desk_projects
  FOR EACH ROW
  EXECUTE FUNCTION public.set_deal_desk_projects_updated_at();

ALTER TABLE public.deal_desk_projects ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.deal_desk_documents ENABLE ROW LEVEL SECURITY;

DROP POLICY IF EXISTS "deal_desk_projects_select_own_org" ON public.deal_desk_projects;
CREATE POLICY "deal_desk_projects_select_own_org"
  ON public.deal_desk_projects FOR SELECT TO authenticated
  USING (organization_id = public.current_user_organization_id());

DROP POLICY IF EXISTS "deal_desk_projects_insert_own_org" ON public.deal_desk_projects;
CREATE POLICY "deal_desk_projects_insert_own_org"
  ON public.deal_desk_projects FOR INSERT TO authenticated
  WITH CHECK (organization_id = public.current_user_organization_id());

DROP POLICY IF EXISTS "deal_desk_projects_update_own_org" ON public.deal_desk_projects;
CREATE POLICY "deal_desk_projects_update_own_org"
  ON public.deal_desk_projects FOR UPDATE TO authenticated
  USING (organization_id = public.current_user_organization_id())
  WITH CHECK (organization_id = public.current_user_organization_id());

DROP POLICY IF EXISTS "deal_desk_projects_delete_own_org" ON public.deal_desk_projects;
CREATE POLICY "deal_desk_projects_delete_own_org"
  ON public.deal_desk_projects FOR DELETE TO authenticated
  USING (organization_id = public.current_user_organization_id());

DROP POLICY IF EXISTS "deal_desk_documents_select_own_org" ON public.deal_desk_documents;
CREATE POLICY "deal_desk_documents_select_own_org"
  ON public.deal_desk_documents FOR SELECT TO authenticated
  USING (organization_id = public.current_user_organization_id());

DROP POLICY IF EXISTS "deal_desk_documents_insert_own_org" ON public.deal_desk_documents;
CREATE POLICY "deal_desk_documents_insert_own_org"
  ON public.deal_desk_documents FOR INSERT TO authenticated
  WITH CHECK (organization_id = public.current_user_organization_id());

DROP POLICY IF EXISTS "deal_desk_documents_update_own_org" ON public.deal_desk_documents;
CREATE POLICY "deal_desk_documents_update_own_org"
  ON public.deal_desk_documents FOR UPDATE TO authenticated
  USING (organization_id = public.current_user_organization_id())
  WITH CHECK (organization_id = public.current_user_organization_id());

DROP POLICY IF EXISTS "deal_desk_documents_delete_own_org" ON public.deal_desk_documents;
CREATE POLICY "deal_desk_documents_delete_own_org"
  ON public.deal_desk_documents FOR DELETE TO authenticated
  USING (organization_id = public.current_user_organization_id());

-- Storage: deal-desk paths use same bucket; first segment remains org_id
-- Path: {organization_id}/deal-desk/{project_id}/{document_id}/{filename}
