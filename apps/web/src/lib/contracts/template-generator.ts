/**
 * Template Generator - Two-Stage Approach
 *
 * Stage 1: GPT-5.2 generates schema-compliant, granular template structure
 * Stage 2: Claude Opus 4.5 enhances legal depth and completeness
 *
 * This approach combines:
 * - GPT-5.2's structured output compliance and atomic clause generation
 * - Opus 4.5's superior legal reasoning and California law expertise
 *
 * Cost: ~$0.88 per template (one-time, reused many times)
 * - GPT-5.2: ~$0.08
 * - Opus 4.5 enhancement: ~$0.80
 */

import OpenAI from "openai";
import Anthropic from "@anthropic-ai/sdk";
import {
  type ContractType,
  type Jurisdiction,
  CONTRACT_TYPES,
  JURISDICTION_NAMES,
} from "./schemas";
import { PLACEHOLDERS, type PlaceholderDefinition } from "./placeholders";

// Lazy initialization of OpenAI client
let openaiClient: OpenAI | null = null;
function getOpenAI(): OpenAI {
  if (!openaiClient) {
    const apiKey = process.env.OPENAI_API_KEY;
    if (!apiKey) {
      // In development, allow mock fallback
      if (process.env.NODE_ENV === "development") {
        console.warn("OPENAI_API_KEY not found. Using mock generator.");
        return {
          responses: {
            create: async () => ({
              output_text: JSON.stringify(getMockTemplate())
            })
          }
        } as unknown as OpenAI;
      }
      throw new Error("OPENAI_API_KEY is not configured");
    }
    openaiClient = new OpenAI({ apiKey });
  }
  return openaiClient;
}

function getMockTemplate(): TemplateContent {
  return {
    title: "Mock Services Agreement",
    preamble: "This Agreement is entered into as of {{effective_date}} by {{party_a_name}} and {{party_b_name}}.",
    recitals: "WHEREAS, Party A desires to engage Party B...",
    clauses: [
      {
        id: "services",
        title: "1. Services",
        content: "Party B shall provide the following services: {{project_scope}}.",
        type: "standard",
        order: 1
      },
      {
        id: "payment",
        title: "2. Payment",
        content: "Party A shall pay {{payment_amount}} for the services.",
        type: "standard",
        order: 2
      },
      {
        id: "term",
        title: "3. Term",
        content: "This agreement shall commence on {{effective_date}}.",
        type: "standard",
        order: 3
      }
    ],
    signatureBlock: "Signature: {{party_a_name}}\nDate: {{effective_date}}"
  };
}

// Lazy initialization of Anthropic client
let anthropicClient: Anthropic | null = null;
function getAnthropic(): Anthropic {
  if (!anthropicClient) {
    anthropicClient = new Anthropic();
  }
  return anthropicClient;
}

// Model configuration
const TEMPLATE_MODEL = "gpt-5.2";
const REASONING_EFFORT = "high";
const ENHANCEMENT_MODEL = "claude-opus-4-5-20251101";

// ============================================================================
// Template Generation Types
// ============================================================================

export interface TemplatePlaceholder {
  id: string;
  token: string;
  label: string;
  description: string;
  category: "party_a" | "party_b" | "dates" | "terms" | "financial" | "project";
  type: "text" | "date" | "number" | "currency" | "email" | "textarea" | "dropdown";
  required: boolean;
  autofillKey?: string;
  defaultValue?: string;
  options?: string[]; // For dropdown type
  validation?: {
    min?: number;
    max?: number;
    pattern?: string;
  };
}

