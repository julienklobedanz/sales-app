-- LLM enrichment fields for RSS ingest (signal category + sales insights)

ALTER TABLE public.market_signal_account_news
  ADD COLUMN IF NOT EXISTS signal_category text,
  ADD COLUMN IF NOT EXISTS insight_signal_fact text,
  ADD COLUMN IF NOT EXISTS insight_why_now text;

ALTER TABLE public.market_signal_executive_events
  ADD COLUMN IF NOT EXISTS signal_category text,
  ADD COLUMN IF NOT EXISTS insight_signal_fact text,
  ADD COLUMN IF NOT EXISTS insight_why_now text;

DO $$
BEGIN
  IF NOT EXISTS (
    SELECT 1 FROM pg_constraint WHERE conname = 'market_signal_account_news_signal_category_check'
  ) THEN
    ALTER TABLE public.market_signal_account_news
      ADD CONSTRAINT market_signal_account_news_signal_category_check
      CHECK (signal_category IS NULL OR signal_category IN ('people', 'finance', 'strategy'));
  END IF;

  IF NOT EXISTS (
    SELECT 1 FROM pg_constraint WHERE conname = 'market_signal_executive_events_signal_category_check'
  ) THEN
    ALTER TABLE public.market_signal_executive_events
      ADD CONSTRAINT market_signal_executive_events_signal_category_check
      CHECK (signal_category IS NULL OR signal_category IN ('people', 'finance', 'strategy'));
  END IF;
END $$;

COMMENT ON COLUMN public.market_signal_account_news.signal_category IS 'LLM/heuristic: people | finance | strategy';
COMMENT ON COLUMN public.market_signal_account_news.insight_signal_fact IS 'Kurzfazit für UI-Label (RSS ingest enrichment).';
COMMENT ON COLUMN public.market_signal_account_news.insight_why_now IS 'Vertriebs-Zweizeiler (RSS ingest enrichment).';

COMMENT ON COLUMN public.market_signal_executive_events.signal_category IS 'LLM/heuristic: people | finance | strategy';
COMMENT ON COLUMN public.market_signal_executive_events.insight_signal_fact IS 'Kurzfazit für UI-Label (RSS ingest enrichment).';
COMMENT ON COLUMN public.market_signal_executive_events.insight_why_now IS 'Vertriebs-Zweizeiler (RSS ingest enrichment).';
