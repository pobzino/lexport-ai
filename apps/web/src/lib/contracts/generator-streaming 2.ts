/**
 * Streaming Contract Generator using OpenAI GPT-5.1
 *
 * This module provides streaming contract generation with progress callbacks
 * to support SSE (Server-Sent Events) for real-time progress updates.
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

// Import clause manifests
import californiaManifests from "./manifests/california.json";

// Re-export GeneratedContract type
export type { GeneratedContract } from "./generator";

// Import types from generator
import type { GeneratedContract } from "./generator";

// Lazy initialization of OpenAI client
let openaiClient: OpenAI | null = null;
function getOpenAI(): OpenAI {
  if (!openaiClient) {
    const apiKey = process.env.OPENAI_API_KEY;
    if (!apiKey) {
      throw new Error("OPENAI_API_KEY is not configured");
    }
    openaiClient = new OpenAI({ apiKey });
  }
  return openaiClient;
}

// Models - GPT-5.1 for best quality
const GENERATION_MODEL = "gpt-5.1";
const REASONING_EFFORT = "low";

// Map contract types to manifest keys
const MANIFEST_KEY_MAP: Record<ContractType, string> = {
  nda_mutual: "nda_mutual",
  nda_one_way: "nda_oneway",
  independent_contractor: "contractor_agreement",
  consulting_agreement: "consulting_agreement",
  safe_note: "safe_note",
  freelance_service: "service_agreement",
  letter_of_intent: "letter_of_intent",
  cofounder_agreement: "cofounder_agreement",
  sales_contract: "sales_contract",
  ip_assignment: "ip_assignment",
  advisor_agreement: "advisor_agreement",
  employment_offer: "employment_offer",
  sow: "statement_of_work",
  msa: "master_service_agreement",
  custom: "",
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

// Progress callback type
export type ProgressCallback = (progress: {
  status: string;
  percent: number;
}) => void;

// Get manifest for contract type
function getManifest(
  contractType: ContractType,
  jurisdiction: Jurisdiction
): ClauseManifest | null {
  const manifestKey = MANIFEST_KEY_MAP[contractType];
  const manifests = californiaManifests as Record<string, ClauseManifest>;
  return manifests[manifestKey] || null;
}

// Helper to format signers from signerGroups for the AI prompt
function formatSignersForPrompt(metadata: ContractMetadata): string | null {
  const meta = metadata as Record<string, unknown>;
  const signerGroups = meta.signerGroups as
    | Array<{
        role: string;
        roleLabel: string;
        signers: Array<{
          id: string;
          name: string;
          email: string;
          title?: string;
        }>;
      }>
    | undefined;

  if (!signerGroups || signerGroups.length === 0) {
    return null;
  }

  const lines: string[] = [];
  for (const group of signerGroups) {
    const signerCount = group.signers.filter((s) => s.name || s.email).length;
    if (signerCount === 0) continue;

    if (signerCount === 1) {
      const signer = group.signers[0];
      lines.push(
        `- ${group.roleLabel}: ${signer.name}${signer.title ? `, ${signer.title}` : ""}`
      );
    } else {
      lines.push(`- ${group.roleLabel} (${signerCount} signers):`);
      for (const signer of group.signers) {
        if (signer.name || signer.email) {
          lines.push(
            `  * ${signer.name}${signer.title ? `, ${signer.title}` : ""}`
          );
        }
      }
    }
  }

  return lines.length > 0 ? lines.join("\n") : null;
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

// Build developer prompt with manifest guidance
function buildDeveloperPrompt(
  jurisdiction: Jurisdiction,
  manifest: ClauseManifest | null
): string {
  const jurisdictionName = JURISDICTION_NAMES[jurisdiction];

  let prompt = `You are a legal contract generator for ${jurisdictionName} law.

FORMATTING REQUIREMENTS:
1. Use numbered subsections throughout (1.1, 1.2, 2.1, etc.)
2. Include a Definitions section for key terms
3. Use professional signature block with "By:" line format
4. All clauses must be appropriate for the specific contract type
5. For optional fields not provided, use placeholder format: _____ (5 underscores) that users can fill in later

SIGNATURE BLOCK FOR MULTIPLE SIGNERS:
When there are multiple signers for the same party (e.g., multiple investors, multiple founders, co-clients):
- Create a separate signature section for EACH individual signer
- Group signers by their role/party type with a header
- Each signer must have their own: Signature line, Printed Name, Title (if provided), Date
- Example for 2 founders: "COMPANY (Founders):" followed by two separate signature blocks`;

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

// Format metadata for the prompt based on contract type
function formatMetadataForPrompt(
  contractType: ContractType,
  metadata: ContractMetadata
): string {
  const signersPrompt = formatSignersForPrompt(metadata);

  switch (contractType) {
    case "nda_mutual":
    case "nda_one_way": {
      const m = metadata as import("./schemas").NDAMetadata;
      const partiesSection =
        signersPrompt ||
        `
- Disclosing Party: ${m.disclosingParty.name}${m.disclosingParty.title ? `, ${m.disclosingParty.title}` : ""}${m.disclosingParty.company ? ` of ${m.disclosingParty.company}` : ""}
- Receiving Party: ${m.receivingParty.name}${m.receivingParty.title ? `, ${m.receivingParty.title}` : ""}${m.receivingParty.company ? ` of ${m.receivingParty.company}` : ""}`;
      return `${partiesSection}
- Effective Date: ${m.effectiveDate}
- Purpose: ${m.purpose}
- Confidentiality Period: ${m.confidentialityPeriod} years
${m.includeNonSolicit ? "- Include Non-Solicitation clause" : ""}
${m.includeNonCompete ? `- Include Non-Compete clause (${m.nonCompetePeriod} months)` : ""}
${m.geographicScope ? `- Geographic Scope: ${m.geographicScope}` : ""}`;
    }

    case "independent_contractor": {
      const m = metadata as import("./schemas").ContractorMetadata;
      const partiesSection =
        signersPrompt ||
        `
- Client: ${m.client.name}${m.client.title ? `, ${m.client.title}` : ""}${m.client.company ? ` of ${m.client.company}` : ""}
- Contractor: ${m.contractor.name}${m.contractor.title ? `, ${m.contractor.title}` : ""}${m.contractor.company ? ` of ${m.contractor.company}` : ""}`;
      return `${partiesSection}
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
      const partiesSection =
        signersPrompt ||
        `
- Client: ${m.client.name}${m.client.title ? `, ${m.client.title}` : ""}${m.client.company ? ` of ${m.client.company}` : ""}
- Consultant: ${m.consultant.name}${m.consultant.title ? `, ${m.consultant.title}` : ""}${m.consultant.company ? ` of ${m.consultant.company}` : ""}`;
      return `${partiesSection}
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
      const partiesSection =
        signersPrompt ||
        `
- Company: ${m.company.name}${m.company.title ? ` (signer: ${m.company.title})` : ""}
- Investor: ${m.investor.name}${m.investor.title ? `, ${m.investor.title}` : ""}${m.investor.company ? ` of ${m.investor.company}` : ""}`;
      return `${partiesSection}
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
        .map(
          (d) =>
            `  - ${d.description}${d.dueDate ? ` (due: ${d.dueDate})` : ""}${d.amount ? ` - $${d.amount}` : ""}`
        )
        .join("\n");
      const partiesSection =
        signersPrompt ||
        `
- Client: ${m.client.name}${m.client.title ? `, ${m.client.title}` : ""}${m.client.company ? ` of ${m.client.company}` : ""}
- Freelancer: ${m.freelancer.name}${m.freelancer.title ? `, ${m.freelancer.title}` : ""}${m.freelancer.company ? ` of ${m.freelancer.company}` : ""}`;
      return `${partiesSection}
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

// Build user prompt with contract details
function buildUserPrompt(
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

// Custom contract generation with streaming progress
async function generateCustomContractStreaming(
  metadata: ContractMetadata,
  onProgress: ProgressCallback
): Promise<GeneratedContract> {
  const meta = metadata as Record<string, unknown>;
  const customContractName =
    (meta.customContractName as string) || "Custom Agreement";
  const customContractDescription =
    (meta.customContractDescription as string) || "";
  const jurisdiction = metadata.jurisdiction;
  const jurisdictionName = JURISDICTION_NAMES[jurisdiction];

  onProgress({ status: "Preparing custom contract template...", percent: 25 });

  const signersPrompt = formatSignersForPrompt(metadata);

  const developerPrompt = `You are an expert legal contract drafter specializing in ${jurisdictionName} law. You are generating a ${customContractName}.

IMPORTANT: This is a custom contract type. Generate appropriate clauses based on the contract name and description provided.

FORMATTING REQUIREMENTS:
1. Use numbered subsections throughout (1.1, 1.2, 2.1, etc.)
2. Include a Definitions section for key terms
3. Use professional signature block with "By:" line format
4. Generate clauses appropriate for this specific contract type
5. For optional fields not provided, use placeholder format: _____ (5 underscores)

Key requirements for ${jurisdictionName}:
${getJurisdictionRequirements(jurisdiction)}

SIGNATURE BLOCK FOR MULTIPLE SIGNERS:
When there are multiple signers:
- Create a separate signature section for EACH individual signer
- Group signers by their role/party type with a header
- Each signer must have their own: Signature line, Printed Name, Title (if provided), Date

Generate a professional, legally sound ${customContractName} with appropriate clauses for this type of agreement.

Output as JSON:
{
  "title": "string",
  "preamble": "string",
  "recitals": "string",
  "clauses": [{"id": "string", "title": "string", "content": "string", "type": "standard|negotiable|optional", "order": number}],
  "signatureBlock": "string"
}`;

  const userPrompt = `Generate a ${customContractName} for ${jurisdictionName}.

CONTRACT DETAILS:
- Contract Type: ${customContractName}
${customContractDescription ? `- Description: ${customContractDescription}` : ""}
- Effective Date: ${meta.effectiveDate || "To be determined"}
${signersPrompt ? `\nPARTIES:\n${signersPrompt}` : ""}

${meta.followUpAnswers ? `ADDITIONAL DETAILS:\n${JSON.stringify(meta.followUpAnswers, null, 2)}` : ""}

Return only valid JSON.`;

  onProgress({ status: "AI is generating custom contract...", percent: 35 });

  // Use GPT-5.1 with Responses API
  const response = await (getOpenAI() as unknown as { responses: { create: (params: unknown) => Promise<{ output_text: string }> } }).responses.create({
    model: GENERATION_MODEL,
    reasoning: { effort: REASONING_EFFORT },
    input: [
      { role: "developer", content: developerPrompt },
      { role: "user", content: userPrompt },
    ],
  });

  onProgress({ status: "Processing AI response...", percent: 75 });

  const content = response.output_text || "";

  // Parse JSON from response
  const jsonMatch = content.match(/\{[\s\S]*\}/);
  if (!jsonMatch) {
    throw new Error("Failed to generate custom contract: No JSON in response");
  }

  onProgress({ status: "Structuring contract clauses...", percent: 85 });

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

/**
 * Generate a contract with streaming progress updates
 *
 * @param contractType - The type of contract to generate
 * @param metadata - Contract metadata including parties and terms
 * @param onProgress - Callback function for progress updates
 * @returns Promise<GeneratedContract> - The generated contract
 */
