/**
 * Contract Risk Analyzer using OpenAI GPT-4.1
 *
 * Analyzes contracts for:
 * - Unusual or non-standard clauses
 * - Missing standard protections
 * - One-sided terms
 * - Jurisdiction-specific legal issues
 */

import OpenAI from "openai";
import crypto from "crypto";
import type {
  ClauseRisk,
  MissingProtection,
  JurisdictionAlert,
  RiskAnalysisResult,
} from "@/types/risk-analysis";

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

const ANALYSIS_MODEL = "gpt-4.1"; // Best accuracy for risk detection

// ============================================================================
// Contract Content Interface
// ============================================================================

interface ClauseData {
  id: string;
  title: string;
  content: string;
  type?: string;
  order?: number;
}

interface ContractContent {
  preamble: string;
  recitals: string;
  clauses: ClauseData[];
  signatureBlock: string;
}

interface Contract {
  id: string;
  title: string;
  type: string;
  jurisdiction: string;
  content: ContractContent;
}

// ============================================================================
// Content Hash Generation
// ============================================================================

/**
 * Generate a SHA256 hash of contract content for cache invalidation
 */
export function generateContentHash(content: ContractContent): string {
  const contentString = JSON.stringify({
    preamble: content.preamble,
    recitals: content.recitals,
    clauses: content.clauses.map((c) => ({
      id: c.id,
      title: c.title,
      content: c.content,
    })),
    signatureBlock: content.signatureBlock,
  });

  return crypto.createHash("sha256").update(contentString).digest("hex");
}

// ============================================================================
// Jurisdiction-Specific Rules
// ============================================================================

const JURISDICTION_RULES: Record<string, string> = {
  us_california: `
CALIFORNIA-SPECIFIC LEGAL RULES:
- Non-compete clauses are UNENFORCEABLE (Business & Professions Code Section 16600)
- Independent contractor classification must meet ABC test (AB5/Dynamex)
- At-will employment cannot be waived by implication
- CCPA applies to personal information handling
- Broad non-solicitation clauses may be void
- Employee invention assignment has carve-outs (Labor Code Section 2870)
- Indemnification of own negligence may be limited`,

  us_texas: `
TEXAS-SPECIFIC LEGAL RULES:
- Non-competes ARE enforceable if reasonable in scope, geography, and duration
- Must be ancillary to an otherwise enforceable agreement
- At-will employment is strongly presumed
- No specific independent contractor test (uses common law factors)
- Broad indemnification clauses generally enforceable
- Choice of law provisions generally upheld`,

  us_new_york: `
NEW YORK-SPECIFIC LEGAL RULES:
- Non-competes enforced if reasonable and necessary to protect legitimate interests
- Stricter review for employee non-competes vs. business sale contexts
- Independent contractor test focuses on control factors
- Forum selection clauses generally upheld
- Mandatory arbitration may be limited in certain contexts
- Indemnification provisions broadly enforced`,

  uk: `
UK-SPECIFIC LEGAL RULES:
- Restrictive covenants must be no wider than reasonably necessary
- GDPR compliance required for ALL personal data handling
- IR35 rules for contractor classification (off-payroll working)
- Consumer Rights Act 2015 applies to consumer contracts
- Unfair Contract Terms Act 1977 limits exclusion clauses
- Data processing agreements required for any personal data
- Unfair dismissal protections after 2 years employment`,
};

// ============================================================================
// Standard Clauses by Contract Type
// ============================================================================

const STANDARD_CLAUSES: Record<string, string[]> = {
  nda_mutual: [
    "Definition of Confidential Information",
    "Obligations of Receiving Party",
    "Exclusions from Confidential Information",
    "Term and Survival of Confidentiality",
    "Return or Destruction of Information",
    "Injunctive Relief",
    "No License Granted",
  ],
  nda_one_way: [
    "Definition of Confidential Information",
    "Obligations of Receiving Party",
    "Exclusions from Confidential Information",
    "Term and Survival",
    "Return or Destruction",
    "Remedies",
  ],
  independent_contractor: [
    "Scope of Services",
    "Compensation and Payment Terms",
    "Independent Contractor Status",
    "Intellectual Property Assignment",
    "Confidentiality",
    "Term and Termination",
    "Indemnification",
    "Limitation of Liability",
    "Insurance Requirements",
  ],
  consulting_agreement: [
    "Scope of Consulting Services",
    "Compensation",
    "Expenses",
    "Intellectual Property Rights",
    "Confidentiality",
    "Non-Solicitation",
    "Term and Termination",
    "Limitation of Liability",
  ],
  safe_note: [
    "Investment Amount",
    "Valuation Cap",
    "Discount Rate",
    "Conversion Events",
    "Pro Rata Rights",
    "MFN Clause",
    "Dissolution Rights",
    "Representations and Warranties",
  ],
  freelance_service: [
    "Scope of Work",
    "Deliverables",
    "Payment Terms",
    "Revision Policy",
    "Intellectual Property",
    "Confidentiality",
    "Termination",
    "Limitation of Liability",
  ],
};

// ============================================================================
// OpenAI Function Calling Schema
// ============================================================================

