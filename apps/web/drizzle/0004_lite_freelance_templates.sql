-- Lite Freelance Templates Migration
-- These replace the complex 20+ clause templates with simple 11-clause versions
-- Appropriate for startup founders and freelancers

-- Deactivate old complex freelance templates
UPDATE contract_templates SET is_active = false WHERE contract_type = 'freelance_service';

-- California - Simple Freelance Agreement
INSERT INTO contract_templates (contract_type, jurisdiction, title, version, is_active, preamble, recitals, signature_block, clauses, placeholders, metadata)
VALUES (
  'freelance_service',
  'us_california',
  'Freelance Agreement - Simple',
  1,
  true,
  'This Freelance Agreement ("Agreement") is entered into as of {{effective_date}} between {{client_name}} ("Client") and {{freelancer_name}} ("Freelancer").',
  'WHEREAS, Client desires to engage Freelancer to provide certain services; and WHEREAS, Freelancer desires to provide such services under the terms set forth herein.',
  E'IN WITNESS WHEREOF, the parties have executed this Agreement.\n\nCLIENT: {{client_name}}\nSignature: _______________________\nName: {{client_signer_name}}\nDate: {{client_sign_date}}\n\nFREELANCER: {{freelancer_name}}\nSignature: _______________________\nDate: {{freelancer_sign_date}}',
  '[
    {"id": "scope", "title": "1. Services", "order": 1, "content": "Freelancer agrees to provide: {{service_description}}. Client will provide reasonable access and information needed."},
    {"id": "deliverables", "title": "2. Deliverables", "order": 2, "content": "Freelancer will deliver: {{deliverables_list}}. Deliverables accepted when Client approves or fails to request changes within {{review_period}} days."},
    {"id": "payment", "title": "3. Payment", "order": 3, "content": "Client will pay {{payment_amount}}. Payment due {{payment_terms}}. Late payments accrue 1.5% monthly interest."},
    {"id": "timeline", "title": "4. Timeline", "order": 4, "content": "Work begins {{start_date}}, final delivery by {{end_date}}. Client-caused delays extend deadlines."},
    {"id": "revisions", "title": "5. Revisions", "order": 5, "content": "Includes {{revision_rounds}} revision rounds. Additional revisions billed at {{hourly_rate}}/hour."},
    {"id": "contractor", "title": "6. Independent Contractor", "order": 6, "content": "Freelancer is an independent contractor, not an employee. Freelancer controls their schedule, methods, and tools. Freelancer handles their own taxes."},
    {"id": "ip", "title": "7. Intellectual Property", "order": 7, "content": "Upon full payment, Client owns all deliverables. Freelancer keeps pre-existing materials and may show work in portfolio."},
    {"id": "confidentiality", "title": "8. Confidentiality", "order": 8, "content": "Both parties keep confidential information private. Does not apply to public information."},
    {"id": "termination", "title": "9. Termination", "order": 9, "content": "Either party may terminate with {{notice_period}} days notice. Client pays for completed work. Early termination by Client incurs {{kill_fee_percentage}}% kill fee."},
    {"id": "liability", "title": "10. Liability", "order": 10, "content": "No liability for indirect damages. Freelancer total liability capped at amount paid."},
    {"id": "general", "title": "11. General", "order": 11, "content": "Governed by California law. Disputes resolved in {{county_name}} County. This is the entire agreement."}
  ]'::jsonb,
  '[
    {"key": "effective_date", "label": "Agreement Date", "type": "date", "required": true, "category": "dates"},
    {"key": "client_name", "label": "Client Name", "type": "text", "required": true, "category": "party_a"},
    {"key": "freelancer_name", "label": "Freelancer Name", "type": "text", "required": true, "category": "party_b"},
    {"key": "service_description", "label": "Services", "type": "textarea", "required": true, "category": "terms"},
    {"key": "deliverables_list", "label": "Deliverables", "type": "textarea", "required": true, "category": "terms"},
    {"key": "review_period", "label": "Review Period (days)", "type": "number", "required": true, "default": "5", "category": "terms"},
    {"key": "payment_amount", "label": "Total Payment", "type": "currency", "required": true, "category": "financial"},
    {"key": "payment_terms", "label": "Payment Terms", "type": "text", "required": true, "default": "within 14 days of invoice", "category": "financial"},
    {"key": "start_date", "label": "Start Date", "type": "date", "required": true, "category": "dates"},
    {"key": "end_date", "label": "End Date", "type": "date", "required": true, "category": "dates"},
    {"key": "revision_rounds", "label": "Revision Rounds", "type": "number", "required": true, "default": "2", "category": "terms"},
    {"key": "hourly_rate", "label": "Hourly Rate", "type": "currency", "required": true, "category": "financial"},
    {"key": "notice_period", "label": "Notice Period (days)", "type": "number", "required": true, "default": "14", "category": "terms"},
    {"key": "kill_fee_percentage", "label": "Kill Fee %", "type": "number", "required": true, "default": "25", "category": "financial"},
    {"key": "county_name", "label": "County", "type": "text", "required": true, "default": "Los Angeles", "category": "legal"},
    {"key": "client_signer_name", "label": "Client Signer", "type": "text", "required": true, "category": "signatures"},
    {"key": "client_sign_date", "label": "Client Sign Date", "type": "date", "required": true, "category": "signatures"},
    {"key": "freelancer_sign_date", "label": "Freelancer Sign Date", "type": "date", "required": true, "category": "signatures"}
  ]'::jsonb,
  '{"word_count": 350, "template_type": "lite", "reading_time": "2 min"}'::jsonb
);

