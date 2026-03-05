-- Map legacy industry values to new professional list.
-- Required: 'Handel' -> 'Retail & Consumer Goods (CPG)', 'Finanzdienstleistungen' -> 'Financial Services & Insurance'.
-- Also map other legacy German values for consistency.

-- references.industry
UPDATE public.references
SET industry = 'Retail & Consumer Goods (CPG)'
WHERE industry = 'Handel';

UPDATE public.references
SET industry = 'Financial Services & Insurance'
WHERE industry = 'Finanzdienstleistungen';

UPDATE public.references
SET industry = 'Technology, Media & Telecom (TMT)'
WHERE industry = 'IT & Software';

UPDATE public.references
SET industry = 'Healthcare & Life Sciences'
WHERE industry = 'Gesundheitswesen';

UPDATE public.references
SET industry = 'Manufacturing & Automotive'
WHERE industry = 'Industrie & Produktion';

UPDATE public.references
SET industry = 'Public Sector & Education'
WHERE industry = 'Öffentlicher Sektor';

-- companies.industry (if column exists and has same legacy values)
DO $$
BEGIN
  IF EXISTS (
    SELECT 1 FROM information_schema.columns
    WHERE table_schema = 'public' AND table_name = 'companies' AND column_name = 'industry'
  ) THEN
    UPDATE public.companies SET industry = 'Retail & Consumer Goods (CPG)' WHERE industry = 'Handel';
    UPDATE public.companies SET industry = 'Financial Services & Insurance' WHERE industry = 'Finanzdienstleistungen';
    UPDATE public.companies SET industry = 'Technology, Media & Telecom (TMT)' WHERE industry = 'IT & Software';
    UPDATE public.companies SET industry = 'Healthcare & Life Sciences' WHERE industry = 'Gesundheitswesen';
    UPDATE public.companies SET industry = 'Manufacturing & Automotive' WHERE industry = 'Industrie & Produktion';
    UPDATE public.companies SET industry = 'Public Sector & Education' WHERE industry = 'Öffentlicher Sektor';
  END IF;
END $$;
