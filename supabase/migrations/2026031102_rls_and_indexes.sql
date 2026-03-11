-- ============================================================
-- RLS Policies + Performance Indexes
-- Enables Row-Level Security on all unprotected tables and
-- adds ownership-based policies and critical indexes.
-- ============================================================

-- ============================================
-- 1. ENABLE RLS ON EXISTING TABLES
-- ============================================

ALTER TABLE contracts ENABLE ROW LEVEL SECURITY;
ALTER TABLE users ENABLE ROW LEVEL SECURITY;
ALTER TABLE signatures ENABLE ROW LEVEL SECURITY;
ALTER TABLE signature_requests ENABLE ROW LEVEL SECURITY;
ALTER TABLE signature_fields ENABLE ROW LEVEL SECURITY;
ALTER TABLE field_values ENABLE ROW LEVEL SECURITY;
ALTER TABLE audit_logs ENABLE ROW LEVEL SECURITY;
ALTER TABLE templates ENABLE ROW LEVEL SECURITY;

-- Enable RLS on new tables (from schema_alignment migration)
ALTER TABLE payments ENABLE ROW LEVEL SECURITY;
ALTER TABLE payment_schedules ENABLE ROW LEVEL SECURITY;
ALTER TABLE template_purchases ENABLE ROW LEVEL SECURITY;
ALTER TABLE completion_certificates ENABLE ROW LEVEL SECURITY;
ALTER TABLE field_templates ENABLE ROW LEVEL SECURITY;
ALTER TABLE contract_versions ENABLE ROW LEVEL SECURITY;
ALTER TABLE contract_risk_analysis ENABLE ROW LEVEL SECURITY;
ALTER TABLE invoices ENABLE ROW LEVEL SECURITY;
ALTER TABLE invoice_settings ENABLE ROW LEVEL SECURITY;
ALTER TABLE invoice_templates ENABLE ROW LEVEL SECURITY;

-- Also enable on usage_history if it exists
DO $$
BEGIN
  IF EXISTS (SELECT 1 FROM pg_tables WHERE schemaname = 'public' AND tablename = 'usage_history') THEN
    EXECUTE 'ALTER TABLE usage_history ENABLE ROW LEVEL SECURITY';
  END IF;
END$$;

-- ============================================
-- 2. RLS POLICIES - CONTRACTS
-- ============================================

CREATE POLICY "contracts_select_own" ON contracts FOR SELECT
  USING (user_id = auth.uid());

CREATE POLICY "contracts_insert_own" ON contracts FOR INSERT
  WITH CHECK (user_id = auth.uid());

CREATE POLICY "contracts_update_own" ON contracts FOR UPDATE
  USING (user_id = auth.uid());

CREATE POLICY "contracts_delete_own" ON contracts FOR DELETE
  USING (user_id = auth.uid());

-- ============================================
-- 3. RLS POLICIES - USERS
-- ============================================

CREATE POLICY "users_select_own" ON users FOR SELECT
  USING (id = auth.uid());

CREATE POLICY "users_insert_own" ON users FOR INSERT
  WITH CHECK (id = auth.uid());

CREATE POLICY "users_update_own" ON users FOR UPDATE
  USING (id = auth.uid());

-- ============================================
-- 4. RLS POLICIES - SIGNATURES
-- ============================================

-- Contract owners can view signatures on their contracts
CREATE POLICY "signatures_select_contract_owner" ON signatures FOR SELECT
  USING (
    contract_id IN (SELECT id FROM contracts WHERE user_id = auth.uid())
  );

-- INSERT handled by submit_signature (SECURITY DEFINER), allow for service role
CREATE POLICY "signatures_insert_via_function" ON signatures FOR INSERT
  WITH CHECK (true);

-- ============================================
-- 5. RLS POLICIES - SIGNATURE_REQUESTS
-- ============================================

CREATE POLICY "sig_requests_select_contract_owner" ON signature_requests FOR SELECT
  USING (
    contract_id IN (SELECT id FROM contracts WHERE user_id = auth.uid())
  );

