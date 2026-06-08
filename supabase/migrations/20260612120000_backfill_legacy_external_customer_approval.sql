-- Legacy: Referenzen mit status external/approved aber ohne customer_approval_status
-- (Freigabe vor Epic-10-Workflow oder Token wurde beim Approve gelöscht).

UPDATE public.references
SET
  customer_approval_status = 'approved',
  approval_internal_status = CASE
    WHEN approval_internal_status = 'pending_internal' THEN 'approved_internal'
    ELSE approval_internal_status
  END,
  approval_internal_reviewed_at = COALESCE(
    approval_internal_reviewed_at,
    approval_responded_at,
    approval_requested_at,
    now()
  )
WHERE status IN ('external', 'approved')
  AND customer_approval_status IS NULL
  AND approval_requested_at IS NOT NULL;
