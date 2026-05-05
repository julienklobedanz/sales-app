-- Executive Tracking: automatische Presse-/News-Erwähnungen (Google News RSS), neben manuellen Rollenwechseln.
ALTER TABLE public.market_signal_executive_events
  ADD COLUMN IF NOT EXISTS source_url text,
  ADD COLUMN IF NOT EXISTS content_hash text,
  ADD COLUMN IF NOT EXISTS event_kind text NOT NULL DEFAULT 'role_change';

UPDATE public.market_signal_executive_events
SET event_kind = 'role_change'
WHERE event_kind IS NULL OR trim(event_kind) = '';

DO $$
BEGIN
  IF NOT EXISTS (
    SELECT 1 FROM pg_constraint WHERE conname = 'market_signal_executive_events_event_kind_check'
  ) THEN
    ALTER TABLE public.market_signal_executive_events
      ADD CONSTRAINT market_signal_executive_events_event_kind_check
      CHECK (event_kind IN ('role_change', 'news_mention'));
  END IF;
END $$;

COMMENT ON COLUMN public.market_signal_executive_events.event_kind IS 'role_change = manuell/klassisch; news_mention = RSS-Ingest (Presse).';
COMMENT ON COLUMN public.market_signal_executive_events.source_url IS 'Artikel-Link bei news_mention.';

CREATE UNIQUE INDEX IF NOT EXISTS market_signal_exec_company_content_hash_uidx
  ON public.market_signal_executive_events (company_id, content_hash)
  WHERE content_hash IS NOT NULL AND length(trim(content_hash)) > 0;
