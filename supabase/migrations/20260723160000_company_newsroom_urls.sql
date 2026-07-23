-- Per-customer newsroom / press URLs for market-signals ingest
ALTER TABLE public.companies
  ADD COLUMN IF NOT EXISTS newsroom_urls text[] NULL;

ALTER TABLE public.companies
  ADD COLUMN IF NOT EXISTS newsroom_discovered_at timestamptz NULL;

COMMENT ON COLUMN public.companies.newsroom_urls IS
  'Discovered press/newsroom absolute URLs for this account (market signals).';

COMMENT ON COLUMN public.companies.newsroom_discovered_at IS
  'When newsroom_urls were last probed from website_url.';
