-- Demo-/Seed-Marktsignale entfernen; Live-RSS-Zeilen (google_news_rss / news_mention + content_hash) bleiben.

DELETE FROM public.market_signal_account_news
WHERE ingest_source IS DISTINCT FROM 'google_news_rss';

DELETE FROM public.market_signal_executive_events
WHERE event_kind IS DISTINCT FROM 'news_mention'
   OR content_hash IS NULL;
