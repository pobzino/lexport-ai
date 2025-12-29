import OpenAI from "openai";
import crypto from "crypto";
import type { ContractContent, ContractClause } from "@/db/types";

const openai = new OpenAI({
  apiKey: process.env.OPENAI_API_KEY,
});

export interface ParsedContractResult {
  content: ContractContent;
  suggestedTitle: string;
  suggestedType: string;
  suggestedJurisdiction: string;
  confidence: "high" | "medium" | "low";
}

/**
 * Parse extracted text into structured contract format using AI
 */
export async function parseContractText(
  text: string
): Promise<ParsedContractResult> {
  const prompt = buildParsePrompt(text);

  const response = await openai.chat.completions.create({
    model: "gpt-4o",
    messages: [
      {
        role: "system",
        content: `You are a legal document parser. Your job is to analyze contract text and structure it into a clean, organized format. You must output valid JSON only.`,
      },
      {
        role: "user",
        content: prompt,
      },
    ],
    response_format: { type: "json_object" },
    max_tokens: 8192,
    temperature: 0.1, // Low temperature for consistency
  });

  const responseText = response.choices[0]?.message?.content || "{}";
  const parsed = JSON.parse(responseText);

  // Convert parsed clauses to our format with IDs
  const clauses: ContractClause[] = (parsed.clauses || []).map(
    (clause: { title: string; content: string }, index: number) => ({
      id: crypto.randomUUID(),
      title: clause.title,
      content: clause.content,
      order: index + 1,
    })
  );

  return {
    content: {
      preamble: parsed.preamble || "",
      recitals: parsed.recitals || "",
      clauses,
      signatureBlock: parsed.signatureBlock || "",
    },
    suggestedTitle: parsed.suggestedTitle || "Uploaded Contract",
    suggestedType: mapToContractType(parsed.contractType),
    suggestedJurisdiction: parsed.jurisdiction || "other",
    confidence: determineConfidence(parsed),
  };
}

/**
 * Build the prompt for contract parsing
 */
function buildParsePrompt(text: string): string {
  return `Analyze this contract text and structure it into components.

Contract Text:
---
${text.slice(0, 30000)}
---

Parse this contract and output a JSON object with the following structure:
{
  "suggestedTitle": "A descriptive title for this contract",
  "contractType": "One of: nda_mutual, nda_oneway, contractor_agreement, consulting_agreement, service_agreement, employment_offer, other",
  "jurisdiction": "Detected jurisdiction code (CA, TX, NY, UK, or other)",
  "preamble": "The opening paragraph identifying the parties and date",
  "recitals": "The WHEREAS clauses or background section",
  "clauses": [
    {
      "title": "Clause title (e.g., 'Confidential Information', 'Term and Termination')",
      "content": "The full text of the clause"
    }
  ],
  "signatureBlock": "The signature section with party names and signature lines"
}

Rules:
1. Extract the preamble (intro identifying parties)
2. Extract any recitals/whereas clauses
3. Split the main body into logical clauses, each with a clear title
4. Preserve numbered/lettered subsections within clause content
5. Keep the original legal language - do NOT paraphrase
6. Extract the signature block at the end
7. If a section is missing, use an empty string
8. Suggest an appropriate contract type and jurisdiction based on content`;
}

/**
 * Map AI-suggested type to our contract types
 */
function mapToContractType(type: string): string {
  const typeMap: Record<string, string> = {
    nda: "nda_mutual",
    nda_mutual: "nda_mutual",
    nda_oneway: "nda_oneway",
    "non-disclosure": "nda_mutual",
    contractor: "contractor_agreement",
    contractor_agreement: "contractor_agreement",
    consulting: "consulting_agreement",
    consulting_agreement: "consulting_agreement",
    service: "service_agreement",
    service_agreement: "service_agreement",
    services: "service_agreement",
    employment: "employment_offer",
    employment_offer: "employment_offer",
    offer: "employment_offer",
    safe: "safe_note",
    safe_note: "safe_note",
    ip: "ip_assignment",
    ip_assignment: "ip_assignment",
    advisor: "advisor_agreement",
    advisor_agreement: "advisor_agreement",
    sow: "sow",
    "statement of work": "sow",
  };

  const normalized = (type || "").toLowerCase().trim();
  return typeMap[normalized] || "service_agreement";
}

/**
 * Determine parsing confidence
 */
function determineConfidence(
  parsed: Record<string, unknown>
): "high" | "medium" | "low" {
  const hasAllSections =
    parsed.preamble && parsed.clauses && parsed.signatureBlock;
  const clauseCount = Array.isArray(parsed.clauses) ? parsed.clauses.length : 0;

  if (hasAllSections && clauseCount >= 3) {
    return "high";
  } else if (clauseCount >= 1) {
    return "medium";
  }
  return "low";
}
