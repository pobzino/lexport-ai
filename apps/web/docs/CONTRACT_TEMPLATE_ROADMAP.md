# Contract Template Roadmap

**Last Updated:** December 31, 2025
**Document Status:** Active Planning Document

---

## Executive Summary

Lexport currently has **19 active contract templates** across 4 jurisdictions (California, Texas, New York, UK) and 6 contract types. However, there is a critical gap: **California is missing 5 of 6 contract types**, having only the Freelance Service Agreement. Given California's large startup ecosystem and unique legal requirements (AB5, B&P Code 16600, CCPA), this represents the highest priority gap to address.

### Current State Matrix

| Contract Type | California | Texas | New York | UK |
|---------------|:----------:|:-----:|:--------:|:--:|
| Consulting Agreement | - | Yes | Yes | Yes |
| Freelance Service | Yes | Yes | Yes | Yes |
| Independent Contractor | - | Yes | Yes | Yes |
| NDA (Mutual) | - | Yes | Yes | Yes |
| NDA (One-Way) | - | Yes | Yes | Yes |
| SAFE Note | - | Yes | Yes | Yes* |

*UK has an "Advance Subscription Agreement" as SAFE equivalent

### Priority Summary

1. **Priority 1 (Critical):** Fill California template gaps (5 templates)
2. **Priority 2 (High):** Add new high-value contract types (6-8 new types)
3. **Priority 3 (Medium):** Expand to additional jurisdictions (Florida, Delaware)
4. **Priority 4 (Low):** Specialized industry templates

---

## Part 1: California Templates (Priority 1 - Critical)

California represents the largest startup market in the US and has the most complex employment and contractor laws. Missing California templates is a critical gap that likely affects the majority of users.

### 1.1 California Consulting Agreement

**Priority:** Critical
**Estimated Complexity:** High
**Recommended Clauses:** 14-16

#### Key California-Specific Requirements

1. **AB5 Compliance (ABC Test)**
   - California Labor Code Section 2750.3
   - Must satisfy ALL three prongs:
     - (A) Worker is free from control and direction
     - (B) Work is outside the usual course of business
     - (C) Worker is customarily engaged in independently established trade
   - Professional services exemption under Labor Code 2783 may apply for:
     - Marketing, HR administration, graphic design, accountants, securities broker-dealers
     - Business-to-business relationships with separate business location

2. **Business & Professions Code Section 16600**
   - Non-compete clauses are VOID in California
   - Template MUST NOT include non-compete provisions
   - Limited exception: sale of business goodwill
   - Non-solicitation of employees: limited enforceability

3. **Labor Code Section 2870 (Invention Assignment)**
   - Cannot require assignment of inventions:
     - Developed entirely on worker's own time
     - Without use of employer equipment, supplies, facilities, or trade secrets
     - Unrelated to employer's business or anticipated research
   - Template MUST include Section 2870 disclosure notice

4. **CCPA/CPRA Compliance**
   - If consultant handles personal information of California residents
   - Include data processing addendum provisions
   - Notice of categories of personal information collected
   - Service provider obligations under CCPA

5. **Additional Requirements**
   - California Civil Code Section 1542 (general release waiver)
   - Late payment penalties (max 10% or $100 for commercial)
   - Proper venue/jurisdiction clauses

#### Template Structure
```
1. Engagement and Services
2. Term and Termination
3. Compensation and Expenses
4. Independent Contractor Status (with ABC test factors)
5. Intellectual Property Assignment (with LC 2870 notice)
6. Confidentiality (no non-compete)
7. Representations and Warranties
8. Indemnification
9. Limitation of Liability
10. Data Protection (CCPA provisions)
11. Insurance Requirements
12. Dispute Resolution
13. California-Specific Notices
14. General Provisions
```

---

### 1.2 California Independent Contractor Agreement

**Priority:** Critical
**Estimated Complexity:** Very High
**Recommended Clauses:** 12-14

#### Key California-Specific Requirements

1. **AB5 Worker Classification (Most Critical)**
   - Default: Workers are EMPLOYEES unless ABC test satisfied
   - Document how each ABC test factor is met:
     - Control and direction statements
     - Outside usual course of business analysis
     - Independent business establishment evidence
   - Include ABC test compliance recitals
   - Reference specific exemption category if applicable

2. **Dynamex v. Superior Court Implications**
   - Template must reflect post-Dynamex standards
   - Cannot rely on pre-2018 independent contractor tests
   - Stricter than federal IRS test

