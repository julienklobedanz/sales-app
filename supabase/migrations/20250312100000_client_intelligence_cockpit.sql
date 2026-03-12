-- Client Intelligence Cockpit: Strategy Value Proposition, Account Status, Stakeholder Profiling

-- Strategy: Value Proposition (Warum gewinnen wir hier?)
ALTER TABLE public.company_strategies
  ADD COLUMN IF NOT EXISTS value_proposition text;
COMMENT ON COLUMN public.company_strategies.value_proposition IS 'Value Proposition: Warum gewinnen wir bei diesem Kunden?';

-- Companies: Account Status für Status-Badge (Account at Risk, Warm-up, Expansion)
ALTER TABLE public.companies
  ADD COLUMN IF NOT EXISTS account_status text;
COMMENT ON COLUMN public.companies.account_status IS 'Account Status: at_risk, warmup, expansion';

-- Stakeholders: Executive Radar & Relationship Map – Profiling
ALTER TABLE public.stakeholders
  ADD COLUMN IF NOT EXISTS linkedin_url text,
  ADD COLUMN IF NOT EXISTS priorities_topics text,
  ADD COLUMN IF NOT EXISTS last_contact_at date,
  ADD COLUMN IF NOT EXISTS sentiment text;
COMMENT ON COLUMN public.stakeholders.linkedin_url IS 'LinkedIn-Profil-URL';
COMMENT ON COLUMN public.stakeholders.priorities_topics IS 'Prioritäten/Themen (z. B. Digitalisierung, Cloud)';
COMMENT ON COLUMN public.stakeholders.last_contact_at IS 'Letzter Kontakt für Relationship Map';
COMMENT ON COLUMN public.stakeholders.sentiment IS 'Sentiment/Notizen (Champion/Blocker/Neutral)';
