/**
 * Seed Templates Script
 *
 * Creates high-quality contract templates with proper placeholders.
 * Run with: bun run scripts/seed-templates.ts
 */

import { createClient } from "@supabase/supabase-js";

const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL!;
const supabaseServiceKey = process.env.SUPABASE_SERVICE_ROLE_KEY!;

if (!supabaseUrl || !supabaseServiceKey) {
  console.error("Missing NEXT_PUBLIC_SUPABASE_URL or SUPABASE_SERVICE_ROLE_KEY");
  process.exit(1);
}

const supabase = createClient(supabaseUrl, supabaseServiceKey);

interface TemplateContent {
  preamble: string;
  recitals: string;
  clauses: Array<{
    id: string;
    title: string;
    content: string;
    type: "standard" | "negotiable" | "optional";
    order: number;
  }>;
  signatureBlock: string;
}

interface SeedTemplate {
  name: string;
  description: string;
  type: string;
  jurisdiction: string;
  content: TemplateContent;
  is_public: boolean;
}

// ============================================================================
// Mutual NDA Template - California
// ============================================================================
const mutualNdaCalifornia: SeedTemplate = {
  name: "Mutual Non-Disclosure Agreement",
  description: "A comprehensive mutual NDA for protecting confidential information exchanged between two parties. Ideal for business discussions, partnerships, and due diligence.",
  type: "nda_mutual",
  jurisdiction: "us_california",
  is_public: true,
  content: {
    preamble: `This Mutual Non-Disclosure Agreement ("Agreement") is entered into as of {{effective_date}} by and between:

{{party_a_name}}, {{party_a_title}} of {{party_a_company}}, with a principal place of business at {{party_a_address}} ("Party A"); and

{{party_b_name}}, {{party_b_title}} of {{party_b_company}}, with a principal place of business at {{party_b_address}} ("Party B").

Party A and Party B are collectively referred to as the "Parties" and individually as a "Party."`,

    recitals: `WHEREAS, the Parties wish to explore a potential business relationship regarding {{purpose}} (the "Purpose"); and

WHEREAS, in connection with the Purpose, each Party may disclose to the other certain confidential and proprietary information; and

WHEREAS, the Parties desire to protect such confidential information from unauthorized use and disclosure;

NOW, THEREFORE, in consideration of the mutual covenants and agreements contained herein, and for other good and valuable consideration, the receipt and sufficiency of which are hereby acknowledged, the Parties agree as follows:`,

    clauses: [
      {
        id: "definitions",
        title: "1. DEFINITIONS",
        content: `1.1 "Confidential Information" means any and all non-public information, in any form or medium, whether written, oral, electronic, or visual, that is disclosed by one Party (the "Disclosing Party") to the other Party (the "Receiving Party"), including but not limited to:

(a) Trade secrets, inventions, ideas, processes, formulas, source code, and object code;
(b) Product specifications, designs, documents, and data;
(c) Business and marketing plans, strategies, and forecasts;
(d) Financial information, pricing, and customer lists;
(e) Any information that is marked or identified as "confidential" or "proprietary"; and
(f) Any information that a reasonable person would understand to be confidential given the nature of the information and circumstances of disclosure.

1.2 Confidential Information does not include information that:
(a) Is or becomes publicly available through no fault of the Receiving Party;
(b) Was rightfully in the Receiving Party's possession prior to disclosure;
(c) Is rightfully obtained by the Receiving Party from a third party without restriction;
(d) Is independently developed by the Receiving Party without use of the Confidential Information; or
(e) Is required to be disclosed by law, regulation, or court order, provided the Receiving Party gives prompt notice to the Disclosing Party.`,
        type: "standard",
        order: 1,
      },
      {
        id: "obligations",
        title: "2. OBLIGATIONS OF RECEIVING PARTY",
        content: `2.1 The Receiving Party agrees to:
(a) Hold all Confidential Information in strict confidence;
(b) Use the Confidential Information solely for the Purpose;
(c) Not disclose any Confidential Information to any third party without the prior written consent of the Disclosing Party;
(d) Limit access to Confidential Information to those employees, agents, and contractors who have a need to know and who are bound by confidentiality obligations at least as protective as those contained herein;
(e) Use at least the same degree of care to protect the Confidential Information as it uses to protect its own confidential information, but in no event less than reasonable care; and
(f) Promptly notify the Disclosing Party of any unauthorized use or disclosure of Confidential Information.

2.2 The Receiving Party shall be responsible for any breach of this Agreement by its employees, agents, or contractors.`,
        type: "standard",
        order: 2,
      },
      {
        id: "term",
        title: "3. TERM AND TERMINATION",
        content: `3.1 This Agreement shall commence on the Effective Date and shall continue for a period of {{term_length}} unless earlier terminated by either Party upon {{notice_period}} written notice to the other Party.

3.2 The obligations of confidentiality set forth in this Agreement shall survive termination and shall remain in effect for a period of {{confidentiality_period}} from the date of termination or expiration of this Agreement.

3.3 Upon termination or expiration of this Agreement, or upon request by the Disclosing Party, the Receiving Party shall promptly return or destroy all Confidential Information and any copies thereof, and shall certify in writing that it has done so.`,
        type: "negotiable",
        order: 3,
      },
      {
        id: "no_license",
        title: "4. NO LICENSE OR WARRANTY",
        content: `4.1 Nothing in this Agreement shall be construed as granting any rights, by license or otherwise, to any Confidential Information, or to any patent, copyright, trademark, or other intellectual property right.

4.2 ALL CONFIDENTIAL INFORMATION IS PROVIDED "AS IS." THE DISCLOSING PARTY MAKES NO WARRANTIES, EXPRESS OR IMPLIED, INCLUDING BUT NOT LIMITED TO WARRANTIES OF MERCHANTABILITY, FITNESS FOR A PARTICULAR PURPOSE, OR NON-INFRINGEMENT.`,
        type: "standard",
        order: 4,
      },
      {
        id: "remedies",
        title: "5. REMEDIES",
        content: `5.1 The Parties acknowledge that any breach of this Agreement may cause irreparable harm to the Disclosing Party for which monetary damages may be inadequate. Accordingly, the Disclosing Party shall be entitled to seek equitable relief, including injunction and specific performance, in addition to any other remedies available at law or in equity.

5.2 The prevailing Party in any action to enforce this Agreement shall be entitled to recover reasonable attorneys' fees and costs.`,
        type: "standard",
        order: 5,
      },
      {
        id: "governing_law",
        title: "6. GOVERNING LAW AND DISPUTE RESOLUTION",
        content: `6.1 This Agreement shall be governed by and construed in accordance with the laws of the State of California, without regard to its conflicts of law principles.

6.2 Any dispute arising out of or relating to this Agreement shall be resolved through binding arbitration in accordance with the rules of JAMS, with the arbitration to be held in {{governing_jurisdiction}}. The decision of the arbitrator shall be final and binding, and judgment on the award may be entered in any court of competent jurisdiction.

6.3 Notwithstanding the foregoing, either Party may seek injunctive or other equitable relief in any court of competent jurisdiction.`,
        type: "standard",
        order: 6,
      },
      {
        id: "miscellaneous",
        title: "7. MISCELLANEOUS",
        content: `7.1 Entire Agreement. This Agreement constitutes the entire agreement between the Parties concerning the subject matter hereof and supersedes all prior agreements, understandings, negotiations, and discussions, whether oral or written.

7.2 Amendment. This Agreement may not be amended except by a written instrument signed by both Parties.

7.3 Waiver. No waiver of any provision of this Agreement shall be effective unless in writing and signed by the waiving Party.

7.4 Severability. If any provision of this Agreement is held to be invalid or unenforceable, the remaining provisions shall continue in full force and effect.

7.5 Assignment. Neither Party may assign this Agreement without the prior written consent of the other Party.

7.6 Counterparts. This Agreement may be executed in counterparts, each of which shall be deemed an original and all of which together shall constitute one and the same instrument.

7.7 Notices. All notices under this Agreement shall be in writing and shall be deemed given when delivered personally, sent by confirmed email, or sent by certified mail, return receipt requested, to the addresses set forth above.`,
        type: "standard",
        order: 7,
      },
    ],
    signatureBlock: `IN WITNESS WHEREOF, the Parties have executed this Agreement as of the date first written above.

PARTY A:
{{party_a_company}}

Signature: ____________________
Printed Name: {{party_a_name}}
Title: {{party_a_title}}
Date: ____________________

PARTY B:
{{party_b_company}}

Signature: ____________________
Printed Name: {{party_b_name}}
Title: {{party_b_title}}
Date: ____________________`,
  },
};