/** Template content without placeholder schema (used during generation) */
export interface TemplateContent {
  title: string;
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

/** Complete template with placeholder schema */
export interface GeneratedTemplate extends TemplateContent {
  /** Placeholder definitions for this template */
  placeholders: TemplatePlaceholder[];
}

export interface TemplateGenerationOptions {
  contractType: ContractType;
  jurisdiction: Jurisdiction;
  includeOptionalClauses?: boolean;
  customInstructions?: string;
  /** Enable two-stage generation with Opus 4.5 enhancement (default: true) */
  enhanceWithOpus?: boolean;
  /** Callback for progress updates */
  onProgress?: (stage: "gpt5" | "opus", status: "started" | "completed") => void;
}

// ============================================================================
// Placeholder Instructions
// ============================================================================

function getPlaceholderInstructions(contractType: ContractType): string {
  // Get placeholders relevant to this contract type
  const relevantPlaceholders = PLACEHOLDERS.filter(
    (p) => !p.contractTypes || p.contractTypes.includes(contractType)
  );

  const placeholderList = relevantPlaceholders
    .map((p) => `- ${p.token}: ${p.description}`)
    .join("\n");

  return `
CRITICAL: You MUST use these placeholder tokens for variable information. Do NOT use actual names, dates, or amounts.

Available placeholders:
${placeholderList}

Rules for placeholders:
1. Use {{party_a_...}} placeholders for the first party (client, discloser, company, etc.)
2. Use {{party_b_...}} placeholders for the second party (contractor, recipient, investor, etc.)
3. Always use {{effective_date}} for the contract start date
4. Use {{governing_jurisdiction}} for the jurisdiction clause
5. For financial terms, use the appropriate {{payment_amount}}, {{hourly_rate}}, etc.
6. NEVER use example names like "John Doe", "Acme Inc", or specific dates
7. The template must be fully reusable with different parties
`;
}

// ============================================================================
// System Prompt
// ============================================================================

function getTemplateSystemPrompt(jurisdiction: Jurisdiction): string {
  const jurisdictionName = JURISDICTION_NAMES[jurisdiction];

  return `You are an expert legal drafter specializing in ${jurisdictionName} commercial law. You are creating a REUSABLE CONTRACT TEMPLATE that will be filled in with specific party details later.

JURISDICTION REQUIREMENTS FOR ${jurisdictionName.toUpperCase()}:
${getJurisdictionRequirements(jurisdiction)}

TEMPLATE REQUIREMENTS:
1. Use placeholder tokens (like {{party_a_name}}) instead of actual names
2. Create professional, legally binding language
3. Include all required clauses for this contract type
4. Ensure compliance with ${jurisdictionName} law
5. Use clear section numbering and structure
6. Make the template comprehensive yet readable

OUTPUT FORMAT:
You must call the generate_template function with structured output.
Each clause must have proper legal language suitable for ${jurisdictionName}.
`;
}

function getJurisdictionRequirements(jurisdiction: Jurisdiction): string {
  const requirements: Record<Jurisdiction, string> = {
    us_california: `
- Comply with California Civil Code
- AB5 compliance for contractor agreements (ABC test)
- Non-compete clauses are generally unenforceable in California
- Include CCPA considerations where applicable
- Reference California trade secret law (CUTSA)`,
    us_texas: `
- Comply with Texas Business & Commerce Code
- Non-compete clauses must be reasonable in scope
- Include Texas-specific arbitration provisions if applicable
- Reference Texas Uniform Trade Secrets Act`,
    us_new_york: `
- Comply with New York General Obligations Law
- Restrictive covenants must be reasonable
- Include New York choice of law provisions
- Reference NY SHIELD Act for data protection`,
    uk: `
- Comply with English law (England and Wales)
- Include GDPR considerations
- Consumer Rights Act 2015 compliance where applicable
- Use British English spelling and terminology
- Include proper dispute resolution clauses for UK courts`,
  };

  return requirements[jurisdiction] || requirements.us_california;
}

// ============================================================================
// JSON Schema for Structured Output
// ============================================================================

const templateSchema = {
  type: "object" as const,
  additionalProperties: false,
  properties: {
    title: {
      type: "string",
      description:
        "The title of the contract template (e.g., 'Mutual Non-Disclosure Agreement')",
    },
    preamble: {
      type: "string",
      description:
        "Opening paragraph with {{placeholder}} tokens for parties and effective date. Example: 'This Agreement is entered into as of {{effective_date}} by and between {{party_a_name}} (\"Party A\") and {{party_b_name}} (\"Party B\").'",
    },
    recitals: {
      type: "string",
      description:
        "Background/whereas clauses explaining the purpose. Use {{purpose}} placeholder if applicable.",
    },
    clauses: {
      type: "array",
      description: "Array of contract clauses with placeholder tokens",
      items: {
        type: "object",
        additionalProperties: false,
        properties: {
          id: {
            type: "string",
            description: "Unique identifier (e.g., 'definitions', 'confidentiality')",
          },
          title: {
            type: "string",
            description: "Section title (e.g., '1. DEFINITIONS')",
          },
          content: {
            type: "string",
            description:
              "Full legal text with {{placeholder}} tokens. Use numbered subsections (1.1, 1.2, etc.)",
          },
          type: {
            type: "string",
            enum: ["standard", "negotiable", "optional"],
            description: "Clause type for editing purposes",
          },
          order: {
            type: "number",
            description: "Order of the clause in the document",
          },
        },
        required: ["id", "title", "content", "type", "order"],
      },
    },
    signatureBlock: {
      type: "string",
      description: `Signature block with placeholders. Format:

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
  },
  required: ["title", "preamble", "recitals", "clauses", "signatureBlock"],
};

// ============================================================================
// Template Generation
// ============================================================================

export async function generateTemplate(
  options: TemplateGenerationOptions
): Promise<GeneratedTemplate> {
  const {
    contractType,
    jurisdiction,
    includeOptionalClauses = true,
    customInstructions,
    enhanceWithOpus = true,
    onProgress,
  } = options;

  const contractDef = CONTRACT_TYPES[contractType];

  // Build the user prompt
  const userPrompt = buildTemplatePrompt(
    contractType,
    jurisdiction,
    contractDef,
    includeOptionalClauses,
    customInstructions
  );

  const openai = getOpenAI();

  // Stage 1: GPT-5.2 generates schema-compliant template
  onProgress?.("gpt5", "started");

  let result: TemplateContent;

  try {
    // Use Responses API with GPT-5.2 and high reasoning effort
    const response = await openai.responses.create({
      model: TEMPLATE_MODEL,
      instructions: getTemplateSystemPrompt(jurisdiction),
      input: userPrompt,
      reasoning: {
        effort: REASONING_EFFORT,
      },
      text: {
        format: {
          type: "json_schema",
          name: "generate_template",
          schema: templateSchema,
        },
      },
    });

    // Parse the JSON response
    result = JSON.parse(response.output_text) as TemplateContent;

    // Validate the result has required fields
    if (!result.title || !result.preamble || !result.clauses || !result.signatureBlock) {
      throw new Error("Generated template is missing required fields");
    }

    // Ensure clauses have proper structure
    result.clauses = result.clauses.map((clause, index) => ({
      id: clause.id || `clause_${index + 1}`,
      title: clause.title,
      content: clause.content,
      type: clause.type || "standard",
      order: clause.order || index + 1,
    }));

    onProgress?.("gpt5", "completed");
  } catch (error) {
    console.error("GPT-5.2 template generation error:", error);
    throw new Error(
      `Failed to generate template (Stage 1): ${error instanceof Error ? error.message : "Unknown error"}`
    );
  }

  // Stage 2: Opus 4.5 enhances legal depth (optional but recommended)
  if (enhanceWithOpus) {
    onProgress?.("opus", "started");

    try {
      result = await enhanceTemplateWithOpus(result, jurisdiction);
      onProgress?.("opus", "completed");
    } catch (error) {
      console.error("Opus enhancement failed, using GPT-5.2 output:", error);
      // Continue with GPT-5.2 output if Opus fails
    }
  }

  // Build placeholder schema from the generated content
  const placeholders = buildPlaceholderSchema(result, contractType);

  return {
    ...result,
    placeholders,
  };
}

/**
 * Generate template with GPT-5.2 only (no Opus enhancement)
 * Faster and cheaper, but less comprehensive legal content
 */
export async function generateTemplateBasic(
  options: Omit<TemplateGenerationOptions, "enhanceWithOpus">
): Promise<GeneratedTemplate> {
  return generateTemplate({ ...options, enhanceWithOpus: false });
}

function buildTemplatePrompt(
  contractType: ContractType,
  jurisdiction: Jurisdiction,
  contractDef: (typeof CONTRACT_TYPES)[ContractType],
  includeOptionalClauses: boolean,
  customInstructions?: string
): string {
  const jurisdictionName = JURISDICTION_NAMES[jurisdiction];

  // Get required clauses from the contract definition
  const requiredClauses = contractDef.clauseTemplates
    .filter((c) => c.type === "standard" || c.type === "negotiable")
    .map((c) => `- ${c.title}: ${c.description}`)
    .join("\n");

  const optionalClauses = contractDef.clauseTemplates
    .filter((c) => c.type === "optional")
    .map((c) => `- ${c.title}: ${c.description}`)
    .join("\n");

  let prompt = `Generate a professional ${contractDef.name} template for ${jurisdictionName}.

${getPlaceholderInstructions(contractType)}

CONTRACT TYPE: ${contractDef.name}
DESCRIPTION: ${contractDef.description}
JURISDICTION: ${jurisdictionName}

REQUIRED CLAUSES (must include all):
${requiredClauses}
`;

  if (includeOptionalClauses && optionalClauses) {
    prompt += `
OPTIONAL CLAUSES (include these as well):
${optionalClauses}
`;
  }

  if (customInstructions) {
    prompt += `
ADDITIONAL INSTRUCTIONS:
${customInstructions}
`;
  }

  prompt += `
Generate the complete template now using the generate_template function.
Ensure all placeholder tokens are properly formatted as {{placeholder_name}}.
`;

  return prompt;
}

// ============================================================================
// Opus 4.5 Enhancement (Stage 2)
// ============================================================================

const ENHANCEMENT_SYSTEM_PROMPT = `You are an expert legal reviewer specializing in commercial law. You are enhancing a contract template that was already generated.

YOUR TASK: Improve the legal depth and completeness of each clause WITHOUT changing the structure.

CRITICAL RULES:
1. Keep the EXACT same JSON structure - do not add or remove top-level fields
2. Keep the EXACT same number of clauses in the same order
3. Keep ALL placeholder tokens exactly as they are ({{placeholder_name}} format)
4. Do NOT consolidate clauses - maintain the granular structure
5. Do NOT change clause IDs or types
6. Do NOT add new placeholders - only use the ones already present in the template

WHAT TO ENHANCE:
- Add legal nuances and edge cases within existing clauses
- Strengthen protective language
- Add jurisdiction-specific law references (statutes, codes, acts)
- Include provisions that may have been missed (breach notification, whistleblower immunity for trade secrets)
- Improve precision of legal terminology
- Add subsection numbering if not present (1.1, 1.2, etc.)
- Ensure comprehensive definitions

OUTPUT: Return the enhanced template as valid JSON matching the exact same schema.`;

async function enhanceTemplateWithOpus(
  template: TemplateContent,
  jurisdiction: Jurisdiction
): Promise<TemplateContent> {
  const jurisdictionName = JURISDICTION_NAMES[jurisdiction];
  const anthropic = getAnthropic();

  const userPrompt = `Enhance this ${jurisdictionName} contract template for legal depth. Keep the exact same structure and all placeholders.

JURISDICTION: ${jurisdictionName}
${getJurisdictionRequirements(jurisdiction)}

CURRENT TEMPLATE:
\`\`\`json
${JSON.stringify(template, null, 2)}
\`\`\`

Return the enhanced template as JSON. Do not change the structure, only deepen the legal content within each clause.`;

  // Use streaming to handle long responses
  let fullText = "";
  const stream = await anthropic.messages.stream({
    model: ENHANCEMENT_MODEL,
    max_tokens: 20000,
    system: ENHANCEMENT_SYSTEM_PROMPT,
    messages: [{ role: "user", content: userPrompt }],
  });

  for await (const event of stream) {
    if (event.type === "content_block_delta" && event.delta.type === "text_delta") {
      fullText += event.delta.text;
    }
  }

  // Parse JSON from response - try multiple extraction methods
  let jsonStr = fullText;

  // Method 1: Extract from code block
  const jsonMatch = jsonStr.match(/```(?:json)?\s*([\s\S]*?)```/);
  if (jsonMatch) {
    jsonStr = jsonMatch[1];
  } else {
    // Method 2: Find JSON object by matching outermost braces
    const firstBrace = fullText.indexOf("{");
    const lastBrace = fullText.lastIndexOf("}");
    if (firstBrace !== -1 && lastBrace !== -1 && lastBrace > firstBrace) {
      jsonStr = fullText.slice(firstBrace, lastBrace + 1);
    }
  }

  // Clean up common issues
  jsonStr = jsonStr
    .replace(/[\u0000-\u001F\u007F]/g, " ") // Remove control characters
    .replace(/[""]/g, '"') // Replace smart/curly quotes with straight quotes
    .replace(/['']/g, "'") // Replace smart apostrophes
    .replace(/,\s*}/g, "}") // Remove trailing commas
    .replace(/,\s*]/g, "]") // Remove trailing commas in arrays
    .trim();

  // Debug: save raw output for inspection
  const fs = await import("fs");
  const debugPath = `/tmp/opus-debug-${Date.now()}.txt`;
  fs.writeFileSync(debugPath, `=== RAW OPUS OUTPUT ===\n${fullText}\n\n=== EXTRACTED JSON ===\n${jsonStr}`);
  console.log(`  📝 Debug output saved to: ${debugPath}`);

  try {
    const enhanced = JSON.parse(jsonStr) as GeneratedTemplate;

    // Validate structure was preserved
    if (enhanced.clauses.length !== template.clauses.length) {
      console.warn("Opus changed clause count, using original structure with enhanced content");
      // Merge enhanced content into original structure
      return {
        ...template,
        preamble: enhanced.preamble || template.preamble,
        recitals: enhanced.recitals || template.recitals,
        clauses: template.clauses.map((originalClause, i) => ({
          ...originalClause,
          content: enhanced.clauses[i]?.content || originalClause.content,
        })),
        signatureBlock: enhanced.signatureBlock || template.signatureBlock,
      };
    }

    // Preserve original clause metadata (id, type, order) with enhanced content
    return {
      title: enhanced.title || template.title,
      preamble: enhanced.preamble || template.preamble,
      recitals: enhanced.recitals || template.recitals,
      clauses: template.clauses.map((originalClause, i) => ({
        id: originalClause.id,
        title: originalClause.title,
        content: enhanced.clauses[i]?.content || originalClause.content,
        type: originalClause.type,
        order: originalClause.order,
      })),
      signatureBlock: enhanced.signatureBlock || template.signatureBlock,
    };
  } catch (error) {
    console.error("Failed to parse Opus enhancement, using original template:", error);
    return template;
  }
}

// ============================================================================
// Template Validation
// ============================================================================

export function validateGeneratedTemplate(template: GeneratedTemplate): {
  valid: boolean;
  errors: string[];
  warnings: string[];
} {
  const errors: string[] = [];
  const warnings: string[] = [];

  // Check for required placeholders
  const allContent = [
    template.preamble,
    template.recitals,
    ...template.clauses.map((c) => c.content),
    template.signatureBlock,
  ].join(" ");

  // Must have party placeholders
  if (!allContent.includes("{{party_a_name}}")) {
    errors.push("Template must include {{party_a_name}} placeholder");
  }
  if (!allContent.includes("{{party_b_name}}")) {
    errors.push("Template must include {{party_b_name}} placeholder");
  }

  // Should have effective date
  if (!allContent.includes("{{effective_date}}")) {
    warnings.push("Template should include {{effective_date}} placeholder");
  }

  // Check for hardcoded example names (common AI mistakes)
  const badPatterns = [
    /John\s+Doe/i,
    /Jane\s+Doe/i,
    /Acme\s+(Corp|Inc|LLC)/i,
    /Example\s+Company/i,
    /\d{1,2}\/\d{1,2}\/\d{4}/, // Hardcoded dates
    /January\s+\d{1,2},\s+\d{4}/i,
  ];

  for (const pattern of badPatterns) {
    if (pattern.test(allContent)) {
      errors.push(`Template contains hardcoded values that should be placeholders: ${pattern}`);
    }
  }

  // Check clause structure
  if (template.clauses.length < 3) {
    warnings.push("Template has fewer than 3 clauses, which may be incomplete");
  }

  // Check signature block has placeholders
  if (!template.signatureBlock.includes("{{")) {
    errors.push("Signature block must include placeholder tokens");
  }

  return {
    valid: errors.length === 0,
    errors,
    warnings,
  };
}

// ============================================================================
// Placeholder Extraction
// ============================================================================

/**
 * Extract all placeholders from template content and build schema
 */
export function buildPlaceholderSchema(
  template: TemplateContent,
  contractType: ContractType
): TemplatePlaceholder[] {
  // Combine all content
  const allContent = [
    template.preamble,
    template.recitals,
    ...template.clauses.map((c) => c.content),
    template.signatureBlock,
  ].join(" ");

  // Extract placeholder tokens
  const tokenRegex = /\{\{([a-z_]+)\}\}/g;
  const foundTokens = new Set<string>();
  let match;
  while ((match = tokenRegex.exec(allContent)) !== null) {
    foundTokens.add(match[1]);
  }

  // Map to placeholder definitions
  const placeholders: TemplatePlaceholder[] = [];

  for (const tokenId of Array.from(foundTokens)) {
    const token = `{{${tokenId}}}`;
    const existing = PLACEHOLDERS.find((p) => p.token === token);

    if (existing) {
      // Use existing definition
      placeholders.push({
        id: tokenId,
        token: token,
        label: existing.label,
        description: existing.description,
        category: existing.category,
        type: existing.type,
        required: existing.required,
        autofillKey: existing.autofillKey,
      });
    } else {
      // Create a default definition for unknown placeholders
      placeholders.push({
        id: tokenId,
        token: token,
        label: formatTokenLabel(tokenId),
        description: `Value for ${formatTokenLabel(tokenId).toLowerCase()}`,
        category: guessCategory(tokenId),
        type: guessType(tokenId),
        required: false,
      });
    }
  }

  // Sort by category and then by required status
  const categoryOrder = ["party_a", "party_b", "dates", "terms", "financial", "project"];
  placeholders.sort((a, b) => {
    const catA = categoryOrder.indexOf(a.category);
    const catB = categoryOrder.indexOf(b.category);
    if (catA !== catB) return catA - catB;
    if (a.required !== b.required) return a.required ? -1 : 1;
    return a.label.localeCompare(b.label);
  });

  return placeholders;
}

/**
 * Format a token ID into a human-readable label
 */
function formatTokenLabel(tokenId: string): string {
  return tokenId
    .split("_")
    .map((word) => word.charAt(0).toUpperCase() + word.slice(1))
    .join(" ");
}

/**
 * Guess the category from token ID
 */
function guessCategory(tokenId: string): TemplatePlaceholder["category"] {
  if (tokenId.startsWith("party_a")) return "party_a";
  if (tokenId.startsWith("party_b")) return "party_b";
  if (tokenId.includes("date") || tokenId.includes("period")) return "dates";
  if (tokenId.includes("amount") || tokenId.includes("rate") || tokenId.includes("fee") || tokenId.includes("payment")) return "financial";
  if (tokenId.includes("project") || tokenId.includes("service") || tokenId.includes("deliverable")) return "project";
  return "terms";
}

/**
 * Guess the type from token ID
 */
function guessType(tokenId: string): TemplatePlaceholder["type"] {
  if (tokenId.includes("date")) return "date";
  if (tokenId.includes("email")) return "email";
  if (tokenId.includes("amount") || tokenId.includes("rate") || tokenId.includes("fee") || tokenId.includes("cap")) return "currency";
  if (tokenId.includes("period") || tokenId.includes("days") || tokenId.includes("years") || tokenId.includes("percent")) return "number";
  if (tokenId.includes("description") || tokenId.includes("address") || tokenId.includes("deliverable") || tokenId.includes("scope")) return "textarea";
  return "text";
}
