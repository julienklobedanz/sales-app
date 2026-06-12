-- Kunde sperrt Zugriff über Sperrlink: temporärer Status + Ereignis.

ALTER TABLE public.references
  DROP CONSTRAINT IF EXISTS references_customer_approval_status_check;

ALTER TABLE public.references
  ADD CONSTRAINT references_customer_approval_status_check
  CHECK (
    customer_approval_status IS NULL
    OR customer_approval_status IN (
      'pending',
      'approved',
      'rejected',
      'revoked_by_customer'
    )
  );

COMMENT ON COLUMN public.references.customer_approval_status IS
  'Kundenentscheidung / Sperrstatus (pending, approved, rejected, revoked_by_customer).';

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
      'reference_approval_updated',
      'reference_viewed',
      'reference_matched',
      'reference_exported',
      'reference_shared',
      'ki_entwurf_generated',
      'customer_approval_requested',
      'internal_approval_decided',
      'internal_approval_requested',
      'approval_delegated',
      'customer_access_revoked'
    )
  );
