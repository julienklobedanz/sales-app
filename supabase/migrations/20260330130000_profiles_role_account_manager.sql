-- EPIC 0.5 / Arbeitspaket 4
-- Rollen-Refactor: account_owner -> account_manager

-- Datenmigration
UPDATE public.profiles
SET role = 'account_manager'
WHERE role = 'account_owner';

-- Optionales Sicherheitsnetz: Rollenliste per Check-Constraint festziehen (idempotent)
DO $$
BEGIN
  -- Bei ENUM-Spalte ist ein CHECK-Constraint redundant/konfliktträchtig; nur setzen, wenn role KEIN ENUM ist.
  IF EXISTS (
    SELECT 1
    FROM information_schema.columns
    WHERE table_schema = 'public'
      AND table_name = 'profiles'
      AND column_name = 'role'
      AND udt_name IN ('user_role', 'profile_role')
  ) THEN
    RETURN;
  END IF;

  BEGIN
    ALTER TABLE public.profiles DROP CONSTRAINT IF EXISTS profiles_role_check;
  EXCEPTION
    WHEN undefined_table THEN
      RETURN;
  END;

  BEGIN
    ALTER TABLE public.profiles
      ADD CONSTRAINT profiles_role_check
      CHECK (role IN ('admin', 'sales', 'account_manager'));
  EXCEPTION
    WHEN duplicate_object THEN
      NULL;
  END;
END $$;

