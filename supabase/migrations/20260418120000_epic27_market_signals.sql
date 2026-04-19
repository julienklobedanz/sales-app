-- Epic 27 / KAN-214: Market Signals – Executive Tracking & Account News (Phase 1, manuell gepflegt)

CREATE TABLE IF NOT EXISTS public.market_signal_executive_events (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  company_id uuid NOT NULL REFERENCES public.companies(id) ON DELETE CASCADE,
  person_name text NOT NULL,
  person_title_before text,
  person_title_after text,
  change_summary text NOT NULL,
  detected_at timestamptz NOT NULL DEFAULT now(),
  created_by uuid REFERENCES auth.users(id) ON DELETE SET NULL,
  created_at timestamptz NOT NULL DEFAULT now()
);

CREATE INDEX IF NOT EXISTS idx_market_signal_exec_company_detected
  ON public.market_signal_executive_events(company_id, detected_at DESC);

ALTER TABLE public.market_signal_executive_events ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Users see executive events for own org companies"
  ON public.market_signal_executive_events FOR SELECT TO authenticated
  USING (
    EXISTS (
      SELECT 1 FROM public.companies c
      WHERE c.id = market_signal_executive_events.company_id
        AND c.organization_id = public.current_user_organization_id()
    )
  );

CREATE POLICY "Users insert executive events for own org companies"
  ON public.market_signal_executive_events FOR INSERT TO authenticated
  WITH CHECK (
    EXISTS (
      SELECT 1 FROM public.companies c
      WHERE c.id = company_id
        AND c.organization_id = public.current_user_organization_id()
    )
  );

CREATE POLICY "Users update executive events for own org companies"
  ON public.market_signal_executive_events FOR UPDATE TO authenticated
  USING (
    EXISTS (
      SELECT 1 FROM public.companies c
      WHERE c.id = market_signal_executive_events.company_id
        AND c.organization_id = public.current_user_organization_id()
    )
  );

CREATE POLICY "Users delete executive events for own org companies"
  ON public.market_signal_executive_events FOR DELETE TO authenticated
  USING (
    EXISTS (
      SELECT 1 FROM public.companies c
      WHERE c.id = market_signal_executive_events.company_id
        AND c.organization_id = public.current_user_organization_id()
    )
  );

-- Account News (Kunde vs. Prospect manuell gesetzt)
CREATE TABLE IF NOT EXISTS public.market_signal_account_news (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  company_id uuid NOT NULL REFERENCES public.companies(id) ON DELETE CASCADE,
  body text NOT NULL,
  source_label text,
  published_on date NOT NULL DEFAULT (CURRENT_DATE),
  segment text NOT NULL CHECK (segment IN ('customer', 'prospect')),
  created_by uuid REFERENCES auth.users(id) ON DELETE SET NULL,
  created_at timestamptz NOT NULL DEFAULT now()
);

CREATE INDEX IF NOT EXISTS idx_market_signal_news_company_published
  ON public.market_signal_account_news(company_id, published_on DESC);

ALTER TABLE public.market_signal_account_news ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Users see account news for own org companies"
  ON public.market_signal_account_news FOR SELECT TO authenticated
  USING (
    EXISTS (
      SELECT 1 FROM public.companies c
      WHERE c.id = market_signal_account_news.company_id
        AND c.organization_id = public.current_user_organization_id()
    )
  );

CREATE POLICY "Users insert account news for own org companies"
  ON public.market_signal_account_news FOR INSERT TO authenticated
  WITH CHECK (
    EXISTS (
      SELECT 1 FROM public.companies c
      WHERE c.id = company_id
        AND c.organization_id = public.current_user_organization_id()
    )
  );

CREATE POLICY "Users update account news for own org companies"
  ON public.market_signal_account_news FOR UPDATE TO authenticated
  USING (
    EXISTS (
      SELECT 1 FROM public.companies c
      WHERE c.id = market_signal_account_news.company_id
        AND c.organization_id = public.current_user_organization_id()
    )
  );

CREATE POLICY "Users delete account news for own org companies"
  ON public.market_signal_account_news FOR DELETE TO authenticated
  USING (
    EXISTS (
      SELECT 1 FROM public.companies c
      WHERE c.id = market_signal_account_news.company_id
        AND c.organization_id = public.current_user_organization_id()
    )
  );

COMMENT ON TABLE public.market_signal_executive_events IS 'Phase 1: manuelle/CSV-gepflegte Führungswechsel je Account (Epic 27).';
COMMENT ON TABLE public.market_signal_account_news IS 'Phase 1: manuelle Account-News; Segment Kunde/Prospect (Epic 27).';
