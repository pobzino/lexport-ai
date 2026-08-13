import OpenAI from "openai";
import crypto from "crypto";
import type { ContractContent, ContractClause } from "@/db/types";

const OPENAI_PARSE_TIMEOUT_MS = 15_000;
const MAX_AI_SOURCE_LENGTH = 20_000;
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
  const localResult = parseContractTextFallback(text);

  // Numbered and explicitly headed legal documents can be parsed locally with
  // exact source preservation. AI adds latency and can silently omit clauses.
  if (localResult.confidence !== "low" || text.length > MAX_AI_SOURCE_LENGTH) {
    return localResult;
  }

  const openai = createOpenAIClient();
  if (!openai) {
    return localResult;
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
      return localResult;
    }

    const sourceLength = compactLegalText(text).length;
    const parsedLength = compactLegalText([
      parsed.preamble,
      parsed.recitals,
      ...clauses.map((clause) => clause.content),
      parsed.signatureBlock,
    ].filter((value): value is string => typeof value === "string").join(" ")).length;

    // A parser must not produce a polished-looking document that has silently
    // lost a material portion of the uploaded legal language.
    if (sourceLength > 0 && parsedLength / sourceLength < 0.72) {
      console.warn("AI contract parsing omitted source text; using local parser");
      return localResult;
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
    return localResult;
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

interface FlatSectionMarker {
  number: number;
  markerIndex: number;
  title: string;
  titleStart: number;
}

const COMMON_SECTION_HEADING = /^(parties|definitions?|scope(?: of (?:work|services))?|services?|fees?|payment(?: terms)?|term(?: and termination)?|termination|confidentiality|intellectual property|liability|indemnification|warranties|representations|governing law|dispute resolution|notices?|assignment|force majeure|entire agreement|miscellaneous)$/i;

function compactLegalText(value: string): string {
  return value.replace(/\s+/g, " ").trim();
}

function stripPageFurniture(text: string): string {
  return text
    // Common flattened PDF header: DOCUMENT / FIRM / CONFIDENTIAL / Page N.
    .replace(
      /(?:^|\s)[A-Z][A-Z0-9 &'’.,/()-]{2,120}\s+(?:PRIVATE\s*(?:&|AND)\s*)?CONFIDENTIAL\s+Page\s+\d+(?:\s+of\s+\d+)?(?=\s|$)/g,
      "\n"
    )
    // Standalone page labels are layout metadata, not contract language.
    .replace(/(?:^|\n)\s*Page\s+\d+(?:\s+of\s+\d+)?\s*(?=\n|$)/gi, "\n")
    .replace(/[ \t]+\n/g, "\n")
    .replace(/\n[ \t]+/g, "\n")
    .replace(/\n{3,}/g, "\n\n")
    .trim();
}

function inferFlatHeading(
  text: string,
  markerIndex: number,
  sectionNumber: number
): { title: string; titleStart: number } {
  const windowStart = Math.max(0, markerIndex - 180);
  const before = text.slice(windowStart, markerIndex);
  const boundaryMatches = [...before.matchAll(/[.!?]["')\]]*\s+|\n+/g)];
  const lastBoundary = boundaryMatches.at(-1);
  const candidateStart = lastBoundary
    ? windowStart + (lastBoundary.index || 0) + lastBoundary[0].length
    : windowStart;
  const rawCandidate = text.slice(candidateStart, markerIndex);
  const firstNonWhitespace = rawCandidate.search(/\S/);
  let candidate = rawCandidate.trim();
  let titleStart = candidateStart + Math.max(firstNonWhitespace, 0);

  if (candidate.split(/\s+/).length > 10 || candidate.length > 100) {
    const commonSuffix = candidate.match(
      /(?:^|\s)(Parties|Definitions?|Services?|Fees?|Payments?|Termination|Confidentiality|Intellectual Property|Liability|Indemnification|Warranties|Notices?|Assignment|Force Majeure|Entire Agreement|Miscellaneous)$/i
    );
    if (commonSuffix?.[1]) {
      const suffixStart = candidate.toLowerCase().lastIndexOf(
        commonSuffix[1].toLowerCase()
      );
      titleStart += Math.max(suffixStart, 0);
      candidate = commonSuffix[1];
    }
  }

  const words = candidate.split(/\s+/).filter(Boolean);
  const looksLikeHeading =
    candidate.length >= 3 &&
    candidate.length <= 100 &&
    words.length <= 10 &&
    /^[A-Z]/.test(candidate) &&
    !/[;:]$/.test(candidate) &&
    !/\b\d+\.\d+\b/.test(candidate);

  return looksLikeHeading
    ? { title: candidate, titleStart }
    : { title: `Section ${sectionNumber}`, titleStart: markerIndex };
}

function findFlatSectionMarkers(text: string): FlatSectionMarker[] {
  const matches = [...text.matchAll(/\b(\d{1,2})\.1\b/g)]
    .map((match) => ({
      number: Number(match[1]),
      markerIndex: match.index || 0,
    }))
    .filter((match) => Number.isInteger(match.number));

  let best: Array<{ number: number; markerIndex: number }> = [];
  for (let start = 0; start < matches.length; start += 1) {
    const run = [matches[start]];
    let expected = matches[start].number + 1;
    for (let index = start + 1; index < matches.length; index += 1) {
      if (matches[index].number === expected) {
        run.push(matches[index]);
        expected += 1;
      } else if (matches[index].number > expected) {
        break;
      }
    }
    if (run.length > best.length) best = run;
  }

  if (best.length < 2) return [];

  return best.map((marker) => ({
    ...marker,
    ...inferFlatHeading(text, marker.markerIndex, marker.number),
  }));
}

function findSignatureStart(text: string, minimumIndex: number): number {
  const signaturePattern = /\b(?:SIGNATURES?|SIGNATURE BLOCK|EXECUTION|IN WITNESS WHEREOF)\b/gi;
  const matches = [...text.matchAll(signaturePattern)]
    .map((match) => match.index || 0)
    .filter((index) => index > minimumIndex && index > text.length * 0.55);
  return matches.at(-1) ?? text.length;
}

function inferSuggestedTitle(preamble: string, source: string): string {
  const uppercaseTitle = source.match(
    /\b([A-Z0-9][A-Z0-9&'’/-]*(?:\s+[A-Z0-9&'’/-]+){0,6}\s+(?:AGREEMENT|CONTRACT|DEED|NOTE))\b/
  );
  if (uppercaseTitle?.[1]) return uppercaseTitle[1];

  const lines = preamble.split("\n").map((line) => line.trim()).filter(Boolean);
  const lineTitle = lines.find(
    (line) => line.length <= 120 && /\b(agreement|contract|deed|note|offer|statement of work)\b/i.test(line)
  );
  if (lineTitle) return lineTitle.replace(/\s+/g, " ");
  return "Uploaded Contract";
}

function parseFlatNumberedContract(text: string): {
  preamble: string;
  clauses: ContractClause[];
  signatureBlock: string;
} | null {
  const markers = findFlatSectionMarkers(text);
  if (markers.length < 2) return null;

  const signatureStart = findSignatureStart(text, markers.at(-1)?.markerIndex || 0);
  const clauses = markers.map((marker, index) => {
    const nextStart = markers[index + 1]?.titleStart ?? signatureStart;
    return {
      id: crypto.randomUUID(),
      title: cleanHeading(marker.title),
      content: text.slice(marker.markerIndex, nextStart).trim(),
      order: index + 1,
    };
  });

  return {
    preamble: text.slice(0, markers[0].titleStart).trim(),
    clauses,
    signatureBlock: signatureStart < text.length
      ? text.slice(signatureStart).trim()
      : "",
  };
}

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
  const source = text.replace(/\r\n?/g, "\n").trim();
  const normalized = stripPageFurniture(source);
  const flatContract = parseFlatNumberedContract(normalized);

  if (flatContract) {
    return {
      content: {
        preamble: flatContract.preamble,
        recitals: "",
        clauses: flatContract.clauses,
        signatureBlock: flatContract.signatureBlock,
      },
      suggestedTitle: inferSuggestedTitle(flatContract.preamble, source),
      suggestedType: inferContractType(normalized),
      suggestedJurisdiction: inferJurisdiction(normalized),
      confidence: "high",
    };
  }

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

  const suggestedTitle = inferSuggestedTitle(
    preambleLines.join("\n").trim(),
    source
  );

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