3. **Professional Services Exemption Checklist**
   - Labor Code 2783 exemption requirements:
     - Maintains business location (can be home if customary)
     - Has business license/permits
     - Has ability to negotiate own rates
     - Sets own hours
     - Performs services for other clients
     - Customarily performs similar work
   - Document exemption applicability in contract

4. **Labor Code Section 2870 Notice**
   - REQUIRED written notice for invention assignments
   - Must be included in or attached to agreement
   - Specific statutory language required

5. **Business & Professions Code 16600**
   - NO non-compete clauses
   - No geographic restrictions on future work
   - Very limited customer non-solicitation (if any)

6. **Expense Reimbursement**
   - Labor Code 2802 applies even to contractors in some cases
   - Clear expense allocation needed

#### Template Structure
```
1. Services and Deliverables
2. ABC Test Compliance Recitals
3. Contractor Status and Representations
4. Compensation
5. Term and Termination
6. Intellectual Property (with LC 2870 Notice)
7. Confidential Information
8. No Non-Compete Acknowledgment
9. Indemnification
10. Insurance
11. Dispute Resolution (CA venue)
12. General Provisions
```

---

### 1.3 California Mutual NDA

**Priority:** High
**Estimated Complexity:** Medium
**Recommended Clauses:** 12-13

#### Key California-Specific Requirements

1. **California Uniform Trade Secrets Act (CUTSA)**
   - Civil Code Sections 3426-3426.11
   - Definition of trade secret aligned with CUTSA
   - Preemption of common law claims
   - Misappropriation remedies and injunctive relief

2. **Business & Professions Code 16600**
   - NO provisions restricting future employment
   - Cannot prevent use of general skills and knowledge
   - Focus on trade secrets and truly confidential information only

3. **Defend Trade Secrets Act (DTSA) Whistleblower Immunity**
   - REQUIRED notice under 18 U.S.C. Section 1833(b)
   - Immunity for disclosure to attorney/government
   - Notice must be conspicuous

4. **Term Limitations**
   - Consider reasonable time limits (2-5 years typical)
   - Perpetual confidentiality may be unenforceable for non-trade-secrets
   - Trade secrets: duration tied to secrecy status

5. **Residuals Clauses**
   - Common in California tech industry
   - "General knowledge, skills, and experience" carve-out

6. **CCPA Considerations**
   - If exchanging personal information
   - Business purpose limitations
   - Data minimization principles

#### Template Structure
```
1. Definition of Confidential Information
2. Exclusions from Confidential Information
3. Mutual Confidentiality Obligations
4. Permitted Disclosures
5. Term of Confidentiality
6. Return/Destruction of Information
7. DTSA Whistleblower Notice
8. No License Granted
9. Equitable Relief
10. Governing Law (California)
11. Dispute Resolution
12. General Provisions
```

---

### 1.4 California One-Way NDA

**Priority:** High
**Estimated Complexity:** Medium
**Recommended Clauses:** 10-11

#### Key California-Specific Requirements

Same as Mutual NDA, plus:

1. **Asymmetric Obligations**
   - Clear discloser/recipient roles
   - Receiving party has all obligations
   - Disclosing party has limited warranties only

2. **Pitchbook/Investor Context**
   - Common use case for California startups
   - Investor-friendly standard terms
   - Time-limited review periods

3. **Employee/Contractor Pre-Hire Context**
   - Cannot extract promises that violate B&P 16600
   - Cannot require non-compete as condition of disclosure
   - Focus on limited purpose disclosure

#### Template Structure
```
1. Definition of Confidential Information
2. Exclusions
3. Recipient Obligations
4. Permitted Uses
5. Term and Duration
6. Return of Information
7. DTSA Whistleblower Notice
8. Remedies
9. Governing Law (California)
10. General Provisions
```

---

### 1.5 California SAFE Note

**Priority:** High
**Estimated Complexity:** High
**Recommended Clauses:** 12-14

#### Key California-Specific Requirements

1. **California Corporations Code**
   - Section 25102(f) exemption for small offerings
   - Section 25102(o) for equity compensation plans
   - Blue sky filing requirements
   - Notice filings for federal covered securities

2. **Corporate Securities Law of 1968**
   - Qualification requirements for securities offerings
   - Exemption documentation
   - Anti-fraud provisions

3. **California Franchise Tax Board Implications**
   - Tax treatment of SAFE conversion
   - Withholding requirements for non-California investors
   - Qualified Small Business Stock (QSBS) considerations

4. **Y Combinator SAFE Standard Variations**
   - Post-money SAFE (current standard)
   - Valuation cap mechanics
   - MFN provisions
   - Pro rata rights side letter

5. **California-Specific Terms**
   - Governing law: California
   - Venue: State or federal courts in California
   - California Corporate Securities Law representations

