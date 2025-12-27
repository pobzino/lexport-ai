/**
 * Contract Generator using OpenAI GPT
 *
 * Uses OpenAI's function calling for structured outputs to generate
 * consistent, clause-based contracts.
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

// Model to use - GPT-4o is the latest with best function calling
const MODEL = "gpt-4o";

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
          description: "Signature block with spaces for all parties to sign",
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
- Make the signature block appropriate for the parties involved

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
// Contract Generation
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

  // Build the user prompt with all the metadata
  const userPrompt = buildGenerationPrompt(contractType, metadata, typeDefinition);

  const response = await getOpenAI().chat.completions.create({
    model: MODEL,
    max_tokens: 8000,
    messages: [
      {
        role: "system",
        content: getGenerationSystemPrompt(jurisdiction),
      },
      {
        role: "user",
        content: userPrompt,
      },
    ],
    tools: [generateContractFunction],
    tool_choice: { type: "function", function: { name: "generate_contract" } },
  });

  // Extract the function call response
  const toolCall = response.choices[0]?.message?.tool_calls?.[0] as {
    type: "function";
    function: { name: string; arguments: string };
  } | undefined;

  if (!toolCall || toolCall.function.name !== "generate_contract") {
    throw new Error("Failed to generate contract: No function response");
  }

  const input = JSON.parse(toolCall.function.arguments) as {
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
  const clauses: Clause[] = input.clauses.map((c) => ({
    ...c,
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
- Disclosing Party: ${m.disclosingParty.name}${m.disclosingParty.company ? ` (${m.disclosingParty.company})` : ""}
- Receiving Party: ${m.receivingParty.name}${m.receivingParty.company ? ` (${m.receivingParty.company})` : ""}
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
- Client: ${m.client.name}${m.client.company ? ` (${m.client.company})` : ""}
- Contractor: ${m.contractor.name}${m.contractor.company ? ` (${m.contractor.company})` : ""}
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
- Client: ${m.client.name}${m.client.company ? ` (${m.client.company})` : ""}
- Consultant: ${m.consultant.name}${m.consultant.company ? ` (${m.consultant.company})` : ""}
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
- Company: ${m.company.name}
- Investor: ${m.investor.name}
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
- Client: ${m.client.name}${m.client.company ? ` (${m.client.company})` : ""}
- Freelancer: ${m.freelancer.name}${m.freelancer.company ? ` (${m.freelancer.company})` : ""}
- Project: ${m.projectName}
- Description: ${m.projectDescription}
- Total Amount: $${m.totalAmount}
${m.depositAmount ? `- Deposit: $${m.depositAmount}` : ""}
- Payment Schedule: ${m.paymentSchedule}
- Revision Rounds: ${m.revisionRounds}
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
    model: MODEL,
    max_tokens: 2000,
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
    model: MODEL,
    max_tokens: 1500,
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
    model: MODEL,
    max_tokens: 2000,
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
