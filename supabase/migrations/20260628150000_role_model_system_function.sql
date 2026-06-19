-- Welle 1: Zwei-Dimensionen-Rollenmodell auf profiles (system_role + function_role + capabilities).

DO $$ BEGIN
  CREATE TYPE public.system_role AS ENUM ('owner', 'admin', 'member', 'viewer');
EXCEPTION WHEN duplicate_object THEN NULL;
END $$;

DO $$ BEGIN
  CREATE TYPE public.function_role AS ENUM ('sales_rep', 'account_manager', 'sales_leader');
EXCEPTION WHEN duplicate_object THEN NULL;
END $$;

ALTER TABLE public.profiles
  ADD COLUMN IF NOT EXISTS system_role public.system_role NOT NULL DEFAULT 'member',
  ADD COLUMN IF NOT EXISTS function_role public.function_role NOT NULL DEFAULT 'sales_rep',
  ADD COLUMN IF NOT EXISTS capabilities jsonb NOT NULL DEFAULT '{}'::jsonb;

DO $$
BEGIN
  IF EXISTS (
    SELECT 1 FROM information_schema.columns
    WHERE table_schema = 'public' AND table_name = 'profiles' AND column_name = 'role'
  ) THEN
    UPDATE public.profiles
    SET
      system_role = CASE role::text
        WHEN 'admin' THEN 'admin'::public.system_role
        ELSE 'member'::public.system_role
      END,
      function_role = CASE role::text
        WHEN 'admin' THEN 'sales_leader'::public.function_role
        WHEN 'account_manager' THEN 'account_manager'::public.function_role
        ELSE 'sales_rep'::public.function_role
      END
    WHERE system_role = 'member'::public.system_role
      AND function_role = 'sales_rep'::public.function_role
      AND role IS NOT NULL;
  END IF;
END $$;

WITH oldest_admin AS (
  SELECT DISTINCT ON (p.organization_id) p.id
  FROM public.profiles p
  JOIN auth.users u ON u.id = p.id
  WHERE p.system_role = 'admin'::public.system_role
    AND p.organization_id IS NOT NULL
  ORDER BY p.organization_id, u.created_at ASC
)
UPDATE public.profiles p
SET system_role = 'owner'::public.system_role
FROM oldest_admin oa
WHERE p.id = oa.id;

DO $$
BEGIN
  IF EXISTS (
    SELECT 1 FROM information_schema.columns
    WHERE table_schema = 'public' AND table_name = 'profiles' AND column_name = 'role'
  ) THEN
    CREATE OR REPLACE FUNCTION public.sync_legacy_profile_role()
    RETURNS trigger
    LANGUAGE plpgsql
    AS $fn$
    BEGIN
      NEW.role := CASE
        WHEN NEW.function_role = 'account_manager'::public.function_role THEN 'account_manager'
        WHEN NEW.system_role IN ('owner'::public.system_role, 'admin'::public.system_role) THEN 'admin'
        ELSE 'sales'
      END;
      RETURN NEW;
    END;
    $fn$;

    DROP TRIGGER IF EXISTS trg_sync_legacy_profile_role ON public.profiles;
    CREATE TRIGGER trg_sync_legacy_profile_role
      BEFORE INSERT OR UPDATE OF system_role, function_role ON public.profiles
      FOR EACH ROW
      EXECUTE FUNCTION public.sync_legacy_profile_role();
  END IF;
END $$;

DO $$
BEGIN
  PERFORM pg_catalog.pg_notify('pgrst', 'reload schema');
END $$;