// ============================================================================
// Independent Contractor Agreement - California
// ============================================================================
const contractorAgreementCalifornia: SeedTemplate = {
  name: "Independent Contractor Agreement",
  description: "A comprehensive agreement for engaging independent contractors. Includes scope of work, payment terms, IP assignment, and California-specific compliance provisions.",
  type: "independent_contractor",
  jurisdiction: "us_california",
  is_public: true,
  content: {
    preamble: `This Independent Contractor Agreement ("Agreement") is entered into as of {{effective_date}} by and between:

{{party_a_name}}, {{party_a_title}} of {{party_a_company}}, with a principal place of business at {{party_a_address}} (the "Company"); and

{{party_b_name}}, an independent contractor with a principal place of business at {{party_b_address}} (the "Contractor").

The Company and Contractor are collectively referred to as the "Parties" and individually as a "Party."`,

    recitals: `WHEREAS, the Company desires to engage the Contractor to perform certain services as described herein; and

WHEREAS, the Contractor represents that they possess the skills, qualifications, and experience necessary to perform such services; and

WHEREAS, the Parties wish to establish the terms and conditions of the Contractor's engagement;

NOW, THEREFORE, in consideration of the mutual covenants and agreements contained herein, the Parties agree as follows:`,

    clauses: [
      {
        id: "services",
        title: "1. SERVICES",
        content: `1.1 Scope of Services. The Contractor agrees to perform the following services for the Company (the "Services"):

{{scope_of_work}}

1.2 Deliverables. The Contractor shall provide the following deliverables:
{{deliverables}}

1.3 Standards. The Contractor shall perform the Services in a professional and workmanlike manner, consistent with industry standards and the Company's reasonable requirements.

1.4 Changes. Any material changes to the scope of Services must be agreed upon in writing by both Parties.`,
        type: "standard",
        order: 1,
      },
      {
        id: "term",
        title: "2. TERM AND TERMINATION",
        content: `2.1 Term. This Agreement shall commence on {{effective_date}} and shall continue until {{end_date}}, unless earlier terminated in accordance with this Section.

2.2 Termination for Convenience. Either Party may terminate this Agreement at any time upon {{notice_period}} written notice to the other Party.

2.3 Termination for Cause. Either Party may terminate this Agreement immediately upon written notice if the other Party materially breaches this Agreement and fails to cure such breach within {{cure_period}} after receiving written notice thereof.

2.4 Effect of Termination. Upon termination:
(a) The Contractor shall immediately cease all work and return all Company materials;
(b) The Company shall pay the Contractor for all Services satisfactorily performed through the date of termination;
(c) The provisions of Sections 5, 6, 7, and 8 shall survive termination.`,
        type: "standard",
        order: 2,
      },
      {
        id: "compensation",
        title: "3. COMPENSATION",
        content: `3.1 Rate. The Company shall pay the Contractor at the rate of {{hourly_rate}} per hour / {{payment_amount}} for the Services (select as applicable).

3.2 Invoices. The Contractor shall submit invoices on a {{payment_schedule}} basis. Each invoice shall include a detailed description of the Services performed and time spent.

3.3 Payment. The Company shall pay all undisputed invoices within {{payment_terms}} of receipt.

3.4 Expenses. The Company shall reimburse the Contractor for pre-approved, reasonable expenses incurred in performing the Services, provided the Contractor submits appropriate documentation.

3.5 Taxes. The Contractor is solely responsible for all taxes arising from compensation received under this Agreement. The Company will not withhold any taxes from payments to the Contractor.`,
        type: "negotiable",
        order: 3,
      },
      {
        id: "relationship",
        title: "4. INDEPENDENT CONTRACTOR RELATIONSHIP",
        content: `4.1 Status. The Contractor is an independent contractor and not an employee, agent, joint venturer, or partner of the Company. Nothing in this Agreement shall be construed to create an employment relationship.

4.2 Control. The Contractor shall have sole control over the manner, method, and means of performing the Services, subject to the Company's general direction regarding the desired results.

4.3 No Benefits. The Contractor is not entitled to any employee benefits from the Company, including but not limited to health insurance, retirement benefits, paid time off, or workers' compensation.

4.4 California ABC Test Compliance. The Parties acknowledge that the Contractor's classification as an independent contractor is intended to comply with California Labor Code Section 2750.3 (AB5) and the ABC test. The Contractor represents and warrants that:
(a) The Contractor is free from the control and direction of the Company in performing the Services;
(b) The Contractor performs work outside the usual course of the Company's business; and
(c) The Contractor is customarily engaged in an independently established trade, occupation, or business of the same nature as the Services.`,
        type: "standard",
        order: 4,
      },
      {
        id: "ip",
        title: "5. INTELLECTUAL PROPERTY",
        content: `5.1 Work Product. All work product, inventions, discoveries, developments, improvements, and materials created by the Contractor in connection with the Services ("Work Product") shall be the sole and exclusive property of the Company.

5.2 Assignment. The Contractor hereby irrevocably assigns to the Company all right, title, and interest in and to the Work Product, including all intellectual property rights therein.

5.3 Waiver of Moral Rights. To the extent permitted by law, the Contractor waives any moral rights in the Work Product.

5.4 Further Assurances. The Contractor agrees to execute any documents and take any actions reasonably requested by the Company to perfect, register, or enforce the Company's rights in the Work Product.

5.5 Pre-Existing Materials. Any pre-existing materials owned by the Contractor and incorporated into the Work Product shall be identified in writing. The Contractor grants the Company a perpetual, royalty-free license to use such pre-existing materials as part of the Work Product.`,
        type: "standard",
        order: 5,
      },
      {
        id: "confidentiality",
        title: "6. CONFIDENTIALITY",
        content: `6.1 Confidential Information. The Contractor acknowledges that in performing the Services, the Contractor may have access to confidential and proprietary information of the Company ("Confidential Information").

6.2 Obligations. The Contractor agrees to:
(a) Hold all Confidential Information in strict confidence;
(b) Use Confidential Information solely for the purpose of performing the Services;
(c) Not disclose Confidential Information to any third party without the Company's prior written consent;
(d) Return or destroy all Confidential Information upon termination of this Agreement.

6.3 Survival. The obligations of confidentiality shall survive termination of this Agreement for a period of {{confidentiality_period}}.`,
        type: "standard",
        order: 6,
      },
      {
        id: "representations",
        title: "7. REPRESENTATIONS AND WARRANTIES",
        content: `7.1 Contractor Representations. The Contractor represents and warrants that:
(a) The Contractor has the right and authority to enter into this Agreement;
(b) The Services will be performed in a professional manner consistent with industry standards;
(c) The Work Product will be original and will not infringe any third-party rights;
(d) The Contractor has all licenses and permits required to perform the Services;
(e) The Contractor will comply with all applicable laws in performing the Services.

7.2 Indemnification. The Contractor shall indemnify, defend, and hold harmless the Company from any claims, damages, losses, and expenses arising from:
(a) The Contractor's breach of this Agreement;
(b) The Contractor's negligence or willful misconduct;
(c) Any claim that the Work Product infringes third-party rights.`,
        type: "standard",
        order: 7,
      },
      {
        id: "general",
        title: "8. GENERAL PROVISIONS",
        content: `8.1 Governing Law. This Agreement shall be governed by and construed in accordance with the laws of the State of California, without regard to conflicts of law principles.

8.2 Dispute Resolution. Any dispute arising under this Agreement shall be resolved through binding arbitration in {{governing_jurisdiction}} in accordance with JAMS rules.

8.3 Entire Agreement. This Agreement constitutes the entire agreement between the Parties and supersedes all prior agreements and understandings.

8.4 Amendment. This Agreement may only be amended in writing signed by both Parties.

8.5 Severability. If any provision is found unenforceable, the remaining provisions shall continue in effect.

8.6 Assignment. The Contractor may not assign this Agreement without the Company's prior written consent.

8.7 Notices. All notices shall be in writing and sent to the addresses set forth above.`,
        type: "standard",
        order: 8,
      },
    ],
    signatureBlock: `IN WITNESS WHEREOF, the Parties have executed this Agreement as of the date first written above.

COMPANY:
{{party_a_company}}

Signature: ____________________
Printed Name: {{party_a_name}}
Title: {{party_a_title}}
Date: ____________________

CONTRACTOR:

Signature: ____________________
Printed Name: {{party_b_name}}
Date: ____________________`,
  },
};

