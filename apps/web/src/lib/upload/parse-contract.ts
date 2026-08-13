import OpenAI from "openai";
import crypto from "crypto";
import type { ContractContent, ContractClause } from "@/db/types";

const OPENAI_PARSE_TIMEOUT_MS = 15_000;
function createOpenAIClient(): OpenAI | null {
  return process.env.OPENAI_API_KEY
    ? new OpenAI({
      apiKey: process.env.OPENAI_API_KEY,
      timeout: OPENAI_PARSE_TIMEOUT_MS,
      maxRetries: 0,
    })
    : null;
}

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
  const openai = createOpenAIClient();
  if (!openai) {
    return parseContractTextFallback(text);
  }

  try {
    const prompt = buildParsePrompt(text);

    const response = await openai.chat.completions.create({
      model: "gpt-4.1-mini",
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
      max_tokens: 4096,
      temperature: 0.1,
    });

    const responseText = response.choices[0]?.message?.content || "{}";
    const parsed = JSON.parse(responseText);

    // Convert parsed clauses to our format with IDs
    const clauses: ContractClause[] = (parsed.clauses || [])
      .filter(
        (clause: unknown): clause is { title: string; content: string } =>
          Boolean(
            clause &&
              typeof clause === "object" &&
              typeof (clause as { title?: unknown }).title === "string" &&
              typeof (clause as { content?: unknown }).content === "string"
          )
      )
      .map((clause: { title: string; content: string }, index: number) => ({
        id: crypto.randomUUID(),
        title: clause.title,
        content: clause.content,
        order: index + 1,
      }));

    if (clauses.length === 0) {
      return parseContractTextFallback(text);
    }

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
  } catch (error) {
    console.warn("AI contract parsing failed; using local parser:", error);
    return parseContractTextFallback(text);
  }
}

/**
 * Build the prompt for contract parsing
 */
function buildParsePrompt(text: string): string {
  return `Analyze this contract text and structure it into components.

Contract Text:
---
${text.slice(0, 20000)}
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

interface LocalSection {
  title: string;
  lines: string[];
}

const COMMON_SECTION_HEADING = /^(definitions?|scope(?: of (?:work|services))?|services?|fees?|payment(?: terms)?|term(?: and termination)?|termination|confidentiality|intellectual property|liability|indemnification|warranties|representations|governing law|dispute resolution|notices?|assignment|force majeure|entire agreement|miscellaneous)$/i;

function isSectionHeading(line: string): boolean {
  const value = line.trim();
  if (!value || value.length > 120) return false;
  if (/^whereas\b/i.test(value)) return false;

  return /^(?:article|section|clause)\s+[A-Z0-9IVXLC]+(?:[.:-]|\s)/i.test(value) ||
    /^\d+(?:\.\d+)*(?:[.)])?\s+[A-Z][A-Za-z0-9 ,/&()'-]{2,}$/.test(value) ||
    /^[A-Z][A-Z0-9 ,/&()'-]{3,}$/.test(value) ||
    COMMON_SECTION_HEADING.test(value);
}

function cleanHeading(line: string): string {
  return line
    .trim()
    .replace(/^(?:article|section|clause)\s+[A-Z0-9IVXLC]+\s*[:.-]?\s*/i, "")
    .replace(/^\d+(?:\.\d+)*(?:[.)])?\s*/, "")
    .replace(/\s+/g, " ") || "Agreement Terms";
}

function inferContractType(text: string): string {
  const value = text.toLowerCase();
  if (/safe\s+(?:note|agreement)|simple agreement for future equity/.test(value)) {
    return "safe_note";
  }
  if (/statement of work|\bsow\b/.test(value)) return "sow";
  if (/employment offer|offer of employment/.test(value)) return "employment_offer";
  if (/independent contractor/.test(value)) return "contractor_agreement";
  if (/consulting agreement|consultant/.test(value)) return "consulting_agreement";
  if (/non-disclosure|nondisclosure|confidentiality agreement/.test(value)) {
    return "nda_mutual";
  }
  return "service_agreement";
}

function inferJurisdiction(text: string): string {
  if (/laws? of (?:the state of )?california|governed by california/i.test(text)) {
    return "CA";
  }
  if (/laws? of (?:the state of )?texas|governed by texas/i.test(text)) {
    return "TX";
  }
  if (/laws? of (?:the state of )?new york|governed by new york/i.test(text)) {
    return "NY";
  }
  if (/england and wales|united kingdom|laws? of england/i.test(text)) {
    return "UK";
  }
  return "other";
}

/**
 * Fast, lossless-enough fallback for serverless timeouts. It recognizes common
 * legal headings and keeps their body text verbatim rather than paraphrasing.
 */
export function parseContractTextFallback(text: string): ParsedContractResult {
  const normalized = text.replace(/\r\n?/g, "\n").trim();
  const lines = normalized.split("\n").map((line) => line.trimEnd());
  const preambleLines: string[] = [];
  const sections: LocalSection[] = [];
  let currentSection: LocalSection | null = null;

  for (const line of lines) {
    if (isSectionHeading(line)) {
      const isDocumentTitle =
        !currentSection &&
        sections.length === 0 &&
        preambleLines.every((candidate) => !candidate.trim()) &&
        /\b(agreement|contract|deed|note|offer|statement of work)\b/i.test(line);
      if (isDocumentTitle) {
        preambleLines.push(line);
        continue;
      }
      if (currentSection) sections.push(currentSection);
      currentSection = { title: cleanHeading(line), lines: [] };
    } else if (currentSection) {
      currentSection.lines.push(line);
    } else {
      preambleLines.push(line);
    }
  }
  if (currentSection) sections.push(currentSection);

  const recitals: string[] = [];
  const signatureBlocks: string[] = [];
  const clauses: ContractClause[] = [];

  for (const section of sections) {
    const body = section.lines.join("\n").trim();
    if (/^(recitals?|background|whereas)$/i.test(section.title)) {
      recitals.push(body);
    } else if (/^(signatures?|signature blocks?|execution|in witness whereof)$/i.test(section.title)) {
      signatureBlocks.push([section.title, body].filter(Boolean).join("\n"));
    } else {
      clauses.push({
        id: crypto.randomUUID(),
        title: section.title,
        content: body,
        order: clauses.length + 1,
      });
    }
  }

  // Unstructured documents remain editable as one clause and retain all text.
  if (clauses.length === 0) {
    clauses.push({
      id: crypto.randomUUID(),
      title: "Agreement Terms",
      content: normalized,
      order: 1,
    });
  }

  const firstLine = lines.find((line) => line.trim())?.trim() || "Uploaded Contract";
  const suggestedTitle = firstLine.length <= 120
    ? firstLine.replace(/\s+/g, " ")
    : "Uploaded Contract";

  return {
    content: {
      preamble: clauses.length === 1 && clauses[0].content === normalized
        ? ""
        : preambleLines.join("\n").trim(),
      recitals: recitals.join("\n\n"),
      clauses,
      signatureBlock: signatureBlocks.join("\n\n"),
    },
    suggestedTitle,
    suggestedType: inferContractType(normalized),
    suggestedJurisdiction: inferJurisdiction(normalized),
    confidence: sections.length > 1 ? "medium" : "low",
  };
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
