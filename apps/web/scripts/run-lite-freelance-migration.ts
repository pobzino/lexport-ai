/**
 * Run the Lite Freelance Templates Migration
 * This script replaces the complex 20+ clause freelance templates with simple 11-clause versions
 */

import { createClient } from "@supabase/supabase-js";

const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL!;
const supabaseKey = process.env.SUPABASE_SERVICE_ROLE_KEY || process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!;

const supabase = createClient(supabaseUrl, supabaseKey);

const LITE_TEMPLATES = [
  // California Lite
  {
    contract_type: "freelance_service",
    jurisdiction: "us_california",
    title: "Freelance Agreement - Simple",
    version: 1,
    is_active: true,
    preamble: 'This Freelance Agreement ("Agreement") is entered into as of {{effective_date}} between {{client_name}} ("Client") and {{freelancer_name}} ("Freelancer").',
    recitals: "WHEREAS, Client desires to engage Freelancer to provide certain services; and WHEREAS, Freelancer desires to provide such services under the terms set forth herein.",
    signature_block: `IN WITNESS WHEREOF, the parties have executed this Agreement.

CLIENT: {{client_name}}
Signature: _______________________
Name: {{client_signer_name}}
Date: {{client_sign_date}}

FREELANCER: {{freelancer_name}}
Signature: _______________________
Date: {{freelancer_sign_date}}`,
    clauses: [
      { id: "scope", title: "1. Services", order: 1, content: "Freelancer agrees to provide: {{service_description}}. Client will provide reasonable access and information needed." },
      { id: "deliverables", title: "2. Deliverables", order: 2, content: "Freelancer will deliver: {{deliverables_list}}. Deliverables accepted when Client approves or fails to request changes within {{review_period}} days." },
      { id: "payment", title: "3. Payment", order: 3, content: "Client will pay {{payment_amount}}. Payment due {{payment_terms}}. Late payments accrue 1.5% monthly interest." },
      { id: "timeline", title: "4. Timeline", order: 4, content: "Work begins {{start_date}}, final delivery by {{end_date}}. Client-caused delays extend deadlines." },
      { id: "revisions", title: "5. Revisions", order: 5, content: "Includes {{revision_rounds}} revision rounds. Additional revisions billed at {{hourly_rate}}/hour." },
      { id: "contractor", title: "6. Independent Contractor", order: 6, content: "Freelancer is an independent contractor, not an employee. Freelancer controls their schedule, methods, and tools. Freelancer handles their own taxes." },
      { id: "ip", title: "7. Intellectual Property", order: 7, content: "Upon full payment, Client owns all deliverables. Freelancer keeps pre-existing materials and may show work in portfolio." },
      { id: "confidentiality", title: "8. Confidentiality", order: 8, content: "Both parties keep confidential information private. Does not apply to public information." },
      { id: "termination", title: "9. Termination", order: 9, content: "Either party may terminate with {{notice_period}} days notice. Client pays for completed work. Early termination by Client incurs {{kill_fee_percentage}}% kill fee." },
      { id: "liability", title: "10. Liability", order: 10, content: "No liability for indirect damages. Freelancer total liability capped at amount paid." },
      { id: "general", title: "11. General", order: 11, content: "Governed by California law. Disputes resolved in {{county_name}} County. This is the entire agreement." },
    ],
    placeholders: [
      { key: "effective_date", label: "Agreement Date", type: "date", required: true, category: "dates" },
      { key: "client_name", label: "Client Name", type: "text", required: true, category: "party_a" },
      { key: "freelancer_name", label: "Freelancer Name", type: "text", required: true, category: "party_b" },
      { key: "service_description", label: "Services", type: "textarea", required: true, category: "terms" },
      { key: "deliverables_list", label: "Deliverables", type: "textarea", required: true, category: "terms" },
      { key: "review_period", label: "Review Period (days)", type: "number", required: true, default: "5", category: "terms" },
      { key: "payment_amount", label: "Total Payment", type: "currency", required: true, category: "financial" },
      { key: "payment_terms", label: "Payment Terms", type: "text", required: true, default: "within 14 days of invoice", category: "financial" },
      { key: "start_date", label: "Start Date", type: "date", required: true, category: "dates" },
      { key: "end_date", label: "End Date", type: "date", required: true, category: "dates" },
      { key: "revision_rounds", label: "Revision Rounds", type: "number", required: true, default: "2", category: "terms" },
      { key: "hourly_rate", label: "Hourly Rate", type: "currency", required: true, category: "financial" },
      { key: "notice_period", label: "Notice Period (days)", type: "number", required: true, default: "14", category: "terms" },
      { key: "kill_fee_percentage", label: "Kill Fee %", type: "number", required: true, default: "25", category: "financial" },
      { key: "county_name", label: "County", type: "text", required: true, default: "Los Angeles", category: "legal" },
      { key: "client_signer_name", label: "Client Signer", type: "text", required: true, category: "signatures" },
      { key: "client_sign_date", label: "Client Sign Date", type: "date", required: true, category: "signatures" },
      { key: "freelancer_sign_date", label: "Freelancer Sign Date", type: "date", required: true, category: "signatures" },
    ],
    metadata: { word_count: 350, template_type: "lite", reading_time: "2 min" },
  },
  // New York Lite (with FIFA)
  {
    contract_type: "freelance_service",
    jurisdiction: "us_new_york",
    title: "Freelance Agreement - Simple",
    version: 1,
    is_active: true,
    preamble: "This Freelance Agreement (\"Agreement\") is entered into as of {{effective_date}} between {{client_name}} (\"Client\") and {{freelancer_name}} (\"Freelancer\") pursuant to New York's Freelance Isn't Free Act.",
    recitals: "WHEREAS, Client desires to engage Freelancer to provide certain services; and WHEREAS, Freelancer desires to provide such services under the terms set forth herein.",
    signature_block: `IN WITNESS WHEREOF, the parties have executed this Agreement.

CLIENT: {{client_name}}
Signature: _______________________
Name: {{client_signer_name}}
Date: {{client_sign_date}}

FREELANCER: {{freelancer_name}}
Signature: _______________________
Date: {{freelancer_sign_date}}`,
    clauses: [
      { id: "scope", title: "1. Services", order: 1, content: "Freelancer agrees to provide: {{service_description}}. Client will provide reasonable access and information needed." },
      { id: "deliverables", title: "2. Deliverables", order: 2, content: "Freelancer will deliver: {{deliverables_list}}. Deliverables accepted when Client approves or fails to request changes within {{review_period}} days." },
      { id: "payment", title: "3. Payment", order: 3, content: "Client will pay {{payment_amount}}. Per NY Freelance Isn't Free Act, payment due within 30 days of completion or {{payment_terms}}, whichever is sooner. Late payment may result in double damages plus attorneys' fees." },
      { id: "timeline", title: "4. Timeline", order: 4, content: "Work begins {{start_date}}, final delivery by {{end_date}}. Client-caused delays extend deadlines." },
      { id: "revisions", title: "5. Revisions", order: 5, content: "Includes {{revision_rounds}} revision rounds. Additional revisions billed at {{hourly_rate}}/hour." },
      { id: "contractor", title: "6. Independent Contractor", order: 6, content: "Freelancer is an independent contractor, not an employee. Freelancer controls their schedule, methods, and tools. Freelancer handles their own taxes." },
      { id: "ip", title: "7. Intellectual Property", order: 7, content: "Upon full payment, Client owns all deliverables. Freelancer keeps pre-existing materials and may show work in portfolio." },
      { id: "confidentiality", title: "8. Confidentiality", order: 8, content: "Both parties keep confidential information private. Does not apply to public information." },
      { id: "termination", title: "9. Termination", order: 9, content: "Either party may terminate with {{notice_period}} days notice. Client pays for completed work within 30 days per FIFA." },
      { id: "liability", title: "10. Liability", order: 10, content: "No liability for indirect damages. Freelancer total liability capped at amount paid." },
      { id: "general", title: "11. General", order: 11, content: "Governed by New York law. Disputes resolved in {{county_name}} County. This is the entire agreement." },
    ],
    placeholders: [
      { key: "effective_date", label: "Agreement Date", type: "date", required: true, category: "dates" },
      { key: "client_name", label: "Client Name", type: "text", required: true, category: "party_a" },
      { key: "freelancer_name", label: "Freelancer Name", type: "text", required: true, category: "party_b" },
      { key: "service_description", label: "Services", type: "textarea", required: true, category: "terms" },
      { key: "deliverables_list", label: "Deliverables", type: "textarea", required: true, category: "terms" },
      { key: "review_period", label: "Review Period (days)", type: "number", required: true, default: "5", category: "terms" },
      { key: "payment_amount", label: "Total Payment", type: "currency", required: true, category: "financial" },
      { key: "payment_terms", label: "Payment Terms", type: "text", required: true, default: "within 14 days of invoice", category: "financial" },
      { key: "start_date", label: "Start Date", type: "date", required: true, category: "dates" },
      { key: "end_date", label: "End Date", type: "date", required: true, category: "dates" },
      { key: "revision_rounds", label: "Revision Rounds", type: "number", required: true, default: "2", category: "terms" },
      { key: "hourly_rate", label: "Hourly Rate", type: "currency", required: true, category: "financial" },
      { key: "notice_period", label: "Notice Period (days)", type: "number", required: true, default: "14", category: "terms" },
      { key: "county_name", label: "County", type: "text", required: true, default: "New York", category: "legal" },
      { key: "client_signer_name", label: "Client Signer", type: "text", required: true, category: "signatures" },
      { key: "client_sign_date", label: "Client Sign Date", type: "date", required: true, category: "signatures" },
      { key: "freelancer_sign_date", label: "Freelancer Sign Date", type: "date", required: true, category: "signatures" },
    ],
    metadata: { word_count: 380, template_type: "lite", reading_time: "2 min", fifa_compliant: true },
  },
  // Texas Lite
  {
    contract_type: "freelance_service",
    jurisdiction: "us_texas",
    title: "Freelance Agreement - Simple",
    version: 1,
    is_active: true,
    preamble: 'This Freelance Agreement ("Agreement") is entered into as of {{effective_date}} between {{client_name}} ("Client") and {{freelancer_name}} ("Freelancer").',
    recitals: "WHEREAS, Client desires to engage Freelancer to provide certain services; and WHEREAS, Freelancer desires to provide such services under the terms set forth herein.",
    signature_block: `IN WITNESS WHEREOF, the parties have executed this Agreement.

CLIENT: {{client_name}}
Signature: _______________________
Name: {{client_signer_name}}
Date: {{client_sign_date}}

FREELANCER: {{freelancer_name}}
Signature: _______________________
Date: {{freelancer_sign_date}}`,
    clauses: [
      { id: "scope", title: "1. Services", order: 1, content: "Freelancer agrees to provide: {{service_description}}. Client will provide reasonable access and information needed." },
      { id: "deliverables", title: "2. Deliverables", order: 2, content: "Freelancer will deliver: {{deliverables_list}}. Deliverables accepted when Client approves or fails to request changes within {{review_period}} days." },
      { id: "payment", title: "3. Payment", order: 3, content: "Client will pay {{payment_amount}}. Payment due {{payment_terms}}. Late payments accrue 1.5% monthly interest." },
      { id: "timeline", title: "4. Timeline", order: 4, content: "Work begins {{start_date}}, final delivery by {{end_date}}. Client-caused delays extend deadlines." },
      { id: "revisions", title: "5. Revisions", order: 5, content: "Includes {{revision_rounds}} revision rounds. Additional revisions billed at {{hourly_rate}}/hour." },
      { id: "contractor", title: "6. Independent Contractor", order: 6, content: "Freelancer is an independent contractor, not an employee. Freelancer controls their schedule, methods, and tools. Freelancer handles their own taxes." },
      { id: "ip", title: "7. Intellectual Property", order: 7, content: "Upon full payment, Client owns all deliverables. Freelancer keeps pre-existing materials and may show work in portfolio." },
      { id: "confidentiality", title: "8. Confidentiality", order: 8, content: "Both parties keep confidential information private. Does not apply to public information." },
      { id: "termination", title: "9. Termination", order: 9, content: "Either party may terminate with {{notice_period}} days notice. Client pays for completed work. Early termination by Client incurs {{kill_fee_percentage}}% kill fee." },
      { id: "liability", title: "10. Liability", order: 10, content: "No liability for indirect damages. Freelancer total liability capped at amount paid." },
      { id: "general", title: "11. General", order: 11, content: "Governed by Texas law. Disputes resolved in {{county_name}} County. This is the entire agreement." },
    ],
    placeholders: [
      { key: "effective_date", label: "Agreement Date", type: "date", required: true, category: "dates" },
      { key: "client_name", label: "Client Name", type: "text", required: true, category: "party_a" },
      { key: "freelancer_name", label: "Freelancer Name", type: "text", required: true, category: "party_b" },
      { key: "service_description", label: "Services", type: "textarea", required: true, category: "terms" },
      { key: "deliverables_list", label: "Deliverables", type: "textarea", required: true, category: "terms" },
      { key: "review_period", label: "Review Period (days)", type: "number", required: true, default: "5", category: "terms" },
      { key: "payment_amount", label: "Total Payment", type: "currency", required: true, category: "financial" },
      { key: "payment_terms", label: "Payment Terms", type: "text", required: true, default: "within 14 days of invoice", category: "financial" },
      { key: "start_date", label: "Start Date", type: "date", required: true, category: "dates" },
      { key: "end_date", label: "End Date", type: "date", required: true, category: "dates" },
      { key: "revision_rounds", label: "Revision Rounds", type: "number", required: true, default: "2", category: "terms" },
      { key: "hourly_rate", label: "Hourly Rate", type: "currency", required: true, category: "financial" },
      { key: "notice_period", label: "Notice Period (days)", type: "number", required: true, default: "14", category: "terms" },
      { key: "kill_fee_percentage", label: "Kill Fee %", type: "number", required: true, default: "25", category: "financial" },
      { key: "county_name", label: "County", type: "text", required: true, default: "Travis", category: "legal" },
      { key: "client_signer_name", label: "Client Signer", type: "text", required: true, category: "signatures" },
      { key: "client_sign_date", label: "Client Sign Date", type: "date", required: true, category: "signatures" },
      { key: "freelancer_sign_date", label: "Freelancer Sign Date", type: "date", required: true, category: "signatures" },
    ],
    metadata: { word_count: 350, template_type: "lite", reading_time: "2 min" },
  },
  // UK Lite
  {
    contract_type: "freelance_service",
    jurisdiction: "uk",
    title: "Freelance Agreement - Simple",
    version: 1,
    is_active: true,
    preamble: 'This Freelance Agreement ("Agreement") is entered into as of {{effective_date}} between {{client_name}} ("Client") and {{freelancer_name}} ("Freelancer").',
    recitals: "WHEREAS, Client desires to engage Freelancer to provide certain services; and WHEREAS, Freelancer desires to provide such services under the terms set forth herein.",
    signature_block: `IN WITNESS WHEREOF, the parties have executed this Agreement.

CLIENT: {{client_name}}
Signature: _______________________
Name: {{client_signer_name}}
Date: {{client_sign_date}}

FREELANCER: {{freelancer_name}}
Signature: _______________________
Date: {{freelancer_sign_date}}`,
    clauses: [
      { id: "scope", title: "1. Services", order: 1, content: "Freelancer agrees to provide: {{service_description}}. Client will provide reasonable access and information needed." },
      { id: "deliverables", title: "2. Deliverables", order: 2, content: "Freelancer will deliver: {{deliverables_list}}. Deliverables accepted when Client approves or fails to request changes within {{review_period}} days." },
      { id: "payment", title: "3. Payment", order: 3, content: "Client will pay {{payment_amount}}. Payment due {{payment_terms}}. Late payments accrue interest per Late Payment of Commercial Debts Act 1998." },
      { id: "timeline", title: "4. Timeline", order: 4, content: "Work begins {{start_date}}, final delivery by {{end_date}}. Client-caused delays extend deadlines." },
      { id: "revisions", title: "5. Revisions", order: 5, content: "Includes {{revision_rounds}} revision rounds. Additional revisions billed at {{hourly_rate}}/hour." },
      { id: "contractor", title: "6. Independent Contractor", order: 6, content: "Freelancer is an independent contractor, not an employee. Freelancer controls their schedule, methods, and tools. Freelancer handles their own tax and National Insurance." },
      { id: "ip", title: "7. Intellectual Property", order: 7, content: "Upon full payment, Client owns all deliverables per Copyright, Designs and Patents Act 1988. Freelancer keeps pre-existing materials and may show work in portfolio." },
      { id: "confidentiality", title: "8. Confidentiality", order: 8, content: "Both parties keep confidential information private. Does not apply to public information." },
      { id: "termination", title: "9. Termination", order: 9, content: "Either party may terminate with {{notice_period}} days notice. Client pays for completed work. Early termination by Client incurs {{kill_fee_percentage}}% kill fee." },
      { id: "liability", title: "10. Liability", order: 10, content: "No liability for indirect damages. Freelancer total liability capped at amount paid. Nothing excludes liability for fraud or death/personal injury from negligence." },
      { id: "general", title: "11. General", order: 11, content: "Governed by laws of England and Wales. Disputes resolved in courts of England and Wales. This is the entire agreement." },
    ],
    placeholders: [
      { key: "effective_date", label: "Agreement Date", type: "date", required: true, category: "dates" },
      { key: "client_name", label: "Client Name", type: "text", required: true, category: "party_a" },
      { key: "freelancer_name", label: "Freelancer Name", type: "text", required: true, category: "party_b" },
      { key: "service_description", label: "Services", type: "textarea", required: true, category: "terms" },
      { key: "deliverables_list", label: "Deliverables", type: "textarea", required: true, category: "terms" },
      { key: "review_period", label: "Review Period (days)", type: "number", required: true, default: "5", category: "terms" },
      { key: "payment_amount", label: "Total Payment", type: "currency", required: true, category: "financial" },
      { key: "payment_terms", label: "Payment Terms", type: "text", required: true, default: "within 14 days of invoice", category: "financial" },
      { key: "start_date", label: "Start Date", type: "date", required: true, category: "dates" },
      { key: "end_date", label: "End Date", type: "date", required: true, category: "dates" },
      { key: "revision_rounds", label: "Revision Rounds", type: "number", required: true, default: "2", category: "terms" },
      { key: "hourly_rate", label: "Hourly Rate", type: "currency", required: true, category: "financial" },
      { key: "notice_period", label: "Notice Period (days)", type: "number", required: true, default: "14", category: "terms" },
      { key: "kill_fee_percentage", label: "Kill Fee %", type: "number", required: true, default: "25", category: "financial" },
      { key: "client_signer_name", label: "Client Signer", type: "text", required: true, category: "signatures" },
      { key: "client_sign_date", label: "Client Sign Date", type: "date", required: true, category: "signatures" },
      { key: "freelancer_sign_date", label: "Freelancer Sign Date", type: "date", required: true, category: "signatures" },
    ],
    metadata: { word_count: 380, template_type: "lite", reading_time: "2 min" },
  },
  // Florida Lite
  {
    contract_type: "freelance_service",
    jurisdiction: "us_florida",
    title: "Freelance Agreement - Simple",
    version: 1,
    is_active: true,
    preamble: 'This Freelance Agreement ("Agreement") is entered into as of {{effective_date}} between {{client_name}} ("Client") and {{freelancer_name}} ("Freelancer").',
    recitals: "WHEREAS, Client desires to engage Freelancer to provide certain services; and WHEREAS, Freelancer desires to provide such services under the terms set forth herein.",
    signature_block: `IN WITNESS WHEREOF, the parties have executed this Agreement.

CLIENT: {{client_name}}
Signature: _______________________
Name: {{client_signer_name}}
Date: {{client_sign_date}}

FREELANCER: {{freelancer_name}}
Signature: _______________________
Date: {{freelancer_sign_date}}`,
    clauses: [
      { id: "scope", title: "1. Services", order: 1, content: "Freelancer agrees to provide: {{service_description}}. Client will provide reasonable access and information needed." },
      { id: "deliverables", title: "2. Deliverables", order: 2, content: "Freelancer will deliver: {{deliverables_list}}. Deliverables accepted when Client approves or fails to request changes within {{review_period}} days." },
      { id: "payment", title: "3. Payment", order: 3, content: "Client will pay {{payment_amount}}. Payment due {{payment_terms}}. Late payments accrue 1.5% monthly interest." },
      { id: "timeline", title: "4. Timeline", order: 4, content: "Work begins {{start_date}}, final delivery by {{end_date}}. Client-caused delays extend deadlines." },
      { id: "revisions", title: "5. Revisions", order: 5, content: "Includes {{revision_rounds}} revision rounds. Additional revisions billed at {{hourly_rate}}/hour." },
      { id: "contractor", title: "6. Independent Contractor", order: 6, content: "Freelancer is an independent contractor, not an employee. Freelancer controls their schedule, methods, and tools. Freelancer handles their own taxes." },
      { id: "ip", title: "7. Intellectual Property", order: 7, content: "Upon full payment, Client owns all deliverables. Freelancer keeps pre-existing materials and may show work in portfolio." },
      { id: "confidentiality", title: "8. Confidentiality", order: 8, content: "Both parties keep confidential information private. Does not apply to public information." },
      { id: "termination", title: "9. Termination", order: 9, content: "Either party may terminate with {{notice_period}} days notice. Client pays for completed work. Early termination by Client incurs {{kill_fee_percentage}}% kill fee." },
      { id: "liability", title: "10. Liability", order: 10, content: "No liability for indirect damages. Freelancer total liability capped at amount paid." },
      { id: "general", title: "11. General", order: 11, content: "Governed by Florida law. Disputes resolved in {{county_name}} County. This is the entire agreement." },
    ],
    placeholders: [
      { key: "effective_date", label: "Agreement Date", type: "date", required: true, category: "dates" },
      { key: "client_name", label: "Client Name", type: "text", required: true, category: "party_a" },
      { key: "freelancer_name", label: "Freelancer Name", type: "text", required: true, category: "party_b" },
      { key: "service_description", label: "Services", type: "textarea", required: true, category: "terms" },
      { key: "deliverables_list", label: "Deliverables", type: "textarea", required: true, category: "terms" },
      { key: "review_period", label: "Review Period (days)", type: "number", required: true, default: "5", category: "terms" },
      { key: "payment_amount", label: "Total Payment", type: "currency", required: true, category: "financial" },
      { key: "payment_terms", label: "Payment Terms", type: "text", required: true, default: "within 14 days of invoice", category: "financial" },
      { key: "start_date", label: "Start Date", type: "date", required: true, category: "dates" },
      { key: "end_date", label: "End Date", type: "date", required: true, category: "dates" },
      { key: "revision_rounds", label: "Revision Rounds", type: "number", required: true, default: "2", category: "terms" },
      { key: "hourly_rate", label: "Hourly Rate", type: "currency", required: true, category: "financial" },
      { key: "notice_period", label: "Notice Period (days)", type: "number", required: true, default: "14", category: "terms" },
      { key: "kill_fee_percentage", label: "Kill Fee %", type: "number", required: true, default: "25", category: "financial" },
      { key: "county_name", label: "County", type: "text", required: true, default: "Miami-Dade", category: "legal" },
      { key: "client_signer_name", label: "Client Signer", type: "text", required: true, category: "signatures" },
      { key: "client_sign_date", label: "Client Sign Date", type: "date", required: true, category: "signatures" },
      { key: "freelancer_sign_date", label: "Freelancer Sign Date", type: "date", required: true, category: "signatures" },
    ],
    metadata: { word_count: 350, template_type: "lite", reading_time: "2 min" },
  },
  // Delaware Lite
  {
    contract_type: "freelance_service",
    jurisdiction: "us_delaware",
    title: "Freelance Agreement - Simple",
    version: 1,
    is_active: true,
    preamble: 'This Freelance Agreement ("Agreement") is entered into as of {{effective_date}} between {{client_name}} ("Client") and {{freelancer_name}} ("Freelancer").',
    recitals: "WHEREAS, Client desires to engage Freelancer to provide certain services; and WHEREAS, Freelancer desires to provide such services under the terms set forth herein.",
    signature_block: `IN WITNESS WHEREOF, the parties have executed this Agreement.

CLIENT: {{client_name}}
Signature: _______________________
Name: {{client_signer_name}}
Date: {{client_sign_date}}

FREELANCER: {{freelancer_name}}
Signature: _______________________
Date: {{freelancer_sign_date}}`,
    clauses: [
      { id: "scope", title: "1. Services", order: 1, content: "Freelancer agrees to provide: {{service_description}}. Client will provide reasonable access and information needed." },
      { id: "deliverables", title: "2. Deliverables", order: 2, content: "Freelancer will deliver: {{deliverables_list}}. Deliverables accepted when Client approves or fails to request changes within {{review_period}} days." },
      { id: "payment", title: "3. Payment", order: 3, content: "Client will pay {{payment_amount}}. Payment due {{payment_terms}}. Late payments accrue 1.5% monthly interest." },
      { id: "timeline", title: "4. Timeline", order: 4, content: "Work begins {{start_date}}, final delivery by {{end_date}}. Client-caused delays extend deadlines." },
      { id: "revisions", title: "5. Revisions", order: 5, content: "Includes {{revision_rounds}} revision rounds. Additional revisions billed at {{hourly_rate}}/hour." },
      { id: "contractor", title: "6. Independent Contractor", order: 6, content: "Freelancer is an independent contractor, not an employee. Freelancer controls their schedule, methods, and tools. Freelancer handles their own taxes." },
      { id: "ip", title: "7. Intellectual Property", order: 7, content: "Upon full payment, Client owns all deliverables. Freelancer keeps pre-existing materials and may show work in portfolio." },
      { id: "confidentiality", title: "8. Confidentiality", order: 8, content: "Both parties keep confidential information private. Does not apply to public information." },
      { id: "termination", title: "9. Termination", order: 9, content: "Either party may terminate with {{notice_period}} days notice. Client pays for completed work. Early termination by Client incurs {{kill_fee_percentage}}% kill fee." },
      { id: "liability", title: "10. Liability", order: 10, content: "No liability for indirect damages. Freelancer total liability capped at amount paid." },
      { id: "general", title: "11. General", order: 11, content: "Governed by Delaware law. Disputes resolved in {{county_name}} County. This is the entire agreement." },
    ],
    placeholders: [
      { key: "effective_date", label: "Agreement Date", type: "date", required: true, category: "dates" },
      { key: "client_name", label: "Client Name", type: "text", required: true, category: "party_a" },
      { key: "freelancer_name", label: "Freelancer Name", type: "text", required: true, category: "party_b" },
      { key: "service_description", label: "Services", type: "textarea", required: true, category: "terms" },
      { key: "deliverables_list", label: "Deliverables", type: "textarea", required: true, category: "terms" },
      { key: "review_period", label: "Review Period (days)", type: "number", required: true, default: "5", category: "terms" },
      { key: "payment_amount", label: "Total Payment", type: "currency", required: true, category: "financial" },
      { key: "payment_terms", label: "Payment Terms", type: "text", required: true, default: "within 14 days of invoice", category: "financial" },
      { key: "start_date", label: "Start Date", type: "date", required: true, category: "dates" },
      { key: "end_date", label: "End Date", type: "date", required: true, category: "dates" },
      { key: "revision_rounds", label: "Revision Rounds", type: "number", required: true, default: "2", category: "terms" },
      { key: "hourly_rate", label: "Hourly Rate", type: "currency", required: true, category: "financial" },
      { key: "notice_period", label: "Notice Period (days)", type: "number", required: true, default: "14", category: "terms" },
      { key: "kill_fee_percentage", label: "Kill Fee %", type: "number", required: true, default: "25", category: "financial" },
      { key: "county_name", label: "County", type: "text", required: true, default: "New Castle", category: "legal" },
      { key: "client_signer_name", label: "Client Signer", type: "text", required: true, category: "signatures" },
      { key: "client_sign_date", label: "Client Sign Date", type: "date", required: true, category: "signatures" },
      { key: "freelancer_sign_date", label: "Freelancer Sign Date", type: "date", required: true, category: "signatures" },
    ],
    metadata: { word_count: 350, template_type: "lite", reading_time: "2 min" },
  },
];