// ============================================================================
// Consulting Agreement - California
// ============================================================================
const consultingAgreementCalifornia: SeedTemplate = {
  name: "Consulting Agreement",
  description: "A professional consulting agreement for advisory and consulting services. Includes detailed scope of work, deliverables, and intellectual property provisions.",
  type: "consulting_agreement",
  jurisdiction: "us_california",
  is_public: true,
  content: {
    preamble: `This Consulting Agreement ("Agreement") is entered into as of {{effective_date}} by and between:

{{party_a_name}}, {{party_a_title}} of {{party_a_company}}, with a principal place of business at {{party_a_address}} (the "Client"); and

{{party_b_name}}, {{party_b_title}} of {{party_b_company}}, with a principal place of business at {{party_b_address}} (the "Consultant").

The Client and Consultant are collectively referred to as the "Parties" and individually as a "Party."`,

    recitals: `WHEREAS, the Client desires to engage the Consultant to provide certain consulting services; and

WHEREAS, the Consultant has expertise in the relevant field and is willing to provide such services; and

WHEREAS, the Parties wish to set forth the terms and conditions of this engagement;

NOW, THEREFORE, in consideration of the mutual covenants contained herein, the Parties agree as follows:`,

    clauses: [
      {
        id: "engagement",
        title: "1. ENGAGEMENT AND SERVICES",
        content: `1.1 Engagement. The Client hereby engages the Consultant, and the Consultant accepts such engagement, to provide consulting services as described in this Agreement.

1.2 Services. The Consultant shall provide the following consulting services (the "Services"):

{{scope_of_work}}

1.3 Deliverables. The Consultant shall provide the following deliverables:
{{deliverables}}

1.4 Performance Standards. The Consultant shall perform the Services:
(a) In a professional and competent manner consistent with industry best practices;
(b) In accordance with the Client's reasonable policies and procedures;
(c) In compliance with all applicable laws and regulations.`,
        type: "standard",
        order: 1,
      },
      {
        id: "term",
        title: "2. TERM",
        content: `2.1 Initial Term. This Agreement shall commence on {{effective_date}} and shall continue for an initial term of {{term_length}} (the "Initial Term").

2.2 Renewal. Upon expiration of the Initial Term, this Agreement shall automatically renew for successive {{renewal_term}} periods unless either Party provides written notice of non-renewal at least {{notice_period}} prior to the expiration of the then-current term.

2.3 Early Termination. Either Party may terminate this Agreement:
(a) For any reason upon {{notice_period}} prior written notice;
(b) Immediately upon written notice if the other Party materially breaches this Agreement and fails to cure within {{cure_period}} after receiving written notice.`,
        type: "negotiable",
        order: 2,
      },
      {
        id: "compensation",
        title: "3. COMPENSATION AND EXPENSES",
        content: `3.1 Fees. The Client shall pay the Consultant:
[ ] A fixed fee of {{payment_amount}} for the Services; OR
[ ] An hourly rate of {{hourly_rate}} per hour for time spent on the Services; OR
[ ] A monthly retainer of {{retainer_amount}} per month.

3.2 Invoicing. The Consultant shall submit invoices {{payment_schedule}}. Invoices shall include a description of Services performed and, if applicable, hours worked.

3.3 Payment Terms. The Client shall pay all undisputed amounts within {{payment_terms}} of receipt of invoice.

3.4 Expenses. The Client shall reimburse the Consultant for reasonable, pre-approved business expenses incurred in performing the Services. The Consultant shall provide receipts for all expenses over $50.

3.5 Late Payment. Overdue payments shall accrue interest at the rate of 1.5% per month or the maximum rate permitted by law, whichever is less.`,
        type: "negotiable",
        order: 3,
      },
      {
        id: "relationship",
        title: "4. INDEPENDENT CONTRACTOR STATUS",
        content: `4.1 Independent Contractor. The Consultant is an independent contractor and not an employee of the Client. The Consultant shall not be entitled to any employee benefits.

4.2 Taxes. The Consultant is solely responsible for payment of all taxes arising from compensation under this Agreement. The Client will report payments to the Consultant on IRS Form 1099.

4.3 No Authority. The Consultant has no authority to bind the Client or enter into agreements on behalf of the Client without prior written authorization.

4.4 Other Engagements. The Consultant may provide services to other clients, provided such engagements do not conflict with the Consultant's obligations under this Agreement.`,
        type: "standard",
        order: 4,
      },
      {
        id: "confidentiality",
        title: "5. CONFIDENTIALITY",
        content: `5.1 Definition. "Confidential Information" means all non-public information disclosed by the Client to the Consultant, including business plans, financial data, customer information, trade secrets, and any information marked as confidential.

5.2 Obligations. The Consultant agrees to:
(a) Maintain the confidentiality of all Confidential Information;
(b) Use Confidential Information only for purposes of performing the Services;
(c) Not disclose Confidential Information to any third party without prior written consent;
(d) Take reasonable precautions to prevent unauthorized disclosure.

5.3 Exceptions. These obligations do not apply to information that:
(a) Is or becomes publicly available through no fault of the Consultant;
(b) Was known to the Consultant prior to disclosure;
(c) Is independently developed by the Consultant without use of Confidential Information;
(d) Is required to be disclosed by law (with prompt notice to Client).

5.4 Duration. Confidentiality obligations survive termination for {{confidentiality_period}}.`,
        type: "standard",
        order: 5,
      },
      {
        id: "ip",
        title: "6. INTELLECTUAL PROPERTY",
        content: `6.1 Work Product. All deliverables, materials, and work product created by the Consultant in performing the Services ("Work Product") shall be the sole property of the Client.

6.2 Assignment. The Consultant hereby assigns to the Client all right, title, and interest in the Work Product, including all intellectual property rights.

6.3 Pre-Existing IP. The Consultant retains ownership of any pre-existing intellectual property. The Consultant grants the Client a perpetual, royalty-free license to use any pre-existing IP incorporated into the Work Product.

6.4 Cooperation. The Consultant agrees to execute any documents necessary to perfect the Client's rights in the Work Product.`,
        type: "standard",
        order: 6,
      },
      {
        id: "warranties",
        title: "7. REPRESENTATIONS AND WARRANTIES",
        content: `7.1 Consultant Warranties. The Consultant represents and warrants that:
(a) The Consultant has the skills and experience to perform the Services;
(b) The Services will be performed professionally and competently;
(c) The Work Product will be original and will not infringe third-party rights;
(d) The Consultant has authority to enter into this Agreement.

7.2 Client Warranties. The Client represents and warrants that:
(a) The Client has authority to enter into this Agreement;
(b) The Client will provide reasonable access and cooperation as needed for the Consultant to perform the Services.`,
        type: "standard",
        order: 7,
      },
      {
        id: "liability",
        title: "8. LIMITATION OF LIABILITY",
        content: `8.1 Cap on Liability. EXCEPT FOR BREACHES OF CONFIDENTIALITY, INFRINGEMENT OF INTELLECTUAL PROPERTY, OR GROSS NEGLIGENCE OR WILLFUL MISCONDUCT, NEITHER PARTY'S TOTAL LIABILITY UNDER THIS AGREEMENT SHALL EXCEED THE FEES PAID OR PAYABLE UNDER THIS AGREEMENT DURING THE TWELVE (12) MONTHS PRECEDING THE CLAIM.

8.2 Consequential Damages. NEITHER PARTY SHALL BE LIABLE FOR ANY INDIRECT, INCIDENTAL, SPECIAL, CONSEQUENTIAL, OR PUNITIVE DAMAGES, EVEN IF ADVISED OF THE POSSIBILITY OF SUCH DAMAGES.

8.3 Indemnification. The Consultant shall indemnify and hold harmless the Client from claims arising from the Consultant's breach of this Agreement or negligent performance of the Services.`,
        type: "negotiable",
        order: 8,
      },
      {
        id: "general",
        title: "9. GENERAL PROVISIONS",
        content: `9.1 Governing Law. This Agreement is governed by the laws of the State of California.

9.2 Dispute Resolution. Disputes shall be resolved through binding arbitration in {{governing_jurisdiction}}.

9.3 Entire Agreement. This Agreement constitutes the entire agreement between the Parties.

9.4 Amendments. Amendments must be in writing signed by both Parties.

9.5 Severability. Invalid provisions shall be modified to be enforceable; remaining provisions continue in effect.

9.6 Waiver. Failure to enforce any provision is not a waiver of future enforcement.

9.7 Assignment. Neither Party may assign this Agreement without prior written consent.

9.8 Notices. Notices shall be sent to the addresses above via email or certified mail.

9.9 Counterparts. This Agreement may be signed in counterparts.`,
        type: "standard",
        order: 9,
      },
    ],
    signatureBlock: `IN WITNESS WHEREOF, the Parties have executed this Agreement as of the date first written above.

CLIENT:
{{party_a_company}}

Signature: ____________________
Printed Name: {{party_a_name}}
Title: {{party_a_title}}
Date: ____________________

CONSULTANT:
{{party_b_company}}

Signature: ____________________
Printed Name: {{party_b_name}}
Title: {{party_b_title}}
Date: ____________________`,
  },
};

