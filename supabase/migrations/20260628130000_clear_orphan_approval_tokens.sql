-- Verwaiste Kundenfreigabe-Tokens entfernen (Workflow nie gestartet / Kunde nicht pending).
UPDATE public.references
SET approval_token = NULL
WHERE approval_requested_at IS NULL
  AND (customer_approval_status IS NULL OR customer_approval_status NOT IN ('pending', 'approved'))
  AND approval_token IS NOT NULL;