async function runMigration() {
  console.log("Starting Lite Freelance Templates Migration...\n");

  // Step 1: Deactivate old complex templates
  console.log("Step 1: Deactivating old complex freelance templates...");
  const { error: deactivateError, count: deactivateCount } = await supabase
    .from("contract_templates")
    .update({ is_active: false })
    .eq("contract_type", "freelance_service")
    .eq("is_active", true);

  if (deactivateError) {
    console.error("Error deactivating templates:", deactivateError);
    process.exit(1);
  }
  console.log(`  Deactivated ${deactivateCount ?? "unknown"} templates\n`);

  // Step 2: Insert new lite templates
  console.log("Step 2: Inserting new lite freelance templates...");

  for (const template of LITE_TEMPLATES) {
    const { error: insertError } = await supabase
      .from("contract_templates")
      .insert(template);

    if (insertError) {
      console.error(`Error inserting ${template.jurisdiction} template:`, insertError);
    } else {
      console.log(`  ✓ Inserted ${template.jurisdiction} template`);
    }
  }

  // Step 3: Verify
  console.log("\nStep 3: Verifying...");
  const { data: activeTemplates, error: verifyError } = await supabase
    .from("contract_templates")
    .select("jurisdiction, title, metadata")
    .eq("contract_type", "freelance_service")
    .eq("is_active", true)
    .order("jurisdiction");

  if (verifyError) {
    console.error("Error verifying:", verifyError);
  } else {
    console.log(`\nActive freelance templates: ${activeTemplates?.length || 0}`);
    activeTemplates?.forEach((t) => {
      const type = (t.metadata as { template_type?: string })?.template_type || "standard";
      console.log(`  - ${t.jurisdiction}: ${t.title} (${type})`);
    });
  }

  console.log("\nMigration complete!");
}

runMigration().catch(console.error);
