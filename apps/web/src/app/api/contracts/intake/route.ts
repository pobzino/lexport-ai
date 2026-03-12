import { NextRequest, NextResponse } from "next/server";
import { createClient } from "@/lib/supabase/server";
import OpenAI from "openai";
import { CONTRACT_TYPES, type ContractType } from "@/lib/contracts/schemas";
import { extractPlaceholders } from "@/lib/contracts/placeholders";
import {
  INTAKE_MODEL,
  INTAKE_SYSTEM_PROMPT,
  normalizeIntakeResponse,
} from "@/lib/contracts/intake-prompt";

const openai = new OpenAI({
  apiKey: process.env.OPENAI_API_KEY,
});

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

    const response = await openai.chat.completions.create({
      model: INTAKE_MODEL,
      messages: [
        { role: "system", content: INTAKE_SYSTEM_PROMPT },
        { role: "user", content: description },
      ],
      temperature: 0.3,
      response_format: { type: "json_object" },
    });

    const content = response.choices[0]?.message?.content;
    if (!content) {
      throw new Error("No response from AI");
    }

    const analysis = JSON.parse(content);
    const normalized = normalizeIntakeResponse(analysis);

    // Only check for templates if we have a valid recommendation
    const jurisdiction = (analysis.jurisdiction as string) || "us_california";
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
      const fullContent = [
        matchingTemplate.preamble || "",
        matchingTemplate.recitals || "",
        matchingTemplate.signature_block || "",
        ...((matchingTemplate.clauses as Array<{ content?: string }>) || []).map((c) => c.content || ""),
      ].join("\n");

      const placeholderTokens = extractPlaceholders(fullContent);

      // Map extracted fields to placeholders where possible
      const autoFilledValues: Record<string, string> = {};
      const extractedFields = (analysis.extractedFields || {}) as Record<string, string | number | boolean>;

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
        filledCount: Object.keys(autoFilledValues).length,
        totalCount: placeholderTokens.length,
      };
    }

    return NextResponse.json({
      success: true,
      hasRecommendation: normalized.hasRecommendation,
      analysis: normalized.analysis,
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
