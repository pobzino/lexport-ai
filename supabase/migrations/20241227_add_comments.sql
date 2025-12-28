-- Comments/Annotations system for contract collaboration
-- Run this migration to add comments functionality

-- Comments table for storing comments on contract clauses
CREATE TABLE IF NOT EXISTS comments (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  contract_id UUID NOT NULL REFERENCES contracts(id) ON DELETE CASCADE,
  clause_id TEXT NOT NULL,
  user_id UUID NOT NULL REFERENCES users(id),
  parent_comment_id UUID REFERENCES comments(id) ON DELETE CASCADE,
  content TEXT NOT NULL,
  selection_start INTEGER,
  selection_end INTEGER,
  selected_text TEXT,
  is_resolved BOOLEAN DEFAULT FALSE,
  resolved_by UUID REFERENCES users(id),
  resolved_at TIMESTAMPTZ,
  created_at TIMESTAMPTZ DEFAULT NOW(),
  updated_at TIMESTAMPTZ DEFAULT NOW()
);

-- Comment mentions for @-mentions and notifications
CREATE TABLE IF NOT EXISTS comment_mentions (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  comment_id UUID NOT NULL REFERENCES comments(id) ON DELETE CASCADE,
  mentioned_user_id UUID NOT NULL REFERENCES users(id),
  is_read BOOLEAN DEFAULT FALSE,
  read_at TIMESTAMPTZ,
  created_at TIMESTAMPTZ DEFAULT NOW()
);

-- Indexes for efficient querying
CREATE INDEX IF NOT EXISTS idx_comments_contract_id ON comments(contract_id);
CREATE INDEX IF NOT EXISTS idx_comments_clause_id ON comments(contract_id, clause_id);
CREATE INDEX IF NOT EXISTS idx_comments_user_id ON comments(user_id);
CREATE INDEX IF NOT EXISTS idx_comments_parent_id ON comments(parent_comment_id);
CREATE INDEX IF NOT EXISTS idx_comments_resolved ON comments(contract_id, is_resolved);
CREATE INDEX IF NOT EXISTS idx_comment_mentions_user_id ON comment_mentions(mentioned_user_id);
CREATE INDEX IF NOT EXISTS idx_comment_mentions_unread ON comment_mentions(mentioned_user_id, is_read) WHERE is_read = FALSE;

-- Enable Row Level Security
ALTER TABLE comments ENABLE ROW LEVEL SECURITY;
ALTER TABLE comment_mentions ENABLE ROW LEVEL SECURITY;

-- RLS Policies for comments
-- Users can view comments on contracts they own or are signers of
CREATE POLICY "Users can view comments on their contracts" ON comments
  FOR SELECT
  USING (
    contract_id IN (
      SELECT id FROM contracts WHERE user_id = auth.uid()
    )
    OR
    user_id = auth.uid()
    OR
    contract_id IN (
      SELECT contract_id FROM signature_requests WHERE signer_email = (
        SELECT email FROM users WHERE id = auth.uid()
      )
    )
  );

-- Users can create comments on contracts they have access to
CREATE POLICY "Users can create comments on accessible contracts" ON comments
  FOR INSERT
  WITH CHECK (
    auth.uid() = user_id
    AND (
      contract_id IN (
        SELECT id FROM contracts WHERE user_id = auth.uid()
      )
      OR
      contract_id IN (
        SELECT contract_id FROM signature_requests WHERE signer_email = (
          SELECT email FROM users WHERE id = auth.uid()
        )
      )
    )
  );

-- Users can update their own comments
CREATE POLICY "Users can update their own comments" ON comments
  FOR UPDATE
  USING (user_id = auth.uid())
  WITH CHECK (user_id = auth.uid());

-- Users can delete their own comments OR contract owners can delete any comment
CREATE POLICY "Users can delete comments" ON comments
  FOR DELETE
  USING (
    user_id = auth.uid()
    OR
    contract_id IN (
      SELECT id FROM contracts WHERE user_id = auth.uid()
    )
  );

-- RLS Policies for comment_mentions
CREATE POLICY "Users can view their mentions" ON comment_mentions
  FOR SELECT
  USING (mentioned_user_id = auth.uid());

CREATE POLICY "Users can update their mentions" ON comment_mentions
  FOR UPDATE
  USING (mentioned_user_id = auth.uid())
  WITH CHECK (mentioned_user_id = auth.uid());

-- Function to update updated_at timestamp
CREATE OR REPLACE FUNCTION update_comment_updated_at()
RETURNS TRIGGER AS $$
BEGIN
  NEW.updated_at = NOW();
  RETURN NEW;
END;
$$ LANGUAGE plpgsql;

-- Trigger to auto-update updated_at
CREATE TRIGGER comments_updated_at
  BEFORE UPDATE ON comments
  FOR EACH ROW
  EXECUTE FUNCTION update_comment_updated_at();

-- Enable realtime for comments (optional, for real-time collaboration)
ALTER PUBLICATION supabase_realtime ADD TABLE comments;