export async function generateContractStreaming(
  contractType: ContractType,
  metadata: ContractMetadata,
  onProgress: ProgressCallback
): Promise<GeneratedContract> {
  const jurisdiction = metadata.jurisdiction;

  // Handle custom contracts specially
  if (contractType === "custom") {
    return generateCustomContractStreaming(metadata, onProgress);
  }

  const typeDefinition = CONTRACT_TYPES[contractType];

  onProgress({ status: "Loading contract template...", percent: 25 });

  // Get manifest for this contract type
  const manifest = getManifest(contractType, jurisdiction);

  onProgress({ status: "Preparing legal requirements...", percent: 30 });

  // Build the prompts
  const developerPrompt = buildDeveloperPrompt(jurisdiction, manifest);
  const userPrompt = buildUserPrompt(
    contractType,
    metadata,
    typeDefinition,
    manifest
  );

  onProgress({
    status: "AI is drafting your contract...",
    percent: 40,
  });

  // Use GPT-5.1 with Responses API for generation
  const response = await (getOpenAI() as unknown as { responses: { create: (params: unknown) => Promise<{ output_text: string }> } }).responses.create({
    model: GENERATION_MODEL,
    reasoning: { effort: REASONING_EFFORT },
    input: [
      { role: "developer", content: developerPrompt },
      { role: "user", content: userPrompt },
    ],
  });

  onProgress({ status: "Processing AI response...", percent: 70 });

  const content = response.output_text || "";

  // Parse JSON from response
  const jsonMatch = content.match(/\{[\s\S]*\}/);
  if (!jsonMatch) {
    throw new Error("Failed to generate contract: No JSON in response");
  }

  onProgress({ status: "Structuring contract clauses...", percent: 80 });

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

  onProgress({ status: "Finalizing contract...", percent: 85 });

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
