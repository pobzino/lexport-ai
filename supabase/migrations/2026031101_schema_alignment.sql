-- ============================================================
-- Schema Alignment Migration
-- Adds missing enums, columns, and tables to match TypeScript types
-- All operations are idempotent (IF NOT EXISTS / ADD COLUMN IF NOT EXISTS)
-- ============================================================

-- ============================================
-- 1. MISSING ENUMS
-- ============================================

-- signature_type enum (draw, type, upload)
DO $$
BEGIN
  IF NOT EXISTS (SELECT 1 FROM pg_type WHERE typname = 'signature_type') THEN
    CREATE TYPE signature_type AS ENUM ('draw', 'type', 'upload');
  END IF;
END$$;

-- Extend signature_field_type with missing values
DO $$
BEGIN
  IF NOT EXISTS (SELECT 1 FROM pg_enum WHERE enumlabel = 'checkbox' AND enumtypid = 'signature_field_type'::regtype) THEN
    ALTER TYPE signature_field_type ADD VALUE 'checkbox';
  END IF;
END$$;

DO $$
BEGIN
  IF NOT EXISTS (SELECT 1 FROM pg_enum WHERE enumlabel = 'dropdown' AND enumtypid = 'signature_field_type'::regtype) THEN
    ALTER TYPE signature_field_type ADD VALUE 'dropdown';
  END IF;
END$$;

DO $$
BEGIN
  IF NOT EXISTS (SELECT 1 FROM pg_enum WHERE enumlabel = 'attachment' AND enumtypid = 'signature_field_type'::regtype) THEN
    ALTER TYPE signature_field_type ADD VALUE 'attachment';
  END IF;
END$$;

DO $$
BEGIN
  IF NOT EXISTS (SELECT 1 FROM pg_enum WHERE enumlabel = 'payment' AND enumtypid = 'signature_field_type'::regtype) THEN
    ALTER TYPE signature_field_type ADD VALUE 'payment';
  END IF;
END$$;

-- ============================================
-- 2. CONTRACTS TABLE - 22 missing columns
-- ============================================

ALTER TABLE contracts ADD COLUMN IF NOT EXISTS completed_at TIMESTAMPTZ;
ALTER TABLE contracts ADD COLUMN IF NOT EXISTS version INTEGER DEFAULT 1;
ALTER TABLE contracts ADD COLUMN IF NOT EXISTS require_sequential_signing BOOLEAN DEFAULT false;

-- Reminder fields
ALTER TABLE contracts ADD COLUMN IF NOT EXISTS reminder_enabled BOOLEAN DEFAULT true;
ALTER TABLE contracts ADD COLUMN IF NOT EXISTS reminder_interval_days INTEGER DEFAULT 3;
ALTER TABLE contracts ADD COLUMN IF NOT EXISTS reminder_count INTEGER DEFAULT 0;
ALTER TABLE contracts ADD COLUMN IF NOT EXISTS max_reminders INTEGER DEFAULT 5;
ALTER TABLE contracts ADD COLUMN IF NOT EXISTS last_reminder_sent_at TIMESTAMPTZ;
ALTER TABLE contracts ADD COLUMN IF NOT EXISTS next_reminder_at TIMESTAMPTZ;

-- Payment fields
ALTER TABLE contracts ADD COLUMN IF NOT EXISTS payment_required BOOLEAN DEFAULT false;
ALTER TABLE contracts ADD COLUMN IF NOT EXISTS payment_amount NUMERIC;
ALTER TABLE contracts ADD COLUMN IF NOT EXISTS payment_currency TEXT DEFAULT 'usd';
ALTER TABLE contracts ADD COLUMN IF NOT EXISTS payment_status TEXT DEFAULT 'not_required';
ALTER TABLE contracts ADD COLUMN IF NOT EXISTS stripe_payment_intent_id TEXT;
ALTER TABLE contracts ADD COLUMN IF NOT EXISTS payment_structure TEXT DEFAULT 'full';
ALTER TABLE contracts ADD COLUMN IF NOT EXISTS deposit_percentage NUMERIC DEFAULT 100;

