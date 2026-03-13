-- Erweiterung des ENUM-Typs stakeholder_role um 'unknown' (falls noch nicht vorhanden)
DO $$
BEGIN
  -- Falls der Typ noch gar nicht existiert (z. B. in neuer DB), neu anlegen inkl. aller bekannten Werte.
  IF NOT EXISTS (
    SELECT 1
    FROM pg_type t
    WHERE t.typname = 'stakeholder_role'
  ) THEN
    CREATE TYPE public.stakeholder_role AS ENUM (
      'economic_buyer',
      'champion',
      'blocker',
      'technical_buyer',
      'user_buyer',
      'unknown'
    );
  ELSE
    -- Typ existiert: Wert 'unknown' nur ergänzen, wenn er fehlt.
    IF NOT EXISTS (
      SELECT 1
      FROM pg_type t
      JOIN pg_enum e ON t.oid = e.enumtypid
      WHERE t.typname = 'stakeholder_role'
        AND e.enumlabel = 'unknown'
    ) THEN
      ALTER TYPE public.stakeholder_role ADD VALUE 'unknown';
    END IF;
  END IF;
END
$$;

