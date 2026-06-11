-- Einmalige Bereinigung: Stellenanzeigen und Karriere-Rauschen aus RSS-Signalen entfernen.
-- Heuristik spiegelt lib/market-signals/sales-signal-relevance.ts (isLowValueRssTitle).

DELETE FROM public.market_signal_account_news
WHERE body ~* '(m/w/d|w/m/d|m/f/d|all genders|\(m/w/d\)|stellenanzeige|jobangebot|jobsuche|karriereportal|recruiting|praktikum|werkstudent|ausbildung|traineeprogramm|duales studium|wir suchen|jetzt bewerben|bewerbung bis|stellenmarkt|your career|join our team|we are hiring|karriere\s+bei|jobs\s+bei|instandhaltung|facility management|hausmeister|reinigungskraft)';

DELETE FROM public.market_signal_executive_events
WHERE event_kind = 'news_mention'
  AND change_summary ~* '(m/w/d|w/m/d|m/f/d|all genders|\(m/w/d\)|stellenanzeige|jobangebot|jobsuche|karriereportal|recruiting|praktikum|werkstudent|ausbildung|traineeprogramm|duales studium|wir suchen|jetzt bewerben|bewerbung bis|stellenmarkt|your career|join our team|we are hiring|karriere\s+bei|jobs\s+bei|instandhaltung|facility management|hausmeister|reinigungskraft)';
