-- Search Contracts RPC Function
-- Migration: 20260222_search_contracts_rpc.sql
-- Retry fix for LEX-004: Add missing RPC function for full-text search

-- Drop function if exists (for idempotency)
DROP FUNCTION IF EXISTS search_contracts(
  text, uuid, text[], text, uuid, uuid[], text, text, text, int, int
);

-- Create the search_contracts RPC function
CREATE OR REPLACE FUNCTION search_contracts(
  search_query text,
  user_id_filter uuid,
  status_filter text[] DEFAULT NULL,
  jurisdiction_filter text DEFAULT NULL,
  folder_id_filter uuid DEFAULT NULL,
  tag_ids_filter uuid[] DEFAULT NULL,
  date_from_filter text DEFAULT NULL,
  date_to_filter text DEFAULT NULL,
  sort_by text DEFAULT 'relevance',
  result_limit int DEFAULT 20,
  result_offset int DEFAULT 0
)
RETURNS TABLE (
  id uuid,
  title text,
  title_highlighted text,
  type text,
  jurisdiction text,
  status text,
  content jsonb,
  created_at timestamptz,
  updated_at timestamptz,
  rank real,
  folders jsonb,
  tags jsonb
)
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  ts_query tsquery;
BEGIN
  -- Convert search query to tsquery
  ts_query := plainto_tsquery('english', search_query);
  
  -- Main search query with filters
  RETURN QUERY
  SELECT DISTINCT
    c.id,
    c.title,
    ts_headline('english', c.title, ts_query, 'StartSel=<mark>, StopSel=</mark>') as title_highlighted,
    c.type,
    c.jurisdiction,
    c.status,
    c.content,
    c.created_at,
    c.updated_at,
    ts_rank(c.search_vector, ts_query) as rank,
    -- Aggregate folders
    COALESCE(
      (SELECT jsonb_agg(jsonb_build_object(
        'folder_id', cf.folder_id,
        'folder', jsonb_build_object(
          'id', f.id,
          'name', f.name,
          'color', f.color
        )
      ))
      FROM contract_folders cf
      JOIN folders f ON f.id = cf.folder_id
      WHERE cf.contract_id = c.id),
      '[]'::jsonb
    ) as folders,
    -- Aggregate tags
    COALESCE(
      (SELECT jsonb_agg(jsonb_build_object(
        'tag_id', ct.tag_id,
        'tag', jsonb_build_object(
          'id', t.id,
          'name', t.name,
          'color', t.color
        )
      ))
      FROM contract_tags ct
      JOIN tags t ON t.id = ct.tag_id
      WHERE ct.contract_id = c.id),
      '[]'::jsonb
    ) as tags
  FROM contracts c
  WHERE
    -- Security: only return user's contracts
    c.user_id = user_id_filter
    -- Full-text search
    AND c.search_vector @@ ts_query
    -- Status filter
    AND (status_filter IS NULL OR c.status = ANY(status_filter))
    -- Jurisdiction filter
    AND (jurisdiction_filter IS NULL OR c.jurisdiction = jurisdiction_filter)
    -- Folder filter
    AND (
      folder_id_filter IS NULL
      OR EXISTS (
        SELECT 1 FROM contract_folders cf
        WHERE cf.contract_id = c.id AND cf.folder_id = folder_id_filter
      )
    )
    -- Tag filter (contract must have at least one of the specified tags)
    AND (
      tag_ids_filter IS NULL
      OR EXISTS (
        SELECT 1 FROM contract_tags ct
        WHERE ct.contract_id = c.id AND ct.tag_id = ANY(tag_ids_filter)
      )
    )
    -- Date range filter
    AND (date_from_filter IS NULL OR c.created_at >= date_from_filter::timestamptz)
    AND (date_to_filter IS NULL OR c.created_at <= date_to_filter::timestamptz)
  ORDER BY
    CASE
      WHEN sort_by = 'relevance' THEN ts_rank(c.search_vector, ts_query)
      ELSE 0
    END DESC,
    CASE
      WHEN sort_by = 'date' THEN c.updated_at
      ELSE NULL
    END DESC NULLS LAST,
    CASE
      WHEN sort_by = 'title' THEN c.title
      ELSE NULL
    END ASC NULLS LAST
  LIMIT result_limit
  OFFSET result_offset;
END;
$$;

-- Grant execute permission to authenticated users
GRANT EXECUTE ON FUNCTION search_contracts TO authenticated;

-- Update the trigger function to include parties and tags in search_vector
CREATE OR REPLACE FUNCTION update_contract_search_vector()
RETURNS TRIGGER AS $$
DECLARE
  parties_text text := '';
  tags_text text := '';
BEGIN
  -- Extract parties from metadata if exists
  IF NEW.metadata ? 'parties' THEN
    SELECT string_agg(party_value, ' ')
    INTO parties_text
    FROM jsonb_array_elements_text(NEW.metadata->'parties') AS party_value;
  END IF;

  -- Get associated tags
  SELECT string_agg(t.name, ' ')
  INTO tags_text
  FROM contract_tags ct
  JOIN tags t ON t.id = ct.tag_id
  WHERE ct.contract_id = NEW.id;

  -- Build weighted search vector
  NEW.search_vector := 
    setweight(to_tsvector('english', COALESCE(NEW.title, '')), 'A') ||
    setweight(to_tsvector('english', COALESCE(NEW.content->>'preamble', '')), 'B') ||
    setweight(to_tsvector('english', COALESCE(NEW.content->>'signatureBlock', '')), 'B') ||
    setweight(to_tsvector('english', COALESCE(NEW.type, '')), 'C') ||
    setweight(to_tsvector('english', COALESCE(NEW.jurisdiction, '')), 'C') ||
    setweight(to_tsvector('english', COALESCE(parties_text, '')), 'C') ||
    setweight(to_tsvector('english', COALESCE(tags_text, '')), 'C');
  
  -- Also index clause content if clauses exist
  IF NEW.content ? 'clauses' AND jsonb_typeof(NEW.content->'clauses') = 'array' THEN
    NEW.search_vector := NEW.search_vector ||
      setweight(to_tsvector('english', COALESCE(
        (SELECT string_agg(clause->>'content', ' ')
         FROM jsonb_array_elements(NEW.content->'clauses') AS clause),
        ''
      )), 'B');
  END IF;
  
  RETURN NEW;
END;
$$ LANGUAGE plpgsql;

-- Re-index existing contracts with updated search vectors
-- This will include parties and tags in the search index
UPDATE contracts SET updated_at = updated_at;
