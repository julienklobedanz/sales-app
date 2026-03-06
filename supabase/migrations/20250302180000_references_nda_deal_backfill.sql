-- Daten-Wiederherstellung: is_nda_deal für alle bestehenden Zeilen auf false setzen
-- (falls Spalte nullable war oder Einträge vor DEFAULT angelegt wurden)

DO $$
BEGIN
  IF EXISTS (
    SELECT 1 FROM information_schema.columns c
    WHERE c.table_schema = 'public' AND c.table_name = 'references' AND c.column_name = 'is_nda_deal'
      AND c.is_nullable = 'YES'
  ) THEN
    UPDATE references SET is_nda_deal = false WHERE is_nda_deal IS NULL;
    ALTER TABLE references ALTER COLUMN is_nda_deal SET DEFAULT false;
    ALTER TABLE references ALTER COLUMN is_nda_deal SET NOT NULL;
  ELSIF EXISTS (
    SELECT 1 FROM information_schema.columns
    WHERE table_schema = 'public' AND table_name = 'references' AND column_name = 'is_nda_deal'
  ) THEN
    UPDATE references SET is_nda_deal = false WHERE is_nda_deal IS NULL;
    ALTER TABLE references ALTER COLUMN is_nda_deal SET DEFAULT false;
  END IF;
EXCEPTION
  WHEN OTHERS THEN
    NULL;
END $$;
