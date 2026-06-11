-- Phase 4: Historische Branchenwerte → 12 Master-IDs (fin, ret, man, tech, media, energy, health, pub, log, cons, prop, other).
-- Idempotent: Zeilen mit bereits gültiger Master-ID werden nicht überschrieben.
-- Vergleich case-insensitiv via lower(btrim(...)).

-- ---------------------------------------------------------------------------
-- Optional: Vorschau im SQL Editor (nur lesen, vor dem UPDATE ausführen)
-- ---------------------------------------------------------------------------
-- SELECT 'references' AS tbl, industry, COUNT(*) AS cnt
-- FROM public.references
-- WHERE industry IS NULL
--    OR btrim(industry) = ''
--    OR lower(btrim(industry)) NOT IN (
--      'fin','ret','man','tech','media','energy','health','pub','log','cons','prop','other'
--    )
-- GROUP BY 1, 2
-- ORDER BY cnt DESC;
--
-- SELECT 'companies' AS tbl, industry, COUNT(*) AS cnt
-- FROM public.companies
-- WHERE industry IS NULL
--    OR btrim(industry) = ''
--    OR lower(btrim(industry)) NOT IN (
--      'fin','ret','man','tech','media','energy','health','pub','log','cons','prop','other'
--    )
-- GROUP BY 1, 2
-- ORDER BY cnt DESC;
--
-- SELECT 'deals' AS tbl, industry, COUNT(*) AS cnt
-- FROM public.deals
-- WHERE industry IS NULL
--    OR btrim(industry) = ''
--    OR lower(btrim(industry)) NOT IN (
--      'fin','ret','man','tech','media','energy','health','pub','log','cons','prop','other'
--    )
-- GROUP BY 1, 2
-- ORDER BY cnt DESC;

CREATE OR REPLACE FUNCTION public.map_legacy_industry_to_master_id(raw text)
RETURNS text
LANGUAGE sql
IMMUTABLE
PARALLEL SAFE
AS $$
  SELECT CASE
    WHEN raw IS NULL OR btrim(raw) = '' THEN 'other'
  ELSE CASE lower(btrim(raw))
    -- fin
    WHEN 'finanzdienstleistungen & versicherung' THEN 'fin'
    WHEN 'financial services & insurance' THEN 'fin'
    WHEN 'finanz' THEN 'fin'
    WHEN 'versicherung' THEN 'fin'
    WHEN 'finanzdienstleistungen' THEN 'fin'

    -- ret
    WHEN 'handel & konsumgüter' THEN 'ret'
    WHEN 'retail & consumer goods (cpg)' THEN 'ret'
    WHEN 'retail & consumer goods' THEN 'ret'
    WHEN 'handel' THEN 'ret'
    WHEN 'e-commerce' THEN 'ret'

    -- man
    WHEN 'industrie & automotive' THEN 'man'
    WHEN 'manufacturing & automotive' THEN 'man'
    WHEN 'industrie & produktion' THEN 'man'
    WHEN 'manufacturing' THEN 'man'
    WHEN 'automotive' THEN 'man'

    -- tech
    WHEN 'software, tech & telekommunikation' THEN 'tech'
    WHEN 'technology, media & telecom (tmt)' THEN 'tech'
    WHEN 'software, tech & telecom' THEN 'tech'
    WHEN 'it & software' THEN 'tech'
    WHEN 'it' THEN 'tech'
    WHEN 'software' THEN 'tech'
    WHEN 'technologie, medien & telekommunikation' THEN 'tech'

    -- media
    WHEN 'medien, marketing & unterhaltung' THEN 'media'
    WHEN 'media, entertainment & marketing' THEN 'media'

    -- energy
    WHEN 'energie, versorgung & rohstoffe' THEN 'energy'
    WHEN 'energy, resources & utilities' THEN 'energy'
    WHEN 'energy, utilities & resources' THEN 'energy'
    WHEN 'energie' THEN 'energy'
    WHEN 'energie, rohstoffe & versorgung' THEN 'energy'

    -- health
    WHEN 'gesundheitswesen, life sciences & chemie' THEN 'health'
    WHEN 'healthcare & life sciences' THEN 'health'
    WHEN 'healthcare, life sciences & chemical' THEN 'health'
    WHEN 'gesundheitswesen' THEN 'health'
    WHEN 'pharma' THEN 'health'
    WHEN 'gesundheitswesen & life sciences' THEN 'health'

    -- pub
    WHEN 'öffentlicher sektor & bildung' THEN 'pub'
    WHEN 'public sector & education' THEN 'pub'
    WHEN 'öffentlicher sektor' THEN 'pub'

    -- log
    WHEN 'logistik, transport & aviation' THEN 'log'
    WHEN 'logistics, transport & aviation' THEN 'log'
    WHEN 'logistik & transport' THEN 'log'
    WHEN 'logistik / supply chain' THEN 'log'
    WHEN 'logistik' THEN 'log'
    WHEN 'reise, transport & gastgewerbe' THEN 'log'
    WHEN 'travel, transport & hospitality' THEN 'log'

    -- cons
    WHEN 'beratung & professional services' THEN 'cons'
    WHEN 'professional services & logistics' THEN 'cons'
    WHEN 'professional services & consulting' THEN 'cons'
    WHEN 'beratung' THEN 'cons'
    WHEN 'beratung & logistik' THEN 'cons'

    -- prop
    WHEN 'immobilien & bauwirtschaft' THEN 'prop'
    WHEN 'real estate & construction' THEN 'prop'
    WHEN 'bauwirtschaft' THEN 'prop'

    -- explizite Sonstige-Labels
    WHEN 'sonstige' THEN 'other'
    WHEN 'other' THEN 'other'

    ELSE 'other'
  END
  END;