// ============================================================================
// One-Way NDA Template - California
// ============================================================================
const oneWayNdaCalifornia: SeedTemplate = {
  name: "One-Way Non-Disclosure Agreement",
  description: "A one-way NDA where only one party discloses confidential information. Ideal for sharing proprietary information with potential investors, employees, or vendors.",
  type: "nda_one_way",
  jurisdiction: "us_california",
  is_public: true,
  content: {
    preamble: `This Non-Disclosure Agreement ("Agreement") is entered into as of {{effective_date}} by and between:

{{party_a_name}}, {{party_a_title}} of {{party_a_company}}, with a principal place of business at {{party_a_address}} (the "Disclosing Party"); and

{{party_b_name}}, {{party_b_title}} of {{party_b_company}}, with a principal place of business at {{party_b_address}} (the "Receiving Party").`,

    recitals: `WHEREAS, the Disclosing Party possesses certain confidential and proprietary information relating to {{purpose}}; and

WHEREAS, the Disclosing Party desires to disclose such information to the Receiving Party for the purpose of {{purpose}}; and

WHEREAS, the Receiving Party agrees to receive such information and to hold it in confidence;

NOW, THEREFORE, in consideration of the disclosure of Confidential Information and other good and valuable consideration, the Parties agree as follows:`,

    clauses: [
      {
        id: "definitions",
        title: "1. CONFIDENTIAL INFORMATION",
        content: `1.1 "Confidential Information" means any and all information disclosed by the Disclosing Party to the Receiving Party, whether orally, in writing, or in any other form, including but not limited to:
(a) Business plans, strategies, and financial information;
(b) Technical data, trade secrets, and know-how;
(c) Product designs, specifications, and roadmaps;
(d) Customer lists, marketing plans, and pricing information;
(e) Any other information marked "Confidential" or disclosed under circumstances indicating its confidential nature.

1.2 Confidential Information does not include information that:
(a) Is or becomes publicly known through no breach by the Receiving Party;
(b) Was rightfully known by the Receiving Party prior to disclosure;
(c) Is rightfully received from a third party without confidentiality restrictions;
(d) Is independently developed without use of the Confidential Information;
(e) Is disclosed pursuant to a legal requirement, with prior notice to the Disclosing Party.`,
        type: "standard",
        order: 1,
      },
      {
        id: "obligations",
        title: "2. RECEIVING PARTY OBLIGATIONS",
        content: `2.1 The Receiving Party agrees to:
(a) Maintain the Confidential Information in strict confidence;
(b) Use the Confidential Information solely for the Purpose stated above;
(c) Not disclose the Confidential Information to any third party without prior written consent;
(d) Restrict access to the Confidential Information to those with a need to know who are bound by confidentiality obligations;
(e) Protect the Confidential Information using the same degree of care as it protects its own confidential information, but no less than reasonable care;
(f) Not copy, reproduce, or reverse engineer any Confidential Information without prior written consent.

2.2 The Receiving Party shall immediately notify the Disclosing Party upon discovery of any unauthorized use or disclosure of Confidential Information.`,
        type: "standard",
        order: 2,
      },
      {
        id: "term",
        title: "3. TERM",
        content: `3.1 This Agreement shall remain in effect for {{term_length}} from the Effective Date.

3.2 The Receiving Party's obligations with respect to Confidential Information shall survive termination or expiration of this Agreement for a period of {{confidentiality_period}}.

3.3 Upon termination or upon request by the Disclosing Party, the Receiving Party shall promptly return or destroy all Confidential Information and certify in writing that it has done so.`,
        type: "negotiable",
        order: 3,
      },
      {
        id: "ownership",
        title: "4. OWNERSHIP",
        content: `4.1 All Confidential Information remains the sole property of the Disclosing Party.

4.2 Nothing in this Agreement grants the Receiving Party any license or right in or to the Confidential Information except as expressly set forth herein.

4.3 The Disclosing Party makes no representation or warranty as to the accuracy or completeness of the Confidential Information.`,
        type: "standard",
        order: 4,
      },
      {
        id: "remedies",
        title: "5. REMEDIES",
        content: `5.1 The Receiving Party acknowledges that any breach of this Agreement may cause irreparable harm to the Disclosing Party for which monetary damages would be inadequate.

5.2 The Disclosing Party shall be entitled to seek injunctive relief, specific performance, or other equitable remedies, in addition to any other remedies available at law.

5.3 The prevailing party in any proceeding to enforce this Agreement shall be entitled to recover reasonable attorneys' fees and costs.`,
        type: "standard",
        order: 5,
      },
      {
        id: "general",
        title: "6. GENERAL PROVISIONS",
        content: `6.1 Governing Law. This Agreement shall be governed by the laws of the State of California.

6.2 Entire Agreement. This Agreement constitutes the entire agreement between the Parties regarding the subject matter hereof.

6.3 Amendment. This Agreement may only be modified by a written instrument signed by both Parties.

6.4 Severability. If any provision is held invalid, the remaining provisions shall continue in full force.

6.5 Assignment. The Receiving Party may not assign this Agreement without the Disclosing Party's prior written consent.

6.6 Waiver. Failure to enforce any provision shall not constitute a waiver of future enforcement.

6.7 Counterparts. This Agreement may be executed in counterparts.`,
        type: "standard",
        order: 6,
      },
    ],
    signatureBlock: `IN WITNESS WHEREOF, the Parties have executed this Agreement as of the date first written above.

DISCLOSING PARTY:
{{party_a_company}}

Signature: ____________________
Printed Name: {{party_a_name}}
Title: {{party_a_title}}
Date: ____________________

RECEIVING PARTY:
{{party_b_company}}

Signature: ____________________
Printed Name: {{party_b_name}}
Title: {{party_b_title}}
Date: ____________________`,
  },
};

// ============================================================================
// Main Seeding Function
// ============================================================================

const templates: SeedTemplate[] = [
  mutualNdaCalifornia,
  oneWayNdaCalifornia,
  contractorAgreementCalifornia,
  consultingAgreementCalifornia,
];

async function seedTemplates() {
  console.log("Starting template seeding...\n");

  for (const template of templates) {
    console.log(`Creating: ${template.name} (${template.jurisdiction})...`);

    const { data, error } = await supabase
      .from("templates")
      .insert({
        name: template.name,
        description: template.description,
        type: template.type,
        jurisdiction: template.jurisdiction,
        content: template.content,
        is_public: template.is_public,
        usage_count: 0,
        created_by_id: null, // System templates have no creator
      })
      .select()
      .single();

    if (error) {
      console.error(`  Error: ${error.message}`);
    } else {
      console.log(`  Created with ID: ${data.id}`);
    }
  }

  console.log("\nTemplate seeding complete!");
}

seedTemplates().catch(console.error);
