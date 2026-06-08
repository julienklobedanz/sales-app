-- Demo-Reset: Freigabe-Workflow für ausgewählte Referenzen zurücksetzen
-- (Samsung SoC, eBay SAP, AT&T, BMW, Arla)

WITH target_refs AS (
  SELECT r.id
  FROM public.references r
  JOIN public.companies c ON c.id = r.company_id
  WHERE r.deleted_at IS NULL
    AND (
      (c.name ILIKE '%samsung%' AND (r.title ILIKE '%soc%' OR r.title ILIKE '%soC%'))
      OR (c.name ILIKE '%ebay%' AND r.title ILIKE '%sap%')
      OR (c.name ILIKE '%at&t%' OR lower(replace(replace(c.name, '&', ''), ' ', '')) LIKE '%att%')
      OR (c.name ILIKE '%bmw%')
      OR (c.name ILIKE '%arla%')
    )
)
UPDATE public.references r
SET
  status = COALESCE(
    NULLIF(TRIM(r.approval_reference_status_snapshot), '')::public.reference_status,
    'draft'::public.reference_status
  ),
  approval_token = NULL,
  customer_approval_status = NULL,
  approval_internal_status = 'pending_internal',
  approval_requested_at = NULL,
  approval_requested_by = NULL,
  approval_requester_name = NULL,
  approval_internal_reviewer_id = NULL,
  approval_internal_reviewed_at = NULL,
  approval_responded_at = NULL,
  approval_comment = NULL,
  approval_contact_id = NULL,
  approval_external_contact_id = NULL,
  approval_delegated_to_name = NULL,
  approval_delegated_to_email = NULL,
  approval_message = NULL,
  approval_owner_name = NULL,
  approval_expires_at = NULL,
  approval_grace_until = NULL,
  approval_reference_status_snapshot = NULL,
  approval_quote_approved = NULL,
  approval_consent_file_url = NULL,
  approval_scope_confidential_sales = false,
  approval_reference_call_frequency = NULL
WHERE r.id IN (SELECT id FROM target_refs);

DELETE FROM public.approvals a
WHERE a.reference_id IN (
  SELECT r.id
  FROM public.references r
  JOIN public.companies c ON c.id = r.company_id
  WHERE r.deleted_at IS NULL
    AND (
      (c.name ILIKE '%samsung%' AND (r.title ILIKE '%soc%' OR r.title ILIKE '%soC%'))
      OR (c.name ILIKE '%ebay%' AND r.title ILIKE '%sap%')
      OR (c.name ILIKE '%at&t%' OR lower(replace(replace(c.name, '&', ''), ' ', '')) LIKE '%att%')
      OR (c.name ILIKE '%bmw%')
      OR (c.name ILIKE '%arla%')
    )
);

UPDATE public.shared_portfolios sp
SET is_active = false
WHERE sp.is_active = true
  AND EXISTS (
    SELECT 1
    FROM public.references r
    JOIN public.companies c ON c.id = r.company_id
    WHERE r.deleted_at IS NULL
      AND r.id = ANY(sp.reference_ids)
      AND (
        (c.name ILIKE '%samsung%' AND (r.title ILIKE '%soc%' OR r.title ILIKE '%soC%'))
        OR (c.name ILIKE '%ebay%' AND r.title ILIKE '%sap%')
        OR (c.name ILIKE '%at&t%' OR lower(replace(replace(c.name, '&', ''), ' ', '')) LIKE '%att%')
        OR (c.name ILIKE '%bmw%')
        OR (c.name ILIKE '%arla%')
      )
  );
