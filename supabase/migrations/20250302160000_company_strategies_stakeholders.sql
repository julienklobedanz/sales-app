-- ClientOS: Strategische Analyse pro Firma (eine Zeile pro company)
CREATE TABLE IF NOT EXISTS public.company_strategies (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  company_id uuid NOT NULL REFERENCES public.companies(id) ON DELETE CASCADE,
  company_goals text,
  red_flags text,
  competition text,
  next_steps text,
  created_at timestamptz DEFAULT now(),
  updated_at timestamptz DEFAULT now(),
  UNIQUE(company_id)
);

CREATE INDEX IF NOT EXISTS idx_company_strategies_company_id ON public.company_strategies(company_id);

ALTER TABLE public.company_strategies ENABLE ROW LEVEL SECURITY;

-- RLS: gleiche Organisation wie die Firma
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

-- Stakeholder-Rollen für ClientOS
CREATE TYPE public.stakeholder_role AS ENUM (
  'economic_buyer',
  'champion',
  'blocker',
  'technical_buyer',
  'user_buyer'
);

CREATE TABLE IF NOT EXISTS public.stakeholders (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  company_id uuid NOT NULL REFERENCES public.companies(id) ON DELETE CASCADE,
  name text NOT NULL,
  title text,
  role public.stakeholder_role NOT NULL,
  created_at timestamptz DEFAULT now(),
  updated_at timestamptz DEFAULT now()
);

CREATE INDEX IF NOT EXISTS idx_stakeholders_company_id ON public.stakeholders(company_id);

ALTER TABLE public.stakeholders ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Users see stakeholders for own org companies"
  ON public.stakeholders FOR SELECT TO authenticated
  USING (
    EXISTS (
      SELECT 1 FROM public.companies c
      WHERE c.id = stakeholders.company_id
        AND c.organization_id = public.current_user_organization_id()
    )
  );
CREATE POLICY "Users insert stakeholders for own org companies"
  ON public.stakeholders FOR INSERT TO authenticated
  WITH CHECK (
    EXISTS (
      SELECT 1 FROM public.companies c
      WHERE c.id = stakeholders.company_id
        AND c.organization_id = public.current_user_organization_id()
    )
  );
CREATE POLICY "Users update stakeholders for own org companies"
  ON public.stakeholders FOR UPDATE TO authenticated
  USING (
    EXISTS (
      SELECT 1 FROM public.companies c
      WHERE c.id = stakeholders.company_id
        AND c.organization_id = public.current_user_organization_id()
    )
  );
CREATE POLICY "Users delete stakeholders for own org companies"
  ON public.stakeholders FOR DELETE TO authenticated
  USING (
    EXISTS (
      SELECT 1 FROM public.companies c
      WHERE c.id = stakeholders.company_id
        AND c.organization_id = public.current_user_organization_id()
    )
  );