6. **Investor Representations**
   - California investor qualifications
   - Accredited investor status
   - Investment limitations for non-accredited

#### Template Structure
```
1. Investment Amount
2. Conversion Events
3. Valuation Cap Terms
4. Discount Rate Terms
5. Conversion Mechanics
6. Company Representations
7. Investor Representations
8. Securities Law Compliance
9. Pro Rata Rights (if applicable)
10. Most Favored Nation (if applicable)
11. Termination
12. General Provisions
13. Signature Block with Blue Sky Notices
```

---

## Part 2: New Contract Types (Priority 2)

Based on market research and common startup/freelancer needs, the following new contract types should be added.

### 2.1 Employment Offer Letter

**Priority:** Very High
**Use Case:** Hiring employees (vs. contractors)
**Target User:** Startups, small businesses
**Jurisdictions Needed:** CA (most complex), TX, NY, UK
**Estimated Complexity:** Very High (especially California)

#### Key Legal Considerations

**California Specific:**
- At-will employment with clear statement
- No non-compete (B&P 16600)
- CFRA/PDL leave notices
- Paid family leave information
- Required workplace postings acknowledgment
- Salary history ban (Labor Code 432.3)
- Pay transparency requirements (SB 1162)
- Meal/rest break acknowledgments
- Expense reimbursement (Labor Code 2802)

**All Jurisdictions:**
- Position, title, start date
- Compensation and benefits
- Equity grants (if any)
- At-will status
- Conditions of employment
- Proprietary information agreement reference

---

### 2.2 Advisor Agreement (with Equity)

**Priority:** High
**Use Case:** Engaging startup advisors with equity compensation
**Target User:** Startup founders
**Jurisdictions Needed:** CA, TX, NY (US only)
**Estimated Complexity:** High

#### Key Legal Considerations
- FAST Agreement standard (Founder Advisors Standard Template)
- Vesting schedules (typically 2-year monthly)
- Advisor tier levels and expected time commitment
- IP assignment and confidentiality
- Securities law compliance
- 409A valuation requirements
- Option grant procedures

---

### 2.3 Statement of Work (SOW)

**Priority:** High
**Use Case:** Project-based work under master agreement
**Target User:** Agencies, consultants, contractors
**Jurisdictions Needed:** CA, TX, NY, UK
**Estimated Complexity:** Medium

#### Key Legal Considerations
- Reference to master agreement
- Scope definition
- Deliverables and acceptance criteria
- Timeline and milestones
- Fixed price vs. T&M pricing
- Change order procedures
- Project-specific terms

---

### 2.4 IP Assignment Agreement

**Priority:** High
**Use Case:** Transferring intellectual property rights
**Target User:** Startups acquiring work, acqui-hires
**Jurisdictions Needed:** CA, TX, NY, UK
**Estimated Complexity:** Medium-High

#### Key Legal Considerations

**California Specific:**
- Labor Code 2870 compliance
- Moral rights waiver (limited in US)
- Prior inventions schedule

**All Jurisdictions:**
- Definition of assigned IP
- Chain of title representations
- Warranty of originality
- No encumbrances
- Further assurances
- Moral rights (UK has specific provisions)

---

### 2.5 Master Service Agreement (MSA)

**Priority:** Medium-High
**Use Case:** Ongoing service relationships with multiple projects
**Target User:** Agencies, SaaS companies, consultants
**Jurisdictions Needed:** CA, TX, NY, UK
**Estimated Complexity:** High

#### Key Legal Considerations
- Umbrella terms for multiple SOWs
- Order form/SOW attachment structure
- Service levels and SLAs
- Data processing terms
- Support and maintenance
- Price changes and renewals

---

### 2.6 Website Terms of Service

**Priority:** Medium
**Use Case:** Website/SaaS product terms
**Target User:** SaaS founders, online businesses
**Jurisdictions Needed:** CA, TX, NY, UK
**Estimated Complexity:** Medium

#### Key Legal Considerations

**California Specific:**
- CCPA/CPRA compliance
- CalOPPA (online privacy)
- Shine the Light Act (third-party sharing)

**UK Specific:**
- Consumer Rights Act 2015
- GDPR compliance
- Consumer Contracts Regulations

**All Jurisdictions:**
- Acceptance mechanisms (browsewrap, clickwrap)
- License grants
- User conduct
- Content ownership
- Disclaimers and limitations
- Dispute resolution
- Termination

---

### 2.7 Privacy Policy

**Priority:** Medium
**Use Case:** GDPR/CCPA compliance for websites and apps
**Target User:** All digital businesses
**Jurisdictions Needed:** CA, TX, NY, UK
**Estimated Complexity:** Medium-High