-- New York - Simple Freelance Agreement (FIFA Compliant)
INSERT INTO contract_templates (contract_type, jurisdiction, title, version, is_active, preamble, recitals, signature_block, clauses, placeholders, metadata)
VALUES (
  'freelance_service',
  'us_new_york',
  'Freelance Agreement - Simple',
  1,
  true,
  'This Freelance Agreement ("Agreement") is entered into as of {{effective_date}} between {{client_name}} ("Client") and {{freelancer_name}} ("Freelancer") pursuant to New York''s Freelance Isn''t Free Act.',
  'WHEREAS, Client desires to engage Freelancer to provide certain services; and WHEREAS, Freelancer desires to provide such services under the terms set forth herein.',
  E'IN WITNESS WHEREOF, the parties have executed this Agreement.\n\nCLIENT: {{client_name}}\nSignature: _______________________\nName: {{client_signer_name}}\nDate: {{client_sign_date}}\n\nFREELANCER: {{freelancer_name}}\nSignature: _______________________\nDate: {{freelancer_sign_date}}',
  '[
    {"id": "scope", "title": "1. Services", "order": 1, "content": "Freelancer agrees to provide: {{service_description}}. Client will provide reasonable access and information needed."},
    {"id": "deliverables", "title": "2. Deliverables", "order": 2, "content": "Freelancer will deliver: {{deliverables_list}}. Deliverables accepted when Client approves or fails to request changes within {{review_period}} days."},
    {"id": "payment", "title": "3. Payment", "order": 3, "content": "Client will pay {{payment_amount}}. Per NY Freelance Isn''t Free Act, payment due within 30 days of completion or {{payment_terms}}, whichever is sooner. Late payment may result in double damages plus attorneys'' fees."},
    {"id": "timeline", "title": "4. Timeline", "order": 4, "content": "Work begins {{start_date}}, final delivery by {{end_date}}. Client-caused delays extend deadlines."},
    {"id": "revisions", "title": "5. Revisions", "order": 5, "content": "Includes {{revision_rounds}} revision rounds. Additional revisions billed at {{hourly_rate}}/hour."},
    {"id": "contractor", "title": "6. Independent Contractor", "order": 6, "content": "Freelancer is an independent contractor, not an employee. Freelancer controls their schedule, methods, and tools. Freelancer handles their own taxes."},
    {"id": "ip", "title": "7. Intellectual Property", "order": 7, "content": "Upon full payment, Client owns all deliverables. Freelancer keeps pre-existing materials and may show work in portfolio."},
    {"id": "confidentiality", "title": "8. Confidentiality", "order": 8, "content": "Both parties keep confidential information private. Does not apply to public information."},
    {"id": "termination", "title": "9. Termination", "order": 9, "content": "Either party may terminate with {{notice_period}} days notice. Client pays for completed work within 30 days per FIFA."},
    {"id": "liability", "title": "10. Liability", "order": 10, "content": "No liability for indirect damages. Freelancer total liability capped at amount paid."},
    {"id": "general", "title": "11. General", "order": 11, "content": "Governed by New York law. Disputes resolved in {{county_name}} County. This is the entire agreement."}
  ]'::jsonb,
  '[
    {"key": "effective_date", "label": "Agreement Date", "type": "date", "required": true, "category": "dates"},
    {"key": "client_name", "label": "Client Name", "type": "text", "required": true, "category": "party_a"},
    {"key": "freelancer_name", "label": "Freelancer Name", "type": "text", "required": true, "category": "party_b"},
    {"key": "service_description", "label": "Services", "type": "textarea", "required": true, "category": "terms"},
    {"key": "deliverables_list", "label": "Deliverables", "type": "textarea", "required": true, "category": "terms"},
    {"key": "review_period", "label": "Review Period (days)", "type": "number", "required": true, "default": "5", "category": "terms"},
    {"key": "payment_amount", "label": "Total Payment", "type": "currency", "required": true, "category": "financial"},
    {"key": "payment_terms", "label": "Payment Terms", "type": "text", "required": true, "default": "within 14 days of invoice", "category": "financial"},
    {"key": "start_date", "label": "Start Date", "type": "date", "required": true, "category": "dates"},
    {"key": "end_date", "label": "End Date", "type": "date", "required": true, "category": "dates"},
    {"key": "revision_rounds", "label": "Revision Rounds", "type": "number", "required": true, "default": "2", "category": "terms"},
    {"key": "hourly_rate", "label": "Hourly Rate", "type": "currency", "required": true, "category": "financial"},
    {"key": "notice_period", "label": "Notice Period (days)", "type": "number", "required": true, "default": "14", "category": "terms"},
    {"key": "county_name", "label": "County", "type": "text", "required": true, "default": "New York", "category": "legal"},
    {"key": "client_signer_name", "label": "Client Signer", "type": "text", "required": true, "category": "signatures"},
    {"key": "client_sign_date", "label": "Client Sign Date", "type": "date", "required": true, "category": "signatures"},
    {"key": "freelancer_sign_date", "label": "Freelancer Sign Date", "type": "date", "required": true, "category": "signatures"}
  ]'::jsonb,
  '{"word_count": 380, "template_type": "lite", "reading_time": "2 min", "fifa_compliant": true}'::jsonb
);

