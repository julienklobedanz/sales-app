-- Kunden-Freigabe: vertrauliche Sales-Nutzung + Referenz-Call-Frequenz
ALTER TABLE public.references
  ADD COLUMN IF NOT EXISTS approval_scope_confidential_sales boolean NOT NULL DEFAULT false,
  ADD COLUMN IF NOT EXISTS approval_reference_call_frequency text;

COMMENT ON COLUMN public.references.approval_scope_confidential_sales IS
  'Kunde erlaubt vertrauliche 1:1 Sales-Nutzung (unter NDA).';
COMMENT ON COLUMN public.references.approval_reference_call_frequency IS
  'Max. Häufigkeit Reference Calls: quarterly | twice_yearly | yearly.';

DO $$
BEGIN
  IF NOT EXISTS (
    SELECT 1 FROM pg_constraint WHERE conname = 'references_approval_reference_call_frequency_check'
  ) THEN
    ALTER TABLE public.references
      ADD CONSTRAINT references_approval_reference_call_frequency_check
      CHECK (
        approval_reference_call_frequency IS NULL
        OR approval_reference_call_frequency IN ('quarterly', 'twice_yearly', 'yearly')
      );
  END IF;
END $$;