#### Key Legal Considerations

**California (CCPA/CPRA):**
- Categories of personal information
- Purpose of collection
- Third-party sharing
- Sale/sharing opt-out
- Access, deletion, correction rights
- Do Not Sell/Share links
- Financial incentive disclosures
- Sensitive personal information

**UK (GDPR):**
- Legal basis for processing
- Data controller identification
- Data protection officer (if required)
- International transfers
- Subject access requests
- Right to erasure
- Data retention periods
- Breach notification

---

### 2.8 Partnership Agreement (LLC Operating Agreement)

**Priority:** Medium
**Use Case:** Business co-founders, joint ventures
**Target User:** Business partners, co-founders
**Jurisdictions Needed:** CA, TX, DE, NY, UK
**Estimated Complexity:** Very High

#### Key Legal Considerations
- Member capital contributions
- Profit/loss allocation
- Management structure
- Voting rights
- Transfer restrictions
- Buy-sell provisions
- Dissolution procedures
- Tax elections (S-corp, etc.)

---

## Part 3: Implementation Timeline

### Phase 1: California Gap Fill (Weeks 1-3)
**Goal:** Complete California template coverage

| Week | Templates | Status |
|------|-----------|--------|
| 1 | CA Independent Contractor Agreement | Pending |
| 1 | CA Consulting Agreement | Pending |
| 2 | CA NDA (Mutual) | Pending |
| 2 | CA NDA (One-Way) | Pending |
| 3 | CA SAFE Note | Pending |

**Success Criteria:**
- All 5 templates generated and validated
- AB5 compliance verified by legal review
- LC 2870 notices properly included
- No non-compete clauses present

### Phase 2: High-Value New Types (Weeks 4-8)
**Goal:** Add most requested new contract types

| Week | Templates | Jurisdictions |
|------|-----------|---------------|
| 4 | Employment Offer Letter | CA, TX, NY |
| 5 | Advisor Agreement | CA, TX, NY |
| 6 | Statement of Work (SOW) | CA, TX, NY, UK |
| 7 | IP Assignment Agreement | CA, TX, NY, UK |
| 8 | Master Service Agreement | CA, TX, NY, UK |

### Phase 3: Compliance & Policy (Weeks 9-11)
**Goal:** Add compliance-focused templates

| Week | Templates | Jurisdictions |
|------|-----------|---------------|
| 9 | Website Terms of Service | CA, UK |
| 10 | Privacy Policy | CA, UK |
| 11 | Data Processing Addendum | All |

### Phase 4: Additional Jurisdictions (Weeks 12-16)
**Goal:** Expand geographic coverage

| Week | Jurisdiction | Templates |
|------|--------------|-----------|
| 12-13 | Florida | Core 6 types |
| 14-15 | Delaware | Corporate (SAFE, LLC) |
| 16 | International (Canada, Australia) | Assessment |

---

## Part 4: Technical Requirements

### 4.1 Database Schema Updates

The current `contract_templates` table structure is adequate:

```sql
-- Existing schema supports new templates
contract_templates (
  id uuid,
  contract_type text,        -- Add new types: 'employment_offer', 'advisor_agreement', etc.
  jurisdiction text,         -- Current: us_california, us_texas, us_new_york, uk
  version integer,
  title text,
  preamble text,
  recitals text,
  clauses jsonb,
  signature_block text,
  is_active boolean,
  metadata jsonb,
  placeholders jsonb
)
```

**Needed Additions:**
1. Add new contract_type enum values to `schemas.ts`
2. Add new placeholder definitions for new contract types
3. Update CONTRACT_TYPES registry in schemas

### 4.2 New Placeholder Definitions

**Employment Offer Letter:**
```typescript
{{employee_name}}
{{employee_start_date}}
{{job_title}}
{{department}}
{{salary_amount}}
{{salary_frequency}}       // annual, monthly, hourly
{{bonus_target}}
{{equity_shares}}
{{equity_type}}            // options, RSUs
{{vesting_schedule}}
{{benefits_description}}
{{pto_days}}
{{reporting_manager}}
{{work_location}}
{{remote_policy}}
```

**Advisor Agreement:**
```typescript
{{advisor_name}}
{{advisor_role}}           // Technical, Business, Strategic
{{advisor_tier}}           // Standard, Expert, Strategic
{{equity_percentage}}
{{vesting_period}}         // typically 24 months
{{vesting_cliff}}          // typically 0 for advisors
{{expected_hours}}         // per month
{{advisor_term}}           // engagement duration
```

