-- Full-Text Search for Contracts
-- Migration: 20260222_add_contract_search.sql

-- Add search vector column to contracts table
ALTER TABLE contracts ADD COLUMN IF NOT EXISTS search_vector tsvector;

-- Create GIN index for fast full-text search
CREATE INDEX IF NOT EXISTS idx_contracts_search ON contracts USING GIN(search_vector);

-- Create function to update search vector
-- Weights: A (title) > B (content) > C (type, jurisdiction)
CREATE OR REPLACE FUNCTION update_contract_search_vector()
RETURNS TRIGGER AS $$
BEGIN
  NEW.search_vector := 
    setweight(to_tsvector('english', COALESCE(NEW.title, '')), 'A') ||
    setweight(to_tsvector('english', COALESCE(NEW.content->>'preamble', '')), 'B') ||
    setweight(to_tsvector('english', COALESCE(NEW.content->>'signatureBlock', '')), 'B') ||
    setweight(to_tsvector('english', COALESCE(NEW.type, '')), 'C') ||
    setweight(to_tsvector('english', COALESCE(NEW.jurisdiction, '')), 'C');
  
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

-- Create trigger to auto-update search vector on insert/update
DROP TRIGGER IF EXISTS contracts_search_vector_trigger ON contracts;
CREATE TRIGGER contracts_search_vector_trigger
  BEFORE INSERT OR UPDATE ON contracts
  FOR EACH ROW
  EXECUTE FUNCTION update_contract_search_vector();

-- Update existing rows with search vectors
UPDATE contracts SET search_vector = 
  setweight(to_tsvector('english', COALESCE(title, '')), 'A') ||
  setweight(to_tsvector('english', COALESCE(content->>'preamble', '')), 'B') ||
  setweight(to_tsvector('english', COALESCE(content->>'signatureBlock', '')), 'B') ||
  setweight(to_tsvector('english', COALESCE(type, '')), 'C') ||
  setweight(to_tsvector('english', COALESCE(jurisdiction, '')), 'C') ||
  CASE 
    WHEN content ? 'clauses' AND jsonb_typeof(content->'clauses') = 'array' THEN
      setweight(to_tsvector('english', COALESCE(
        (SELECT string_agg(clause->>'content', ' ')
         FROM jsonb_array_elements(content->'clauses') AS clause),
        ''
      )), 'B')
    ELSE to_tsvector('english', '')
  END;
