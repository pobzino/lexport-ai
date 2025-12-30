-- Folders and Tags for organizing contracts
-- Migration: 20241229_folders_tags.sql

-- Create folders table
CREATE TABLE IF NOT EXISTS folders (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id UUID NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  name TEXT NOT NULL,
  color TEXT DEFAULT '#529ec6',
  icon TEXT DEFAULT 'folder',
  parent_id UUID REFERENCES folders(id) ON DELETE SET NULL,
  created_at TIMESTAMPTZ DEFAULT NOW(),
  updated_at TIMESTAMPTZ DEFAULT NOW(),
  UNIQUE(user_id, name, parent_id)
);

-- Create tags table
CREATE TABLE IF NOT EXISTS tags (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id UUID NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  name TEXT NOT NULL,
  color TEXT DEFAULT '#202e46',
  created_at TIMESTAMPTZ DEFAULT NOW(),
  UNIQUE(user_id, name)
);

-- Create junction table for contracts and folders
CREATE TABLE IF NOT EXISTS contract_folders (
  contract_id UUID NOT NULL REFERENCES contracts(id) ON DELETE CASCADE,
  folder_id UUID NOT NULL REFERENCES folders(id) ON DELETE CASCADE,
  created_at TIMESTAMPTZ DEFAULT NOW(),
  PRIMARY KEY (contract_id, folder_id)
);

-- Create junction table for contracts and tags
CREATE TABLE IF NOT EXISTS contract_tags (
  contract_id UUID NOT NULL REFERENCES contracts(id) ON DELETE CASCADE,
  tag_id UUID NOT NULL REFERENCES tags(id) ON DELETE CASCADE,
  created_at TIMESTAMPTZ DEFAULT NOW(),
  PRIMARY KEY (contract_id, tag_id)
);

-- Indexes
CREATE INDEX idx_folders_user_id ON folders(user_id);
CREATE INDEX idx_folders_parent_id ON folders(parent_id);
CREATE INDEX idx_tags_user_id ON tags(user_id);
CREATE INDEX idx_contract_folders_contract ON contract_folders(contract_id);
CREATE INDEX idx_contract_folders_folder ON contract_folders(folder_id);
CREATE INDEX idx_contract_tags_contract ON contract_tags(contract_id);
CREATE INDEX idx_contract_tags_tag ON contract_tags(tag_id);

-- Enable RLS
ALTER TABLE folders ENABLE ROW LEVEL SECURITY;
ALTER TABLE tags ENABLE ROW LEVEL SECURITY;
ALTER TABLE contract_folders ENABLE ROW LEVEL SECURITY;
ALTER TABLE contract_tags ENABLE ROW LEVEL SECURITY;

-- Folders RLS policies
CREATE POLICY "Users can view their own folders"
ON folders FOR SELECT
USING (auth.uid() = user_id);

CREATE POLICY "Users can create folders"
ON folders FOR INSERT
WITH CHECK (auth.uid() = user_id);

CREATE POLICY "Users can update their own folders"
ON folders FOR UPDATE
USING (auth.uid() = user_id);

CREATE POLICY "Users can delete their own folders"
ON folders FOR DELETE
USING (auth.uid() = user_id);

-- Tags RLS policies
CREATE POLICY "Users can view their own tags"
ON tags FOR SELECT
USING (auth.uid() = user_id);

CREATE POLICY "Users can create tags"
ON tags FOR INSERT
WITH CHECK (auth.uid() = user_id);

CREATE POLICY "Users can update their own tags"
ON tags FOR UPDATE
USING (auth.uid() = user_id);

CREATE POLICY "Users can delete their own tags"
ON tags FOR DELETE
USING (auth.uid() = user_id);

-- Contract-folders RLS (based on contract ownership)
CREATE POLICY "Users can view contract folders for their contracts"
ON contract_folders FOR SELECT
USING (
  EXISTS (
    SELECT 1 FROM contracts 
    WHERE contracts.id = contract_id 
    AND contracts.user_id = auth.uid()
  )
);

CREATE POLICY "Users can manage contract folders for their contracts"
ON contract_folders FOR ALL
USING (
  EXISTS (
    SELECT 1 FROM contracts 
    WHERE contracts.id = contract_id 
    AND contracts.user_id = auth.uid()
  )
);

-- Contract-tags RLS (based on contract ownership)
CREATE POLICY "Users can view contract tags for their contracts"
ON contract_tags FOR SELECT
USING (
  EXISTS (
    SELECT 1 FROM contracts 
    WHERE contracts.id = contract_id 
    AND contracts.user_id = auth.uid()
  )
);

CREATE POLICY "Users can manage contract tags for their contracts"
ON contract_tags FOR ALL
USING (
  EXISTS (
    SELECT 1 FROM contracts 
    WHERE contracts.id = contract_id 
    AND contracts.user_id = auth.uid()
  )
);

-- Add folder_id column to contracts for quick access
ALTER TABLE contracts ADD COLUMN IF NOT EXISTS folder_id UUID REFERENCES folders(id) ON DELETE SET NULL;
CREATE INDEX IF NOT EXISTS idx_contracts_folder_id ON contracts(folder_id);