-- Texas - Simple Freelance Agreement
INSERT INTO contract_templates (contract_type, jurisdiction, title, version, is_active, preamble, recitals, signature_block, clauses, placeholders, metadata)
VALUES (
  'freelance_service',
  'us_texas',
  'Freelance Agreement - Simple',
  1,
  true,
  'This Freelance Agreement ("Agreement") is entered into as of {{effective_date}} between {{client_name}} ("Client") and {{freelancer_name}} ("Freelancer").',
  'WHEREAS, Client desires to engage Freelancer to provide certain services; and WHEREAS, Freelancer desires to provide such services under the terms set forth herein.',
  E'IN WITNESS WHEREOF, the parties have executed this Agreement.\n\nCLIENT: {{client_name}}\nSignature: _______________________\nName: {{client_signer_name}}\nDate: {{client_sign_date}}\n\nFREELANCER: {{freelancer_name}}\nSignature: _______________________\nDate: {{freelancer_sign_date}}',
  '[
    {"id": "scope", "title": "1. Services", "order": 1, "content": "Freelancer agrees to provide: {{service_description}}. Client will provide reasonable access and information needed."},
    {"id": "deliverables", "title": "2. Deliverables", "order": 2, "content": "Freelancer will deliver: {{deliverables_list}}. Deliverables accepted when Client approves or fails to request changes within {{review_period}} days."},
    {"id": "payment", "title": "3. Payment", "order": 3, "content": "Client will pay {{payment_amount}}. Payment due {{payment_terms}}. Late payments accrue 1.5% monthly interest."},
    {"id": "timeline", "title": "4. Timeline", "order": 4, "content": "Work begins {{start_date}}, final delivery by {{end_date}}. Client-caused delays extend deadlines."},
    {"id": "revisions", "title": "5. Revisions", "order": 5, "content": "Includes {{revision_rounds}} revision rounds. Additional revisions billed at {{hourly_rate}}/hour."},
    {"id": "contractor", "title": "6. Independent Contractor", "order": 6, "content": "Freelancer is an independent contractor, not an employee. Freelancer controls their schedule, methods, and tools. Freelancer handles their own taxes."},
    {"id": "ip", "title": "7. Intellectual Property", "order": 7, "content": "Upon full payment, Client owns all deliverables. Freelancer keeps pre-existing materials and may show work in portfolio."},
    {"id": "confidentiality", "title": "8. Confidentiality", "order": 8, "content": "Both parties keep confidential information private. Does not apply to public information."},
    {"id": "termination", "title": "9. Termination", "order": 9, "content": "Either party may terminate with {{notice_period}} days notice. Client pays for completed work. Early termination by Client incurs {{kill_fee_percentage}}% kill fee."},
    {"id": "liability", "title": "10. Liability", "order": 10, "content": "No liability for indirect damages. Freelancer total liability capped at amount paid."},
    {"id": "general", "title": "11. General", "order": 11, "content": "Governed by Texas law. Disputes resolved in {{county_name}} County. This is the entire agreement."}
  ]'::jsonb,
  '[
    {"key": "effective_date", "label": "Agreement Date", "type": "date", "required": true, "category": "dates"},
    {"key": "client_name", "label": "Client Name", "type": "text", "required": true, "category": "party_a"},
    {"key": "freelancer_name", "label": "Freelancer Name", "type": "text", "required": true, "category": "party_b"},
    {"key": "service_description", "label": "Services", "type": "textarea", "required": true, "category": "terms"},
    {"key": "deliverables_list", "label": "Deliverables", "type": "textarea", "required": true, "category": "terms"},
    {"key": "review_period", "label": "Review Period (days)", "type": "number", "required": true, "default": "5", "category": "terms"},
    {"key": "payment_amount", "label": "Total Payment", "type": "currency", "required": true, "category": "financial"},
    {"key": "payment_terms", "label": "Payment Terms", "type": "text", "required": true, "default": "within 14 days of invoice", "category": "financial"},
    {"key": "start_date", "label": "Start Date", "type": "date", "required": true, "category": "dates"},
    {"key": "end_date", "label": "End Date", "type": "date", "required": true, "category": "dates"},
    {"key": "revision_rounds", "label": "Revision Rounds", "type": "number", "required": true, "default": "2", "category": "terms"},
    {"key": "hourly_rate", "label": "Hourly Rate", "type": "currency", "required": true, "category": "financial"},
    {"key": "notice_period", "label": "Notice Period (days)", "type": "number", "required": true, "default": "14", "category": "terms"},
    {"key": "kill_fee_percentage", "label": "Kill Fee %", "type": "number", "required": true, "default": "25", "category": "financial"},
    {"key": "county_name", "label": "County", "type": "text", "required": true, "default": "Travis", "category": "legal"},
    {"key": "client_signer_name", "label": "Client Signer", "type": "text", "required": true, "category": "signatures"},
    {"key": "client_sign_date", "label": "Client Sign Date", "type": "date", "required": true, "category": "signatures"},
    {"key": "freelancer_sign_date", "label": "Freelancer Sign Date", "type": "date", "required": true, "category": "signatures"}
  ]'::jsonb,
  '{"word_count": 350, "template_type": "lite", "reading_time": "2 min"}'::jsonb
);

