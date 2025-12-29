-- Onboarding System Migration
-- Adds tables and columns for user onboarding tracking

-- Add user_type and onboarding columns to users table
ALTER TABLE users ADD COLUMN IF NOT EXISTS user_type TEXT;
ALTER TABLE users ADD COLUMN IF NOT EXISTS onboarding_completed_at TIMESTAMPTZ;

-- Create onboarding_progress table to track completed steps
CREATE TABLE IF NOT EXISTS onboarding_progress (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id UUID NOT NULL REFERENCES users(id) ON DELETE CASCADE,
  step TEXT NOT NULL,
  completed_at TIMESTAMPTZ DEFAULT NOW(),
  metadata JSONB,
  created_at TIMESTAMPTZ DEFAULT NOW(),
  UNIQUE(user_id, step)
);

-- Create dismissed_tips table to track which tooltips user has dismissed
CREATE TABLE IF NOT EXISTS dismissed_tips (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id UUID NOT NULL REFERENCES users(id) ON DELETE CASCADE,
  tip_id TEXT NOT NULL,
  dismissed_at TIMESTAMPTZ DEFAULT NOW(),
  UNIQUE(user_id, tip_id)
);

-- Create indexes for performance
CREATE INDEX IF NOT EXISTS idx_onboarding_progress_user_id ON onboarding_progress(user_id);
CREATE INDEX IF NOT EXISTS idx_dismissed_tips_user_id ON dismissed_tips(user_id);

-- Add RLS policies
ALTER TABLE onboarding_progress ENABLE ROW LEVEL SECURITY;
ALTER TABLE dismissed_tips ENABLE ROW LEVEL SECURITY;

-- Users can only see/modify their own onboarding progress
CREATE POLICY "Users can view own onboarding progress"
  ON onboarding_progress FOR SELECT
  USING (auth.uid() = user_id);

CREATE POLICY "Users can insert own onboarding progress"
  ON onboarding_progress FOR INSERT
  WITH CHECK (auth.uid() = user_id);

CREATE POLICY "Users can update own onboarding progress"
  ON onboarding_progress FOR UPDATE
  USING (auth.uid() = user_id);

-- Users can only see/modify their own dismissed tips
CREATE POLICY "Users can view own dismissed tips"
  ON dismissed_tips FOR SELECT
  USING (auth.uid() = user_id);

CREATE POLICY "Users can insert own dismissed tips"
  ON dismissed_tips FOR INSERT
  WITH CHECK (auth.uid() = user_id);

CREATE POLICY "Users can update own dismissed tips"
  ON dismissed_tips FOR UPDATE
  USING (auth.uid() = user_id);