CREATE POLICY "sig_requests_insert_contract_owner" ON signature_requests FOR INSERT
  WITH CHECK (
    contract_id IN (SELECT id FROM contracts WHERE user_id = auth.uid())
  );

CREATE POLICY "sig_requests_update_contract_owner" ON signature_requests FOR UPDATE
  USING (
    contract_id IN (SELECT id FROM contracts WHERE user_id = auth.uid())
  );

CREATE POLICY "sig_requests_delete_contract_owner" ON signature_requests FOR DELETE
  USING (
    contract_id IN (SELECT id FROM contracts WHERE user_id = auth.uid())
  );

-- ============================================
-- 6. RLS POLICIES - SIGNATURE_FIELDS
-- ============================================

CREATE POLICY "sig_fields_select_contract_owner" ON signature_fields FOR SELECT
  USING (
    contract_id IN (SELECT id FROM contracts WHERE user_id = auth.uid())
  );

CREATE POLICY "sig_fields_insert_contract_owner" ON signature_fields FOR INSERT
  WITH CHECK (
    contract_id IN (SELECT id FROM contracts WHERE user_id = auth.uid())
  );

CREATE POLICY "sig_fields_update_contract_owner" ON signature_fields FOR UPDATE
  USING (
    contract_id IN (SELECT id FROM contracts WHERE user_id = auth.uid())
  );

CREATE POLICY "sig_fields_delete_contract_owner" ON signature_fields FOR DELETE
  USING (
    contract_id IN (SELECT id FROM contracts WHERE user_id = auth.uid())
  );

-- ============================================
-- 7. RLS POLICIES - FIELD_VALUES
-- ============================================

-- Contract owners can view field values
CREATE POLICY "field_values_select_contract_owner" ON field_values FOR SELECT
  USING (
    field_id IN (
      SELECT sf.id FROM signature_fields sf
      WHERE sf.contract_id IN (SELECT id FROM contracts WHERE user_id = auth.uid())
    )
  );

-- INSERT handled by submit_signature (SECURITY DEFINER)
CREATE POLICY "field_values_insert_via_function" ON field_values FOR INSERT
  WITH CHECK (true);

-- ============================================
-- 8. RLS POLICIES - AUDIT_LOGS
-- ============================================

-- Users can view their own audit logs or logs for their contracts
CREATE POLICY "audit_logs_select_own" ON audit_logs FOR SELECT
  USING (
    user_id = auth.uid()
    OR contract_id IN (SELECT id FROM contracts WHERE user_id = auth.uid())
  );

-- INSERT is open (done by server-side functions and SECURITY DEFINER)
CREATE POLICY "audit_logs_insert" ON audit_logs FOR INSERT
  WITH CHECK (true);

-- ============================================
-- 9. RLS POLICIES - TEMPLATES
-- ============================================

-- Anyone can read public templates; owners can read their own
CREATE POLICY "templates_select_public_or_own" ON templates FOR SELECT
  USING (is_public = true OR created_by_id = auth.uid());

CREATE POLICY "templates_insert_own" ON templates FOR INSERT
  WITH CHECK (created_by_id = auth.uid());

CREATE POLICY "templates_update_own" ON templates FOR UPDATE
  USING (created_by_id = auth.uid());

CREATE POLICY "templates_delete_own" ON templates FOR DELETE
  USING (created_by_id = auth.uid());

-- ============================================
-- 10. RLS POLICIES - PAYMENTS
-- ============================================

CREATE POLICY "payments_select_own" ON payments FOR SELECT
  USING (user_id = auth.uid());

CREATE POLICY "payments_insert_own" ON payments FOR INSERT
  WITH CHECK (user_id = auth.uid());

CREATE POLICY "payments_update_own" ON payments FOR UPDATE
  USING (user_id = auth.uid());

-- ============================================
-- 11. RLS POLICIES - PAYMENT_SCHEDULES
-- ============================================

CREATE POLICY "payment_schedules_select_contract_owner" ON payment_schedules FOR SELECT
  USING (
    contract_id IN (SELECT id FROM contracts WHERE user_id = auth.uid())
  );

