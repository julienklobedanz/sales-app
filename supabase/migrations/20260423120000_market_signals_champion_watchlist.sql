CREATE TABLE IF NOT EXISTS public.market_signal_champion_watchlist (
  user_id uuid NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  person_key text NOT NULL,
  person_name text NOT NULL,
  created_at timestamptz NOT NULL DEFAULT now(),
  PRIMARY KEY (user_id, person_key)
);

CREATE INDEX IF NOT EXISTS idx_market_signal_champion_watchlist_user
  ON public.market_signal_champion_watchlist(user_id, created_at DESC);

ALTER TABLE public.market_signal_champion_watchlist ENABLE ROW LEVEL SECURITY;

DROP POLICY IF EXISTS "Users read own market_signal_champion_watchlist"
  ON public.market_signal_champion_watchlist;
CREATE POLICY "Users read own market_signal_champion_watchlist"
  ON public.market_signal_champion_watchlist FOR SELECT TO authenticated
  USING (user_id = auth.uid());

DROP POLICY IF EXISTS "Users insert own market_signal_champion_watchlist"
  ON public.market_signal_champion_watchlist;
CREATE POLICY "Users insert own market_signal_champion_watchlist"
  ON public.market_signal_champion_watchlist FOR INSERT TO authenticated
  WITH CHECK (user_id = auth.uid());

DROP POLICY IF EXISTS "Users delete own market_signal_champion_watchlist"
  ON public.market_signal_champion_watchlist;
CREATE POLICY "Users delete own market_signal_champion_watchlist"
  ON public.market_signal_champion_watchlist FOR DELETE TO authenticated
  USING (user_id = auth.uid());
