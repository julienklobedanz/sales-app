-- 1. Sicherstellen, dass company_goals in company_strategies existiert (Behebung des Fehlers)
ALTER TABLE public.company_strategies ADD COLUMN IF NOT EXISTS company_goals text;

-- 2. Opportunity Roadmap: Projekte pro Firma (klare Trennung von Unternehmens-Zielen)
CREATE TABLE IF NOT EXISTS public.company_roadmap_projects (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  company_id uuid NOT NULL REFERENCES public.companies(id) ON DELETE CASCADE,
  project_name text NOT NULL,
  estimated_value text,
  status text,
  target_date date,
  created_at timestamptz DEFAULT now(),
  updated_at timestamptz DEFAULT now()
);

CREATE INDEX IF NOT EXISTS idx_company_roadmap_projects_company_id ON public.company_roadmap_projects(company_id);

ALTER TABLE public.company_roadmap_projects ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Users see roadmap projects for own org companies"
  ON public.company_roadmap_projects FOR SELECT TO authenticated
  USING (
    EXISTS (
      SELECT 1 FROM public.companies c
      WHERE c.id = company_roadmap_projects.company_id
        AND c.organization_id = public.current_user_organization_id()
    )
  );
CREATE POLICY "Users insert roadmap projects for own org companies"
  ON public.company_roadmap_projects FOR INSERT TO authenticated
  WITH CHECK (
    EXISTS (
      SELECT 1 FROM public.companies c
      WHERE c.id = company_roadmap_projects.company_id
        AND c.organization_id = public.current_user_organization_id()
    )
  );
CREATE POLICY "Users update roadmap projects for own org companies"
  ON public.company_roadmap_projects FOR UPDATE TO authenticated
  USING (
    EXISTS (
      SELECT 1 FROM public.companies c
      WHERE c.id = company_roadmap_projects.company_id
        AND c.organization_id = public.current_user_organization_id()
    )
  );
CREATE POLICY "Users delete roadmap projects for own org companies"
  ON public.company_roadmap_projects FOR DELETE TO authenticated
  USING (
    EXISTS (
      SELECT 1 FROM public.companies c
      WHERE c.id = company_roadmap_projects.company_id
        AND c.organization_id = public.current_user_organization_id()
    )
  );