**Statement of Work:**
```typescript
{{project_name}}
{{msa_reference}}
{{project_scope}}
{{deliverables_list}}      // JSON array
{{project_timeline}}
{{milestone_schedule}}     // JSON array
{{project_budget}}
{{pricing_model}}          // fixed, T&M, milestone
{{change_order_process}}
{{acceptance_criteria}}
```

### 4.3 Clause Manifest Structure

Create manifest files for each new contract type:

```
src/lib/contracts/manifests/
  - employment-offer.ts
  - advisor-agreement.ts
  - statement-of-work.ts
  - ip-assignment.ts
  - master-service-agreement.ts
  - terms-of-service.ts
  - privacy-policy.ts
```

Each manifest should define:
- Required clauses
- Optional clauses
- Jurisdiction variations
- Placeholder mappings
- Risk analysis rules

### 4.4 Risk Analysis Integration

Update risk analyzer for new contract types:

1. **Employment Offer:**
   - At-will statement presence
   - Non-compete detection (flag for CA)
   - Missing benefits disclosures
   - Salary history inquiry (CA)

2. **Advisor Agreement:**
   - Equity terms reasonableness
   - Vesting schedule validation
   - Time commitment clarity
   - IP assignment scope

3. **SOW/MSA:**
   - Scope creep provisions
   - Change order process
   - Acceptance criteria clarity
   - Payment terms

### 4.5 UI/UX Updates

1. **Contract Creation Flow:**
   - Update contract type selector
   - Add category groupings (Work, Protection, Investment, Employment, Compliance)
   - Show jurisdiction availability per type

2. **Template Management:**
   - Admin interface for template versioning
   - A/B testing for template variations
   - Usage analytics per template

3. **Risk Analysis Display:**
   - New risk categories for new contract types
   - Jurisdiction-specific warnings
   - Compliance checklist views

---

## Part 5: Quality Assurance

### 5.1 Legal Review Checklist

For each California template:
- [ ] AB5 compliance verified (contractor templates)
- [ ] No non-compete clauses present
- [ ] LC 2870 notice included (IP assignment)
- [ ] DTSA whistleblower notice included (NDAs)
- [ ] CCPA provisions where applicable
- [ ] California venue/jurisdiction specified
- [ ] Civil Code 1542 waiver where applicable

### 5.2 Template Validation

- [ ] All placeholders properly defined
- [ ] No hardcoded names, dates, or amounts
- [ ] Proper clause numbering
- [ ] Signature blocks complete
- [ ] Metadata properly structured

### 5.3 User Testing

- [ ] Contract generation completes successfully
- [ ] All placeholders render correctly
- [ ] PDF generation works
- [ ] Signature flow functions
- [ ] Risk analysis displays properly

---

## Appendix A: California Law Quick Reference

### Key Statutes

| Code | Section | Topic |
|------|---------|-------|
| Labor Code | 2750.3 | ABC Test (AB5) |
| Labor Code | 2870 | Invention Assignment Limits |
| Labor Code | 2802 | Expense Reimbursement |
| Labor Code | 432.3 | Salary History Ban |
| B&P Code | 16600 | Non-Compete Void |
| Civil Code | 1542 | General Release Waiver |
| Civil Code | 3426 | Trade Secrets (CUTSA) |
| Corp Code | 25102 | Securities Exemptions |

### AB5 Exemptions Quick Reference

| Category | Code Section | Requirements |
|----------|--------------|--------------|
| Licensed Professionals | LC 2783 | License + B2B relationship |
| Business Services | LC 2783 | Separate location + multiple clients |
| Referral Agencies | LC 2777 | Platform model requirements |

---

## Appendix B: Competitor Analysis

### Template Coverage Comparison

| Provider | Contract Types | Jurisdictions | California-Specific |
|----------|---------------|---------------|---------------------|
| Lexport (Current) | 6 | 4 | Limited |
| Lexport (Target) | 14 | 6+ | Comprehensive |
| DocuSign | 10+ | Generic | Minimal |
| HelloSign | 5 | Generic | None |
| PandaDoc | 15+ | Some | Some |
| Clerky | 8 | CA focus | Strong |

### Differentiation Opportunity

Lexport can differentiate by:
1. **California-first approach** - Deep AB5/LC 2870 compliance
2. **AI risk analysis** - Jurisdiction-aware warnings
3. **Startup focus** - SAFE, equity, advisor agreements
4. **Integrated signatures** - One platform for generation + signing

---

## Document History

| Date | Version | Changes |
|------|---------|---------|
| 2025-12-31 | 1.0 | Initial roadmap creation |

---

*This document should be reviewed and updated quarterly to reflect completed work and changing priorities.*
