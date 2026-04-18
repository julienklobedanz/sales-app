-- Epic 4: match_references liefert Account-Name und Volumen für Match-Karten (Wireframe §14).

DROP FUNCTION IF EXISTS public.match_references(vector(1536), double precision, integer, uuid, boolean);

CREATE OR REPLACE FUNCTION public.match_references(
  query_embedding vector(1536),
  match_threshold double precision,
  match_count integer,
  p_organization_id uuid,
  p_sales_visible_only boolean DEFAULT false
)
RETURNS TABLE (
  id uuid,
  title text,
  summary text,
  industry text,
  similarity double precision,
  company_name text,
  volume_eur text
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
    COALESCE(r.volume_eur::text, '') AS volume_eur
  FROM public.references r
  INNER JOIN public.companies c ON c.id = r.company_id
  WHERE r.embedding IS NOT NULL
    AND c.organization_id = p_organization_id
    AND r.deleted_at IS NULL
    AND (
      NOT p_sales_visible_only
      OR r.status::text IN ('approved', 'internal_only')
    )
    AND 1 - (r.embedding <=> query_embedding) >= match_threshold
  ORDER BY r.embedding <=> query_embedding
  LIMIT match_count;
$$;

COMMENT ON FUNCTION public.match_references(vector(1536), double precision, integer, uuid, boolean) IS
  'Semantische Top-N-Treffer pro Organisation; inkl. Account-Name und Volumen für UI.';

GRANT EXECUTE ON FUNCTION public.match_references(vector(1536), double precision, integer, uuid, boolean)
  TO authenticated, service_role;
