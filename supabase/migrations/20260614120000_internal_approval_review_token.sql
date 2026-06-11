-- Einmal-Link für interne AM-Freigabe per E-Mail (vor Kundenfreigabe).

ALTER TABLE public.references
  ADD COLUMN IF NOT EXISTS approval_internal_review_token uuid;

CREATE UNIQUE INDEX IF NOT EXISTS idx_references_internal_review_token
  ON public.references (approval_internal_review_token)
  WHERE approval_internal_review_token IS NOT NULL;

COMMENT ON COLUMN public.references.approval_internal_review_token IS
  'Einmal-Token für interne Freigabe aus der AM-E-Mail; wird nach Bestätigung geleert.';
