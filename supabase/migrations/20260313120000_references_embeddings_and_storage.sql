-- Enable pgvector extension (idempotent)
CREATE EXTENSION IF NOT EXISTS vector;

-- Embedding column for semantic search (OpenAI text-embedding-3-small → 1536 dims)
ALTER TABLE public.references
  ADD COLUMN IF NOT EXISTS embedding vector(1536);

-- Persistent link to original uploaded document (PDF/DOCX/PPTX)
ALTER TABLE public.references
  ADD COLUMN IF NOT EXISTS original_document_url text;

-- Index for vector similarity (cosine distance)
CREATE INDEX IF NOT EXISTS references_embedding_ivfflat
ON public.references
USING ivfflat (embedding vector_cosine_ops)
WITH (lists = 100);

-- RPC: match_references – returns top-N references by cosine similarity
CREATE OR REPLACE FUNCTION public.match_references(
  query_embedding vector(1536),
  match_threshold double precision,
  match_count integer
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
  WHERE r.embedding IS NOT NULL
    AND 1 - (r.embedding <=> query_embedding) >= match_threshold
  ORDER BY r.embedding <=> query_embedding
  LIMIT match_count;
$$;

GRANT EXECUTE ON FUNCTION public.match_references(vector(1536), double precision, integer)
  TO authenticated, service_role;

