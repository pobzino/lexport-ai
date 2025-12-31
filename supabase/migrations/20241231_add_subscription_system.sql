-- =============================================
-- Subscription System Migration
-- Adds subscription tracking to users and organizations
-- =============================================

-- Add subscription fields to users table
ALTER TABLE users ADD COLUMN IF NOT EXISTS subscription_tier TEXT DEFAULT 'free';
ALTER TABLE users ADD COLUMN IF NOT EXISTS subscription_status TEXT DEFAULT 'active';
ALTER TABLE users ADD COLUMN IF NOT EXISTS stripe_customer_id TEXT;
ALTER TABLE users ADD COLUMN IF NOT EXISTS stripe_subscription_id TEXT;
ALTER TABLE users ADD COLUMN IF NOT EXISTS subscription_started_at TIMESTAMPTZ;
ALTER TABLE users ADD COLUMN IF NOT EXISTS subscription_ends_at TIMESTAMPTZ;
ALTER TABLE users ADD COLUMN IF NOT EXISTS trial_ends_at TIMESTAMPTZ;

-- Usage tracking fields (reset monthly for free tier)
ALTER TABLE users ADD COLUMN IF NOT EXISTS ai_contracts_used INTEGER DEFAULT 0;
ALTER TABLE users ADD COLUMN IF NOT EXISTS ai_contracts_limit INTEGER DEFAULT 3;
ALTER TABLE users ADD COLUMN IF NOT EXISTS signatures_used INTEGER DEFAULT 0;
ALTER TABLE users ADD COLUMN IF NOT EXISTS signatures_limit INTEGER DEFAULT 5;
ALTER TABLE users ADD COLUMN IF NOT EXISTS usage_reset_at TIMESTAMPTZ DEFAULT NOW();

-- Add subscription fields to organizations table
ALTER TABLE organizations ADD COLUMN IF NOT EXISTS subscription_tier TEXT DEFAULT 'free';
ALTER TABLE organizations ADD COLUMN IF NOT EXISTS subscription_status TEXT DEFAULT 'active';
ALTER TABLE organizations ADD COLUMN IF NOT EXISTS stripe_subscription_id TEXT;
ALTER TABLE organizations ADD COLUMN IF NOT EXISTS subscription_started_at TIMESTAMPTZ;
ALTER TABLE organizations ADD COLUMN IF NOT EXISTS subscription_ends_at TIMESTAMPTZ;
ALTER TABLE organizations ADD COLUMN IF NOT EXISTS trial_ends_at TIMESTAMPTZ;
ALTER TABLE organizations ADD COLUMN IF NOT EXISTS seats_included INTEGER DEFAULT 1;
ALTER TABLE organizations ADD COLUMN IF NOT EXISTS seats_used INTEGER DEFAULT 0;

-- Create monthly usage history table for analytics and audit
CREATE TABLE IF NOT EXISTS usage_history (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    user_id UUID REFERENCES users(id) ON DELETE CASCADE,
    organization_id UUID REFERENCES organizations(id) ON DELETE CASCADE,
    period_start DATE NOT NULL,
    period_end DATE NOT NULL,
    ai_contracts_used INTEGER DEFAULT 0,
    signatures_used INTEGER DEFAULT 0,
    created_at TIMESTAMPTZ DEFAULT NOW()
);

-- Indexes
CREATE INDEX IF NOT EXISTS idx_usage_history_user_period ON usage_history(user_id, period_start);
CREATE INDEX IF NOT EXISTS idx_usage_history_org_period ON usage_history(organization_id, period_start);
CREATE INDEX IF NOT EXISTS idx_users_subscription_tier ON users(subscription_tier);
CREATE INDEX IF NOT EXISTS idx_users_stripe_customer ON users(stripe_customer_id);
CREATE INDEX IF NOT EXISTS idx_orgs_subscription_tier ON organizations(subscription_tier);

-- =============================================
-- RPC Functions
-- =============================================

-- RPC function to increment AI contracts used
CREATE OR REPLACE FUNCTION increment_ai_contracts_used(user_uuid UUID)
RETURNS void AS $$
BEGIN
    UPDATE users
    SET ai_contracts_used = ai_contracts_used + 1,
        updated_at = NOW()
    WHERE id = user_uuid;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- RPC function to increment signatures used
CREATE OR REPLACE FUNCTION increment_signatures_used(user_uuid UUID, count INTEGER DEFAULT 1)
RETURNS void AS $$
BEGIN
    UPDATE users
    SET signatures_used = signatures_used + count,
        updated_at = NOW()
    WHERE id = user_uuid;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- RPC function to set subscription tier with proper limits
CREATE OR REPLACE FUNCTION set_subscription_tier(
    user_uuid UUID,
    new_tier TEXT,
    new_status TEXT DEFAULT 'active'
)
RETURNS void AS $$
DECLARE
    new_contracts_limit INTEGER;
    new_signatures_limit INTEGER;
