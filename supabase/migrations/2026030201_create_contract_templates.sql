-- System contract templates used by intake and template browsing.
CREATE TABLE IF NOT EXISTS public.contract_templates (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  contract_type TEXT NOT NULL,
  jurisdiction TEXT NOT NULL,
  version INTEGER NOT NULL DEFAULT 1,
  title TEXT NOT NULL,
  preamble TEXT,
  recitals TEXT,
  clauses JSONB NOT NULL DEFAULT '[]'::jsonb,
  signature_block TEXT,
  placeholders JSONB NOT NULL DEFAULT '{}'::jsonb,
  metadata JSONB NOT NULL DEFAULT '{}'::jsonb,
  is_active BOOLEAN NOT NULL DEFAULT true,
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

CREATE INDEX IF NOT EXISTS idx_contract_templates_type
  ON public.contract_templates(contract_type);

CREATE INDEX IF NOT EXISTS idx_contract_templates_jurisdiction
  ON public.contract_templates(jurisdiction);

CREATE INDEX IF NOT EXISTS idx_contract_templates_active
  ON public.contract_templates(is_active);

CREATE UNIQUE INDEX IF NOT EXISTS idx_contract_templates_version_unique
  ON public.contract_templates(contract_type, jurisdiction, version);
