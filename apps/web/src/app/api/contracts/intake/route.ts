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
- NDA (mutual/one_way): parties (names, emails), purpose, effectiveDate, confidentialityPeriod (years)
- Independent Contractor: clientName, contractorName, servicesDescription, paymentAmount (number), paymentFrequency (hourly|monthly|project|milestone), duration (e.g. "4 months")
- Consulting Agreement: clientName, consultantName, consultingScope, hourlyRate or retainerAmount
- SAFE Note: companyName, investorName, investmentAmount, valuationCap or discountRate (US only)
- Freelance Service: clientName, freelancerName, projectName, projectDescription, totalAmount

IMPORTANT field naming conventions:
- paymentAmount: Always a NUMBER (e.g., 25000 not "$25,000")
- paymentFrequency: Must be one of: "hourly", "daily", "weekly", "monthly", "project", "milestone"
- duration: The contract length as a string (e.g., "4 months", "1 year")
- Do NOT confuse duration with paymentFrequency

Respond with a JSON object matching this structure:
{
  "suggestedType": "contract_type_id",
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

    // Validate the suggested type
    if (!CONTRACT_TYPES[analysis.suggestedType]) {
      analysis.suggestedType = "nda_mutual"; // Fallback
      analysis.confidence = 50;
    }

    // Validate jurisdiction
    if (analysis.jurisdiction && !JURISDICTION_NAMES[analysis.jurisdiction as Jurisdiction]) {
      analysis.jurisdiction = null;
    }

    // Get contract type details for the response
    const contractTypeDef = CONTRACT_TYPES[analysis.suggestedType];

    // Check for matching system template
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
      analysis: {
        ...analysis,
        contractTypeName: contractTypeDef.name,
        contractTypeDescription: contractTypeDef.description,
        contractTypeIcon: contractTypeDef.icon,
        jurisdictionName: analysis.jurisdiction
          ? JURISDICTION_NAMES[analysis.jurisdiction as Jurisdiction]
          : null,
        availableJurisdictions: contractTypeDef.jurisdictions.map(j => ({
          id: j,
          name: JURISDICTION_NAMES[j],
        })),
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
