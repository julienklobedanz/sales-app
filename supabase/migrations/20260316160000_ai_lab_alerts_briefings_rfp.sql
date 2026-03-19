-- AI Lab: High-Impact Alerts (Executive moves, company news, etc.)
CREATE TABLE IF NOT EXISTS public.high_impact_alerts (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  organization_id uuid NOT NULL REFERENCES public.organizations(id) ON DELETE CASCADE,
  title text NOT NULL,
  body text,
  alert_type text NOT NULL,
  company_id uuid REFERENCES public.companies(id) ON DELETE SET NULL,
  source_url text,
  created_at timestamptz DEFAULT now()
);

CREATE INDEX IF NOT EXISTS idx_high_impact_alerts_org_created ON public.high_impact_alerts(organization_id, created_at DESC);

ALTER TABLE public.high_impact_alerts ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Users see alerts of own org"
  ON public.high_impact_alerts FOR SELECT TO authenticated
  USING (organization_id = public.current_user_organization_id());

-- Per-user read state for alerts
CREATE TABLE IF NOT EXISTS public.alert_reads (
  user_id uuid NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  alert_id uuid NOT NULL REFERENCES public.high_impact_alerts(id) ON DELETE CASCADE,
  read_at timestamptz DEFAULT now(),
  PRIMARY KEY (user_id, alert_id)
);

ALTER TABLE public.alert_reads ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Users manage own alert reads"
  ON public.alert_reads FOR ALL TO authenticated
  USING (auth.uid() = user_id)
  WITH CHECK (auth.uid() = user_id);

-- Executive Briefings (from AI Lab)
CREATE TABLE IF NOT EXISTS public.executive_briefings (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  company_id uuid NOT NULL REFERENCES public.companies(id) ON DELETE CASCADE,
  stakeholder_id uuid REFERENCES public.stakeholders(id) ON DELETE SET NULL,
  name text NOT NULL,
  linkedin_url text,
  summary text,
  top_priorities text,
  red_flags text,
  created_at timestamptz DEFAULT now()
);

CREATE INDEX IF NOT EXISTS idx_executive_briefings_company ON public.executive_briefings(company_id);

ALTER TABLE public.executive_briefings ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Users see briefings for own org companies"
  ON public.executive_briefings FOR SELECT TO authenticated
  USING (
    EXISTS (
      SELECT 1 FROM public.companies c
      WHERE c.id = executive_briefings.company_id
        AND c.organization_id = public.current_user_organization_id()
    )
  );
CREATE POLICY "Users insert briefings for own org companies"
  ON public.executive_briefings FOR INSERT TO authenticated
  WITH CHECK (
    EXISTS (
      SELECT 1 FROM public.companies c
      WHERE c.id = executive_briefings.company_id
        AND c.organization_id = public.current_user_organization_id()
    )
  );
CREATE POLICY "Users update briefings for own org companies"
  ON public.executive_briefings FOR UPDATE TO authenticated
  USING (
    EXISTS (
      SELECT 1 FROM public.companies c
      WHERE c.id = executive_briefings.company_id
        AND c.organization_id = public.current_user_organization_id()
    )
  );
CREATE POLICY "Users delete briefings for own org companies"
  ON public.executive_briefings FOR DELETE TO authenticated
  USING (
    EXISTS (
      SELECT 1 FROM public.companies c
      WHERE c.id = executive_briefings.company_id
        AND c.organization_id = public.current_user_organization_id()
    )
  );

-- RFP Analysis results (matches to success_stories / references)
CREATE TABLE IF NOT EXISTS public.rfp_analysis (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  organization_id uuid NOT NULL REFERENCES public.organizations(id) ON DELETE CASCADE,
  company_id uuid REFERENCES public.companies(id) ON DELETE SET NULL,
  source_file_name text,
  extracted_requirements jsonb DEFAULT '[]',
  matched_reference_ids uuid[] DEFAULT '{}',
  created_at timestamptz DEFAULT now()
);

CREATE INDEX IF NOT EXISTS idx_rfp_analysis_org_created ON public.rfp_analysis(organization_id, created_at DESC);
CREATE INDEX IF NOT EXISTS idx_rfp_analysis_company ON public.rfp_analysis(company_id);

ALTER TABLE public.rfp_analysis ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Users see rfp_analysis of own org"
  ON public.rfp_analysis FOR SELECT TO authenticated
  USING (organization_id = public.current_user_organization_id());
CREATE POLICY "Users insert rfp_analysis for own org"
  ON public.rfp_analysis FOR INSERT TO authenticated
  WITH CHECK (organization_id = public.current_user_organization_id());

-- Company news cache for Market Signal Summarizer (simulated; later from API)
CREATE TABLE IF NOT EXISTS public.company_news_signals (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  company_id uuid NOT NULL REFERENCES public.companies(id) ON DELETE CASCADE,
  title text,
  summary_bullets text,
  source_url text,
  source_name text,
  published_at timestamptz,
  created_at timestamptz DEFAULT now()
);

CREATE INDEX IF NOT EXISTS idx_company_news_signals_company ON public.company_news_signals(company_id);

ALTER TABLE public.company_news_signals ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Users see company_news for own org companies"
  ON public.company_news_signals FOR SELECT TO authenticated
  USING (
    EXISTS (
      SELECT 1 FROM public.companies c
      WHERE c.id = company_news_signals.company_id
        AND c.organization_id = public.current_user_organization_id()
    )
  );
CREATE POLICY "Users insert company_news for own org companies"
  ON public.company_news_signals FOR INSERT TO authenticated
  WITH CHECK (
    EXISTS (
      SELECT 1 FROM public.companies c
      WHERE c.id = company_news_signals.company_id
        AND c.organization_id = public.current_user_organization_id()
    )
  );
