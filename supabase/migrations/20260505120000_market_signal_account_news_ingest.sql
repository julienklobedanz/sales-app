-- Company News: automatischer Ingest (Dedupe, Original-Link)
ALTER TABLE public.market_signal_account_news
  ADD COLUMN IF NOT EXISTS source_url text,
  ADD COLUMN IF NOT EXISTS content_hash text,
  ADD COLUMN IF NOT EXISTS ingest_source text;

COMMENT ON COLUMN public.market_signal_account_news.source_url IS 'Original-Artikel-URL (z. B. Google News Redirect).';
COMMENT ON COLUMN public.market_signal_account_news.content_hash IS 'Dedupe: sha256(company_id|url) o. Ä.';
COMMENT ON COLUMN public.market_signal_account_news.ingest_source IS 'z. B. google_news_rss | manual';

CREATE UNIQUE INDEX IF NOT EXISTS market_signal_account_news_company_content_hash_uidx
  ON public.market_signal_account_news (company_id, content_hash)
  WHERE content_hash IS NOT NULL AND length(trim(content_hash)) > 0;
