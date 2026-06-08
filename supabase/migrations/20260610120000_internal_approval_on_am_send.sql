-- Interne Freigabe gehört zum AM-Versand an den Kunden, nicht zur Kundenentscheidung.
-- Bestehende Datensätze: AM hat bereits versendet (Token + pending), intern noch offen.

UPDATE public.references
SET
  approval_internal_status = 'approved_internal',
  approval_internal_reviewed_at = COALESCE(
    approval_internal_reviewed_at,
    approval_requested_at,
    now()
  )
WHERE approval_internal_status = 'pending_internal'
  AND approval_requested_at IS NOT NULL
  AND (
    (customer_approval_status = 'pending' AND approval_token IS NOT NULL)
    OR customer_approval_status = 'approved'
  );