-- UK - Simple Freelance Agreement
INSERT INTO contract_templates (contract_type, jurisdiction, title, version, is_active, preamble, recitals, signature_block, clauses, placeholders, metadata)
VALUES (
  'freelance_service',
  'uk',
  'Freelance Agreement - Simple',
  1,
  true,
  'This Freelance Agreement ("Agreement") is entered into as of {{effective_date}} between {{client_name}} ("Client") and {{freelancer_name}} ("Freelancer").',
  'WHEREAS, Client desires to engage Freelancer to provide certain services; and WHEREAS, Freelancer desires to provide such services under the terms set forth herein.',
  E'IN WITNESS WHEREOF, the parties have executed this Agreement.\n\nCLIENT: {{client_name}}\nSignature: _______________________\nName: {{client_signer_name}}\nDate: {{client_sign_date}}\n\nFREELANCER: {{freelancer_name}}\nSignature: _______________________\nDate: {{freelancer_sign_date}}',
  '[
    {"id": "scope", "title": "1. Services", "order": 1, "content": "Freelancer agrees to provide: {{service_description}}. Client will provide reasonable access and information needed."},
    {"id": "deliverables", "title": "2. Deliverables", "order": 2, "content": "Freelancer will deliver: {{deliverables_list}}. Deliverables accepted when Client approves or fails to request changes within {{review_period}} days."},
    {"id": "payment", "title": "3. Payment", "order": 3, "content": "Client will pay {{payment_amount}}. Payment due {{payment_terms}}. Late payments accrue interest per Late Payment of Commercial Debts Act 1998."},
    {"id": "timeline", "title": "4. Timeline", "order": 4, "content": "Work begins {{start_date}}, final delivery by {{end_date}}. Client-caused delays extend deadlines."},
    {"id": "revisions", "title": "5. Revisions", "order": 5, "content": "Includes {{revision_rounds}} revision rounds. Additional revisions billed at {{hourly_rate}}/hour."},
    {"id": "contractor", "title": "6. Independent Contractor", "order": 6, "content": "Freelancer is an independent contractor, not an employee. Freelancer controls their schedule, methods, and tools. Freelancer handles their own tax and National Insurance."},
    {"id": "ip", "title": "7. Intellectual Property", "order": 7, "content": "Upon full payment, Client owns all deliverables per Copyright, Designs and Patents Act 1988. Freelancer keeps pre-existing materials and may show work in portfolio."},
    {"id": "confidentiality", "title": "8. Confidentiality", "order": 8, "content": "Both parties keep confidential information private. Does not apply to public information."},
    {"id": "termination", "title": "9. Termination", "order": 9, "content": "Either party may terminate with {{notice_period}} days notice. Client pays for completed work. Early termination by Client incurs {{kill_fee_percentage}}% kill fee."},
    {"id": "liability", "title": "10. Liability", "order": 10, "content": "No liability for indirect damages. Freelancer total liability capped at amount paid. Nothing excludes liability for fraud or death/personal injury from negligence."},
    {"id": "general", "title": "11. General", "order": 11, "content": "Governed by laws of England and Wales. Disputes resolved in courts of England and Wales. This is the entire agreement."}
  ]'::jsonb,
  '[
    {"key": "effective_date", "label": "Agreement Date", "type": "date", "required": true, "category": "dates"},
    {"key": "client_name", "label": "Client Name", "type": "text", "required": true, "category": "party_a"},
    {"key": "freelancer_name", "label": "Freelancer Name", "type": "text", "required": true, "category": "party_b"},
    {"key": "service_description", "label": "Services", "type": "textarea", "required": true, "category": "terms"},
    {"key": "deliverables_list", "label": "Deliverables", "type": "textarea", "required": true, "category": "terms"},
    {"key": "review_period", "label": "Review Period (days)", "type": "number", "required": true, "default": "5", "category": "terms"},
    {"key": "payment_amount", "label": "Total Payment", "type": "currency", "required": true, "category": "financial"},
    {"key": "payment_terms", "label": "Payment Terms", "type": "text", "required": true, "default": "within 14 days of invoice", "category": "financial"},
    {"key": "start_date", "label": "Start Date", "type": "date", "required": true, "category": "dates"},
    {"key": "end_date", "label": "End Date", "type": "date", "required": true, "category": "dates"},
    {"key": "revision_rounds", "label": "Revision Rounds", "type": "number", "required": true, "default": "2", "category": "terms"},
    {"key": "hourly_rate", "label": "Hourly Rate", "type": "currency", "required": true, "category": "financial"},
    {"key": "notice_period", "label": "Notice Period (days)", "type": "number", "required": true, "default": "14", "category": "terms"},
    {"key": "kill_fee_percentage", "label": "Kill Fee %", "type": "number", "required": true, "default": "25", "category": "financial"},
    {"key": "client_signer_name", "label": "Client Signer", "type": "text", "required": true, "category": "signatures"},
    {"key": "client_sign_date", "label": "Client Sign Date", "type": "date", "required": true, "category": "signatures"},
    {"key": "freelancer_sign_date", "label": "Freelancer Sign Date", "type": "date", "required": true, "category": "signatures"}
  ]'::jsonb,
  '{"word_count": 380, "template_type": "lite", "reading_time": "2 min"}'::jsonb
);