const analyzeContractFunction: OpenAI.Chat.Completions.ChatCompletionTool = {
  type: "function",
  function: {
    name: "analyze_contract_risks",
    description:
      "Analyze a contract for risks, unusual terms, missing protections, and jurisdiction issues",
    parameters: {
      type: "object",
      properties: {
        overall_risk_level: {
          type: "string",
          enum: ["low", "medium", "high"],
          description: "Overall risk level based on cumulative findings",
        },
        overall_summary: {
          type: "string",
          description: "2-3 sentence executive summary of key findings",
        },
        clause_risks: {
          type: "array",
          description: "Risks identified in specific clauses",
          items: {
            type: "object",
            properties: {
              clauseId: { type: "string" },
              clauseTitle: { type: "string" },
              severity: { type: "string", enum: ["info", "warning", "critical"] },
              category: {
                type: "string",
                enum: [
                  "unusual_terms",
                  "missing_protection",
                  "one_sided",
                  "jurisdiction_issue",
                  "ambiguity",
                  "liability_exposure",
                ],
              },
              title: { type: "string", description: "Brief risk title" },
              description: { type: "string", description: "Plain English explanation" },
              problematicText: { type: "string", description: "The specific concerning text" },
              suggestion: { type: "string", description: "Recommended fix" },
              affectedParty: { type: "string", enum: ["client", "contractor", "both"] },
            },
            required: ["clauseId", "clauseTitle", "severity", "category", "title", "description"],
          },
        },
        missing_protections: {
          type: "array",
          description: "Standard protections that are absent",
          items: {
            type: "object",
            properties: {
              severity: { type: "string", enum: ["info", "warning", "critical"] },
              title: { type: "string" },
              description: { type: "string" },
              standardFor: {
                type: "array",
                items: { type: "string" },
                description: "Contract types where this is standard",
              },
              suggestion: { type: "string", description: "Recommended clause to add" },
            },
            required: ["severity", "title", "description", "suggestion"],
          },
        },
        jurisdiction_alerts: {
          type: "array",
          description: "Jurisdiction-specific legal alerts",
          items: {
            type: "object",
            properties: {
              severity: { type: "string", enum: ["info", "warning", "critical"] },
              jurisdiction: { type: "string" },
              title: { type: "string" },
              description: { type: "string" },
              legalReference: { type: "string", description: "Relevant statute or code" },
              affectedClauseId: { type: "string" },
            },
            required: ["severity", "jurisdiction", "title", "description"],
          },
        },
      },
      required: [
        "overall_risk_level",
        "overall_summary",
        "clause_risks",
        "missing_protections",
        "jurisdiction_alerts",
      ],
    },
  },
};

// ============================================================================
// System Prompt Builder
// ============================================================================

function buildSystemPrompt(jurisdiction: string, contractType: string): string {
  const jurisdictionRules =
    JURISDICTION_RULES[jurisdiction] ||
    "Standard contract law principles apply. Review for reasonableness and enforceability.";

  const standardClauses = STANDARD_CLAUSES[contractType] || [];
  const standardClausesText =
    standardClauses.length > 0
      ? standardClauses.map((c, i) => `${i + 1}. ${c}`).join("\n")
      : "No specific standard clauses defined for this contract type.";

  const contractTypeName = contractType.replace(/_/g, " ").toUpperCase();
  const jurisdictionName = jurisdiction.replace("us_", "").replace("_", " ").toUpperCase();

  return `You are an expert legal contract analyst specializing in ${jurisdictionName} law, reviewing a ${contractTypeName}.

Your task is to identify risks, unusual terms, and potential issues. Focus on protecting the user who created this contract while also noting issues that could affect either party.

${jurisdictionRules}

STANDARD CLAUSES EXPECTED IN A ${contractTypeName}:
${standardClausesText}

CRITICAL QUALITY RULES - FOLLOW THESE STRICTLY:

1. NO DUPLICATES: Each issue should appear ONCE. Do not report the same issue multiple times under different categories. For example, if a non-compete clause has jurisdiction issues, report it ONCE, not as both a "clause risk" AND a "jurisdiction alert".

2. READ CAREFULLY BEFORE FLAGGING MISSING ITEMS: Before claiming something is "missing", thoroughly search the entire contract. For example, if survival language exists (like "obligations shall survive for as long as information remains a trade secret"), do NOT flag survival as missing.

3. ACKNOWLEDGE SELF-AWARE CLAUSES: If a contract explicitly acknowledges a clause may be unenforceable (e.g., "to the extent permitted by law" or "may not be enforceable in certain jurisdictions"), lower the severity to "info" rather than "critical" - the drafter was aware.

4. CONTRACT-TYPE APPROPRIATE SUGGESTIONS:
   - NDAs typically do NOT require insurance clauses - don't suggest adding them
   - For acquisition-related NDAs, focus on confidentiality, not employment restrictions
   - Match suggestions to what's standard for this specific contract type

ANALYSIS CATEGORIES:

1. DRAFTING ERRORS (category: ambiguity) - HIGH PRIORITY
   - Party name issues (same name for both parties, typos, duplications)
   - Unremoved template placeholders or metadata (words like "standard", "negotiable", "[BLANK]", underscores as placeholders)
   - Incomplete sections or obvious copy-paste errors
   - Missing definitions for key terms used in the contract

2. STRUCTURAL IMBALANCE (category: one_sided)
   - Completely one-sided agreements with no reciprocal protections
   - Asymmetric obligations (one party has all duties, other has all rights)
   - Missing damage caps or liability limits that expose one party excessively
   - Unreasonable notice periods or termination rights

3. JURISDICTION ISSUES (category: jurisdiction_issue)
   - Clauses that conflict with ${jurisdictionName} law
   - Note provisions that may be unenforceable - but reduce severity if contract acknowledges this
   - Compliance requirements (GDPR, CCPA, etc.)

4. UNUSUAL TERMS (category: unusual_terms)
   - Provisions that deviate significantly from standard ${contractTypeName} agreements
   - Consider industry norms and common practices
   - Only flag if genuinely unusual, not just comprehensive

5. MISSING PROTECTIONS (category: missing_protection)
   - ONLY flag if you've confirmed the protection is truly absent
   - Standard protective clauses that are absent AND would be expected for this contract type
   - Examples: Missing limitation of liability, no indemnification cap

6. LIABILITY EXPOSURE (category: liability_exposure)
   - Unlimited or uncapped liability (this is a real issue worth flagging)
   - Excessive indemnification obligations
   - Do NOT suggest insurance for contract types that don't typically require it

SEVERITY LEVELS:
- critical: Legally problematic AND drafter appears unaware, or creates significant unmitigated liability. Requires immediate attention.
- warning: One-sided or unusual terms that should be negotiated. Important but not blocking.
- info: Minor observations, self-acknowledged limitations, or suggestions. Good to know.

OUTPUT QUALITY:
- Be precise, not padded. 3-5 genuine issues is better than 10 redundant ones.
- Focus on actionable findings that would help a non-lawyer understand real risks.
- Avoid legal jargon where possible.
- If the contract is well-drafted, say so - don't manufacture issues.`;
}

