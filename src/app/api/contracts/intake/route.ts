import { NextRequest, NextResponse } from "next/server";
import { createClient } from "@/lib/supabase/server";
import OpenAI from "openai";
import { CONTRACT_TYPES, JURISDICTION_NAMES, type ContractType, type Jurisdiction } from "@/lib/contracts/schemas";

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
- NDA (mutual/one_way): parties (names, emails), purpose, effective date, confidentiality period
- Independent Contractor: client, contractor, services description, payment amount, payment frequency
- Consulting Agreement: client, consultant, consulting scope, hourly rate or retainer
- SAFE Note: company, investor, investment amount, valuation cap or discount (US only - not available for UK)
- Freelance Service: client, freelancer, project name, description, total amount

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
    });
  } catch (error) {
    console.error("Error analyzing contract intake:", error);
    return NextResponse.json(
      { error: "Failed to analyze your request. Please try again." },
      { status: 500 }
    );
  }
}
