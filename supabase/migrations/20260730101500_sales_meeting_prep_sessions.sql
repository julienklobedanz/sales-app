-- Sales Lead Meeting Prep: gespeicherte Briefing-Sessions (ohne Deal-Pflicht)

CREATE TABLE IF NOT EXISTS public.sales_meeting_prep_sessions (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  organization_id uuid NOT NULL REFERENCES public.organizations(id) ON DELETE CASCADE,
  created_by uuid NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  company_id uuid REFERENCES public.companies(id) ON DELETE SET NULL,
  company_name_query text NOT NULL,
  title text NOT NULL,
  snapshot jsonb NOT NULL DEFAULT '{}'::jsonb,
  created_at timestamptz NOT NULL DEFAULT now(),
  updated_at timestamptz NOT NULL DEFAULT now()
);

CREATE INDEX IF NOT EXISTS idx_sales_meeting_prep_sessions_org_user_created
  ON public.sales_meeting_prep_sessions (organization_id, created_by, created_at DESC);

CREATE INDEX IF NOT EXISTS idx_sales_meeting_prep_sessions_company
  ON public.sales_meeting_prep_sessions (company_id)
  WHERE company_id IS NOT NULL;

ALTER TABLE public.sales_meeting_prep_sessions ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Users see own org meeting prep sessions"
  ON public.sales_meeting_prep_sessions FOR SELECT TO authenticated
  USING (organization_id = public.current_user_organization_id());

CREATE POLICY "Users insert own meeting prep sessions"
  ON public.sales_meeting_prep_sessions FOR INSERT TO authenticated
  WITH CHECK (
    organization_id = public.current_user_organization_id()
    AND created_by = auth.uid()
  );

CREATE POLICY "Users update own meeting prep sessions"
  ON public.sales_meeting_prep_sessions FOR UPDATE TO authenticated
  USING (
    organization_id = public.current_user_organization_id()
    AND created_by = auth.uid()
  )
  WITH CHECK (
    organization_id = public.current_user_organization_id()
    AND created_by = auth.uid()
  );

CREATE POLICY "Users delete own meeting prep sessions"
  ON public.sales_meeting_prep_sessions FOR DELETE TO authenticated
  USING (
    organization_id = public.current_user_organization_id()
    AND created_by = auth.uid()
  );
