/**
 * Contract Generator using OpenAI GPT-5-mini
 *
 * Uses manifest-based dynamic prompts for optimal quality/cost balance.
 * Manifests are generated from GPT-5.2 to ensure clause completeness.
 *
 * Cost: ~$0.009 per contract (vs $0.072 with GPT-5.2)
 */

import OpenAI from "openai";
import {
  type ContractType,
  type ContractMetadata,
  type Clause,
  type Jurisdiction,
  CONTRACT_TYPES,
  JURISDICTION_NAMES,
} from "./schemas";

// Import clause manifests (generated from GPT-5.2)
import californiaManifests from "./manifests/california.json";

// Lazy initialization of OpenAI client to prevent build-time errors
let openaiClient: OpenAI | null = null;
function getOpenAI(): OpenAI {
  if (!openaiClient) {
    const apiKey = process.env.OPENAI_API_KEY;
    if (!apiKey) {
      throw new Error('OPENAI_API_KEY is not configured');
    }
    openaiClient = new OpenAI({ apiKey });
  }
  return openaiClient;
}

// Models
const GENERATION_MODEL = "gpt-5-mini"; // Fast, cost-effective for generation
const REASONING_EFFORT = "low"; // Low effort is sufficient with manifest guidance
const CHAT_MODEL = "gpt-4o"; // Keep GPT-4o for chat/explanations

// Map contract types to manifest keys
const MANIFEST_KEY_MAP: Record<ContractType, string> = {
  nda_mutual: "nda_mutual",
  nda_one_way: "nda_oneway",
  independent_contractor: "contractor_agreement",
  consulting_agreement: "consulting_agreement",
  safe_note: "safe_note",
  freelance_service: "service_agreement",
};

// Type for manifest structure
interface ClauseManifest {
  contractType: string;
  contractName: string;
  jurisdiction: string;
  requiredClauses: Array<{
    title: string;
    type: string;
    keyProvisions: string[];
  }>;
  commonClauses: Array<{
    title: string;
    type: string;
    keyProvisions: string[];
  }>;
  optionalClauses?: Array<{
    title: string;
    type: string;
    keyProvisions: string[];
  }>;
}

// Get manifest for contract type
function getManifest(contractType: ContractType, jurisdiction: Jurisdiction): ClauseManifest | null {
  // Currently only California manifests are available
  if (!jurisdiction.startsWith("us_california") && jurisdiction !== "us_california") {
    // Fall back to California for now, but could load jurisdiction-specific manifests
  }

  const manifestKey = MANIFEST_KEY_MAP[contractType];
  const manifests = californiaManifests as Record<string, ClauseManifest>;

  return manifests[manifestKey] || null;
}

// ============================================================================
// Function Definitions for Structured Output
// ============================================================================

