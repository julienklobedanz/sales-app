-- EPIC 0.5 / Arbeitspaket 4
-- Rollen-Refactor: ENUM erweitern (muss vor UPDATE committed sein)

DO $$
BEGIN
  -- Standard: Supabase-Enum heißt bei vielen Projekten "user_role"
  IF EXISTS (SELECT 1 FROM pg_type WHERE typname = 'user_role') THEN
    EXECUTE 'ALTER TYPE public.user_role ADD VALUE IF NOT EXISTS ''account_manager''';
    RETURN;
  END IF;

  -- Fallback: falls anders benannt
  IF EXISTS (SELECT 1 FROM pg_type WHERE typname = 'profile_role') THEN
    EXECUTE 'ALTER TYPE public.profile_role ADD VALUE IF NOT EXISTS ''account_manager''';
    RETURN;
  END IF;
END $$;

