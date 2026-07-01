-- Smart Match / Stufe C: strukturelle Vorfilter für die semantische Referenz-Suche.
-- Ergänzt match_references um optionale Filter (Branche, Volumen-Range, Status,
-- created_at) UND gibt status + created_at zurück. Alle Filter default NULL =
-- kein Filter -> vollständig rückwärtskompatibel zu Aufrufern mit den 5 Altparametern.
--
-- Prinzip: VORfiltern (harte SQL-Bedingungen) -> semantisch ranken -> Top-N.
-- Semantische Suche allein kann keine numerischen/kategorialen Constraints erzwingen
-- (z. B. "Volumen > 2 Mio" matchte sonst auch kleinere Projekte).

-- Alte 5-Parameter-Signatur entfernen (sonst Overload-Ambiguität bei benannten Params).
DROP FUNCTION IF EXISTS public.match_references(vector(1536), double precision, integer, uuid, boolean);

CREATE OR REPLACE FUNCTION public.match_references(
  query_embedding vector(1536),
  match_threshold double precision,
  match_count integer,
  p_organization_id uuid,
  p_sales_visible_only boolean DEFAULT false,
  p_industries text[] DEFAULT NULL,
  p_min_volume bigint DEFAULT NULL,
  p_max_volume bigint DEFAULT NULL,
  p_statuses text[] DEFAULT NULL,
  p_created_after timestamptz DEFAULT NULL
)
RETURNS TABLE (
  id uuid,
  title text,
  summary text,
  industry text,
  similarity double precision,
  company_name text,
  volume_eur text,
  status text,
  created_at timestamptz
)
LANGUAGE sql
STABLE
AS $$
  SELECT
    r.id,
    r.title,
    r.summary,
    r.industry,
    1 - (r.embedding <=> query_embedding) AS similarity,
    c.name::text AS company_name,
    COALESCE(r.volume_eur::text, '') AS volume_eur,
    r.status::text AS status,
    r.created_at
  FROM public.references r
  INNER JOIN public.companies c ON c.id = r.company_id
  WHERE r.embedding IS NOT NULL
    AND c.organization_id = p_organization_id
    AND r.deleted_at IS NULL
    AND (
      NOT p_sales_visible_only
      OR r.status::text IN ('approved', 'internal_only', 'anonymized', 'external')
    )
    -- Strukturelle Vorfilter (jeweils NULL = inaktiv)
    AND (p_industries IS NULL OR r.industry = ANY (p_industries))
    AND (p_statuses IS NULL OR r.status::text = ANY (p_statuses))
    AND (p_created_after IS NULL OR r.created_at >= p_created_after)
    AND (
      p_min_volume IS NULL
      OR NULLIF(regexp_replace(COALESCE(r.volume_eur, ''), '[^0-9]', '', 'g'), '')::bigint >= p_min_volume
    )
    AND (
      p_max_volume IS NULL
      OR NULLIF(regexp_replace(COALESCE(r.volume_eur, ''), '[^0-9]', '', 'g'), '')::bigint <= p_max_volume
    )
    AND 1 - (r.embedding <=> query_embedding) >= match_threshold
  ORDER BY r.embedding <=> query_embedding
  LIMIT match_count;
$$;

GRANT EXECUTE ON FUNCTION public.match_references(
  vector(1536), double precision, integer, uuid, boolean, text[], bigint, bigint, text[], timestamptz
) TO authenticated;

COMMENT ON FUNCTION public.match_references(
  vector(1536), double precision, integer, uuid, boolean, text[], bigint, bigint, text[], timestamptz
) IS 'Semantische Top-N pro Organisation + optionale strukturelle Vorfilter (Branche, Volumen-Range, Status, created_at). p_sales_visible_only=true beschränkt auf approved/internal_only/anonymized/external.';
