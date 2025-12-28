-- Contract Version History Table
-- Stores snapshots of contract content at each version
CREATE TABLE contract_versions (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  contract_id UUID NOT NULL REFERENCES contracts(id) ON DELETE CASCADE,
  version_number INTEGER NOT NULL,
  content JSONB NOT NULL,
  metadata JSONB,
  change_summary TEXT,
  change_type TEXT NOT NULL CHECK (change_type IN ('create', 'edit', 'ai_modification', 'rollback')),
  created_by UUID REFERENCES users(id),
  created_at TIMESTAMPTZ DEFAULT NOW(),
  UNIQUE (contract_id, version_number)
);

-- Index for faster version lookups by contract
CREATE INDEX idx_contract_versions_contract_id ON contract_versions(contract_id);

-- Index for ordering versions
CREATE INDEX idx_contract_versions_created_at ON contract_versions(created_at DESC);

-- Enable RLS
ALTER TABLE contract_versions ENABLE ROW LEVEL SECURITY;

-- RLS Policy: Users can view versions for their own contracts
CREATE POLICY "Users can view their contract versions"
  ON contract_versions
  FOR SELECT
  USING (
    EXISTS (
      SELECT 1 FROM contracts
      WHERE contracts.id = contract_versions.contract_id
      AND contracts.user_id = auth.uid()
    )
  );

-- RLS Policy: Users can create versions for their own contracts
CREATE POLICY "Users can create versions for their contracts"
  ON contract_versions
  FOR INSERT
  WITH CHECK (
    EXISTS (
      SELECT 1 FROM contracts
      WHERE contracts.id = contract_versions.contract_id
      AND contracts.user_id = auth.uid()
    )
  );
