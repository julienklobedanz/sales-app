-- Epic 4 / KAN-73: match_references mandantensicher
-- Vorher: globale Suche über alle Referenzen mit Embedding (kein Org-Filter).
-- Nachher: nur Referenzen der angegebenen Organisation (über companies.organization_id),
--          optional nur für Sales sichtbare Status (approved + internal_only),
--          keine gelöschten Zeilen (deleted_at).

DROP FUNCTION IF EXISTS public.match_references(vector(1536), double precision, integer);

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
  similarity double precision
)
LANGUAGE sql
STABLE
AS $$
  SELECT
    r.id,
    r.title,
    r.summary,
    r.industry,
    1 - (r.embedding <=> query_embedding) AS similarity
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
  'Semantische Top-N-Treffer pro Organisation; p_sales_visible_only=true entspricht Evidence-Hub-Filter für Sales.';

GRANT EXECUTE ON FUNCTION public.match_references(vector(1536), double precision, integer, uuid, boolean)
  TO authenticated, service_role;
