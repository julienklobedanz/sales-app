-- Enterprise approval flow extensions:
-- internal review, delegation, reference giver, grace period, competitor blacklist, quotes, consent artifact.
ALTER TABLE public.references
  ADD COLUMN IF NOT EXISTS approval_internal_status text NOT NULL DEFAULT 'pending_internal',
  ADD COLUMN IF NOT EXISTS approval_internal_reviewer_id uuid REFERENCES public.profiles(id) ON DELETE SET NULL,
  ADD COLUMN IF NOT EXISTS approval_internal_reviewed_at timestamptz,
  ADD COLUMN IF NOT EXISTS approval_internal_review_comment text,
  ADD COLUMN IF NOT EXISTS approval_grace_until timestamptz,
  ADD COLUMN IF NOT EXISTS approval_reference_giver_name text,
  ADD COLUMN IF NOT EXISTS approval_reference_giver_title text,
  ADD COLUMN IF NOT EXISTS approval_competitor_blacklist text[] NOT NULL DEFAULT '{}',
  ADD COLUMN IF NOT EXISTS approval_quote_proposed text,
  ADD COLUMN IF NOT EXISTS approval_quote_approved text,
  ADD COLUMN IF NOT EXISTS approval_consent_file_url text,
  ADD COLUMN IF NOT EXISTS approval_delegated_to_name text,
  ADD COLUMN IF NOT EXISTS approval_delegated_to_email text;

DO $$
BEGIN
  IF NOT EXISTS (
    SELECT 1
    FROM pg_constraint
    WHERE conname = 'references_approval_internal_status_check'
  ) THEN
    ALTER TABLE public.references
      ADD CONSTRAINT references_approval_internal_status_check
      CHECK (
        approval_internal_status IN (
          'pending_internal',
          'approved_internal',
          'rejected_internal',
          'withdrawn_internal'
        )
      );
  END IF;
END $$;
