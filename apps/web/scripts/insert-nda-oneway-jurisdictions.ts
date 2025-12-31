/**
 * Insert NDA One-Way templates for TX, NY, and UK jurisdictions
 * Based on the California NDA One-Way template structure
 *
 * Run with: bun run scripts/insert-nda-oneway-jurisdictions.ts
 */

import { createClient } from "@supabase/supabase-js";

const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL!;
const supabaseServiceKey = process.env.SUPABASE_SERVICE_ROLE_KEY!;

if (!supabaseUrl || !supabaseServiceKey) {
  console.error("Missing NEXT_PUBLIC_SUPABASE_URL or SUPABASE_SERVICE_ROLE_KEY");
  process.exit(1);
}

const supabase = createClient(supabaseUrl, supabaseServiceKey, {
  auth: {
    autoRefreshToken: false,
    persistSession: false,
  },
});

// Common placeholders for all NDA One-Way templates
const commonPlaceholders = [
  {
    id: "party_a_email",
    token: "{{party_a_email}}",
    label: "Your Email",
    description: "Email address of the first party",
    category: "party_a",
    type: "email",
    required: true,
    autofillKey: "email"
  },
  {
    id: "party_a_name",
    token: "{{party_a_name}}",
    label: "Your Name",
    description: "Full legal name of the first party",
    category: "party_a",
    type: "text",
    required: true,
    autofillKey: "name"
  },
  {
    id: "party_a_address",
    token: "{{party_a_address}}",
    label: "Your Address",
    description: "Business or mailing address",
    category: "party_a",
    type: "textarea",
    required: false,
    autofillKey: "address"
  },
  {
    id: "party_a_company",
    token: "{{party_a_company}}",
    label: "Your Company",
    description: "Company or organization name",
    category: "party_a",
    type: "text",
    required: false,
    autofillKey: "company_name"
  },
  {
    id: "party_a_title",
    token: "{{party_a_title}}",
    label: "Your Title",
    description: "Job title or role",
    category: "party_a",
    type: "text",
    required: false,
    autofillKey: "job_title"
  },
  {
    id: "party_b_email",
    token: "{{party_b_email}}",
    label: "Other Party Email",
    description: "Email address of the second party",
    category: "party_b",
    type: "email",
    required: true
  },
  {
    id: "party_b_name",
    token: "{{party_b_name}}",
    label: "Other Party Name",
    description: "Full legal name of the second party",
    category: "party_b",
    type: "text",
    required: true
  },
  {
    id: "party_b_address",
    token: "{{party_b_address}}",
    label: "Other Party Address",
    description: "Business or mailing address",
    category: "party_b",
    type: "textarea",
    required: false
  },
  {
    id: "party_b_company",
    token: "{{party_b_company}}",
    label: "Other Party Company",
    description: "Company or organization name",
    category: "party_b",
    type: "text",
    required: false
  },
  {
    id: "party_b_title",
    token: "{{party_b_title}}",
    label: "Other Party Title",
    description: "Job title or role",
    category: "party_b",
    type: "text",
    required: false
  },
  {
    id: "effective_date",
    token: "{{effective_date}}",
    label: "Effective Date",
    description: "When the agreement becomes effective",
    category: "dates",
    type: "date",
    required: true
  },
  {
    id: "expiration_date",
    token: "{{expiration_date}}",
    label: "Expiration Date",
    description: "When the agreement ends (if applicable)",
    category: "dates",
    type: "date",
    required: false
  },
  {
    id: "signature_date",
    token: "{{signature_date}}",
    label: "Signature Date",
    description: "Date of signing",
    category: "dates",
    type: "date",
    required: false
  },
  {
    id: "governing_jurisdiction",
    token: "{{governing_jurisdiction}}",
    label: "Governing Jurisdiction",
    description: "State/country whose laws govern the agreement",
    category: "terms",
    type: "text",
    required: true
  },
  {
    id: "confidentiality_period",
    token: "{{confidentiality_period}}",
    label: "Confidentiality Period",
    description: "Duration of confidentiality obligations (in years)",
    category: "terms",
    type: "number",
    required: false
  },
  {
    id: "notice_period",
    token: "{{notice_period}}",
    label: "Notice Period",
    description: "Days notice required for termination",
    category: "terms",
    type: "number",
    required: false
  },
  {
    id: "purpose",
    token: "{{purpose}}",
    label: "Purpose",
    description: "Purpose of the agreement or disclosure",
    category: "terms",
    type: "textarea",
    required: false
  }
];