CREATE POLICY "payment_schedules_insert_contract_owner" ON payment_schedules FOR INSERT
  WITH CHECK (
    contract_id IN (SELECT id FROM contracts WHERE user_id = auth.uid())
  );

-- ============================================
-- 12. RLS POLICIES - TEMPLATE_PURCHASES
-- ============================================

CREATE POLICY "template_purchases_select_own" ON template_purchases FOR SELECT
  USING (user_id = auth.uid());

CREATE POLICY "template_purchases_insert_own" ON template_purchases FOR INSERT
  WITH CHECK (user_id = auth.uid());

-- ============================================
-- 13. RLS POLICIES - COMPLETION_CERTIFICATES
-- ============================================

CREATE POLICY "completion_certificates_select_contract_owner" ON completion_certificates FOR SELECT
  USING (
    contract_id IN (SELECT id FROM contracts WHERE user_id = auth.uid())
  );

CREATE POLICY "completion_certificates_insert" ON completion_certificates FOR INSERT
  WITH CHECK (true);

-- ============================================
-- 14. RLS POLICIES - FIELD_TEMPLATES
-- ============================================

CREATE POLICY "field_templates_select" ON field_templates FOR SELECT
  USING (is_public = true OR created_by_id = auth.uid());

CREATE POLICY "field_templates_insert_own" ON field_templates FOR INSERT
  WITH CHECK (created_by_id = auth.uid());

CREATE POLICY "field_templates_update_own" ON field_templates FOR UPDATE
  USING (created_by_id = auth.uid());

CREATE POLICY "field_templates_delete_own" ON field_templates FOR DELETE
  USING (created_by_id = auth.uid());

-- ============================================
-- 15. RLS POLICIES - CONTRACT_VERSIONS
-- ============================================

CREATE POLICY "contract_versions_select_contract_owner" ON contract_versions FOR SELECT
  USING (
    contract_id IN (SELECT id FROM contracts WHERE user_id = auth.uid())
  );

CREATE POLICY "contract_versions_insert_contract_owner" ON contract_versions FOR INSERT
  WITH CHECK (
    contract_id IN (SELECT id FROM contracts WHERE user_id = auth.uid())
  );

-- ============================================
-- 16. RLS POLICIES - CONTRACT_RISK_ANALYSIS
-- ============================================

CREATE POLICY "contract_risk_select_contract_owner" ON contract_risk_analysis FOR SELECT
  USING (
    contract_id IN (SELECT id FROM contracts WHERE user_id = auth.uid())
  );

CREATE POLICY "contract_risk_insert" ON contract_risk_analysis FOR INSERT
  WITH CHECK (true);

-- ============================================
-- 17. RLS POLICIES - INVOICES
-- ============================================

CREATE POLICY "invoices_select_own" ON invoices FOR SELECT
  USING (user_id = auth.uid());

CREATE POLICY "invoices_insert_own" ON invoices FOR INSERT
  WITH CHECK (user_id = auth.uid());

CREATE POLICY "invoices_update_own" ON invoices FOR UPDATE
  USING (user_id = auth.uid());

CREATE POLICY "invoices_delete_own" ON invoices FOR DELETE
  USING (user_id = auth.uid());

-- ============================================
-- 18. RLS POLICIES - INVOICE_SETTINGS
-- ============================================

CREATE POLICY "invoice_settings_select_own" ON invoice_settings FOR SELECT
  USING (user_id = auth.uid());

CREATE POLICY "invoice_settings_insert_own" ON invoice_settings FOR INSERT
  WITH CHECK (user_id = auth.uid());

CREATE POLICY "invoice_settings_update_own" ON invoice_settings FOR UPDATE
  USING (user_id = auth.uid());

-- ============================================
-- 19. RLS POLICIES - INVOICE_TEMPLATES
-- ============================================

CREATE POLICY "invoice_templates_select" ON invoice_templates FOR SELECT
  USING (is_public = true OR is_system = true OR user_id = auth.uid());

CREATE POLICY "invoice_templates_insert_own" ON invoice_templates FOR INSERT
  WITH CHECK (user_id = auth.uid());

CREATE POLICY "invoice_templates_update_own" ON invoice_templates FOR UPDATE
  USING (user_id = auth.uid());

