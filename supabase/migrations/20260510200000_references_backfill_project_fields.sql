-- Referenzen: fehlende Projektfelder mit konsistenten Demo-Werten befüllen (idempotent).
-- Vertragsarten entsprechen dem Formular (CONTRACT_TYPE_GROUPS in reference-form.tsx).
-- project_start liegt ca. 4 Monate bis ~6,5 Jahre zurück (innerhalb „nicht älter als 7 Jahre“).
-- project_status / project_end: etwa jedes dritte Projekt „completed“ mit Enddatum, sonst „active“ ohne Ende.

UPDATE public.references AS r
SET
  contract_type = COALESCE(NULLIF(TRIM(r.contract_type), ''), p.contract_pick),
  incumbent_provider = COALESCE(NULLIF(TRIM(r.incumbent_provider), ''), p.incumbent_pick),
  competitors = COALESCE(NULLIF(TRIM(r.competitors), ''), p.competitors_pick),
  project_start = COALESCE(r.project_start, p.start_d),
  project_end = CASE
    WHEN r.project_end IS NOT NULL THEN r.project_end
    WHEN r.project_status = 'active'
      OR (r.project_status IS NULL AND p.status_default = 'active')
      THEN r.project_end
    ELSE
      (COALESCE(r.project_start, p.start_d)
        + ((8 + mod(abs(hashtext(r.id::text)), 28))::text || ' months')::interval)::date
  END,
  project_status = COALESCE(r.project_status, p.status_default),
  updated_at = NOW()
FROM (
  SELECT
    r2.id,
    (
      ARRAY[
        'Festpreis',
        'Time & Material',
        'Rahmenvertrag',
        'Subscription (Per User/Tiered)',
        'Usage-Based',
        'SLA-Servicevertrag',
        'Full Managed',
        'Stundenkontingent',
        'Andere'
      ]
    )[1 + mod(abs(hashtext(r2.id::text)), 9)] AS contract_pick,
    (
      ARRAY[
        'Accenture',
        'Capgemini',
        'IBM Consulting',
        'Deloitte Digital',
        'Infosys',
        'T-Systems MMS',
        'NTT Data',
        'Cognizant',
        'HCLTech'
      ]
    )[1 + mod(abs(hashtext(r2.id::text)), 9)] AS incumbent_pick,
    (
      ARRAY[
        'Atos, BearingPoint',
        'McKinsey Digital, BCG Platinion',
        'Publicis Sapient, EY',
        'PwC, KPMG Advisory',
        'NTT Data, Fujitsu',
        'Cognizant, HCLTech',
        'Wipro',
        'LTIMindtree',
        'Infosys, Tech Mahindra'
      ]
    )[1 + mod(abs(hashtext(r2.id::text)), 9)] AS competitors_pick,
    (CURRENT_DATE - ((120 + mod(abs(hashtext(r2.id::text)), 2300))::integer))::date AS start_d,
    CASE
      WHEN mod(abs(hashtext(r2.id::text)), 3) = 0 THEN 'completed'::text
      ELSE 'active'::text
    END AS status_default
  FROM public.references AS r2
  WHERE r2.deleted_at IS NULL
) AS p
WHERE r.id = p.id
  AND r.deleted_at IS NULL;