-- Florida - Simple Freelance Agreement
INSERT INTO contract_templates (contract_type, jurisdiction, title, version, is_active, preamble, recitals, signature_block, clauses, placeholders, metadata)
VALUES (
  'freelance_service',
  'us_florida',
  'Freelance Agreement - Simple',
  1,
  true,
  'This Freelance Agreement ("Agreement") is entered into as of {{effective_date}} between {{client_name}} ("Client") and {{freelancer_name}} ("Freelancer").',
  'WHEREAS, Client desires to engage Freelancer to provide certain services; and WHEREAS, Freelancer desires to provide such services under the terms set forth herein.',
  E'IN WITNESS WHEREOF, the parties have executed this Agreement.\n\nCLIENT: {{client_name}}\nSignature: _______________________\nName: {{client_signer_name}}\nDate: {{client_sign_date}}\n\nFREELANCER: {{freelancer_name}}\nSignature: _______________________\nDate: {{freelancer_sign_date}}',
  '[
    {"id": "scope", "title": "1. Services", "order": 1, "content": "Freelancer agrees to provide: {{service_description}}. Client will provide reasonable access and information needed."},
    {"id": "deliverables", "title": "2. Deliverables", "order": 2, "content": "Freelancer will deliver: {{deliverables_list}}. Deliverables accepted when Client approves or fails to request changes within {{review_period}} days."},
    {"id": "payment", "title": "3. Payment", "order": 3, "content": "Client will pay {{payment_amount}}. Payment due {{payment_terms}}. Late payments accrue 1.5% monthly interest."},
    {"id": "timeline", "title": "4. Timeline", "order": 4, "content": "Work begins {{start_date}}, final delivery by {{end_date}}. Client-caused delays extend deadlines."},
    {"id": "revisions", "title": "5. Revisions", "order": 5, "content": "Includes {{revision_rounds}} revision rounds. Additional revisions billed at {{hourly_rate}}/hour."},
    {"id": "contractor", "title": "6. Independent Contractor", "order": 6, "content": "Freelancer is an independent contractor, not an employee. Freelancer controls their schedule, methods, and tools. Freelancer handles their own taxes."},
    {"id": "ip", "title": "7. Intellectual Property", "order": 7, "content": "Upon full payment, Client owns all deliverables. Freelancer keeps pre-existing materials and may show work in portfolio."},
    {"id": "confidentiality", "title": "8. Confidentiality", "order": 8, "content": "Both parties keep confidential information private. Does not apply to public information."},
    {"id": "termination", "title": "9. Termination", "order": 9, "content": "Either party may terminate with {{notice_period}} days notice. Client pays for completed work. Early termination by Client incurs {{kill_fee_percentage}}% kill fee."},
    {"id": "liability", "title": "10. Liability", "order": 10, "content": "No liability for indirect damages. Freelancer total liability capped at amount paid."},
    {"id": "general", "title": "11. General", "order": 11, "content": "Governed by Florida law. Disputes resolved in {{county_name}} County. This is the entire agreement."}
  ]'::jsonb,
  '[
    {"key": "effective_date", "label": "Agreement Date", "type": "date", "required": true, "category": "dates"},
    {"key": "client_name", "label": "Client Name", "type": "text", "required": true, "category": "party_a"},
    {"key": "freelancer_name", "label": "Freelancer Name", "type": "text", "required": true, "category": "party_b"},
    {"key": "service_description", "label": "Services", "type": "textarea", "required": true, "category": "terms"},
    {"key": "deliverables_list", "label": "Deliverables", "type": "textarea", "required": true, "category": "terms"},
    {"key": "review_period", "label": "Review Period (days)", "type": "number", "required": true, "default": "5", "category": "terms"},
    {"key": "payment_amount", "label": "Total Payment", "type": "currency", "required": true, "category": "financial"},
    {"key": "payment_terms", "label": "Payment Terms", "type": "text", "required": true, "default": "within 14 days of invoice", "category": "financial"},
    {"key": "start_date", "label": "Start Date", "type": "date", "required": true, "category": "dates"},
    {"key": "end_date", "label": "End Date", "type": "date", "required": true, "category": "dates"},
    {"key": "revision_rounds", "label": "Revision Rounds", "type": "number", "required": true, "default": "2", "category": "terms"},
    {"key": "hourly_rate", "label": "Hourly Rate", "type": "currency", "required": true, "category": "financial"},
    {"key": "notice_period", "label": "Notice Period (days)", "type": "number", "required": true, "default": "14", "category": "terms"},
    {"key": "kill_fee_percentage", "label": "Kill Fee %", "type": "number", "required": true, "default": "25", "category": "financial"},
    {"key": "county_name", "label": "County", "type": "text", "required": true, "default": "Miami-Dade", "category": "legal"},
    {"key": "client_signer_name", "label": "Client Signer", "type": "text", "required": true, "category": "signatures"},
    {"key": "client_sign_date", "label": "Client Sign Date", "type": "date", "required": true, "category": "signatures"},
    {"key": "freelancer_sign_date", "label": "Freelancer Sign Date", "type": "date", "required": true, "category": "signatures"}
  ]'::jsonb,
  '{"word_count": 350, "template_type": "lite", "reading_time": "2 min"}'::jsonb
);

