-- Invoice Templates and Standalone Invoices Migration
-- This migration:
-- 1. Creates the invoice_templates table for template definitions
-- 2. Makes invoices.contract_id nullable to support standalone invoices
-- 3. Adds template_id reference to invoices
-- 4. Seeds 4 standard system templates

-- ============================================
-- 1. Create invoice_templates table
-- ============================================
CREATE TABLE IF NOT EXISTS invoice_templates (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id UUID REFERENCES auth.users(id) ON DELETE CASCADE,
  name TEXT NOT NULL,
  description TEXT,
  template_type TEXT NOT NULL CHECK (template_type IN ('hourly', 'fixed_fee', 'milestone', 'retainer', 'custom')),
  is_system BOOLEAN DEFAULT FALSE,
  is_public BOOLEAN DEFAULT FALSE,

  -- Template configuration
  default_line_items JSONB DEFAULT '[]'::jsonb,
  default_notes TEXT,
  default_due_days INTEGER DEFAULT 30,
  default_payment_terms TEXT DEFAULT 'Net 30',

  -- For hourly templates
  hourly_rate INTEGER, -- cents

  -- For milestone templates
  milestones JSONB DEFAULT '[]'::jsonb,

  -- For retainer templates
  retainer_amount INTEGER, -- cents
  retainer_period TEXT CHECK (retainer_period IN ('weekly', 'monthly', 'quarterly', NULL)),

  -- Metadata
  usage_count INTEGER DEFAULT 0,
  created_at TIMESTAMPTZ DEFAULT now(),
  updated_at TIMESTAMPTZ DEFAULT now()
);

-- ============================================
-- 2. Enable RLS on invoice_templates
-- ============================================
ALTER TABLE invoice_templates ENABLE ROW LEVEL SECURITY;

-- Users can view their own templates and all system/public templates
CREATE POLICY "Users can view own templates and system templates"
  ON invoice_templates FOR SELECT
  USING (user_id = auth.uid() OR is_system = TRUE OR is_public = TRUE);

-- Users can create their own templates (but not system templates)
CREATE POLICY "Users can create own templates"
  ON invoice_templates FOR INSERT
  WITH CHECK (user_id = auth.uid() AND is_system = FALSE);

-- Users can update their own templates (but not system templates)
CREATE POLICY "Users can update own templates"
  ON invoice_templates FOR UPDATE
  USING (user_id = auth.uid() AND is_system = FALSE);

-- Users can delete their own templates (but not system templates)
CREATE POLICY "Users can delete own templates"
  ON invoice_templates FOR DELETE
  USING (user_id = auth.uid() AND is_system = FALSE);

-- ============================================
-- 3. Create indexes for invoice_templates
-- ============================================
CREATE INDEX IF NOT EXISTS idx_invoice_templates_user_id ON invoice_templates(user_id);
CREATE INDEX IF NOT EXISTS idx_invoice_templates_type ON invoice_templates(template_type);
CREATE INDEX IF NOT EXISTS idx_invoice_templates_system ON invoice_templates(is_system) WHERE is_system = TRUE;

-- ============================================
-- 4. Modify invoices table for standalone support
-- ============================================

-- Make contract_id nullable to support standalone invoices
ALTER TABLE invoices ALTER COLUMN contract_id DROP NOT NULL;

-- Add template_id reference
ALTER TABLE invoices ADD COLUMN IF NOT EXISTS template_id UUID REFERENCES invoice_templates(id) ON DELETE SET NULL;

-- Create index for standalone invoices (where contract_id is null)
CREATE INDEX IF NOT EXISTS idx_invoices_standalone ON invoices(user_id) WHERE contract_id IS NULL;

-- Create index for template usage tracking
CREATE INDEX IF NOT EXISTS idx_invoices_template_id ON invoices(template_id) WHERE template_id IS NOT NULL;

-- ============================================
-- 5. Seed 4 standard system templates
-- ============================================

-- Hourly Rate Invoice Template
INSERT INTO invoice_templates (
  name,
  description,
  template_type,
  is_system,
  is_public,
  default_line_items,
  default_notes,
  default_due_days,
  default_payment_terms
) VALUES (
  'Hourly Rate Invoice',
  'Bill for hours worked at a specified hourly rate. Perfect for consulting, freelance work, and time-based projects.',
  'hourly',
  TRUE,
  TRUE,
  '[{"description": "Professional Services - Hours Worked", "quantity": 0, "unit_price": 0, "amount": 0}]'::jsonb,
  'Hours worked during the billing period. Please remit payment within the specified terms.',
  30,
  'Net 30'
);

-- Fixed Fee Invoice Template
INSERT INTO invoice_templates (
  name,
  description,
  template_type,
  is_system,
  is_public,
  default_line_items,
  default_notes,
  default_due_days,
  default_payment_terms
) VALUES (
  'Fixed Fee Invoice',
  'One-time payment for a defined scope of work. Ideal for project-based work with a set deliverable.',
  'fixed_fee',
  TRUE,
  TRUE,
  '[{"description": "Project Deliverable - Fixed Fee", "quantity": 1, "unit_price": 0, "amount": 0}]'::jsonb,
  'Fixed fee for project completion as agreed in our contract.',
  30,
  'Net 30'
);

-- Milestone Invoice Template
INSERT INTO invoice_templates (
  name,
  description,
  template_type,
  is_system,
  is_public,
  default_line_items,
  default_notes,
  default_due_days,
  default_payment_terms,
  milestones
) VALUES (
  'Milestone Invoice',
  'Invoice for reaching a specific project milestone. Great for phased projects with payment checkpoints.',
  'milestone',
  TRUE,
  TRUE,
  '[{"description": "Milestone Payment", "quantity": 1, "unit_price": 0, "amount": 0}]'::jsonb,
  'Payment for completed milestone as per our project agreement.',
  14,
  'Net 14',
  '[{"name": "Project Kickoff", "percentage": 25}, {"name": "Mid-Project Review", "percentage": 25}, {"name": "Final Delivery", "percentage": 50}]'::jsonb
);

-- Retainer Invoice Template
INSERT INTO invoice_templates (
  name,
  description,
  template_type,
  is_system,
  is_public,
  default_line_items,
  default_notes,
  default_due_days,
  default_payment_terms,
  retainer_period
) VALUES (
  'Retainer Invoice',
  'Recurring invoice for ongoing retained services. Perfect for ongoing advisory, support, or maintenance work.',
  'retainer',
  TRUE,
  TRUE,
  '[{"description": "Monthly Retainer Fee", "quantity": 1, "unit_price": 0, "amount": 0}]'::jsonb,
  'Monthly retainer fee for ongoing professional services as agreed.',
  0,
  'Due on Receipt',
  'monthly'
);

-- ============================================
-- 6. Create function to update usage_count
-- ============================================
CREATE OR REPLACE FUNCTION increment_template_usage()
RETURNS TRIGGER AS $$
BEGIN
  IF NEW.template_id IS NOT NULL THEN
    UPDATE invoice_templates
    SET usage_count = usage_count + 1,
        updated_at = now()
    WHERE id = NEW.template_id;
  END IF;
  RETURN NEW;
END;
$$ LANGUAGE plpgsql;

-- Create trigger to increment usage count when invoice is created with template
DROP TRIGGER IF EXISTS trigger_increment_template_usage ON invoices;
CREATE TRIGGER trigger_increment_template_usage
  AFTER INSERT ON invoices
  FOR EACH ROW
  EXECUTE FUNCTION increment_template_usage();
