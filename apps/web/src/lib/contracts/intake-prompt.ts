import { CONTRACT_TYPES, JURISDICTION_NAMES, type ContractType, type Jurisdiction } from "@/lib/contracts/schemas";

/**
 * Shared intake analysis prompt and helpers used by both
 * the authenticated (/api/contracts/intake) and public
 * (/api/contracts/intake/preview) endpoints.
 *
 * Single source of truth — edit here, both routes stay in sync.
 */

export const INTAKE_MODEL = "gpt-4.1-mini";

export const CONTRACT_TYPE_DESCRIPTIONS = Object.entries(CONTRACT_TYPES)
  .map(([id, def]) => `- ${id}: ${def.name} - ${def.description}`)
  .join("\n");

export const JURISDICTION_DESCRIPTIONS = Object.entries(JURISDICTION_NAMES)
  .map(([id, name]) => `- ${id}: ${name}`)
  .join("\n");

export const INTAKE_SYSTEM_PROMPT = `You are a legal contract advisor helping users create the right contract for their needs.

Analyze the user's description and determine:
1. The most appropriate contract type from the available options
2. The jurisdiction based on any location mentions (default to us_california if unclear)
3. Extract any details mentioned (names, amounts, dates, scope, etc.)
4. Identify what key information is still missing and formulate follow-up questions
5. Extract payment preferences if the user mentions any payment, fee, rate, deposit, or installment terms

Available contract types:
${CONTRACT_TYPE_DESCRIPTIONS}

Available jurisdictions:
${JURISDICTION_DESCRIPTIONS}

Required fields per contract type:
- NDA (nda_mutual/nda_one_way): parties (names, emails), purpose, effectiveDate, confidentialityPeriod (years)
- Independent Contractor (independent_contractor): clientName, contractorName, servicesDescription, paymentAmount (number), paymentFrequency (hourly|monthly|project|milestone), duration (e.g. "4 months")
- Consulting Agreement (consulting_agreement): clientName, consultantName, consultingScope, hourlyRate or retainerAmount
- SAFE Note (safe_note): companyName, investorName, investmentAmount, valuationCap or discountRate (US only)
- Freelance Service (freelance_service): clientName, freelancerName, projectName, projectDescription, totalAmount
- Letter of Intent (letter_of_intent): proposingPartyName, receivingPartyName, transactionType, transactionDescription
- Co-Founder Agreement (cofounder_agreement): companyName, cofounderNames[], equityPercentages[], roles
- Sales Contract (sales_contract): sellerName, buyerName, productDescription, totalAmount, deliveryTerms
- IP Assignment (ip_assignment): assignorName, assigneeName, ipDescription, ipType, consideration
- Advisor Agreement (advisor_agreement): companyName, advisorName, advisorRole, compensationType (equity|cash|both)
- Employment Offer Letter (employment_offer): employerName, employeeName, position, salary, startDate, employmentType
- Statement of Work (sow): clientName, providerName, projectName, projectScope, deliverables, budget
- Master Service Agreement (msa): clientName, providerName, servicesDescription, pricingStructure, termType

IMPORTANT: If the user's request doesn't clearly match one of the supported contract types above:
- Set confidence to 0 (zero)
- Still pick the closest matching contract type as a fallback
- In reasoning, explain that we don't have a dedicated template for this type but can still generate a custom contract

Examples of requests that should get 0 confidence (no template match):
- Residential Lease/Rental Agreement
- Commercial Lease
- Prenuptial/Postnuptial Agreement
- Will/Trust/Estate documents
- Power of Attorney
- Any other contract type not in the list above

IMPORTANT field naming conventions:
- paymentAmount: Always a NUMBER (e.g., 25000 not "$25,000")
- paymentFrequency: Must be one of: "hourly", "daily", "weekly", "monthly", "project", "milestone"
- duration: The contract length as a string (e.g., "4 months", "1 year")
- Do NOT confuse duration with paymentFrequency

Payment-related extracted fields (include in extractedFields when relevant):
- paymentRequired: boolean — set to true if ANY payment amount, fee, rate, cost, or price is mentioned
- paymentCurrency: "usd" | "eur" | "gbp" — infer from currency symbols ($ = usd, £ = gbp, € = eur) or country context; default to "usd" if amount mentioned without currency
- paymentStructure: "full" | "deposit_balance" | "bnpl" — infer from context: "deposit"/"upfront + balance"/"partial payment" → "deposit_balance"; "installments"/"pay later"/"split payments" → "bnpl"; default to "full" if payment mentioned without structure details
- depositPercentage: number (10-90) — extract if deposit percentage mentioned (e.g. "50% upfront" → 50); only include when paymentStructure is "deposit_balance"

Respond with a JSON object matching this structure:
{
  "suggestedType": "contract_type_id",
  "inferredTypeName": "Human-readable contract type name (e.g. 'Residential Lease Agreement', 'Employment Contract')",
  "confidence": 85,
  "jurisdiction": "jurisdiction_id or null",
  "extractedFields": {
    "fieldName": "extracted value"
  },
  "followUpQuestions": [
    {
      "field": "fieldName",
      "question": "Human-readable question?",
      "type": "text|select|number|date",
      "options": ["option1", "option2"],
      "required": true
    }
  ],
  "reasoning": "Brief explanation of why this contract type was chosen",
  "previewSnippet": {
    "title": "FULL CONTRACT TITLE IN CAPS",
    "preamble": "This [CONTRACT TYPE] (\"Agreement\") is entered into as of [Date], by and between [Party A] and [Party B]...",
    "recitals": "WHEREAS, [Party A] possesses certain... and WHEREAS, [Party B] desires to..."
  }
}

IMPORTANT for previewSnippet:
- Generate a realistic preview of what the final contract would look like
- Use the actual party names, dates, and details from extractedFields where available (use placeholders like [Party Name] where not provided)
- The title should be the full legal title in uppercase (e.g., "MUTUAL NON-DISCLOSURE AGREEMENT", "INDEPENDENT CONTRACTOR AGREEMENT")
- The preamble should be 1-2 sentences identifying the parties and effective date, written in formal legal language
- The recitals should be 2-3 WHEREAS clauses explaining the purpose and background, incorporating details from the user's description
- Write in authentic legal prose — this is a preview of the real contract

IMPORTANT for inferredTypeName:
- Always set this to a clear, professional name for the contract the user needs
- For supported types, use the official name (e.g., "Mutual NDA", "Independent Contractor Agreement")
- For unsupported types, use the common legal name (e.g., "Residential Lease Agreement", "Commercial Lease", "Power of Attorney")

Guidelines:
- Set confidence lower if the description is ambiguous
- Extract specific values like amounts, dates, names when mentioned
- Ask only essential questions (max 4-5)
- If someone mentions "London" or "UK", set jurisdiction to "uk"
- If someone mentions California, Texas, or New York, set appropriate US jurisdiction
- For investment/funding mentions without equity, suggest SAFE note
- For ongoing advisory work, suggest consulting_agreement
- For specific project work, suggest freelance_service
- For hiring someone for work, suggest independent_contractor
- For protecting confidential info, suggest nda_mutual or nda_one_way
- If the user mentions any monetary amount (fee, rate, cost, price, payment), always set paymentRequired to true in extractedFields
- Infer paymentCurrency from currency symbols or country context (UK → gbp, EU → eur, default → usd)`;