-- Source/upload fields
ALTER TABLE contracts ADD COLUMN IF NOT EXISTS source_type TEXT DEFAULT 'ai_generated';
ALTER TABLE contracts ADD COLUMN IF NOT EXISTS source_file_url TEXT;
ALTER TABLE contracts ADD COLUMN IF NOT EXISTS source_file_type TEXT;
ALTER TABLE contracts ADD COLUMN IF NOT EXISTS processing_mode TEXT;
ALTER TABLE contracts ADD COLUMN IF NOT EXISTS extracted_text TEXT;

-- AI explanations cache
ALTER TABLE contracts ADD COLUMN IF NOT EXISTS section_explanations JSONB;

-- ============================================
-- 3. SIGNATURES TABLE - 2 missing columns
-- ============================================

ALTER TABLE signatures ADD COLUMN IF NOT EXISTS type signature_type DEFAULT 'draw';
ALTER TABLE signatures ADD COLUMN IF NOT EXISTS image_url TEXT DEFAULT '';

-- ============================================
-- 4. SIGNATURE_FIELDS TABLE - 4 missing columns
-- ============================================

ALTER TABLE signature_fields ADD COLUMN IF NOT EXISTS page INTEGER DEFAULT 1;
ALTER TABLE signature_fields ADD COLUMN IF NOT EXISTS options JSONB;
ALTER TABLE signature_fields ADD COLUMN IF NOT EXISTS placeholder TEXT;
ALTER TABLE signature_fields ADD COLUMN IF NOT EXISTS validation JSONB;

-- ============================================
-- 5. SIGNATURE_REQUESTS TABLE - 2 missing columns
-- ============================================

ALTER TABLE signature_requests ADD COLUMN IF NOT EXISTS viewed_at TIMESTAMPTZ;
ALTER TABLE signature_requests ADD COLUMN IF NOT EXISTS last_reminder_sent_at TIMESTAMPTZ;

-- ============================================
-- 6. TEMPLATES TABLE - 1 missing column
-- ============================================

ALTER TABLE templates ADD COLUMN IF NOT EXISTS is_premium BOOLEAN DEFAULT false;

-- ============================================
-- 7. ORGANIZATIONS TABLE - 3 missing columns
-- (bootstrap creates 7 cols, team_management IF NOT EXISTS skips)
-- ============================================

ALTER TABLE organizations ADD COLUMN IF NOT EXISTS slug TEXT;
ALTER TABLE organizations ADD COLUMN IF NOT EXISTS logo_url TEXT;
ALTER TABLE organizations ADD COLUMN IF NOT EXISTS settings JSONB DEFAULT '{}';

-- Backfill NULL slugs with UUID text so UNIQUE constraint can be added
UPDATE organizations SET slug = id::text WHERE slug IS NULL;

DO $$
BEGIN
  IF NOT EXISTS (
    SELECT 1 FROM pg_constraint WHERE conname = 'organizations_slug_unique'
  ) THEN
    ALTER TABLE organizations ADD CONSTRAINT organizations_slug_unique UNIQUE (slug);
  END IF;
END$$;

-- ============================================
-- 8. USERS TABLE - 8 missing columns
-- ============================================

-- Profile fields
ALTER TABLE users ADD COLUMN IF NOT EXISTS company_name TEXT;
ALTER TABLE users ADD COLUMN IF NOT EXISTS job_title TEXT;
ALTER TABLE users ADD COLUMN IF NOT EXISTS address TEXT;
ALTER TABLE users ADD COLUMN IF NOT EXISTS phone TEXT;
ALTER TABLE users ADD COLUMN IF NOT EXISTS default_jurisdiction TEXT;

-- Stripe Connect
ALTER TABLE users ADD COLUMN IF NOT EXISTS stripe_connect_account_id TEXT;
ALTER TABLE users ADD COLUMN IF NOT EXISTS stripe_connect_status TEXT DEFAULT 'not_connected';
ALTER TABLE users ADD COLUMN IF NOT EXISTS stripe_connect_onboarding_complete BOOLEAN DEFAULT false;

-- ============================================
-- 9. AUDIT_LOGS TABLE - 9 missing columns
-- ============================================

