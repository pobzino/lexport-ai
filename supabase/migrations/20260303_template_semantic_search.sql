-- Enable pgvector for semantic template search
CREATE EXTENSION IF NOT EXISTS vector;

-- Store semantic text + embeddings for user and system templates
ALTER TABLE templates
  ADD COLUMN IF NOT EXISTS semantic_text text,
  ADD COLUMN IF NOT EXISTS semantic_embedding vector(1536);

ALTER TABLE contract_templates
  ADD COLUMN IF NOT EXISTS semantic_text text,
  ADD COLUMN IF NOT EXISTS semantic_embedding vector(1536);

-- ANN indexes for cosine similarity search
CREATE INDEX IF NOT EXISTS idx_templates_semantic_embedding
  ON templates
  USING ivfflat (semantic_embedding vector_cosine_ops)
  WITH (lists = 100);

CREATE INDEX IF NOT EXISTS idx_contract_templates_semantic_embedding
  ON contract_templates
  USING ivfflat (semantic_embedding vector_cosine_ops)
  WITH (lists = 100);

-- Unified semantic search across user templates + system templates
CREATE OR REPLACE FUNCTION public.search_templates_semantic(
  p_user_id uuid,
  p_query_embedding vector(1536),
  p_type text DEFAULT NULL,
  p_jurisdiction text DEFAULT NULL,
  p_public_filter text DEFAULT 'all',
  p_limit integer DEFAULT 50,
  p_offset integer DEFAULT 0
)
RETURNS TABLE (
  source text,
  template_id text,
  score double precision
)
LANGUAGE sql
STABLE
SECURITY DEFINER
SET search_path = public
AS $$
  WITH user_candidates AS (
    SELECT
      'user'::text AS source,
      t.id::text AS template_id,
      (1 - (t.semantic_embedding <=> p_query_embedding))::double precision AS score
    FROM templates t
    WHERE t.semantic_embedding IS NOT NULL
      AND (
        (p_public_filter = 'true' AND t.is_public = true)
        OR (p_public_filter = 'false' AND t.created_by_id = p_user_id)
        OR (
          p_public_filter = 'all'
          AND (t.created_by_id = p_user_id OR t.is_public = true)
        )
      )
      AND (p_type IS NULL OR t.type::text = p_type)
      AND (p_jurisdiction IS NULL OR t.jurisdiction::text = p_jurisdiction)
  ),
  system_candidates AS (
    SELECT
      'system'::text AS source,
      ct.id::text AS template_id,
      (1 - (ct.semantic_embedding <=> p_query_embedding))::double precision AS score
    FROM contract_templates ct
    WHERE p_public_filter <> 'false'
      AND ct.is_active = true
      AND ct.semantic_embedding IS NOT NULL
      AND (p_type IS NULL OR ct.contract_type::text = p_type)
      AND (p_jurisdiction IS NULL OR ct.jurisdiction::text = p_jurisdiction)
  )
  SELECT
    ranked.source,
    ranked.template_id,
    ranked.score
  FROM (
    SELECT * FROM user_candidates
    UNION ALL
    SELECT * FROM system_candidates
  ) AS ranked
  ORDER BY ranked.score DESC
  LIMIT GREATEST(1, p_limit)
  OFFSET GREATEST(0, p_offset);
$$;

GRANT EXECUTE ON FUNCTION public.search_templates_semantic(
  uuid,
  vector,
  text,
  text,
  text,
  integer,
  integer
) TO authenticated;