BEGIN
    -- Set limits based on tier (-1 means unlimited)
    CASE new_tier
        WHEN 'free' THEN
            new_contracts_limit := 3;
            new_signatures_limit := 5;
        WHEN 'pro' THEN
            new_contracts_limit := -1;
            new_signatures_limit := -1;
        WHEN 'team' THEN
            new_contracts_limit := -1;
            new_signatures_limit := -1;
        ELSE
            new_contracts_limit := 3;
            new_signatures_limit := 5;
    END CASE;

    UPDATE users
    SET subscription_tier = new_tier,
        subscription_status = new_status,
        ai_contracts_limit = new_contracts_limit,
        signatures_limit = new_signatures_limit,
        updated_at = NOW()
    WHERE id = user_uuid;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- Organization subscription helper
CREATE OR REPLACE FUNCTION set_org_subscription_tier(
    org_uuid UUID,
    new_tier TEXT,
    new_status TEXT DEFAULT 'active'
)
RETURNS void AS $$
DECLARE
    new_seats INTEGER;
BEGIN
    -- Set seats based on tier
    CASE new_tier
        WHEN 'free' THEN new_seats := 1;
        WHEN 'pro' THEN new_seats := 3;
        WHEN 'team' THEN new_seats := 10;
        ELSE new_seats := 1;
    END CASE;

    UPDATE organizations
    SET subscription_tier = new_tier,
        subscription_status = new_status,
        seats_included = new_seats,
        updated_at = NOW()
    WHERE id = org_uuid;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- RPC function to reset monthly usage for free tier users
CREATE OR REPLACE FUNCTION reset_monthly_usage()
RETURNS INTEGER AS $$
DECLARE
    affected_count INTEGER;
BEGIN
    -- Archive current usage to history (only if there was usage)
    INSERT INTO usage_history (user_id, period_start, period_end, ai_contracts_used, signatures_used)
    SELECT
        id,
        DATE_TRUNC('month', usage_reset_at)::DATE,
        (DATE_TRUNC('month', NOW()) - INTERVAL '1 day')::DATE,
        ai_contracts_used,
        signatures_used
    FROM users
    WHERE subscription_tier = 'free'
      AND (ai_contracts_used > 0 OR signatures_used > 0)
      AND usage_reset_at < DATE_TRUNC('month', NOW());

    -- Reset usage counters for free tier users whose reset date is before this month
    UPDATE users
    SET ai_contracts_used = 0,
        signatures_used = 0,
        usage_reset_at = NOW(),
        updated_at = NOW()
    WHERE subscription_tier = 'free'
      AND usage_reset_at < DATE_TRUNC('month', NOW());

    GET DIAGNOSTICS affected_count = ROW_COUNT;
    RETURN affected_count;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- Get effective subscription for a user (checks org override)
CREATE OR REPLACE FUNCTION get_effective_subscription(user_uuid UUID)
RETURNS TABLE (
    effective_tier TEXT,
    effective_status TEXT,
    source TEXT,
    is_unlimited BOOLEAN,
    contracts_limit INTEGER,
    signatures_limit INTEGER,
    contracts_used INTEGER,
    signatures_used INTEGER,
    usage_reset_at TIMESTAMPTZ,
    organization_name TEXT
) AS $$
DECLARE
    user_rec RECORD;
    org_rec RECORD;
BEGIN
    -- Get user subscription
    SELECT * INTO user_rec FROM users WHERE id = user_uuid;

    IF user_rec IS NULL THEN
        RETURN;
    END IF;

    -- Check if user belongs to an organization with active paid subscription
    IF user_rec.organization_id IS NOT NULL THEN
        SELECT o.* INTO org_rec
        FROM organizations o
        WHERE o.id = user_rec.organization_id
          AND o.subscription_status = 'active'
          AND o.subscription_tier IN ('pro', 'team');

        -- Organization subscription takes precedence if it's a paid tier
        IF org_rec.id IS NOT NULL THEN
            RETURN QUERY SELECT
                org_rec.subscription_tier::TEXT,
                org_rec.subscription_status::TEXT,
                'organization'::TEXT,
                TRUE,
                -1,
                -1,
                user_rec.ai_contracts_used,
                user_rec.signatures_used,
                user_rec.usage_reset_at,
                org_rec.name::TEXT;
            RETURN;
        END IF;
    END IF;

    -- Return user's personal subscription
    RETURN QUERY SELECT
        COALESCE(user_rec.subscription_tier, 'free')::TEXT,
        COALESCE(user_rec.subscription_status, 'active')::TEXT,
        'user'::TEXT,
        (user_rec.subscription_tier IN ('pro', 'team')),
        COALESCE(user_rec.ai_contracts_limit, 3),
        COALESCE(user_rec.signatures_limit, 5),
        COALESCE(user_rec.ai_contracts_used, 0),
        COALESCE(user_rec.signatures_used, 0),
        COALESCE(user_rec.usage_reset_at, NOW()),
        NULL::TEXT;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;
