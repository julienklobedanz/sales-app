-- Settings consolidation persistence (Profile / Workspace / Workflow)

ALTER TABLE public.profiles
  ADD COLUMN IF NOT EXISTS notification_settings jsonb NOT NULL DEFAULT '{}'::jsonb;

ALTER TABLE public.organizations
  ADD COLUMN IF NOT EXISTS subdomain text,
  ADD COLUMN IF NOT EXISTS api_settings jsonb NOT NULL DEFAULT '{}'::jsonb,
  ADD COLUMN IF NOT EXISTS integration_settings jsonb NOT NULL DEFAULT '{}'::jsonb,
  ADD COLUMN IF NOT EXISTS workflow_settings jsonb NOT NULL DEFAULT '{}'::jsonb;

DO $$
BEGIN
  IF NOT EXISTS (
    SELECT 1
    FROM pg_constraint
    WHERE conname = 'organizations_subdomain_format_check'
  ) THEN
    ALTER TABLE public.organizations
      ADD CONSTRAINT organizations_subdomain_format_check
      CHECK (
        subdomain IS NULL
        OR subdomain ~ '^[a-z0-9](?:[a-z0-9-]{0,61}[a-z0-9])?$'
      );
  END IF;
END $$;

CREATE UNIQUE INDEX IF NOT EXISTS idx_organizations_subdomain_unique
  ON public.organizations (lower(subdomain))
  WHERE subdomain IS NOT NULL;