$$;

COMMENT ON FUNCTION public.map_legacy_industry_to_master_id(text) IS
  'Mappt historische Branchen-Labels (DE/EN) auf Master-IDs; NULL/Leer → other.';

-- Nur Zeilen anfassen, die noch KEINE gültige Master-ID sind (oder NULL/leer).
CREATE OR REPLACE FUNCTION public.industry_needs_master_normalization(raw text)
RETURNS boolean
LANGUAGE sql
IMMUTABLE
PARALLEL SAFE
AS $$
  SELECT
    raw IS NULL
    OR btrim(raw) = ''
    OR lower(btrim(raw)) NOT IN (
      'fin', 'ret', 'man', 'tech', 'media', 'energy',
      'health', 'pub', 'log', 'cons', 'prop', 'other'
    );
$$;

DO $$
DECLARE
  v_refs_updated integer := 0;
  v_companies_updated integer := 0;
  v_deals_updated integer := 0;
  v_refs_skipped integer := 0;
  v_companies_skipped integer := 0;
  v_deals_skipped integer := 0;
BEGIN
  SELECT COUNT(*) INTO v_refs_skipped
  FROM public.references
  WHERE NOT public.industry_needs_master_normalization(industry);

  SELECT COUNT(*) INTO v_companies_skipped
  FROM public.companies
  WHERE NOT public.industry_needs_master_normalization(industry);

  SELECT COUNT(*) INTO v_deals_skipped
  FROM public.deals
  WHERE NOT public.industry_needs_master_normalization(industry);

  RAISE NOTICE 'industry master-id migration: start';
  RAISE NOTICE 'references — bereits gültige IDs (übersprungen): %', v_refs_skipped;
  RAISE NOTICE 'companies — bereits gültige IDs (übersprungen): %', v_companies_skipped;
  RAISE NOTICE 'deals — bereits gültige IDs (übersprungen): %', v_deals_skipped;

  UPDATE public.references r
  SET industry = public.map_legacy_industry_to_master_id(r.industry)
  WHERE public.industry_needs_master_normalization(r.industry)
    AND r.industry IS DISTINCT FROM public.map_legacy_industry_to_master_id(r.industry);

  GET DIAGNOSTICS v_refs_updated = ROW_COUNT;
  RAISE NOTICE 'references.industry — aktualisiert: %', v_refs_updated;

  UPDATE public.companies c
  SET industry = public.map_legacy_industry_to_master_id(c.industry)
  WHERE public.industry_needs_master_normalization(c.industry)
    AND c.industry IS DISTINCT FROM public.map_legacy_industry_to_master_id(c.industry);

  GET DIAGNOSTICS v_companies_updated = ROW_COUNT;
  RAISE NOTICE 'companies.industry — aktualisiert: %', v_companies_updated;

  UPDATE public.deals d
  SET industry = public.map_legacy_industry_to_master_id(d.industry)
  WHERE public.industry_needs_master_normalization(d.industry)
    AND d.industry IS DISTINCT FROM public.map_legacy_industry_to_master_id(d.industry);

  GET DIAGNOSTICS v_deals_updated = ROW_COUNT;
  RAISE NOTICE 'deals.industry — aktualisiert: %', v_deals_updated;

  RAISE NOTICE 'industry master-id migration: done (refs=%, companies=%, deals=%)',
    v_refs_updated, v_companies_updated, v_deals_updated;
END $$;