const generateContractFunction: OpenAI.Chat.Completions.ChatCompletionTool = {
  type: "function",
  function: {
    name: "generate_contract",
    description: "Generate a complete contract with structured clauses based on the provided metadata",
    parameters: {
      type: "object",
      properties: {
        title: {
          type: "string",
          description: "The full title of the contract document",
        },
        preamble: {
          type: "string",
          description: "Opening paragraph identifying the parties and effective date",
        },
        recitals: {
          type: "string",
          description: "Background/whereas clauses explaining the purpose of the agreement",
        },
        clauses: {
          type: "array",
          description: "Array of contract clauses in order",
          items: {
            type: "object",
            properties: {
              id: {
                type: "string",
                description: "Unique identifier for the clause (e.g., 'definitions', 'obligations')",
              },
              title: {
                type: "string",
                description: "Section title (e.g., '1. DEFINITIONS')",
              },
              content: {
                type: "string",
                description: "Full legal text of the clause with proper formatting",
              },
              type: {
                type: "string",
                enum: ["standard", "negotiable", "optional"],
                description: "Type of clause for editing purposes",
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
          description: `Professional signature block formatted consistently for all parties. Each party section must include:
1. A role header (e.g., "CLIENT:", "CONTRACTOR:", "INVESTOR:", "COMPANY:")
2. A signature line with "Signature: ____________________"
3. A printed name line: "Printed Name: [Full Name]"
4. A title line if applicable: "Title: [Job Title]"
5. A date line: "Date: ____________________"
6. Company name if applicable

Format example:
CLIENT:
Signature: ____________________
Printed Name: John Smith
Title: Chief Executive Officer
Company: Acme Corp
Date: ____________________

Use consistent formatting for ALL parties with clear visual separation between each.`,
        },
      },
      required: ["title", "preamble", "recitals", "clauses", "signatureBlock"],
    },
  },
};

const modifyClauseFunction: OpenAI.Chat.Completions.ChatCompletionTool = {
  type: "function",
  function: {
    name: "modify_clause",
    description: "Modify a specific clause based on user instructions",
    parameters: {
      type: "object",
      properties: {
        clauseId: {
          type: "string",
          description: "ID of the clause being modified",
        },
        title: {
          type: "string",
          description: "Updated title (or same if unchanged)",
        },
        content: {
          type: "string",
          description: "Updated legal text of the clause",
        },
        explanation: {
          type: "string",
          description: "Brief explanation of what was changed and why",
        },
      },
      required: ["clauseId", "title", "content", "explanation"],
    },
  },
};

const explainClauseFunction: OpenAI.Chat.Completions.ChatCompletionTool = {
  type: "function",
  function: {
    name: "explain_clause",
    description: "Explain a clause in plain English",
    parameters: {
      type: "object",
      properties: {
        summary: {
          type: "string",
          description: "One-sentence summary of what this clause does",
        },
        explanation: {
          type: "string",
          description: "Plain English explanation of the clause, its purpose, and implications",
        },
        keyPoints: {
          type: "array",
          items: { type: "string" },
          description: "Bullet points of the most important things to know",
        },
        risks: {
          type: "array",
          items: { type: "string" },
          description: "Potential risks or things to watch out for",
        },
        negotiationTips: {
          type: "array",
          items: { type: "string" },
          description: "Tips for negotiating this clause if applicable",
        },
      },
      required: ["summary", "explanation", "keyPoints"],
    },
  },
};

// ============================================================================
// System Prompts
// ============================================================================

function getGenerationSystemPrompt(jurisdiction: Jurisdiction): string {
  const jurisdictionName = JURISDICTION_NAMES[jurisdiction];

  return `You are an expert legal contract drafter specializing in ${jurisdictionName} law. You generate professional, legally sound contracts that are:

1. **Jurisdiction-Specific**: All clauses comply with ${jurisdictionName} laws and regulations.
2. **Clear and Professional**: Use standard legal language that is precise yet understandable.
3. **Comprehensive**: Include all necessary clauses for enforceability.
4. **Well-Structured**: Organize clauses logically with proper numbering.

Key requirements for ${jurisdictionName}:
${getJurisdictionRequirements(jurisdiction)}

When generating contracts:
- Use formal legal language appropriate for ${jurisdictionName}
- Include all mandatory clauses for the contract type
- Add proper definitions for key terms
- Include appropriate governing law and dispute resolution clauses
- Format with proper section numbering (1., 1.1, 1.2, etc.)

SIGNATURE BLOCK REQUIREMENTS:
- Create a professional signature block with CONSISTENT formatting for ALL parties
- Each party section must include: role header (e.g., "CLIENT:"), signature line, printed name, title (if provided), company name (if applicable), and date line
- Use clear visual separation between each party's signature section
- Include any provided job titles or roles in the signature block

Always use the generate_contract function to return the structured output.`;
}

function getJurisdictionRequirements(jurisdiction: Jurisdiction): string {
  const requirements: Record<Jurisdiction, string> = {
    us_california: `- California law requires specific disclosures in certain agreements
- Non-compete clauses are generally unenforceable (Business and Professions Code § 16600)
- Independent contractor classification must meet ABC test requirements (AB5)
- Must comply with California Consumer Privacy Act (CCPA) where applicable
- Governing law should specify California with venue in appropriate county`,

    us_texas: `- Texas generally enforces reasonable non-compete agreements
- Independent contractor status follows common law tests
- Must comply with Texas Business & Commerce Code
- Governing law should specify Texas with venue in appropriate county
- Interest rates on late payments subject to Texas usury laws`,

    us_new_york: `- New York enforces reasonable restrictive covenants
- Must comply with New York General Obligations Law
- Choice of law provisions generally upheld
- Non-compete must be reasonable in scope, duration, and geography
- Governing law should specify New York with venue in appropriate county`,

    uk: `- Must comply with UK contract law principles
- Consumer contracts subject to Consumer Rights Act 2015
- GDPR and UK data protection requirements apply
- Non-compete restrictions (restrictive covenants) must be reasonable
- Governing law should specify England and Wales (or Scotland/Northern Ireland as appropriate)
- Include provisions for the Contracts (Rights of Third Parties) Act 1999`,
  };

  return requirements[jurisdiction];
}

function getModificationSystemPrompt(): string {
  return `You are an expert legal contract editor. Your role is to modify contract clauses based on user instructions while:

1. Maintaining legal validity and enforceability
2. Preserving the overall contract structure
3. Ensuring consistency with other clauses
4. Using appropriate legal language

When modifying clauses:
- Make only the requested changes
- Preserve formatting and numbering conventions
- Explain what was changed and why
- Flag any potential issues with the requested change

Use the modify_clause function to return your changes.`;
}

function getExplanationSystemPrompt(): string {
  return `You are a legal expert who explains contract clauses in plain English. Your explanations should be:

1. **Clear**: Use everyday language, avoid jargon
2. **Accurate**: Correctly represent the legal meaning
3. **Practical**: Focus on real-world implications
4. **Balanced**: Note both benefits and risks

When explaining clauses:
- Start with a simple one-sentence summary
- Explain the purpose and effect
- Highlight key points as bullet points
- Note any risks or concerns
- Provide negotiation tips where relevant

Use the explain_clause function to return your explanation.`;
}

// ============================================================================
// Contract Generation (using GPT-5-mini with manifest-based prompts)
// ============================================================================

export interface GeneratedContract {
  title: string;
  preamble: string;
  recitals: string;
  clauses: Clause[];
  signatureBlock: string;
}

export async function generateContract(
  contractType: ContractType,
  metadata: ContractMetadata
): Promise<GeneratedContract> {
  const typeDefinition = CONTRACT_TYPES[contractType];
  const jurisdiction = metadata.jurisdiction;

  // Get manifest for this contract type
  const manifest = getManifest(contractType, jurisdiction);

  // Build the prompt with manifest guidance
  const developerPrompt = buildDeveloperPrompt(jurisdiction, manifest);
  const userPrompt = buildManifestBasedPrompt(contractType, metadata, typeDefinition, manifest);

  // Use GPT-5-mini with Responses API for cost-effective generation
  const response = await (getOpenAI() as any).responses.create({
    model: GENERATION_MODEL,
    reasoning: { effort: REASONING_EFFORT },
    input: [
      { role: "developer", content: developerPrompt },
      { role: "user", content: userPrompt },
    ],
  });

  const content = response.output_text || "";

  // Parse JSON from response
  const jsonMatch = content.match(/\{[\s\S]*\}/);
  if (!jsonMatch) {
    throw new Error("Failed to generate contract: No JSON in response");
  }

  const input = JSON.parse(jsonMatch[0]) as {
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
  };

  // Map to our Clause type with defaults
  const clauses: Clause[] = input.clauses.map((c, index) => ({
    id: c.id || `clause_${index + 1}`,
    title: c.title,
    content: c.content,
    type: c.type || "standard",
    order: c.order || index + 1,
    isEdited: false,
  }));

  return {
    title: input.title,
    preamble: input.preamble,
    recitals: input.recitals,
    clauses,
    signatureBlock: input.signatureBlock,
  };
}

// Build developer prompt with manifest guidance
function buildDeveloperPrompt(jurisdiction: Jurisdiction, manifest: ClauseManifest | null): string {
  const jurisdictionName = JURISDICTION_NAMES[jurisdiction];

  let prompt = `You are a legal contract generator for ${jurisdictionName} law.

FORMATTING REQUIREMENTS:
1. Use numbered subsections throughout (1.1, 1.2, 2.1, etc.)
2. Include a Definitions section for key terms
3. Use professional signature block with "By:" line format
4. All clauses must be appropriate for the specific contract type
5. For optional fields not provided, use placeholder format: _____ (5 underscores) that users can fill in later`;

  if (manifest) {
    const requiredList = manifest.requiredClauses
      .slice(0, 6)
      .map((c) => {
        const provisions = c.keyProvisions?.slice(0, 2).join(", ") || "";
        return `- ${c.title}${provisions ? ` (include: ${provisions})` : ""}`;
      })
      .join("\n");

    const commonList = manifest.commonClauses
      .slice(0, 6)
      .map((c) => `- ${c.title}`)
      .join("\n");

    prompt += `

REQUIRED CLAUSES (must include):
${requiredList}

RECOMMENDED CLAUSES (include if relevant):
${commonList}

You may add other appropriate clauses as needed.`;
  }

  prompt += `

Output as JSON:
{
  "title": "string",
  "preamble": "string",
  "recitals": "string",
  "clauses": [{"id": "string", "title": "string", "content": "string", "type": "standard|negotiable|optional", "order": number}],
  "signatureBlock": "string"
}`;

  return prompt;
}

// Build user prompt with contract details
function buildManifestBasedPrompt(
  contractType: ContractType,
  metadata: ContractMetadata,
  typeDefinition: (typeof CONTRACT_TYPES)[ContractType],
  manifest: ClauseManifest | null
): string {
  const metadataSummary = formatMetadataForPrompt(contractType, metadata);
  const contractName = manifest?.contractName || typeDefinition.name;

  return `Generate a ${contractName} for ${JURISDICTION_NAMES[metadata.jurisdiction]}.

CONTRACT DETAILS:
${metadataSummary}

Return only valid JSON.`;
}

function buildGenerationPrompt(
  contractType: ContractType,
  metadata: ContractMetadata,
  typeDefinition: (typeof CONTRACT_TYPES)[ContractType]
): string {
  const clauseList = typeDefinition.clauseTemplates
    .map((c) => `- ${c.title} (${c.type}): ${c.description}`)
    .join("\n");

  // Build metadata summary based on contract type
  const metadataSummary = formatMetadataForPrompt(contractType, metadata);

  return `Generate a complete ${typeDefinition.name} with the following details:

**Contract Type**: ${typeDefinition.name}
**Jurisdiction**: ${JURISDICTION_NAMES[metadata.jurisdiction]}

**Contract Details**:
${metadataSummary}

**Required Clauses** (generate all of these):
${clauseList}

Please generate the complete contract using the generate_contract function. Include:
1. A professional title
2. A preamble identifying the parties
3. Recitals/whereas clauses
4. All required clauses with proper legal language
5. A signature block for all parties

Make the contract professional, comprehensive, and legally sound for ${JURISDICTION_NAMES[metadata.jurisdiction]}.`;
}

function formatMetadataForPrompt(
  contractType: ContractType,
  metadata: ContractMetadata
): string {
  switch (contractType) {
    case "nda_mutual":
    case "nda_one_way": {
      const m = metadata as import("./schemas").NDAMetadata;
      return `
- Disclosing Party: ${m.disclosingParty.name}${m.disclosingParty.title ? `, ${m.disclosingParty.title}` : ""}${m.disclosingParty.company ? ` of ${m.disclosingParty.company}` : ""}
- Receiving Party: ${m.receivingParty.name}${m.receivingParty.title ? `, ${m.receivingParty.title}` : ""}${m.receivingParty.company ? ` of ${m.receivingParty.company}` : ""}
- Effective Date: ${m.effectiveDate}
- Purpose: ${m.purpose}
- Confidentiality Period: ${m.confidentialityPeriod} years
${m.includeNonSolicit ? "- Include Non-Solicitation clause" : ""}
${m.includeNonCompete ? `- Include Non-Compete clause (${m.nonCompetePeriod} months)` : ""}
${m.geographicScope ? `- Geographic Scope: ${m.geographicScope}` : ""}`;
    }

    case "independent_contractor": {
      const m = metadata as import("./schemas").ContractorMetadata;
      return `
- Client: ${m.client.name}${m.client.title ? `, ${m.client.title}` : ""}${m.client.company ? ` of ${m.client.company}` : ""}
- Contractor: ${m.contractor.name}${m.contractor.title ? `, ${m.contractor.title}` : ""}${m.contractor.company ? ` of ${m.contractor.company}` : ""}
- Effective Date: ${m.effectiveDate}
${m.endDate ? `- End Date: ${m.endDate}` : "- Ongoing engagement"}
- Services: ${m.servicesDescription}
- Payment: $${m.paymentAmount} (${m.paymentFrequency})
- Payment Terms: Net ${m.paymentTerms} days
- Termination Notice: ${m.terminationNoticeDays} days
${m.includeIPAssignment ? "- Include IP Assignment clause" : ""}
${m.includeConfidentiality ? "- Include Confidentiality clause" : ""}`;
    }

    case "consulting_agreement": {
      const m = metadata as import("./schemas").ConsultingMetadata;
      return `
- Client: ${m.client.name}${m.client.title ? `, ${m.client.title}` : ""}${m.client.company ? ` of ${m.client.company}` : ""}
- Consultant: ${m.consultant.name}${m.consultant.title ? `, ${m.consultant.title}` : ""}${m.consultant.company ? ` of ${m.consultant.company}` : ""}
- Effective Date: ${m.effectiveDate}
${m.endDate ? `- End Date: ${m.endDate}` : "- Ongoing engagement"}
- Scope: ${m.consultingScope}
${m.retainerAmount ? `- Retainer: $${m.retainerAmount}` : ""}
${m.hourlyRate ? `- Hourly Rate: $${m.hourlyRate}` : ""}
${m.maxHours ? `- Maximum Hours: ${m.maxHours}` : ""}
- Payment Terms: Net ${m.paymentTerms} days
${m.deliverables?.length ? `- Deliverables: ${m.deliverables.join(", ")}` : ""}
${m.includeNonCompete ? `- Include Non-Compete (${m.nonCompetePeriod} months)` : ""}`;
    }

    case "safe_note": {
      const m = metadata as import("./schemas").SAFEMetadata;
      return `
- Company: ${m.company.name}${m.company.title ? ` (signer: ${m.company.title})` : ""}
- Investor: ${m.investor.name}${m.investor.title ? `, ${m.investor.title}` : ""}${m.investor.company ? ` of ${m.investor.company}` : ""}
- Investment Amount: $${m.investmentAmount.toLocaleString()}
- SAFE Type: ${m.safeType.replace(/_/g, " ")}
${m.valuationCap ? `- Valuation Cap: $${m.valuationCap.toLocaleString()}` : ""}
${m.discountRate ? `- Discount Rate: ${m.discountRate}%` : ""}
- Pro Rata Rights: ${m.proRataRights ? "Yes" : "No"}
- Effective Date: ${m.effectiveDate}`;
    }

    case "freelance_service": {
      const m = metadata as import("./schemas").FreelanceMetadata;
      const deliverablesList = m.deliverables
        .map((d) => `  - ${d.description}${d.dueDate ? ` (due: ${d.dueDate})` : ""}${d.amount ? ` - $${d.amount}` : ""}`)
        .join("\n");
      return `
- Client: ${m.client.name}${m.client.title ? `, ${m.client.title}` : ""}${m.client.company ? ` of ${m.client.company}` : ""}
- Freelancer: ${m.freelancer.name}${m.freelancer.title ? `, ${m.freelancer.title}` : ""}${m.freelancer.company ? ` of ${m.freelancer.company}` : ""}
- Project: ${m.projectName}
- Description: ${m.projectDescription}
- Total Amount: $${m.totalAmount}
${m.depositAmount ? `- Deposit: $${m.depositAmount}` : ""}
- Payment Schedule: ${m.paymentSchedule}
- Revision Rounds: ${m.revisionRounds === -1 ? "Unlimited" : m.revisionRounds}
- Effective Date: ${m.effectiveDate}
${m.deadline ? `- Deadline: ${m.deadline}` : ""}
- Deliverables:
${deliverablesList}`;
    }

    default:
      return JSON.stringify(metadata, null, 2);
  }
}

// ============================================================================
// Clause Modification
// ============================================================================

export interface ClauseModification {
  clauseId: string;
  title: string;
  content: string;
  explanation: string;
}

export async function modifyClause(
  clause: Clause,
  instruction: string,
  contractContext: string
): Promise<ClauseModification> {
  const response = await getOpenAI().chat.completions.create({
    model: CHAT_MODEL,
    max_completion_tokens: 2000,
    messages: [
      {
        role: "system",
        content: getModificationSystemPrompt(),
      },
      {
        role: "user",
        content: `Please modify the following clause based on my instructions.

**Current Clause**:
Title: ${clause.title}
Content:
${clause.content}

**Contract Context**: ${contractContext}

**My Instructions**: ${instruction}

Use the modify_clause function to return the modified clause.`,
      },
    ],
    tools: [modifyClauseFunction],
    tool_choice: { type: "function", function: { name: "modify_clause" } },
  });

  const toolCall = response.choices[0]?.message?.tool_calls?.[0] as {
    type: "function";
    function: { name: string; arguments: string };
  } | undefined;

  if (!toolCall || toolCall.function.name !== "modify_clause") {
    throw new Error("Failed to modify clause: No function response");
  }

  return JSON.parse(toolCall.function.arguments) as ClauseModification;
}

// ============================================================================
// Clause Explanation
// ============================================================================

export interface ClauseExplanation {
  summary: string;
  explanation: string;
  keyPoints: string[];
  risks?: string[];
  negotiationTips?: string[];
}

export async function explainClause(
  clause: Clause,
  contractType: string
): Promise<ClauseExplanation> {
  const response = await getOpenAI().chat.completions.create({
    model: CHAT_MODEL,
    max_completion_tokens: 1500,
    messages: [
      {
        role: "system",
        content: getExplanationSystemPrompt(),
      },
      {
        role: "user",
        content: `Please explain the following clause from a ${contractType} in plain English.

**Clause Title**: ${clause.title}

**Clause Content**:
${clause.content}

Use the explain_clause function to provide a clear explanation.`,
      },
    ],
    tools: [explainClauseFunction],
    tool_choice: { type: "function", function: { name: "explain_clause" } },
  });

  const toolCall = response.choices[0]?.message?.tool_calls?.[0] as {
    type: "function";
    function: { name: string; arguments: string };
  } | undefined;

  if (!toolCall || toolCall.function.name !== "explain_clause") {
    throw new Error("Failed to explain clause: No function response");
  }

  return JSON.parse(toolCall.function.arguments) as ClauseExplanation;
}

// ============================================================================
// Chat with Contract
// ============================================================================

export interface ChatMessage {
  role: "user" | "assistant";
  content: string;
}

export async function chatWithContract(
  messages: ChatMessage[],
  contractContext: {
    type: ContractType;
    clauses: Clause[];
    jurisdiction: Jurisdiction;
  }
): Promise<string> {
  const systemPrompt = `You are a helpful legal assistant for a ${CONTRACT_TYPES[contractContext.type].name} governed by ${JURISDICTION_NAMES[contractContext.jurisdiction]} law.

The user is reviewing their contract and may ask questions or request changes. You can:
1. Explain any clause in plain English
2. Suggest modifications to clauses
3. Answer questions about the legal implications
4. Help negotiate terms

Current contract clauses:
${contractContext.clauses.map((c) => `- ${c.title}`).join("\n")}

Be helpful, accurate, and when suggesting changes, always explain the implications. If asked to make specific changes, provide the exact new wording.`;

  const response = await getOpenAI().chat.completions.create({
    model: CHAT_MODEL,
    max_completion_tokens: 2000,
    messages: [
      {
        role: "system",
        content: systemPrompt,
      },
      ...messages.map((m) => ({
        role: m.role as "user" | "assistant",
        content: m.content,
      })),
    ],
  });

  return response.choices[0]?.message?.content || "I apologize, I could not generate a response.";
}