// ============================================================================
// TEXAS NDA One-Way Template
// ============================================================================
const texasNdaOneWay = {
  contract_type: "nda_one_way",
  jurisdiction: "us_texas",
  version: 1,
  title: "One-Way Non-Disclosure Agreement (Texas)",
  preamble: `This One-Way Non-Disclosure Agreement ("Agreement") is entered into as of {{effective_date}} (the "Effective Date") by and between {{party_a_company}}, with an address at {{party_a_address}} ("Discloser"), and {{party_b_company}}, with an address at {{party_b_address}} ("Recipient"). Discloser and Recipient may each be referred to herein as a "Party" and collectively as the "Parties."`,
  recitals: `WHEREAS, the Parties wish to explore and/or engage in discussions and activities for {{purpose}} (the "Purpose");

WHEREAS, in connection with the Purpose, Discloser may disclose to Recipient certain non-public information that Discloser considers confidential or proprietary;

WHEREAS, Recipient agrees to receive and protect such information in accordance with the terms of this Agreement.

NOW, THEREFORE, in consideration of the mutual promises and covenants herein and other good and valuable consideration, the receipt and sufficiency of which are acknowledged, the Parties agree as follows:`,
  clauses: [
    {
      id: "definitions",
      title: "1. DEFINITIONS",
      content: `1.1 "Confidential Information" means all non-public information disclosed by or on behalf of Discloser to Recipient, whether disclosed before or after the Effective Date, and whether disclosed orally, visually, in writing, electronically, or in any other form, that is designated as confidential or that reasonably should be understood to be confidential given the nature of the information and the circumstances of disclosure, including without limitation: business plans; product plans; designs; specifications; processes; formulas; inventions; know-how; research and development; customer and supplier information; pricing; financial information; marketing information; source code and object code; software; data; databases; trade secrets (as defined under the Texas Uniform Trade Secrets Act, Texas Civil Practice and Remedies Code Chapter 134A ("TUTSA")); and any notes, analyses, compilations, studies, summaries, interpretations, or other materials prepared by Recipient that contain, reflect, or are based on any of the foregoing.

1.2 "Representatives" means Recipient's and its affiliates' directors, officers, employees, agents, advisors, attorneys, accountants, consultants, contractors, and potential financing sources who have a need to know the Confidential Information for the Purpose.

1.3 "Disclose" and "Disclosure" include any transfer, provision of access, communication, observation, inspection, or other disclosure of Confidential Information.

1.4 "Permitted Purpose" means the Purpose described in the Recitals.

1.5 "Affiliates" means any entity that directly or indirectly controls, is controlled by, or is under common control with a Party, where "control" means the power to direct management or policies, whether through ownership, contract, or otherwise.`,
      type: "standard",
      order: 1
    },
    {
      id: "confidentiality_obligations",
      title: "2. CONFIDENTIALITY OBLIGATIONS",
      content: `2.1 Use Restriction. Recipient shall use the Confidential Information solely for the Permitted Purpose and for no other purpose without Discloser's prior written consent.

2.2 Non-Disclosure. Recipient shall not disclose any Confidential Information to any person or entity except to Representatives who (a) have a need to know the Confidential Information for the Permitted Purpose, and (b) are bound by written obligations of confidentiality and restricted use at least as protective as those set forth in this Agreement. Recipient is responsible for any breach of this Agreement by its Representatives.

2.3 Standard of Care. Recipient shall protect the Confidential Information using at least the same degree of care it uses to protect its own confidential information of like importance, but in no event less than reasonable care.

2.4 Safeguards. Recipient shall implement and maintain reasonable administrative, physical, and technical safeguards designed to protect the Confidential Information against unauthorized access, disclosure, alteration, or destruction.

2.5 No Circumvention of Marking. Confidential Information disclosed orally or visually shall be treated as Confidential Information if identified as confidential at the time of disclosure or if it reasonably should be understood to be confidential under the circumstances.

2.6 Required Disclosure. If Recipient is required by applicable law, regulation, or valid legal process to disclose any Confidential Information, Recipient shall (to the extent legally permitted) (a) provide Discloser with prompt written notice of such requirement, (b) reasonably cooperate with Discloser (at Discloser's expense) in seeking a protective order or other appropriate remedy, and (c) disclose only that portion of the Confidential Information that Recipient is legally required to disclose.

2.7 No Export/Compliance. Recipient shall comply with all applicable laws in its handling of Confidential Information, including any applicable export control and sanctions laws.

2.8 Texas Business & Commerce Code Compliance. The Parties acknowledge that this Agreement is intended to be construed and enforced in accordance with the Texas Business & Commerce Code and TUTSA, including provisions relating to trade secret protection and the duty of confidentiality.`,
      type: "standard",
      order: 2
    },
    {
      id: "exclusions",
      title: "3. EXCLUSIONS FROM CONFIDENTIAL INFORMATION",
      content: `3.1 Excluded Information. Confidential Information does not include information that Recipient can demonstrate by competent written records:

(a) was publicly known and made generally available through no breach of this Agreement by Recipient at the time of disclosure;
(b) becomes publicly known and made generally available after disclosure through no breach of this Agreement by Recipient;
(c) was already in Recipient's lawful possession without restriction on use or disclosure at the time of disclosure by Discloser;
(d) is obtained by Recipient from a third party who had the lawful right to disclose such information and who did not disclose it in breach of any confidentiality obligation to Discloser; or
(e) is independently developed by Recipient without use of or reference to Discloser's Confidential Information.

3.2 Residual Knowledge. Nothing in this Agreement grants Recipient the right to use Discloser's Confidential Information. However, Recipient shall not be liable for use of information retained in the unaided memory of Recipient's personnel who had access to Confidential Information, solely to the extent such use does not involve (i) deliberate memorization of Confidential Information for an unauthorized purpose, (ii) use or disclosure of trade secrets in violation of TUTSA, or (iii) use of any tangible or electronic copies, notes, or other embodiments of Confidential Information.

3.3 No Implied License. For clarity, exclusions do not create any license or other right to use Discloser's Confidential Information beyond the Permitted Purpose.`,
      type: "standard",
      order: 3
    },
    {
      id: "term_duration",
      title: "4. TERM AND DURATION",
      content: `4.1 Term. This Agreement begins on the Effective Date and continues until the earlier of: (a) {{expiration_date}}, or (b) termination by either Party upon written notice to the other Party with at least {{notice_period}} days' prior notice.

4.2 Duration of Confidentiality Obligations. Recipient's obligations of non-disclosure and restricted use with respect to Confidential Information will continue for {{confidentiality_period}} years from the date of each disclosure.

4.3 Trade Secrets. Notwithstanding Section 4.2, to the extent any Confidential Information constitutes a trade secret under TUTSA, Recipient's obligations under this Agreement as to such trade secret will continue for so long as such information remains a trade secret under applicable law.

4.4 Survival. Sections 1 (Definitions), 2 (Confidentiality Obligations), 3 (Exclusions), 4 (Term and Duration), 5 (Return/Destruction), 6 (Remedies), 7 (Governing Law; Venue), and 8 (General Provisions) survive any expiration or termination of this Agreement according to their terms.`,
      type: "standard",
      order: 4
    },
    {
      id: "return_of_information",
      title: "5. RETURN OR DESTRUCTION OF INFORMATION",
      content: `5.1 Return/Destruction Upon Request or Termination. Upon Discloser's written request and/or upon termination or expiration of this Agreement, Recipient shall promptly (and in any event within a reasonable time) return to Discloser or destroy (at Discloser's option) all Confidential Information in Recipient's possession or control, including all copies, excerpts, and summaries, whether in written, electronic, or other form.

5.2 Certification. Upon Discloser's written request, Recipient shall provide a written certification of an authorized representative confirming return or destruction of Confidential Information.

5.3 Backup and Archival Copies. Notwithstanding the foregoing, Recipient may retain copies of Confidential Information (a) solely to the extent automatically stored in routine backup or archival systems in accordance with Recipient's standard policies, and/or (b) as required to comply with applicable law, regulation, or bona fide internal compliance policies, provided that (i) such retained information remains subject to this Agreement, (ii) Recipient does not access it except as required for compliance or legal purposes, and (iii) Recipient continues to protect it in accordance with this Agreement.

5.4 No Obligation to Disclose. Discloser has no obligation to disclose any information under this Agreement, and neither Party is obligated to proceed with any transaction or relationship related to the Purpose.`,
      type: "standard",
      order: 5
    },
    {
      id: "remedies",
      title: "6. REMEDIES",
      content: `6.1 Injunctive Relief. Recipient acknowledges that unauthorized use or disclosure of Confidential Information may cause Discloser irreparable harm for which monetary damages may be inadequate. Accordingly, in the event of any actual or threatened breach of this Agreement, Discloser will be entitled to seek injunctive or other equitable relief pursuant to Texas Civil Practice and Remedies Code Section 134A.003 and other applicable law (without the necessity of posting a bond to the maximum extent permitted by law), in addition to any other rights and remedies available at law or in equity.

6.2 TUTSA Remedies Preserved. Nothing in this Agreement limits any rights or remedies available to Discloser under TUTSA, including the right to recover actual damages, unjust enrichment, and exemplary damages for willful and malicious misappropriation as provided under Texas Civil Practice and Remedies Code Section 134A.004.

6.3 Attorneys' Fees. In any action or proceeding arising out of or related to this Agreement, including actions for misappropriation of trade secrets under TUTSA, the court may award reasonable attorneys' fees to the prevailing party as permitted by Texas Civil Practice and Remedies Code Section 134A.005.

6.4 Limitation of Liability. Nothing in this Agreement limits liability for (a) misappropriation of trade secrets, (b) willful misconduct, or (c) fraud.`,
      type: "optional",
      order: 6
    },
    {
      id: "governing_law",
      title: "7. GOVERNING LAW; VENUE",
      content: `7.1 Governing Law. This Agreement and any dispute arising out of or relating to this Agreement, the Confidential Information, or the Purpose are governed by the laws of the State of Texas, without regard to its conflict of laws rules. The Parties specifically acknowledge the applicability of TUTSA and the Texas Business & Commerce Code to the protection of trade secrets and confidential information under this Agreement.

7.2 Venue; Jurisdiction. Subject to Section 7.3 (Equitable Relief), the Parties agree that any action or proceeding arising out of or related to this Agreement will be brought exclusively in the state or federal courts located in {{governing_jurisdiction}}, Texas, and each Party irrevocably submits to the personal jurisdiction of such courts.

7.3 Equitable Relief in Any Court. Notwithstanding Section 7.2, Discloser may seek temporary restraining orders, preliminary injunctions, or other equitable relief in any court of competent jurisdiction to protect its Confidential Information.

7.4 Jury Trial Waiver. To the fullest extent permitted by Texas law, each Party knowingly and voluntarily waives any right to a trial by jury in any legal proceeding arising out of or relating to this Agreement.

7.5 Texas Non-Compete Considerations. Nothing in this Agreement shall be construed as a covenant not to compete. To the extent any provision could be interpreted as restricting competition, such provision shall be construed narrowly and enforced only to the extent necessary to protect legitimate business interests in accordance with Texas Business & Commerce Code Section 15.50 et seq.`,
      type: "standard",
      order: 7
    },
    {
      id: "general_provisions",
      title: "8. GENERAL PROVISIONS",
      content: `8.1 No License; Ownership. All Confidential Information remains the property of Discloser. No license or other rights are granted to Recipient by this Agreement, whether by implication, estoppel, or otherwise, except the limited right to use Confidential Information solely for the Permitted Purpose.

8.2 No Warranty. All Confidential Information is provided "AS IS." Discloser makes no representation or warranty, express or implied, as to the accuracy, completeness, or performance of the Confidential Information, and Discloser shall have no liability to Recipient resulting from Recipient's use of Confidential Information, except as may not be disclaimed under applicable law.

8.3 No Obligation to Enter Transaction. Nothing in this Agreement obligates either Party to enter into any agreement or business relationship, or to proceed with any proposed transaction, and either Party may cease discussions at any time.

8.4 Assignment. Recipient may not assign or transfer this Agreement, in whole or in part, without Discloser's prior written consent. Any attempted assignment in violation of this Section is void. Discloser may assign this Agreement to a successor in connection with a merger, acquisition, reorganization, or sale of substantially all of its assets.

8.5 Notices. All notices under this Agreement must be in writing and will be deemed given when delivered personally, sent by confirmed email, or sent by nationally recognized overnight courier, to the contacts below (or to such other address a Party designates by notice):

If to Discloser:
{{party_a_company}}
Attn: {{party_a_name}}, {{party_a_title}}
{{party_a_address}}
Email: {{party_a_email}}

If to Recipient:
{{party_b_company}}
Attn: {{party_b_name}}, {{party_b_title}}
{{party_b_address}}
Email: {{party_b_email}}

8.6 Entire Agreement. This Agreement constitutes the entire agreement between the Parties regarding its subject matter and supersedes all prior or contemporaneous agreements, understandings, and communications, whether written or oral, relating to such subject matter.

8.7 Amendment; Waiver. Any amendment or modification of this Agreement must be in writing and signed by both Parties. No waiver of any breach will be deemed a waiver of any other breach. A waiver must be in writing and signed by the waiving Party.

8.8 Severability. If any provision of this Agreement is held invalid or unenforceable by a court of competent jurisdiction in Texas, the remaining provisions will remain in full force and effect, and the invalid or unenforceable provision will be enforced to the maximum extent permitted to effect the Parties' intent.

8.9 Counterparts; Electronic Signatures. This Agreement may be executed in counterparts, each of which will be deemed an original and all of which together constitute one instrument. Signatures transmitted electronically (including PDF and e-signature) will be deemed original and enforceable under Texas law.

8.10 Headings. Headings are for convenience only and do not affect interpretation.

8.11 Texas Data Privacy. To the extent Confidential Information includes personal information subject to Texas privacy law (including the Texas Identity Theft Enforcement and Protection Act, Texas Business & Commerce Code Chapter 521), Recipient shall: (a) implement and maintain reasonable security procedures to protect such information; (b) notify Discloser without unreasonable delay upon discovery of any unauthorized access or acquisition of such personal information; and (c) comply with all applicable data breach notification requirements under Texas law.

8.12 Publicity. Recipient shall not issue press releases or public statements regarding the Purpose or the existence of this Agreement without Discloser's prior written consent, except as required by law.

8.13 Interpretation. This Agreement will be construed as jointly drafted, and no presumption or burden of proof will arise favoring or disfavoring any Party by virtue of authorship.

8.14 Confidential Relationship. Recipient acknowledges that receipt of Confidential Information creates a confidential relationship and a duty to protect such information consistent with this Agreement and applicable Texas law.`,
      type: "standard",
      order: 8
    }
  ],
  signature_block: `IN WITNESS WHEREOF, the Parties have executed this Agreement as of {{signature_date}}.

DISCLOSER (PARTY A):
{{party_a_company}}

By: ________________________________
Name: {{party_a_name}}
Title: {{party_a_title}}
Email: {{party_a_email}}
Address: {{party_a_address}}
Date: {{signature_date}}

RECIPIENT (PARTY B):
{{party_b_company}}

By: ________________________________
Name: {{party_b_name}}
Title: {{party_b_title}}
Email: {{party_b_email}}
Address: {{party_b_address}}
Date: {{signature_date}}`,
  placeholders: commonPlaceholders,
  is_active: true,
  metadata: {
    generator_version: "manual-jurisdiction",
    jurisdiction_specific: true,
    based_on: "nda_one_way_us_california",
    generated_at: new Date().toISOString(),
    legal_references: [
      "Texas Uniform Trade Secrets Act (TUTSA) - Texas Civil Practice and Remedies Code Chapter 134A",
      "Texas Business & Commerce Code",
      "Texas Business & Commerce Code Section 15.50 (Non-Compete)",
      "Texas Identity Theft Enforcement and Protection Act - Texas Business & Commerce Code Chapter 521"
    ]
  }
};