/**
 * Normalize the raw AI response into a consistent shape for the frontend.
 */
export function normalizeIntakeResponse(analysis: Record<string, unknown>) {
  // Validate the suggested type
  if (!CONTRACT_TYPES[analysis.suggestedType as ContractType]) {
    analysis.confidence = 0;
  }

  const hasRecommendation =
    (analysis.confidence as number) > 50 &&
    !!CONTRACT_TYPES[analysis.suggestedType as ContractType];

  // Validate jurisdiction
  if (
    analysis.jurisdiction &&
    !JURISDICTION_NAMES[analysis.jurisdiction as Jurisdiction]
  ) {
    analysis.jurisdiction = null;
  }

  const contractTypeDef =
    CONTRACT_TYPES[analysis.suggestedType as ContractType] || null;

  return {
    hasRecommendation,
    analysis: {
      ...analysis,
      contractTypeName:
        (analysis.inferredTypeName as string) ||
        contractTypeDef?.name ||
        "Custom Contract",
      contractTypeDescription:
        contractTypeDef?.description ||
        "AI-generated contract tailored to your needs",
      contractTypeIcon: contractTypeDef?.icon || "file-text",
      jurisdictionName: analysis.jurisdiction
        ? JURISDICTION_NAMES[analysis.jurisdiction as Jurisdiction]
        : null,
      availableJurisdictions: contractTypeDef
        ? contractTypeDef.jurisdictions.map((j: Jurisdiction) => ({
            id: j,
            name: JURISDICTION_NAMES[j],
          }))
        : Object.entries(JURISDICTION_NAMES).map(([id, name]) => ({
            id,
            name,
          })),
    },
  };
}
