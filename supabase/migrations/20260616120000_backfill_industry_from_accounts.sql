-- Korrektur nach Master-ID-Migration:
-- 1) Account-Branchen (companies) anhand bekannter Firmennamen setzen, wo Brandfetch/Alt-Daten falsch waren.
-- 2) Referenz-Branchen (references) vom verknüpften Account übernehmen.
--
-- Idempotent. Valide Master-IDs auf companies werden nur überschrieben, wenn ein Name-Match greift
-- UND die aktuelle Branche 'other' ist ODER von der Ziel-ID abweicht (Korrektur-Whitelist).

-- ---------------------------------------------------------------------------
-- VORSCHAU (nur lesen):
-- ---------------------------------------------------------------------------
-- SELECT c.name, c.industry AS company_industry, r.title, r.industry AS ref_industry
-- FROM public.references r
-- JOIN public.companies c ON c.id = r.company_id
-- WHERE r.deleted_at IS NULL
-- ORDER BY c.name, r.title;

-- Bekannte Demo-/Referenz-Accounts → Master-ID (erweiterbar)
CREATE OR REPLACE FUNCTION public.resolve_industry_id_by_company_name(company_name text)
RETURNS text
LANGUAGE sql
IMMUTABLE
PARALLEL SAFE
AS $$
  SELECT CASE
    WHEN company_name IS NULL OR btrim(company_name) = '' THEN NULL
    -- man: Automotive, Industrie, Metall
    WHEN company_name ~* '\mbmw\M' THEN 'man'
    WHEN company_name ~* '\baurubis\M' THEN 'man'
    WHEN company_name ~* '\bvolkswagen\M|\bvw\M|\bmercedes|M|\baudi\M|\bporsche\M|\bbosch\M|\bsiemens\M' THEN 'man'
  -- ret: Handel, Konsum, Food, E-Commerce
    WHEN company_name ~* '\barla\M' THEN 'ret'
    WHEN company_name ~* '\bebay\M' THEN 'ret'
    WHEN company_name ~* '\bconrad\M' THEN 'ret'
    WHEN company_name ~* '\bamazon\M|\bzalando\M|\blidl\M|\baldi\M|\bmetro\M|\brewe\M|\bedeka\M' THEN 'ret'
    WHEN company_name ~* '\bnestl[eé]\M|\bunilever\M|\bcoca.?cola\M' THEN 'ret'
  -- fin
    WHEN company_name ~* '\bdeutsche bank\M|\ballianz\M|\bcommerzbank\M|\bsparkasse\M' THEN 'fin'
  -- energy
    WHEN company_name ~* '\be\.on\M|\brwe\M|\bvattenfall\M|\benbw\M' THEN 'energy'
  -- health
    WHEN company_name ~* '\bbayer\M|\bnovartis\M|\broche\M|\bpfizer\M' THEN 'health'
  -- log
    WHEN company_name ~* '\bdhl\M|\bdp world\M|\blufthansa\M|\bfedex\M|\bups\M' THEN 'log'
  -- tech (Telekom, Software, Consumer Electronics mit Tech-Fokus)
    WHEN company_name ~* '\bat&t\M|\batt\M' THEN 'tech'
    WHEN company_name ~* '\bapple\M|\bmicrosoft\M|\bgoogle\M|\bmeta\M|\bnetflix\M' THEN 'tech'
    WHEN company_name ~* '\bsamsung\M|\bfujitsu\M|\bintel\M|\bnvidia\M|\boracle\M|\bsap\M' THEN 'tech'
    WHEN company_name ~* '\bdeutsche telekom\M|\btelekom\M|\bvodafone\M' THEN 'tech'
    ELSE NULL
  END;
$$;

COMMENT ON FUNCTION public.resolve_industry_id_by_company_name(text) IS
  'Heuristik: Firmenname → Master-Branchen-ID für Demo-/Korrektur-Backfill. NULL = kein Treffer.';

DO $$
DECLARE
  v_companies_updated integer := 0;
  v_refs_updated integer := 0;
BEGIN
  RAISE NOTICE 'industry account backfill: start';

  -- Schritt 1: companies.industry korrigieren (nur bei Namens-Match)
  UPDATE public.companies c
  SET industry = public.resolve_industry_id_by_company_name(c.name)
  WHERE public.resolve_industry_id_by_company_name(c.name) IS NOT NULL
    AND (
      c.industry IS NULL
      OR btrim(c.industry) = ''
      OR lower(btrim(c.industry)) = 'other'
      OR c.industry IS DISTINCT FROM public.resolve_industry_id_by_company_name(c.name)
    );

  GET DIAGNOSTICS v_companies_updated = ROW_COUNT;
  RAISE NOTICE 'companies.industry — per Namens-Heuristik aktualisiert: %', v_companies_updated;

  -- Schritt 2: references.industry vom Account übernehmen (Account = Source of Truth)
  UPDATE public.references r
  SET industry = c.industry
  FROM public.companies c
  WHERE c.id = r.company_id
    AND r.deleted_at IS NULL
    AND c.industry IS NOT NULL
    AND btrim(c.industry) <> ''
    AND r.industry IS DISTINCT FROM c.industry;

  GET DIAGNOSTICS v_refs_updated = ROW_COUNT;
  RAISE NOTICE 'references.industry — von companies übernommen: %', v_refs_updated;
  RAISE NOTICE 'industry account backfill: done (companies=%, references=%)',
    v_companies_updated, v_refs_updated;
END $$;
