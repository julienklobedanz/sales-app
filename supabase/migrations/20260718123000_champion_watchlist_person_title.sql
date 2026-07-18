-- Cached role/title for champion watchlist (from stakeholders / signal events / later KI).
ALTER TABLE public.market_signal_champion_watchlist
  ADD COLUMN IF NOT EXISTS person_title text;
