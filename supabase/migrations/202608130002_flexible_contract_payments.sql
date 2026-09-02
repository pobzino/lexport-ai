ALTER TABLE public.contracts
  ADD COLUMN IF NOT EXISTS payment_schedule JSONB NOT NULL DEFAULT '[]'::jsonb;

COMMENT ON COLUMN public.contracts.payment_schedule IS
  'Ordered custom payment milestones: [{id, label, percentage, dueDate?}]';
