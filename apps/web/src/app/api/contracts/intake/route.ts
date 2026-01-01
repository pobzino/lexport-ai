import { NextRequest, NextResponse } from "next/server";
import { createClient } from "@/lib/supabase/server";
import OpenAI from "openai";
import { CONTRACT_TYPES, JURISDICTION_NAMES, type ContractType, type Jurisdiction } from "@/lib/contracts/schemas";
import { extractPlaceholders } from "@/lib/contracts/placeholders";

const openai = new OpenAI({
  apiKey: process.env.OPENAI_API_KEY,
});

// Intake analysis model - fast and cost-effective
const INTAKE_MODEL = "gpt-4.1-mini";

interface ExtractedDetails {
  suggestedType: ContractType;
  inferredTypeName: string; // Human-readable name for what user needs
  confidence: number; // 0-100
  jurisdiction: Jurisdiction | null;
  extractedFields: Record<string, string | number | boolean>;
  followUpQuestions: {
    field: string;
    question: string;
    type: "text" | "select" | "number" | "date";
    options?: string[];
    required: boolean;
  }[];
  reasoning: string;
}

const CONTRACT_TYPE_DESCRIPTIONS = Object.entries(CONTRACT_TYPES)
  .map(([id, def]) => `- ${id}: ${def.name} - ${def.description}`)
  .join("\n");

const JURISDICTION_DESCRIPTIONS = Object.entries(JURISDICTION_NAMES)
  .map(([id, name]) => `- ${id}: ${name}`)
  .join("\n");

export async function POST(request: NextRequest) {
  try {
    const supabase = await createClient();

    // Check authentication
    const { data: { user }, error: authError } = await supabase.auth.getUser();
    if (authError || !user) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    }

    const { description } = await request.json();

    if (!description || typeof description !== "string" || description.trim().length < 10) {
      return NextResponse.json(
        { error: "Please provide a description of at least 10 characters" },
        { status: 400 }
      );
    }

    const systemPrompt = `You are a legal contract advisor helping users create the right contract for their needs.

Analyze the user's description and determine:
1. The most appropriate contract type from the available options
2. The jurisdiction based on any location mentions (default to us_california if unclear)
3. Extract any details mentioned (names, amounts, dates, scope, etc.)
4. Identify what key information is still missing and formulate follow-up questions

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
      "options": ["option1", "option2"] // only for select type
      "required": true
    }
  ],
  "reasoning": "Brief explanation of why this contract type was chosen"
}

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
- For protecting confidential info, suggest nda_mutual or nda_one_way`;

    const response = await openai.chat.completions.create({
      model: INTAKE_MODEL,
      messages: [
        { role: "system", content: systemPrompt },
        { role: "user", content: description },
      ],
      temperature: 0.3,
      response_format: { type: "json_object" },
    });

    const content = response.choices[0]?.message?.content;
    if (!content) {
      throw new Error("No response from AI");
    }

    const analysis: ExtractedDetails = JSON.parse(content);

    // Validate the suggested type - if invalid, don't suggest any type
    if (!CONTRACT_TYPES[analysis.suggestedType]) {
      // Return with no recommendation but allow custom generation
      analysis.confidence = 0;
    }

    // For low confidence (50% or below), mark as "no recommendation"
    // The frontend will show this and allow AI generation without a template
    const hasRecommendation = analysis.confidence > 50 && CONTRACT_TYPES[analysis.suggestedType];

    // Validate jurisdiction
    if (analysis.jurisdiction && !JURISDICTION_NAMES[analysis.jurisdiction as Jurisdiction]) {
      analysis.jurisdiction = null;
    }

    // Get contract type details for the response (may be null for unsupported types)
    const contractTypeDef = CONTRACT_TYPES[analysis.suggestedType] || null;

    // Only check for templates if we have a valid recommendation
    const jurisdiction = analysis.jurisdiction || "us_california";
    const { data: matchingTemplate } = await supabase
      .from("contract_templates")
      .select("id, title, contract_type, jurisdiction, preamble, recitals, clauses, signature_block, placeholders")
      .eq("contract_type", analysis.suggestedType)
      .eq("jurisdiction", jurisdiction)
      .eq("is_active", true)
      .limit(1)
      .single();

    // If we found a matching template, extract placeholder info
    let templateMatch = null;
    if (matchingTemplate) {
      // Get all placeholders from the template content
      const fullContent = [
        matchingTemplate.preamble || "",
        matchingTemplate.recitals || "",
        matchingTemplate.signature_block || "",
        ...((matchingTemplate.clauses as Array<{ content?: string }>) || []).map((c) => c.content || ""),
      ].join("\n");

      const placeholderTokens = extractPlaceholders(fullContent);

      // Map extracted fields to placeholders where possible
      const autoFilledValues: Record<string, string> = {};
      const extractedFields = analysis.extractedFields || {};

      // Common field mappings from extracted fields to placeholder tokens
      const fieldMappings: Record<string, string[]> = {
        "party_a_name": ["clientName", "companyName", "disclosingPartyName"],
        "party_b_name": ["contractorName", "consultantName", "investorName", "freelancerName", "receivingPartyName"],
        "party_a_company": ["clientCompany", "companyName"],
        "party_b_company": ["contractorCompany", "consultantCompany", "investorCompany"],
        "effective_date": ["effectiveDate", "startDate"],
        "purpose": ["purpose", "projectDescription", "consultingScope"],
        "payment_amount": ["paymentAmount", "totalAmount", "investmentAmount"],
        "hourly_rate": ["hourlyRate"],
        "scope_of_work": ["servicesDescription", "projectDescription", "consultingScope"],
      };

      // Try to auto-fill placeholders from extracted fields
      for (const [placeholder, fieldNames] of Object.entries(fieldMappings)) {
        for (const fieldName of fieldNames) {
          if (extractedFields[fieldName]) {
            autoFilledValues[placeholder] = String(extractedFields[fieldName]);
            break;
          }
        }
      }

      templateMatch = {
        id: `system_${matchingTemplate.id}`,
        title: matchingTemplate.title,
        contractType: matchingTemplate.contract_type,
        jurisdiction: matchingTemplate.jurisdiction,
        placeholders: placeholderTokens,
        autoFilledValues,
        // Count how many required placeholders are already filled
        filledCount: Object.keys(autoFilledValues).length,
        totalCount: placeholderTokens.length,
      };
    }

    return NextResponse.json({
      success: true,
      hasRecommendation,
      analysis: {
        ...analysis,
        contractTypeName: analysis.inferredTypeName || contractTypeDef?.name || "Custom Contract",
        contractTypeDescription: contractTypeDef?.description || "AI-generated contract tailored to your needs",
        contractTypeIcon: contractTypeDef?.icon || "file-text",
        jurisdictionName: analysis.jurisdiction
          ? JURISDICTION_NAMES[analysis.jurisdiction as Jurisdiction]
          : null,
        availableJurisdictions: contractTypeDef?.jurisdictions.map(j => ({
          id: j,
          name: JURISDICTION_NAMES[j],
        })) || Object.entries(JURISDICTION_NAMES).map(([id, name]) => ({ id, name })),
      },
      // Include matching template if found
      matchingTemplate: templateMatch,
    });
  } catch (error) {
    console.error("Error analyzing contract intake:", error);
    return NextResponse.json(
      { error: "Failed to analyze your request. Please try again." },
      { status: 500 }
    );
  }
}
