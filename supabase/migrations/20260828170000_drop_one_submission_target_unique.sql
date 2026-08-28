-- Mehrere Abgaben je Eigentümer: Teilnahmeantrag, Erstangebot, finales Angebot.
-- Der partielle Unique stammte aus der automatischen Zuordnung; die gibt es seit #137 nicht.

DROP INDEX IF EXISTS public.deal_deadlines_one_submission_target_deal_idx;
DROP INDEX IF EXISTS public.deal_deadlines_one_submission_target_tender_idx;
