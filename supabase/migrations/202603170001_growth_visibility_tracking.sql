-- =========================================================
-- AI Visibility Tracking tables
-- =========================================================

-- LLM provider enum
DO $$ BEGIN
  CREATE TYPE growth_llm_provider AS ENUM('openai', 'anthropic', 'perplexity', 'google');
EXCEPTION WHEN duplicate_object THEN NULL;
END $$;

-- Brands being tracked
CREATE TABLE IF NOT EXISTS growth_brands (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id UUID NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  name TEXT NOT NULL,
  domain TEXT,
  aliases TEXT[] DEFAULT '{}',
  is_active BOOLEAN DEFAULT TRUE,
  created_at TIMESTAMPTZ DEFAULT NOW() NOT NULL,
  updated_at TIMESTAMPTZ DEFAULT NOW() NOT NULL
);

-- Competitor brands
CREATE TABLE IF NOT EXISTS growth_competitors (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  brand_id UUID NOT NULL REFERENCES growth_brands(id) ON DELETE CASCADE,
  name TEXT NOT NULL,
  domain TEXT,
  aliases TEXT[] DEFAULT '{}',
  created_at TIMESTAMPTZ DEFAULT NOW() NOT NULL
);

-- Keywords to track
CREATE TABLE IF NOT EXISTS growth_keywords (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  brand_id UUID NOT NULL REFERENCES growth_brands(id) ON DELETE CASCADE,
  keyword TEXT NOT NULL,
  category TEXT,
  is_active BOOLEAN DEFAULT TRUE,
  created_at TIMESTAMPTZ DEFAULT NOW() NOT NULL,
  updated_at TIMESTAMPTZ DEFAULT NOW() NOT NULL,
  UNIQUE(brand_id, keyword)
);

-- Visibility check results
CREATE TABLE IF NOT EXISTS growth_snapshots (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  brand_id UUID NOT NULL REFERENCES growth_brands(id) ON DELETE CASCADE,
  keyword_id UUID NOT NULL REFERENCES growth_keywords(id) ON DELETE CASCADE,
  llm_provider growth_llm_provider NOT NULL,
  llm_model TEXT,
  prompt_used TEXT NOT NULL,
  mentioned BOOLEAN DEFAULT FALSE,
  rank_position INTEGER,
  cited_as_source BOOLEAN DEFAULT FALSE,
  competitor_mentions JSONB DEFAULT '{}',
  raw_response TEXT,
  response_tokens INTEGER,
  checked_at TIMESTAMPTZ DEFAULT NOW() NOT NULL,
  created_at TIMESTAMPTZ DEFAULT NOW() NOT NULL
);

-- Auto-detected wins
CREATE TABLE IF NOT EXISTS growth_wins (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  snapshot_id UUID NOT NULL REFERENCES growth_snapshots(id) ON DELETE CASCADE,
  brand_id UUID NOT NULL REFERENCES growth_brands(id) ON DELETE CASCADE,
  keyword_id UUID NOT NULL REFERENCES growth_keywords(id) ON DELETE CASCADE,
  win_type TEXT NOT NULL,
  llm_provider growth_llm_provider NOT NULL,
  rank_position INTEGER,
  detected_at TIMESTAMPTZ DEFAULT NOW() NOT NULL
);

-- Indexes
CREATE INDEX IF NOT EXISTS idx_growth_brands_user_id ON growth_brands(user_id);
CREATE INDEX IF NOT EXISTS idx_growth_competitors_brand_id ON growth_competitors(brand_id);
CREATE INDEX IF NOT EXISTS idx_growth_keywords_brand_id ON growth_keywords(brand_id);
CREATE INDEX IF NOT EXISTS idx_growth_snapshots_brand_id ON growth_snapshots(brand_id);
CREATE INDEX IF NOT EXISTS idx_growth_snapshots_keyword_id ON growth_snapshots(keyword_id);
CREATE INDEX IF NOT EXISTS idx_growth_snapshots_checked_at ON growth_snapshots(checked_at DESC);
CREATE INDEX IF NOT EXISTS idx_growth_snapshots_brand_keyword_provider ON growth_snapshots(brand_id, keyword_id, llm_provider, checked_at DESC);
CREATE INDEX IF NOT EXISTS idx_growth_wins_brand_id ON growth_wins(brand_id);
CREATE INDEX IF NOT EXISTS idx_growth_wins_detected_at ON growth_wins(detected_at DESC);

-- RLS
ALTER TABLE growth_brands ENABLE ROW LEVEL SECURITY;
ALTER TABLE growth_competitors ENABLE ROW LEVEL SECURITY;
ALTER TABLE growth_keywords ENABLE ROW LEVEL SECURITY;
ALTER TABLE growth_snapshots ENABLE ROW LEVEL SECURITY;
ALTER TABLE growth_wins ENABLE ROW LEVEL SECURITY;

-- Brands: owner only
CREATE POLICY "growth_brands_owner" ON growth_brands
  FOR ALL USING (user_id = auth.uid())
  WITH CHECK (user_id = auth.uid());

-- Competitors: through brand ownership
CREATE POLICY "growth_competitors_owner" ON growth_competitors
  FOR ALL USING (brand_id IN (SELECT id FROM growth_brands WHERE user_id = auth.uid()))
  WITH CHECK (brand_id IN (SELECT id FROM growth_brands WHERE user_id = auth.uid()));

-- Keywords: through brand ownership
CREATE POLICY "growth_keywords_owner" ON growth_keywords
  FOR ALL USING (brand_id IN (SELECT id FROM growth_brands WHERE user_id = auth.uid()))
  WITH CHECK (brand_id IN (SELECT id FROM growth_brands WHERE user_id = auth.uid()));

-- Snapshots: through brand ownership
CREATE POLICY "growth_snapshots_owner" ON growth_snapshots
  FOR ALL USING (brand_id IN (SELECT id FROM growth_brands WHERE user_id = auth.uid()))
  WITH CHECK (brand_id IN (SELECT id FROM growth_brands WHERE user_id = auth.uid()));

-- Wins: through brand ownership
CREATE POLICY "growth_wins_owner" ON growth_wins
  FOR ALL USING (brand_id IN (SELECT id FROM growth_brands WHERE user_id = auth.uid()))
  WITH CHECK (brand_id IN (SELECT id FROM growth_brands WHERE user_id = auth.uid()));

-- Updated_at triggers
CREATE OR REPLACE FUNCTION update_growth_updated_at()
RETURNS TRIGGER AS $$
BEGIN
  NEW.updated_at = NOW();
  RETURN NEW;
END;
$$ LANGUAGE plpgsql;

CREATE TRIGGER trg_growth_brands_updated_at
  BEFORE UPDATE ON growth_brands
  FOR EACH ROW EXECUTE FUNCTION update_growth_updated_at();

CREATE TRIGGER trg_growth_keywords_updated_at
  BEFORE UPDATE ON growth_keywords
  FOR EACH ROW EXECUTE FUNCTION update_growth_updated_at();
