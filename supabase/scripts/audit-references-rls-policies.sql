-- Einmalige Prüfung im Supabase SQL Editor (Live-DB)
-- Zeigt alle RLS-Policies auf public.references und auffällige Daten-Inkonsistenzen.

-- 1) Policies auf references
SELECT
  pol.polname AS policy_name,
  CASE pol.polcmd
    WHEN 'r' THEN 'SELECT'
    WHEN 'a' THEN 'INSERT'
    WHEN 'w' THEN 'UPDATE'
    WHEN 'd' THEN 'DELETE'
    WHEN '*' THEN 'ALL'
    ELSE pol.polcmd::text
  END AS command,
  pol.polpermissive AS permissive,
  pg_get_expr(pol.polqual, pol.polrelid) AS using_expression,
  pg_get_expr(pol.polwithcheck, pol.polrelid) AS with_check_expression
FROM pg_policy pol
JOIN pg_class cls ON cls.oid = pol.polrelid
JOIN pg_namespace nsp ON nsp.oid = cls.relnamespace
WHERE nsp.nspname = 'public'
  AND cls.relname = 'references'
ORDER BY pol.polname;

-- 2) Verdächtige Legacy-Policy-Namen (sollte 0 Zeilen liefern)
SELECT pol.polname
FROM pg_policy pol
JOIN pg_class cls ON cls.oid = pol.polrelid
WHERE cls.relname = 'references'
  AND pol.polname ILIKE '%authenticated users%';

-- 3) Referenzen, deren organization_id nicht zur Company passt
SELECT
  r.id,
  r.title,
  r.organization_id AS ref_org_id,
  c.organization_id AS company_org_id,
  c.name AS company_name
FROM public.references r
JOIN public.companies c ON c.id = r.company_id
WHERE r.organization_id IS DISTINCT FROM c.organization_id
LIMIT 50;

-- 4) Referenzen ohne organization_id (sollte nach Migration 0 sein)
SELECT count(*) AS refs_missing_org_id
FROM public.references
WHERE organization_id IS NULL;
