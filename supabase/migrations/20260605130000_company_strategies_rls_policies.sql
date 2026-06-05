-- company_strategies: RLS war aktiv, Policies fehlten in Ziel-DB → INSERT/UPDATE blockiert.

ALTER TABLE public.company_strategies ENABLE ROW LEVEL SECURITY;

DROP POLICY IF EXISTS "Users see strategies for own org companies" ON public.company_strategies;
DROP POLICY IF EXISTS "Users insert strategies for own org companies" ON public.company_strategies;
DROP POLICY IF EXISTS "Users update strategies for own org companies" ON public.company_strategies;
DROP POLICY IF EXISTS "Users delete strategies for own org companies" ON public.company_strategies;

CREATE POLICY "Users see strategies for own org companies"
  ON public.company_strategies FOR SELECT TO authenticated
  USING (
    EXISTS (
      SELECT 1 FROM public.companies c
      WHERE c.id = company_strategies.company_id
        AND c.organization_id = public.current_user_organization_id()
    )
  );

CREATE POLICY "Users insert strategies for own org companies"
  ON public.company_strategies FOR INSERT TO authenticated
  WITH CHECK (
    EXISTS (
      SELECT 1 FROM public.companies c
      WHERE c.id = company_strategies.company_id
        AND c.organization_id = public.current_user_organization_id()
    )
  );

CREATE POLICY "Users update strategies for own org companies"
  ON public.company_strategies FOR UPDATE TO authenticated
  USING (
    EXISTS (
      SELECT 1 FROM public.companies c
      WHERE c.id = company_strategies.company_id
        AND c.organization_id = public.current_user_organization_id()
    )
  )
  WITH CHECK (
    EXISTS (
      SELECT 1 FROM public.companies c
      WHERE c.id = company_strategies.company_id
        AND c.organization_id = public.current_user_organization_id()
    )
  );

CREATE POLICY "Users delete strategies for own org companies"
  ON public.company_strategies FOR DELETE TO authenticated
  USING (
    EXISTS (
      SELECT 1 FROM public.companies c
      WHERE c.id = company_strategies.company_id
        AND c.organization_id = public.current_user_organization_id()
    )
  );
