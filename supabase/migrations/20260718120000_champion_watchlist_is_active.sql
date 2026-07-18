-- Soft-disable for champion watchlist (Switch off keeps the row, stops ingest/feed matching).
ALTER TABLE public.market_signal_champion_watchlist
  ADD COLUMN IF NOT EXISTS is_active boolean NOT NULL DEFAULT true;

CREATE INDEX IF NOT EXISTS idx_market_signal_champion_watchlist_user_active
  ON public.market_signal_champion_watchlist(user_id, is_active);
