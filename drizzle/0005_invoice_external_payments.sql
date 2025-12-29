-- Add external payment tracking columns to invoices
-- Allows users to record payments made outside the platform

-- Payment method for external payments (bank_transfer, cash, check, other)
ALTER TABLE invoices ADD COLUMN IF NOT EXISTS payment_method TEXT;

-- Reference number for external payments (check number, wire reference, etc.)
ALTER TABLE invoices ADD COLUMN IF NOT EXISTS payment_reference TEXT;

-- Add index for payment method queries
CREATE INDEX IF NOT EXISTS idx_invoices_payment_method ON invoices(payment_method) WHERE payment_method IS NOT NULL;

-- Comment for documentation
COMMENT ON COLUMN invoices.payment_method IS 'Payment method for external payments: bank_transfer, cash, check, other';
COMMENT ON COLUMN invoices.payment_reference IS 'Reference number for external payments (check number, wire reference, etc.)';