CREATE POLICY "invoice_templates_delete_own" ON invoice_templates FOR DELETE
  USING (user_id = auth.uid());

-- ============================================
-- 20. RLS POLICIES - USAGE_HISTORY (if exists)
-- ============================================

DO $$
BEGIN
  IF EXISTS (SELECT 1 FROM pg_tables WHERE schemaname = 'public' AND tablename = 'usage_history') THEN
    EXECUTE 'CREATE POLICY "usage_history_select_own" ON usage_history FOR SELECT USING (user_id = auth.uid())';
    EXECUTE 'CREATE POLICY "usage_history_insert" ON usage_history FOR INSERT WITH CHECK (true)';
  END IF;
END$$;

-- ============================================
-- 21. PERFORMANCE INDEXES
-- ============================================

-- Contracts
CREATE INDEX IF NOT EXISTS idx_contracts_user_id ON contracts(user_id);
CREATE INDEX IF NOT EXISTS idx_contracts_status ON contracts(status);
CREATE INDEX IF NOT EXISTS idx_contracts_created_at ON contracts(created_at DESC);
CREATE INDEX IF NOT EXISTS idx_contracts_org_id ON contracts(organization_id);
CREATE INDEX IF NOT EXISTS idx_contracts_type ON contracts(type);

-- Signature requests
CREATE INDEX IF NOT EXISTS idx_sig_requests_contract_id ON signature_requests(contract_id);
CREATE INDEX IF NOT EXISTS idx_sig_requests_status ON signature_requests(status);
CREATE INDEX IF NOT EXISTS idx_sig_requests_signer_email ON signature_requests(signer_email);

-- Signatures
CREATE INDEX IF NOT EXISTS idx_signatures_request_id ON signatures(signature_request_id);
CREATE INDEX IF NOT EXISTS idx_signatures_contract_id ON signatures(contract_id);

-- Audit logs
CREATE INDEX IF NOT EXISTS idx_audit_logs_user_id ON audit_logs(user_id);
CREATE INDEX IF NOT EXISTS idx_audit_logs_event_type ON audit_logs(event_type);
CREATE INDEX IF NOT EXISTS idx_audit_logs_created_at ON audit_logs(created_at DESC);
CREATE INDEX IF NOT EXISTS idx_audit_logs_contract_id ON audit_logs(contract_id);

-- Templates
CREATE INDEX IF NOT EXISTS idx_templates_created_by ON templates(created_by_id);
CREATE INDEX IF NOT EXISTS idx_templates_type ON templates(type);
CREATE INDEX IF NOT EXISTS idx_templates_public ON templates(is_public) WHERE is_public = true;

-- Payments
CREATE INDEX IF NOT EXISTS idx_payments_contract_id ON payments(contract_id);
CREATE INDEX IF NOT EXISTS idx_payments_user_id ON payments(user_id);
CREATE INDEX IF NOT EXISTS idx_payments_status ON payments(status);

-- Invoices
CREATE INDEX IF NOT EXISTS idx_invoices_user_id ON invoices(user_id);
CREATE INDEX IF NOT EXISTS idx_invoices_contract_id ON invoices(contract_id);
CREATE INDEX IF NOT EXISTS idx_invoices_status ON invoices(status);

-- Contract versions
CREATE INDEX IF NOT EXISTS idx_contract_versions_contract_id ON contract_versions(contract_id);

-- Contract risk analysis
CREATE INDEX IF NOT EXISTS idx_contract_risk_contract ON contract_risk_analysis(contract_id);
CREATE INDEX IF NOT EXISTS idx_contract_risk_hash ON contract_risk_analysis(content_hash);

-- Template purchases
CREATE INDEX IF NOT EXISTS idx_template_purchases_user ON template_purchases(user_id);
CREATE INDEX IF NOT EXISTS idx_template_purchases_template ON template_purchases(template_id);

-- Signature fields
CREATE INDEX IF NOT EXISTS idx_sig_fields_contract_id ON signature_fields(contract_id);

-- Field values
CREATE INDEX IF NOT EXISTS idx_field_values_field_id ON field_values(field_id);