ALTER TABLE audit_logs ADD COLUMN IF NOT EXISTS actor_email TEXT;
ALTER TABLE audit_logs ADD COLUMN IF NOT EXISTS actor_name TEXT;
ALTER TABLE audit_logs ADD COLUMN IF NOT EXISTS geo_location JSONB;
ALTER TABLE audit_logs ADD COLUMN IF NOT EXISTS device_info JSONB;
ALTER TABLE audit_logs ADD COLUMN IF NOT EXISTS affected_fields JSONB;
ALTER TABLE audit_logs ADD COLUMN IF NOT EXISTS old_value JSONB;
ALTER TABLE audit_logs ADD COLUMN IF NOT EXISTS new_value JSONB;
ALTER TABLE audit_logs ADD COLUMN IF NOT EXISTS page_url TEXT;
ALTER TABLE audit_logs ADD COLUMN IF NOT EXISTS session_id TEXT;

-- ============================================
-- 10. MISSING TABLES
-- ============================================

-- Payments
CREATE TABLE IF NOT EXISTS payments (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  contract_id UUID NOT NULL REFERENCES contracts(id) ON DELETE CASCADE,
  user_id UUID NOT NULL,
  stripe_payment_intent_id TEXT,
  stripe_charge_id TEXT,
  amount INTEGER NOT NULL,
  currency TEXT DEFAULT 'usd',
  platform_fee INTEGER DEFAULT 0,
  net_amount INTEGER,
  status TEXT DEFAULT 'pending',
  payment_type TEXT DEFAULT 'full',
  payment_method TEXT,
  payer_email TEXT,
  payer_name TEXT,
  description TEXT,
  metadata JSONB DEFAULT '{}',
  refunded_amount INTEGER DEFAULT 0,
  failure_code TEXT,
  failure_message TEXT,
  created_at TIMESTAMPTZ DEFAULT NOW(),
  updated_at TIMESTAMPTZ DEFAULT NOW()
);

-- Payment schedules
CREATE TABLE IF NOT EXISTS payment_schedules (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  contract_id UUID NOT NULL REFERENCES contracts(id) ON DELETE CASCADE,
  schedule_type TEXT NOT NULL,
  total_amount INTEGER NOT NULL,
  currency TEXT DEFAULT 'usd',
  deposit_amount INTEGER,
  balance_amount INTEGER,
  deposit_due_date TIMESTAMPTZ,
  balance_due_date TIMESTAMPTZ,
  deposit_payment_id UUID,
  balance_payment_id UUID,
  installments JSONB DEFAULT '[]',
  status TEXT DEFAULT 'pending',
  created_at TIMESTAMPTZ DEFAULT NOW(),
  updated_at TIMESTAMPTZ DEFAULT NOW()
);

-- Template purchases
CREATE TABLE IF NOT EXISTS template_purchases (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id UUID NOT NULL REFERENCES users(id) ON DELETE CASCADE,
  template_id UUID NOT NULL REFERENCES templates(id) ON DELETE CASCADE,
  amount INTEGER NOT NULL,
  status TEXT DEFAULT 'pending',
  stripe_payment_intent_id TEXT,
  purchased_at TIMESTAMPTZ,
  created_at TIMESTAMPTZ DEFAULT NOW(),
  updated_at TIMESTAMPTZ DEFAULT NOW()
);

-- Completion certificates
CREATE TABLE IF NOT EXISTS completion_certificates (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  contract_id UUID NOT NULL REFERENCES contracts(id) ON DELETE CASCADE,
  certificate_number TEXT NOT NULL UNIQUE,
  pdf_url TEXT,
  generated_at TIMESTAMPTZ DEFAULT NOW(),
  summary JSONB NOT NULL
);

-- Field templates
CREATE TABLE IF NOT EXISTS field_templates (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  name TEXT NOT NULL,
  description TEXT,
  contract_type TEXT,
  fields JSONB NOT NULL DEFAULT '[]',
  is_public BOOLEAN DEFAULT false,
  created_by_id UUID REFERENCES users(id),
  usage_count INTEGER DEFAULT 0,
  created_at TIMESTAMPTZ DEFAULT NOW(),
  updated_at TIMESTAMPTZ DEFAULT NOW()
);