// ============================================================================
// NEW YORK NDA One-Way Template
// ============================================================================
const newYorkNdaOneWay = {
  contract_type: "nda_one_way",
  jurisdiction: "us_new_york",
  version: 1,
  title: "One-Way Non-Disclosure Agreement (New York)",
  preamble: `This One-Way Non-Disclosure Agreement ("Agreement") is entered into as of {{effective_date}} (the "Effective Date") by and between {{party_a_company}}, with an address at {{party_a_address}} ("Discloser"), and {{party_b_company}}, with an address at {{party_b_address}} ("Recipient"). Discloser and Recipient may each be referred to herein as a "Party" and collectively as the "Parties."`,
  recitals: `WHEREAS, the Parties wish to explore and/or engage in discussions and activities for {{purpose}} (the "Purpose");

WHEREAS, in connection with the Purpose, Discloser may disclose to Recipient certain non-public information that Discloser considers confidential or proprietary;

WHEREAS, Recipient agrees to receive and protect such information in accordance with the terms of this Agreement.

NOW, THEREFORE, in consideration of the mutual promises and covenants herein and other good and valuable consideration, the receipt and sufficiency of which are acknowledged, the Parties agree as follows:`,
  clauses: [
    {
      id: "definitions",
      title: "1. DEFINITIONS",
      content: `1.1 "Confidential Information" means all non-public information disclosed by or on behalf of Discloser to Recipient, whether disclosed before or after the Effective Date, and whether disclosed orally, visually, in writing, electronically, or in any other form, that is designated as confidential or that reasonably should be understood to be confidential given the nature of the information and the circumstances of disclosure, including without limitation: business plans; product plans; designs; specifications; processes; formulas; inventions; know-how; research and development; customer and supplier information; pricing; financial information; marketing information; source code and object code; software; data; databases; trade secrets (as recognized under New York common law and the federal Defend Trade Secrets Act, 18 U.S.C. § 1836 et seq. ("DTSA")); and any notes, analyses, compilations, studies, summaries, interpretations, or other materials prepared by Recipient that contain, reflect, or are based on any of the foregoing.

1.2 "Representatives" means Recipient's and its affiliates' directors, officers, employees, agents, advisors, attorneys, accountants, consultants, contractors, and potential financing sources who have a need to know the Confidential Information for the Purpose.

1.3 "Disclose" and "Disclosure" include any transfer, provision of access, communication, observation, inspection, or other disclosure of Confidential Information.

1.4 "Permitted Purpose" means the Purpose described in the Recitals.

1.5 "Affiliates" means any entity that directly or indirectly controls, is controlled by, or is under common control with a Party, where "control" means the power to direct management or policies, whether through ownership, contract, or otherwise.`,
      type: "standard",
      order: 1
    },
    {
      id: "confidentiality_obligations",
      title: "2. CONFIDENTIALITY OBLIGATIONS",
      content: `2.1 Use Restriction. Recipient shall use the Confidential Information solely for the Permitted Purpose and for no other purpose without Discloser's prior written consent.

2.2 Non-Disclosure. Recipient shall not disclose any Confidential Information to any person or entity except to Representatives who (a) have a need to know the Confidential Information for the Permitted Purpose, and (b) are bound by written obligations of confidentiality and restricted use at least as protective as those set forth in this Agreement. Recipient is responsible for any breach of this Agreement by its Representatives.

2.3 Standard of Care. Recipient shall protect the Confidential Information using at least the same degree of care it uses to protect its own confidential information of like importance, but in no event less than reasonable care.

2.4 Safeguards. Recipient shall implement and maintain reasonable administrative, physical, and technical safeguards designed to protect the Confidential Information against unauthorized access, disclosure, alteration, or destruction.

2.5 No Circumvention of Marking. Confidential Information disclosed orally or visually shall be treated as Confidential Information if identified as confidential at the time of disclosure or if it reasonably should be understood to be confidential under the circumstances.

2.6 Required Disclosure. If Recipient is required by applicable law, regulation, or valid legal process to disclose any Confidential Information, Recipient shall (to the extent legally permitted) (a) provide Discloser with prompt written notice of such requirement, (b) reasonably cooperate with Discloser (at Discloser's expense) in seeking a protective order or other appropriate remedy, and (c) disclose only that portion of the Confidential Information that Recipient is legally required to disclose.

2.7 No Export/Compliance. Recipient shall comply with all applicable laws in its handling of Confidential Information, including any applicable export control and sanctions laws.

2.8 New York General Business Law Compliance. The Parties acknowledge that this Agreement is intended to comply with New York General Business Law and applicable common law principles governing confidential relationships and trade secret protection.`,
      type: "standard",
      order: 2
    },
    {
      id: "exclusions",
      title: "3. EXCLUSIONS FROM CONFIDENTIAL INFORMATION",
      content: `3.1 Excluded Information. Confidential Information does not include information that Recipient can demonstrate by competent written records:

(a) was publicly known and made generally available through no breach of this Agreement by Recipient at the time of disclosure;
(b) becomes publicly known and made generally available after disclosure through no breach of this Agreement by Recipient;
(c) was already in Recipient's lawful possession without restriction on use or disclosure at the time of disclosure by Discloser;
(d) is obtained by Recipient from a third party who had the lawful right to disclose such information and who did not disclose it in breach of any confidentiality obligation to Discloser; or
(e) is independently developed by Recipient without use of or reference to Discloser's Confidential Information.

3.2 Residual Knowledge. Nothing in this Agreement grants Recipient the right to use Discloser's Confidential Information. However, Recipient shall not be liable for use of information retained in the unaided memory of Recipient's personnel who had access to Confidential Information, solely to the extent such use does not involve (i) deliberate memorization of Confidential Information for an unauthorized purpose, (ii) use or disclosure of trade secrets in violation of applicable law, or (iii) use of any tangible or electronic copies, notes, or other embodiments of Confidential Information.

3.3 No Implied License. For clarity, exclusions do not create any license or other right to use Discloser's Confidential Information beyond the Permitted Purpose.`,
      type: "standard",
      order: 3
    },
    {
      id: "term_duration",
      title: "4. TERM AND DURATION",
      content: `4.1 Term. This Agreement begins on the Effective Date and continues until the earlier of: (a) {{expiration_date}}, or (b) termination by either Party upon written notice to the other Party with at least {{notice_period}} days' prior notice.

4.2 Duration of Confidentiality Obligations. Recipient's obligations of non-disclosure and restricted use with respect to Confidential Information will continue for {{confidentiality_period}} years from the date of each disclosure. This duration is consistent with New York commercial practice norms for confidentiality agreements.

4.3 Trade Secrets. Notwithstanding Section 4.2, to the extent any Confidential Information constitutes a trade secret under New York common law or the DTSA, Recipient's obligations under this Agreement as to such trade secret will continue for so long as such information remains a trade secret under applicable law.

4.4 Survival. Sections 1 (Definitions), 2 (Confidentiality Obligations), 3 (Exclusions), 4 (Term and Duration), 5 (Return/Destruction), 6 (Remedies), 7 (Governing Law; Venue), and 8 (General Provisions) survive any expiration or termination of this Agreement according to their terms.`,
      type: "standard",
      order: 4
    },
    {
      id: "return_of_information",
      title: "5. RETURN OR DESTRUCTION OF INFORMATION",
      content: `5.1 Return/Destruction Upon Request or Termination. Upon Discloser's written request and/or upon termination or expiration of this Agreement, Recipient shall promptly (and in any event within a reasonable time) return to Discloser or destroy (at Discloser's option) all Confidential Information in Recipient's possession or control, including all copies, excerpts, and summaries, whether in written, electronic, or other form.

5.2 Certification. Upon Discloser's written request, Recipient shall provide a written certification of an authorized representative confirming return or destruction of Confidential Information.

5.3 Backup and Archival Copies. Notwithstanding the foregoing, Recipient may retain copies of Confidential Information (a) solely to the extent automatically stored in routine backup or archival systems in accordance with Recipient's standard policies, and/or (b) as required to comply with applicable law, regulation, or bona fide internal compliance policies, provided that (i) such retained information remains subject to this Agreement, (ii) Recipient does not access it except as required for compliance or legal purposes, and (iii) Recipient continues to protect it in accordance with this Agreement.

5.4 No Obligation to Disclose. Discloser has no obligation to disclose any information under this Agreement, and neither Party is obligated to proceed with any transaction or relationship related to the Purpose.`,
      type: "standard",
      order: 5
    },
    {
      id: "remedies",
      title: "6. REMEDIES",
      content: `6.1 Injunctive Relief. Recipient acknowledges that unauthorized use or disclosure of Confidential Information may cause Discloser irreparable harm for which monetary damages may be inadequate. Accordingly, in the event of any actual or threatened breach of this Agreement, Discloser will be entitled to seek injunctive or other equitable relief from any court of competent jurisdiction in accordance with New York Civil Practice Law and Rules (CPLR) Article 63 (without the necessity of posting a bond to the maximum extent permitted by law), in addition to any other rights and remedies available at law or in equity.

6.2 DTSA and Common Law Remedies Preserved. Nothing in this Agreement limits any rights or remedies available to Discloser under the federal Defend Trade Secrets Act (18 U.S.C. § 1836 et seq.) or New York common law, including the right to recover actual damages, unjust enrichment, and exemplary damages where appropriate.

6.3 Attorneys' Fees. In any action or proceeding arising out of or related to this Agreement, the prevailing party may recover its reasonable attorneys' fees and costs, to the extent permitted by applicable law.

6.4 Limitation of Liability. Nothing in this Agreement limits liability for (a) misappropriation of trade secrets, (b) willful misconduct, or (c) fraud.

6.5 DTSA Whistleblower Notice. Pursuant to 18 U.S.C. § 1833(b), Recipient is hereby notified that an individual will not be held criminally or civilly liable under any federal or state trade secret law for the disclosure of a trade secret that is made in confidence to a federal, state, or local government official, or to an attorney, solely for the purpose of reporting or investigating a suspected violation of law, or in a complaint or other document filed in a lawsuit or other proceeding if such filing is made under seal.`,
      type: "optional",
      order: 6
    },
    {
      id: "governing_law",
      title: "7. GOVERNING LAW; VENUE",
      content: `7.1 Governing Law. This Agreement and any dispute arising out of or relating to this Agreement, the Confidential Information, or the Purpose are governed by the laws of the State of New York, without regard to its conflict of laws rules. The Parties specifically acknowledge the applicability of New York common law principles governing confidential relationships and the federal Defend Trade Secrets Act to the protection of trade secrets and confidential information under this Agreement.

7.2 Venue; Jurisdiction. Subject to Section 7.3 (Equitable Relief), the Parties agree that any action or proceeding arising out of or related to this Agreement will be brought exclusively in the state or federal courts located in {{governing_jurisdiction}}, New York (including the Commercial Division of the Supreme Court of the State of New York, New York County, if applicable), and each Party irrevocably submits to the personal jurisdiction of such courts and waives any objection to venue in such courts.

7.3 Equitable Relief in Any Court. Notwithstanding Section 7.2, Discloser may seek temporary restraining orders, preliminary injunctions, or other equitable relief in any court of competent jurisdiction to protect its Confidential Information.

7.4 Jury Trial Waiver. To the fullest extent permitted by New York law, each Party knowingly and voluntarily waives any right to a trial by jury in any legal proceeding arising out of or relating to this Agreement. This waiver is given knowingly, voluntarily, and intentionally.

7.5 New York Non-Compete Considerations. The Parties acknowledge that nothing in this Agreement shall be construed as a non-compete covenant. To the extent any provision could be interpreted as restricting competition or employment, such provision shall be construed narrowly and enforced only to the extent necessary to protect legitimate business interests in accordance with New York law.`,
      type: "standard",
      order: 7
    },
    {
      id: "general_provisions",
      title: "8. GENERAL PROVISIONS",
      content: `8.1 No License; Ownership. All Confidential Information remains the property of Discloser. No license or other rights are granted to Recipient by this Agreement, whether by implication, estoppel, or otherwise, except the limited right to use Confidential Information solely for the Permitted Purpose.

8.2 No Warranty. All Confidential Information is provided "AS IS." Discloser makes no representation or warranty, express or implied, as to the accuracy, completeness, or performance of the Confidential Information, and Discloser shall have no liability to Recipient resulting from Recipient's use of Confidential Information, except as may not be disclaimed under applicable law.

8.3 No Obligation to Enter Transaction. Nothing in this Agreement obligates either Party to enter into any agreement or business relationship, or to proceed with any proposed transaction, and either Party may cease discussions at any time.

8.4 Assignment. Recipient may not assign or transfer this Agreement, in whole or in part, without Discloser's prior written consent. Any attempted assignment in violation of this Section is void. Discloser may assign this Agreement to a successor in connection with a merger, acquisition, reorganization, or sale of substantially all of its assets.

8.5 Notices. All notices under this Agreement must be in writing and will be deemed given when delivered personally, sent by confirmed email, or sent by nationally recognized overnight courier, to the contacts below (or to such other address a Party designates by notice):

If to Discloser:
{{party_a_company}}
Attn: {{party_a_name}}, {{party_a_title}}
{{party_a_address}}
Email: {{party_a_email}}

If to Recipient:
{{party_b_company}}
Attn: {{party_b_name}}, {{party_b_title}}
{{party_b_address}}
Email: {{party_b_email}}

8.6 Entire Agreement. This Agreement constitutes the entire agreement between the Parties regarding its subject matter and supersedes all prior or contemporaneous agreements, understandings, and communications, whether written or oral, relating to such subject matter.

8.7 Amendment; Waiver. Any amendment or modification of this Agreement must be in writing and signed by both Parties. No waiver of any breach will be deemed a waiver of any other breach. A waiver must be in writing and signed by the waiving Party.

8.8 Severability. If any provision of this Agreement is held invalid or unenforceable by a court of competent jurisdiction in New York, the remaining provisions will remain in full force and effect, and the invalid or unenforceable provision will be enforced to the maximum extent permitted to effect the Parties' intent.

8.9 Counterparts; Electronic Signatures. This Agreement may be executed in counterparts, each of which will be deemed an original and all of which together constitute one instrument. Signatures transmitted electronically (including PDF and e-signature) will be deemed original and enforceable under New York Electronic Signatures and Records Act (ESRA) and federal E-SIGN Act.

8.10 Headings. Headings are for convenience only and do not affect interpretation.

8.11 New York Data Privacy (SHIELD Act). To the extent Confidential Information includes private information of New York residents (as defined under the New York SHIELD Act, N.Y. Gen. Bus. Law § 899-bb), Recipient shall: (a) implement and maintain reasonable safeguards to protect the security, confidentiality, and integrity of such private information, including appropriate administrative, technical, and physical safeguards; (b) notify Discloser without unreasonable delay upon discovery of any security breach involving such private information; and (c) comply with all applicable data breach notification requirements under New York law.

8.12 Publicity. Recipient shall not issue press releases or public statements regarding the Purpose or the existence of this Agreement without Discloser's prior written consent, except as required by law.

8.13 Interpretation. This Agreement will be construed as jointly drafted, and no presumption or burden of proof will arise favoring or disfavoring any Party by virtue of authorship. In accordance with New York rules of contract interpretation, this Agreement shall be interpreted to give effect to the parties' reasonable intent.

8.14 Confidential Relationship. Recipient acknowledges that receipt of Confidential Information creates a confidential relationship and a duty to protect such information consistent with this Agreement and applicable New York law.`,
      type: "standard",
      order: 8
    }
  ],
  signature_block: `IN WITNESS WHEREOF, the Parties have executed this Agreement as of {{signature_date}}.

DISCLOSER (PARTY A):
{{party_a_company}}

By: ________________________________
Name: {{party_a_name}}
Title: {{party_a_title}}
Email: {{party_a_email}}
Address: {{party_a_address}}
Date: {{signature_date}}

RECIPIENT (PARTY B):
{{party_b_company}}

By: ________________________________
Name: {{party_b_name}}
Title: {{party_b_title}}
Email: {{party_b_email}}
Address: {{party_b_address}}
Date: {{signature_date}}`,
  placeholders: commonPlaceholders,
  is_active: true,
  metadata: {
    generator_version: "manual-jurisdiction",
    jurisdiction_specific: true,
    based_on: "nda_one_way_us_california",
    generated_at: new Date().toISOString(),
    legal_references: [
      "New York General Business Law",
      "Federal Defend Trade Secrets Act (DTSA) - 18 U.S.C. § 1836 et seq.",
      "New York SHIELD Act - N.Y. Gen. Bus. Law § 899-bb",
      "New York Electronic Signatures and Records Act (ESRA)",
      "New York Civil Practice Law and Rules (CPLR)"
    ]
  }
};

