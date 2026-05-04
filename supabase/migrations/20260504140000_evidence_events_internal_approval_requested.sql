-- Code loggt internal_approval_requested; Constraint aus 202604181000 listet den Typ nicht → Insert schlägt fehl.
ALTER TABLE public.evidence_events
  DROP CONSTRAINT IF EXISTS evidence_events_event_type_check;

ALTER TABLE public.evidence_events
  ADD CONSTRAINT evidence_events_event_type_check
  CHECK (
    event_type IN (
      'deal_won',
      'deal_lost',
      'deal_withdrawn',
      'reference_helped',
      'share_link_viewed',
      'reference_approval_responded',
      'reference_viewed',
      'reference_matched',
      'reference_exported',
      'reference_shared',
      'ki_entwurf_generated',
      'customer_approval_requested',
      'internal_approval_decided',
      'internal_approval_requested'
    )
  );