-- Delaware - Simple Freelance Agreement
INSERT INTO contract_templates (contract_type, jurisdiction, title, version, is_active, preamble, recitals, signature_block, clauses, placeholders, metadata)
VALUES (
  'freelance_service',
  'us_delaware',
  'Freelance Agreement - Simple',
  1,
  true,
  'This Freelance Agreement ("Agreement") is entered into as of {{effective_date}} between {{client_name}} ("Client") and {{freelancer_name}} ("Freelancer").',
  'WHEREAS, Client desires to engage Freelancer to provide certain services; and WHEREAS, Freelancer desires to provide such services under the terms set forth herein.',
  E'IN WITNESS WHEREOF, the parties have executed this Agreement.\n\nCLIENT: {{client_name}}\nSignature: _______________________\nName: {{client_signer_name}}\nDate: {{client_sign_date}}\n\nFREELANCER: {{freelancer_name}}\nSignature: _______________________\nDate: {{freelancer_sign_date}}',
  '[
    {"id": "scope", "title": "1. Services", "order": 1, "content": "Freelancer agrees to provide: {{service_description}}. Client will provide reasonable access and information needed."},
    {"id": "deliverables", "title": "2. Deliverables", "order": 2, "content": "Freelancer will deliver: {{deliverables_list}}. Deliverables accepted when Client approves or fails to request changes within {{review_period}} days."},
    {"id": "payment", "title": "3. Payment", "order": 3, "content": "Client will pay {{payment_amount}}. Payment due {{payment_terms}}. Late payments accrue 1.5% monthly interest."},
    {"id": "timeline", "title": "4. Timeline", "order": 4, "content": "Work begins {{start_date}}, final delivery by {{end_date}}. Client-caused delays extend deadlines."},
    {"id": "revisions", "title": "5. Revisions", "order": 5, "content": "Includes {{revision_rounds}} revision rounds. Additional revisions billed at {{hourly_rate}}/hour."},
    {"id": "contractor", "title": "6. Independent Contractor", "order": 6, "content": "Freelancer is an independent contractor, not an employee. Freelancer controls their schedule, methods, and tools. Freelancer handles their own taxes."},
    {"id": "ip", "title": "7. Intellectual Property", "order": 7, "content": "Upon full payment, Client owns all deliverables. Freelancer keeps pre-existing materials and may show work in portfolio."},
    {"id": "confidentiality", "title": "8. Confidentiality", "order": 8, "content": "Both parties keep confidential information private. Does not apply to public information."},
    {"id": "termination", "title": "9. Termination", "order": 9, "content": "Either party may terminate with {{notice_period}} days notice. Client pays for completed work. Early termination by Client incurs {{kill_fee_percentage}}% kill fee."},
    {"id": "liability", "title": "10. Liability", "order": 10, "content": "No liability for indirect damages. Freelancer total liability capped at amount paid."},
    {"id": "general", "title": "11. General", "order": 11, "content": "Governed by Delaware law. Disputes resolved in {{county_name}} County. This is the entire agreement."}
  ]'::jsonb,
  '[
    {"key": "effective_date", "label": "Agreement Date", "type": "date", "required": true, "category": "dates"},
    {"key": "client_name", "label": "Client Name", "type": "text", "required": true, "category": "party_a"},
    {"key": "freelancer_name", "label": "Freelancer Name", "type": "text", "required": true, "category": "party_b"},
    {"key": "service_description", "label": "Services", "type": "textarea", "required": true, "category": "terms"},
    {"key": "deliverables_list", "label": "Deliverables", "type": "textarea", "required": true, "category": "terms"},
    {"key": "review_period", "label": "Review Period (days)", "type": "number", "required": true, "default": "5", "category": "terms"},
    {"key": "payment_amount", "label": "Total Payment", "type": "currency", "required": true, "category": "financial"},
    {"key": "payment_terms", "label": "Payment Terms", "type": "text", "required": true, "default": "within 14 days of invoice", "category": "financial"},
    {"key": "start_date", "label": "Start Date", "type": "date", "required": true, "category": "dates"},
    {"key": "end_date", "label": "End Date", "type": "date", "required": true, "category": "dates"},
    {"key": "revision_rounds", "label": "Revision Rounds", "type": "number", "required": true, "default": "2", "category": "terms"},
    {"key": "hourly_rate", "label": "Hourly Rate", "type": "currency", "required": true, "category": "financial"},
    {"key": "notice_period", "label": "Notice Period (days)", "type": "number", "required": true, "default": "14", "category": "terms"},
    {"key": "kill_fee_percentage", "label": "Kill Fee %", "type": "number", "required": true, "default": "25", "category": "financial"},
    {"key": "county_name", "label": "County", "type": "text", "required": true, "default": "New Castle", "category": "legal"},
    {"key": "client_signer_name", "label": "Client Signer", "type": "text", "required": true, "category": "signatures"},
    {"key": "client_sign_date", "label": "Client Sign Date", "type": "date", "required": true, "category": "signatures"},
    {"key": "freelancer_sign_date", "label": "Freelancer Sign Date", "type": "date", "required": true, "category": "signatures"}
  ]'::jsonb,
  '{"word_count": 350, "template_type": "lite", "reading_time": "2 min"}'::jsonb
);
