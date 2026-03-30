-- EPIC 12: profiles.updated_at ergänzen (wird im Code an mehreren Stellen verwendet)

ALTER TABLE public.profiles
ADD COLUMN IF NOT EXISTS updated_at timestamptz DEFAULT now();

-- Optional: Backfill für bestehende Zeilen ohne Wert
UPDATE public.profiles
SET updated_at = now()
WHERE updated_at IS NULL;

