-- Freitext-Unternehmen für Executive-Watchlist (Marktsignale-Einstellungen).

ALTER TABLE public.market_signal_champion_watchlist
  ADD COLUMN IF NOT EXISTS company_name text;

DROP POLICY IF EXISTS "Users update own market_signal_champion_watchlist"
  ON public.market_signal_champion_watchlist;
CREATE POLICY "Users update own market_signal_champion_watchlist"
  ON public.market_signal_champion_watchlist FOR UPDATE TO authenticated
  USING (user_id = auth.uid())
  WITH CHECK (user_id = auth.uid());