-- Contract versions
CREATE TABLE IF NOT EXISTS contract_versions (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  contract_id UUID NOT NULL REFERENCES contracts(id) ON DELETE CASCADE,
  version_number INTEGER NOT NULL,
  content JSONB NOT NULL,
  metadata JSONB,
  change_summary TEXT,
  change_type TEXT NOT NULL DEFAULT 'edit',
  created_by UUID REFERENCES users(id),
  created_at TIMESTAMPTZ DEFAULT NOW(),
  UNIQUE(contract_id, version_number)
);

-- Contract risk analysis cache
CREATE TABLE IF NOT EXISTS contract_risk_analysis (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  contract_id UUID NOT NULL REFERENCES contracts(id) ON DELETE CASCADE,
  content_hash TEXT NOT NULL,
  analysis JSONB NOT NULL,
  created_at TIMESTAMPTZ DEFAULT NOW(),
  UNIQUE(contract_id, content_hash)
);

-- Invoices
CREATE TABLE IF NOT EXISTS invoices (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  contract_id UUID REFERENCES contracts(id) ON DELETE SET NULL,
  template_id UUID,
  payment_id UUID,
  user_id UUID NOT NULL REFERENCES users(id),
  invoice_number TEXT NOT NULL UNIQUE,
  amount INTEGER NOT NULL,
  currency TEXT DEFAULT 'usd',
  status TEXT DEFAULT 'draft',
  line_items JSONB DEFAULT '[]',
  subtotal INTEGER,
  tax_amount INTEGER DEFAULT 0,
  total INTEGER,
  due_date TIMESTAMPTZ,
  paid_at TIMESTAMPTZ,
  sent_at TIMESTAMPTZ,
  pdf_url TEXT,
  recipient_name TEXT,
  recipient_email TEXT,
  recipient_address JSONB,
  sender_name TEXT,
  sender_email TEXT,
  sender_address JSONB,
  notes TEXT,
  payment_method TEXT,
  payment_reference TEXT,
  reminder_enabled BOOLEAN DEFAULT true,
  reminder_interval_days INTEGER DEFAULT 7,
  next_reminder_at TIMESTAMPTZ,
  reminder_count INTEGER DEFAULT 0,
  max_reminders INTEGER DEFAULT 3,
  last_reminder_sent_at TIMESTAMPTZ,
  created_at TIMESTAMPTZ DEFAULT NOW(),
  updated_at TIMESTAMPTZ DEFAULT NOW()
);

-- Invoice settings (per-user)
CREATE TABLE IF NOT EXISTS invoice_settings (
  user_id UUID PRIMARY KEY REFERENCES users(id) ON DELETE CASCADE,
  number_prefix TEXT DEFAULT 'INV-',
  next_number INTEGER DEFAULT 1,
  number_year INTEGER DEFAULT EXTRACT(YEAR FROM NOW()),
  company_name TEXT,
  company_address TEXT,
  company_logo_url TEXT,
  default_due_days INTEGER DEFAULT 30,
  default_notes TEXT,
  default_payment_terms TEXT,
  created_at TIMESTAMPTZ DEFAULT NOW(),
  updated_at TIMESTAMPTZ DEFAULT NOW()
);

-- Invoice templates
CREATE TABLE IF NOT EXISTS invoice_templates (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id UUID REFERENCES users(id) ON DELETE CASCADE,
  name TEXT NOT NULL,
  description TEXT,
  template_type TEXT NOT NULL DEFAULT 'custom',
  is_system BOOLEAN DEFAULT false,
  is_public BOOLEAN DEFAULT false,
  default_line_items JSONB DEFAULT '[]',
  default_notes TEXT,
  default_due_days INTEGER DEFAULT 30,
  default_payment_terms TEXT,
  hourly_rate INTEGER,
  milestones JSONB,
  retainer_amount INTEGER,
  retainer_period TEXT,
  usage_count INTEGER DEFAULT 0,
  created_at TIMESTAMPTZ DEFAULT NOW(),
  updated_at TIMESTAMPTZ DEFAULT NOW()
);
