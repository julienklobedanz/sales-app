-- reference_assets: Kategorisierung (Sales Material, Verträge, Sonstiges)

DO $$
BEGIN
  IF NOT EXISTS (
    SELECT 1 FROM information_schema.columns
    WHERE table_schema = 'public' AND table_name = 'reference_assets' AND column_name = 'category'
  ) THEN
    ALTER TABLE public.reference_assets
      ADD COLUMN category text NOT NULL DEFAULT 'other'
        CHECK (category IN ('sales', 'contract', 'other'));
  END IF;
END $$;

COMMENT ON COLUMN public.reference_assets.category IS 'Kategorie: sales = Sales Material, contract = Verträge, other = Sonstiges';