// ============================================================================
// UK NDA One-Way Template
// ============================================================================
const ukNdaOneWay = {
  contract_type: "nda_one_way",
  jurisdiction: "uk",
  version: 1,
  title: "One-Way Non-Disclosure Agreement (United Kingdom)",
  preamble: `This One-Way Non-Disclosure Agreement ("Agreement") is entered into as of {{effective_date}} (the "Effective Date") by and between {{party_a_company}}, a company registered in England and Wales (or as applicable), with its registered office at {{party_a_address}} ("Discloser"), and {{party_b_company}}, with an address at {{party_b_address}} ("Recipient"). Discloser and Recipient may each be referred to herein as a "Party" and collectively as the "Parties."`,
  recitals: `WHEREAS, the Parties wish to explore and/or engage in discussions and activities for {{purpose}} (the "Purpose");

WHEREAS, in connection with the Purpose, Discloser may disclose to Recipient certain non-public information that Discloser considers confidential or proprietary;

WHEREAS, Recipient agrees to receive and protect such information in accordance with the terms of this Agreement.

NOW, THEREFORE, in consideration of the mutual promises and covenants herein and other good and valuable consideration, the Parties agree as follows:`,
  clauses: [
    {
      id: "definitions",
      title: "1. DEFINITIONS AND INTERPRETATION",
      content: `1.1 "Confidential Information" means all non-public information disclosed by or on behalf of Discloser to Recipient, whether disclosed before or after the Effective Date, and whether disclosed orally, visually, in writing, electronically, or in any other form, that is designated as confidential or that reasonably should be understood to be confidential given the nature of the information and the circumstances of disclosure, including without limitation: business plans; product plans; designs; specifications; processes; formulas; inventions; know-how; research and development; customer and supplier information; pricing; financial information; marketing information; source code and object code; software; data; databases; trade secrets (as recognised under the common law duty of confidence and the Trade Secrets (Enforcement, etc.) Regulations 2018 (SI 2018/597)); and any notes, analyses, compilations, studies, summaries, interpretations, or other materials prepared by Recipient that contain, reflect, or are based on any of the foregoing.

1.2 "Representatives" means Recipient's and its affiliates' directors, officers, employees, agents, advisors, solicitors, barristers, accountants, consultants, contractors, and potential financing sources who have a need to know the Confidential Information for the Purpose.

1.3 "Disclose" and "Disclosure" include any transfer, provision of access, communication, observation, inspection, or other disclosure of Confidential Information.

1.4 "Permitted Purpose" means the Purpose described in the Recitals.

1.5 "Affiliates" means any entity that directly or indirectly controls, is controlled by, or is under common control with a Party, where "control" means the power to direct management or policies, whether through ownership of voting securities, contract, or otherwise.

1.6 "Personal Data" has the meaning given in the UK General Data Protection Regulation (UK GDPR) as retained and amended under UK law and the Data Protection Act 2018.

1.7 In this Agreement, unless the context otherwise requires: (a) words in the singular include the plural and vice versa; (b) a reference to a statute or statutory provision includes any subordinate legislation made under it and any modification, amendment, or re-enactment of it; and (c) headings are for convenience only and shall not affect interpretation.`,
      type: "standard",
      order: 1
    },
    {
      id: "confidentiality_obligations",
      title: "2. CONFIDENTIALITY OBLIGATIONS",
      content: `2.1 Use Restriction. Recipient shall use the Confidential Information solely for the Permitted Purpose and for no other purpose without Discloser's prior written consent.

2.2 Non-Disclosure. Recipient shall not disclose any Confidential Information to any person or entity except to Representatives who (a) have a need to know the Confidential Information for the Permitted Purpose, and (b) are bound by written obligations of confidentiality and restricted use at least as protective as those set forth in this Agreement. Recipient is responsible for any breach of this Agreement by its Representatives.

2.3 Standard of Care. Recipient shall protect the Confidential Information using at least the same degree of care it uses to protect its own confidential information of like importance, but in no event less than reasonable care.

2.4 Safeguards. Recipient shall implement and maintain appropriate technical and organisational measures designed to protect the Confidential Information against unauthorised access, disclosure, alteration, or destruction.

2.5 No Circumvention of Marking. Confidential Information disclosed orally or visually shall be treated as Confidential Information if identified as confidential at the time of disclosure or if it reasonably should be understood to be confidential under the circumstances.

2.6 Required Disclosure. If Recipient is required by applicable law, regulation, court order, or valid legal process to disclose any Confidential Information, Recipient shall (to the extent legally permitted) (a) provide Discloser with prompt written notice of such requirement, (b) reasonably cooperate with Discloser (at Discloser's expense) in seeking a protective order or other appropriate remedy, and (c) disclose only that portion of the Confidential Information that Recipient is legally required to disclose.

2.7 Compliance with Law. Recipient shall comply with all applicable UK laws and regulations in its handling of Confidential Information, including any applicable export control laws.

2.8 UK Common Law Duty of Confidence. The Parties acknowledge that this Agreement supplements and does not derogate from the common law duty of confidence recognised under English law. Nothing in this Agreement shall limit Discloser's rights under the common law or the Trade Secrets (Enforcement, etc.) Regulations 2018.`,
      type: "standard",
      order: 2
    },
    {
      id: "exclusions",
      title: "3. EXCLUSIONS FROM CONFIDENTIAL INFORMATION",
      content: `3.1 Excluded Information. Confidential Information does not include information that Recipient can demonstrate by competent written records:

(a) was publicly known and made generally available through no breach of this Agreement by Recipient at the time of disclosure;
(b) becomes publicly known and made generally available after disclosure through no breach of this Agreement by Recipient;
(c) was already in Recipient's lawful possession without restriction on use or disclosure at the time of disclosure by Discloser;
(d) is obtained by Recipient from a third party who had the lawful right to disclose such information and who did not disclose it in breach of any confidentiality obligation to Discloser; or
(e) is independently developed by Recipient without use of or reference to Discloser's Confidential Information.

3.2 Residual Knowledge. Nothing in this Agreement grants Recipient the right to use Discloser's Confidential Information. However, Recipient shall not be liable for use of information retained in the unaided memory of Recipient's personnel who had access to Confidential Information, solely to the extent such use does not involve (i) deliberate memorisation of Confidential Information for an unauthorised purpose, (ii) use or disclosure of trade secrets in violation of applicable law, or (iii) use of any tangible or electronic copies, notes, or other embodiments of Confidential Information.

3.3 No Implied Licence. For clarity, exclusions do not create any licence or other right to use Discloser's Confidential Information beyond the Permitted Purpose.`,
      type: "standard",
      order: 3
    },
    {
      id: "term_duration",
      title: "4. TERM AND DURATION",
      content: `4.1 Term. This Agreement begins on the Effective Date and continues until the earlier of: (a) {{expiration_date}}, or (b) termination by either Party upon written notice to the other Party with at least {{notice_period}} days' prior notice.

4.2 Duration of Confidentiality Obligations. Recipient's obligations of non-disclosure and restricted use with respect to Confidential Information will continue for {{confidentiality_period}} years from the date of each disclosure.

4.3 Trade Secrets. Notwithstanding Section 4.2, to the extent any Confidential Information constitutes a trade secret under the Trade Secrets (Enforcement, etc.) Regulations 2018 or English common law, Recipient's obligations under this Agreement as to such trade secret will continue for so long as such information remains a trade secret under applicable law.

4.4 Survival. Clauses 1 (Definitions), 2 (Confidentiality Obligations), 3 (Exclusions), 4 (Term and Duration), 5 (Return/Destruction), 6 (Remedies), 7 (Governing Law; Jurisdiction), and 8 (General Provisions) survive any expiration or termination of this Agreement according to their terms.`,
      type: "standard",
      order: 4
    },
    {
      id: "return_of_information",
      title: "5. RETURN OR DESTRUCTION OF INFORMATION",
      content: `5.1 Return/Destruction Upon Request or Termination. Upon Discloser's written request and/or upon termination or expiration of this Agreement, Recipient shall promptly (and in any event within a reasonable time) return to Discloser or destroy (at Discloser's option) all Confidential Information in Recipient's possession or control, including all copies, excerpts, and summaries, whether in written, electronic, or other form.

5.2 Certification. Upon Discloser's written request, Recipient shall provide a written certification of an authorised representative confirming return or destruction of Confidential Information.

5.3 Backup and Archival Copies. Notwithstanding the foregoing, Recipient may retain copies of Confidential Information (a) solely to the extent automatically stored in routine backup or archival systems in accordance with Recipient's standard policies, and/or (b) as required to comply with applicable law, regulation, or bona fide internal compliance policies, provided that (i) such retained information remains subject to this Agreement, (ii) Recipient does not access it except as required for compliance or legal purposes, and (iii) Recipient continues to protect it in accordance with this Agreement.

5.4 No Obligation to Disclose. Discloser has no obligation to disclose any information under this Agreement, and neither Party is obligated to proceed with any transaction or relationship related to the Purpose.`,
      type: "standard",
      order: 5
    },
    {
      id: "remedies",
      title: "6. REMEDIES",
      content: `6.1 Injunctive Relief. Recipient acknowledges that unauthorised use or disclosure of Confidential Information may cause Discloser irreparable harm for which damages may be an inadequate remedy. Accordingly, in the event of any actual or threatened breach of this Agreement, Discloser shall be entitled to seek injunctive or other equitable relief from any court of competent jurisdiction, in addition to any other rights and remedies available at law or in equity.

6.2 Trade Secrets Regulations Remedies. Nothing in this Agreement limits any rights or remedies available to Discloser under the Trade Secrets (Enforcement, etc.) Regulations 2018, including the right to seek interim and final injunctions, damages, delivery up or destruction of infringing goods, and publication of the judgment.

6.3 Undertaking as to Damages. The Parties acknowledge that Discloser may be required to give an undertaking as to damages when seeking interim injunctive relief, in accordance with standard English court practice.

6.4 Legal Costs. Each Party shall bear its own legal costs in connection with any dispute arising out of this Agreement, subject to the court's discretion to order costs in accordance with the Civil Procedure Rules.

6.5 Limitation of Liability. Nothing in this Agreement limits liability for (a) misuse of trade secrets, (b) fraud or fraudulent misrepresentation, (c) wilful misconduct, or (d) any liability which cannot be limited or excluded by law.`,
      type: "optional",
      order: 6
    },
    {
      id: "governing_law",
      title: "7. GOVERNING LAW AND JURISDICTION",
      content: `7.1 Governing Law. This Agreement and any dispute or claim (including non-contractual disputes or claims) arising out of or in connection with it or its subject matter or formation shall be governed by and construed in accordance with the laws of England and Wales.

7.2 Jurisdiction. Each Party irrevocably agrees that the courts of England and Wales shall have exclusive jurisdiction to settle any dispute or claim (including non-contractual disputes or claims) arising out of or in connection with this Agreement or its subject matter or formation.

7.3 Equitable Relief. Notwithstanding Clause 7.2, Discloser may seek interim injunctive or other equitable relief in any court of competent jurisdiction to protect its Confidential Information pending final determination of the dispute.

7.4 Service of Process. Any claim form, particulars of claim, or other document in legal proceedings may be served on a Party by being delivered to the address set out in Clause 8.5 (Notices) or such other address as may be notified in writing by that Party.`,
      type: "standard",
      order: 7
    },
    {
      id: "general_provisions",
      title: "8. GENERAL PROVISIONS",
      content: `8.1 No Licence; Ownership. All Confidential Information remains the property of Discloser. No licence or other rights are granted to Recipient by this Agreement, whether by implication, estoppel, or otherwise, except the limited right to use Confidential Information solely for the Permitted Purpose.

8.2 No Warranty. All Confidential Information is provided "AS IS." Discloser makes no representation or warranty, express or implied, as to the accuracy, completeness, or fitness for purpose of the Confidential Information, and Discloser shall have no liability to Recipient resulting from Recipient's use of Confidential Information, except as may not be excluded under applicable law.

8.3 No Obligation to Enter Transaction. Nothing in this Agreement obligates either Party to enter into any agreement or business relationship, or to proceed with any proposed transaction, and either Party may cease discussions at any time.

8.4 Assignment. Recipient may not assign or transfer this Agreement, in whole or in part, without Discloser's prior written consent. Any attempted assignment in violation of this Clause is void. Discloser may assign this Agreement to a successor in connection with a merger, acquisition, reorganisation, or sale of substantially all of its assets.

8.5 Notices. All notices under this Agreement must be in writing and will be deemed given when delivered personally, sent by confirmed email, or sent by first class post or recorded delivery, to the contacts below (or to such other address a Party designates by notice):

If to Discloser:
{{party_a_company}}
Attn: {{party_a_name}}, {{party_a_title}}
{{party_a_address}}
Email: {{party_a_email}}

If to Recipient:
{{party_b_company}}
Attn: {{party_b_name}}, {{party_b_title}}
{{party_b_address}}
Email: {{party_b_email}}

8.6 Entire Agreement. This Agreement constitutes the entire agreement between the Parties regarding its subject matter and supersedes all prior agreements, understandings, and communications, whether written or oral, relating to such subject matter. Each Party acknowledges that it has not relied on any representation, warranty, or undertaking not expressly set out in this Agreement.

8.7 Variation. No variation of this Agreement shall be effective unless it is in writing and signed by or on behalf of both Parties.

8.8 Waiver. No failure or delay by a Party to exercise any right or remedy under this Agreement shall constitute a waiver of that right or remedy. A waiver of any breach shall not constitute a waiver of any subsequent breach.

8.9 Severability. If any provision of this Agreement is or becomes invalid, illegal, or unenforceable, it shall be deemed modified to the minimum extent necessary to make it valid, legal, and enforceable. If such modification is not possible, the relevant provision shall be deemed deleted. Any modification or deletion shall not affect the validity and enforceability of the remaining provisions.

8.10 Third Party Rights. This Agreement does not confer any rights on any person or party (other than the Parties and their permitted assigns) pursuant to the Contracts (Rights of Third Parties) Act 1999 or otherwise.

8.11 Counterparts. This Agreement may be executed in counterparts, each of which shall be deemed an original and all of which together shall constitute one instrument.

8.12 Electronic Signatures. This Agreement may be executed by electronic signature, which shall be deemed original for all purposes. The Parties agree that electronic signatures are valid and binding in accordance with the Electronic Communications Act 2000 and the eIDAS Regulation (as retained in UK law).

8.13 UK GDPR and Data Protection. To the extent Confidential Information includes Personal Data:

(a) Recipient shall process such Personal Data only for the Permitted Purpose and in compliance with the UK GDPR and the Data Protection Act 2018;
(b) Recipient shall implement appropriate technical and organisational measures to ensure a level of security appropriate to the risk, including protection against accidental or unlawful destruction, loss, alteration, unauthorised disclosure of, or access to Personal Data;
(c) Recipient shall notify Discloser without undue delay upon becoming aware of any Personal Data breach (as defined in UK GDPR) involving Confidential Information;
(d) Recipient shall not transfer Personal Data outside the United Kingdom unless adequate safeguards are in place in accordance with Chapter V of UK GDPR;
(e) Recipient shall assist Discloser reasonably with any data subject requests to the extent related to Recipient's processing of Personal Data;
(f) This Clause does not expand Recipient's access rights beyond those granted elsewhere in this Agreement.

8.14 Publicity. Recipient shall not issue press releases or public statements regarding the Purpose or the existence of this Agreement without Discloser's prior written consent, except as required by law.

8.15 Construction. This Agreement shall be construed without regard to any presumption or rule requiring construction or interpretation against the Party drafting or causing any instrument to be drafted.

8.16 Confidential Relationship. Recipient acknowledges that receipt of Confidential Information creates a relationship of confidence and a duty to protect such information consistent with this Agreement and applicable English law.`,
      type: "standard",
      order: 8
    }
  ],
  signature_block: `IN WITNESS WHEREOF, the Parties have executed this Agreement as of {{signature_date}}.

DISCLOSER (PARTY A):
{{party_a_company}}

Signed: ________________________________
Name: {{party_a_name}}
Title: {{party_a_title}}
Email: {{party_a_email}}
Address: {{party_a_address}}
Date: {{signature_date}}

RECIPIENT (PARTY B):
{{party_b_company}}

Signed: ________________________________
Name: {{party_b_name}}
Title: {{party_b_title}}
Email: {{party_b_email}}
Address: {{party_b_address}}
Date: {{signature_date}}`,
  placeholders: commonPlaceholders,
  is_active: true,
  metadata: {
    generator_version: "manual-jurisdiction",
    jurisdiction_specific: true,
    based_on: "nda_one_way_us_california",
    generated_at: new Date().toISOString(),
    legal_references: [
      "Trade Secrets (Enforcement, etc.) Regulations 2018 (SI 2018/597)",
      "UK General Data Protection Regulation (UK GDPR)",
      "Data Protection Act 2018",
      "Contracts (Rights of Third Parties) Act 1999",
      "Electronic Communications Act 2000",
      "eIDAS Regulation (as retained in UK law)",
      "English common law duty of confidence"
    ]
  }
};

// ============================================================================
// Main Insert Function
// ============================================================================

const templates = [texasNdaOneWay, newYorkNdaOneWay, ukNdaOneWay];

async function main() {
  console.log("\n📥 Inserting NDA One-Way templates for TX, NY, and UK...\n");

  for (const template of templates) {
    console.log(`Inserting: ${template.title}...`);

    const { data, error } = await supabase
      .from("contract_templates")
      .insert({
        contract_type: template.contract_type,
        jurisdiction: template.jurisdiction,
        version: template.version,
        title: template.title,
        preamble: template.preamble,
        recitals: template.recitals,
        clauses: template.clauses,
        signature_block: template.signature_block,
        placeholders: template.placeholders,
        is_active: template.is_active,
        metadata: template.metadata,
      })
      .select()
      .single();

    if (error) {
      console.error(`  ❌ Error: ${error.message}`);
    } else {
      console.log(`  ✅ Inserted with ID: ${data.id}`);
    }
  }

  console.log("\n✨ Done!\n");
}

main().catch(console.error);