// ============================================================================
// Main Analysis Function
// ============================================================================

/**
 * Analyze a contract for risks using OpenAI
 */
export async function analyzeContractRisks(
  contract: Contract
): Promise<Omit<RiskAnalysisResult, "id" | "contractId" | "contentHash" | "analyzedAt">> {
  const openai = getOpenAI();

  const systemPrompt = buildSystemPrompt(contract.jurisdiction, contract.type);

  // Build contract content for analysis
  const clausesSummary = contract.content.clauses
    .map(
      (c, i) =>
        `CLAUSE ${i + 1} (ID: ${c.id}): ${c.title}
Type: ${c.type}
Content:
${c.content}
---`
    )
    .join("\n\n");

  const userPrompt = `Please analyze the following ${contract.type.replace(/_/g, " ")} contract governed by ${contract.jurisdiction.replace("us_", "").replace("_", " ")} law:

TITLE: ${contract.title}

PREAMBLE:
${contract.content.preamble}

RECITALS:
${contract.content.recitals || "None"}

CLAUSES:
${clausesSummary}

SIGNATURE BLOCK:
${contract.content.signatureBlock}

---

Analyze this contract for:
1. Unusual or non-standard terms
2. Missing standard protections
3. One-sided clauses
4. Jurisdiction-specific legal issues
5. Ambiguous language
6. Liability exposure

Provide your analysis using the analyze_contract_risks function.`;

  const response = await openai.chat.completions.create({
    model: ANALYSIS_MODEL,
    messages: [
      { role: "system", content: systemPrompt },
      { role: "user", content: userPrompt },
    ],
    tools: [analyzeContractFunction],
    tool_choice: { type: "function", function: { name: "analyze_contract_risks" } },
    max_tokens: 4000,
  });

  // Extract function call response
  const toolCall = response.choices[0]?.message?.tool_calls?.[0];
  if (!toolCall || toolCall.type !== "function" || toolCall.function.name !== "analyze_contract_risks") {
    throw new Error("Failed to get structured risk analysis from OpenAI");
  }

  const analysis = JSON.parse(toolCall.function.arguments) as {
    overall_risk_level: "low" | "medium" | "high";
    overall_summary: string;
    clause_risks: ClauseRisk[];
    missing_protections: MissingProtection[];
    jurisdiction_alerts: JurisdictionAlert[];
  };

  // Calculate stats
  const allItems = [
    ...analysis.clause_risks,
    ...analysis.missing_protections,
    ...analysis.jurisdiction_alerts,
  ];

  const stats = {
    total: allItems.length,
    critical: allItems.filter((i) => i.severity === "critical").length,
    warning: allItems.filter((i) => i.severity === "warning").length,
    info: allItems.filter((i) => i.severity === "info").length,
  };

  return {
    overallRiskLevel: analysis.overall_risk_level,
    overallSummary: analysis.overall_summary,
    clauseRisks: analysis.clause_risks,
    missingProtections: analysis.missing_protections,
    jurisdictionAlerts: analysis.jurisdiction_alerts,
    stats,
  };
}
