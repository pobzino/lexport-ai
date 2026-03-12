/**
 * Template Quality Reviewer using OpenAI GPT-5.4
 *
 * Reviews contract templates for:
 * - Legal accuracy and completeness
 * - Clause quality and depth
 * - Jurisdiction compliance
 * - Placeholder correctness
 * - Professional language and formatting
 *
 * Uses GPT-5.4 with medium reasoning for thorough, accurate review.
 */

import OpenAI from "openai";

// Lazy initialization
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

const REVIEW_MODEL = "gpt-5.4";
const REASONING_EFFORT = "medium"; // Balance of quality and cost

// ============================================================================
// Types
// ============================================================================

export interface TemplateReviewResult {
  qualityScore: number; // 0-100
  verdict: "publish" | "revise" | "reject";
  summary: string;
  clauseReviews: ClauseReview[];
  missingClauses: MissingClause[];
  jurisdictionIssues: JurisdictionIssue[];
  placeholderIssues: PlaceholderIssue[];
  languageIssues: LanguageIssue[];
  recommendations: string[];
}

export interface ClauseReview {
  clauseTitle: string;
  score: number; // 0-10
  strengths: string[];
  weaknesses: string[];
  suggestion?: string;
}

export interface MissingClause {
  title: string;
  importance: "required" | "recommended" | "optional";
  reason: string;
}

export interface JurisdictionIssue {
  severity: "critical" | "warning" | "info";
  title: string;
  description: string;
  legalReference?: string;
  affectedClause?: string;
}

export interface PlaceholderIssue {
  type: "missing" | "hardcoded" | "malformed";
  location: string;
  description: string;
  suggestion: string;
}

export interface LanguageIssue {
  severity: "error" | "warning" | "suggestion";
  location: string;
  description: string;
  suggestion: string;
}

// ============================================================================
// Template Content Interface
// ============================================================================

interface TemplateContent {
  preamble?: string;
  recitals?: string;
  clauses?: Array<{
    id?: string;
    title: string;
    content: string;
    type?: string;
  }>;
  signatureBlock?: string;
}

interface TemplateForReview {
  id: string;
  name: string;
  type: string;
  jurisdiction: string;
  content: TemplateContent;
  placeholders?: Record<string, unknown>;
}

// ============================================================================
// Jurisdiction Rules (for review context)
// ============================================================================

const JURISDICTION_CONTEXT: Record<string, string> = {
  us_california: `California law:
- Non-competes unenforceable (Bus. & Prof. Code §16600)
- AB5 ABC test for contractor classification
- CCPA/CPRA data protection requirements
- Silenced No More Act (SB 331) — NDAs cannot restrict harassment/discrimination disclosure
- Employee invention carve-outs (Labor Code §2870)
- Freelance Worker Protection Act — written contracts required for engagements over $250`,

  us_texas: `Texas law:
- Non-competes enforceable if reasonable in scope, geography, and duration
- Must be ancillary to an otherwise enforceable agreement
- Texas Uniform Trade Secrets Act (TUTSA)
- At-will employment strongly presumed
- Texas Business and Commerce Code governs commercial transactions
- Courts may reform overly broad restrictions`,

  us_new_york: `New York law:
- Recent restrictions on non-compete agreements
- Common-law test for independent contractor classification
- Strong consumer protection laws
- NY General Obligations Law §5-1401 for choice of law
- Strict enforcement of written contract terms
- Preliminary injunctions available through CPLR Article 63`,

  uk: `United Kingdom law:
- UK GDPR and Data Protection Act 2018 — data processing provisions required
- IR35 off-payroll working rules for contractor classification
- Restrictive covenants must be reasonable and proportionate
- Consumer Rights Act 2015 and Unfair Contract Terms Act 1977
- Employment Rights Act protections
- Public Interest Disclosure Act 1998 (whistleblowing)`,
};

// ============================================================================
// Expected Clauses by Type
// ============================================================================

const EXPECTED_CLAUSES: Record<string, Array<{ title: string; importance: "required" | "recommended" | "optional" }>> = {
  nda_mutual: [
    { title: "Definition of Confidential Information", importance: "required" },
    { title: "Obligations of Receiving Party", importance: "required" },
    { title: "Exclusions from Confidential Information", importance: "required" },
    { title: "Permitted Disclosures / Compelled Disclosure", importance: "required" },
    { title: "Term and Survival", importance: "required" },
    { title: "Return or Destruction of Materials", importance: "required" },
    { title: "Remedies / Injunctive Relief", importance: "recommended" },
    { title: "No License Granted", importance: "recommended" },
    { title: "Governing Law and Dispute Resolution", importance: "recommended" },
    { title: "Notices", importance: "optional" },
  ],
  nda_one_way: [
    { title: "Definition of Confidential Information", importance: "required" },
    { title: "Obligations of Receiving Party", importance: "required" },
    { title: "Exclusions from Confidential Information", importance: "required" },
    { title: "Compelled Disclosure", importance: "required" },
    { title: "Term and Termination", importance: "required" },
    { title: "Return or Destruction of Materials", importance: "required" },
    { title: "Remedies", importance: "recommended" },
    { title: "Governing Law", importance: "recommended" },
  ],
  independent_contractor: [
    { title: "Scope of Services", importance: "required" },
    { title: "Compensation and Payment Terms", importance: "required" },
    { title: "Independent Contractor Status", importance: "required" },
    { title: "Intellectual Property Assignment", importance: "required" },
    { title: "Confidentiality", importance: "required" },
    { title: "Term and Termination", importance: "required" },
    { title: "Indemnification", importance: "recommended" },
    { title: "Limitation of Liability", importance: "recommended" },
    { title: "Insurance Requirements", importance: "optional" },
    { title: "Governing Law", importance: "recommended" },
  ],
  consulting_agreement: [
    { title: "Scope of Consulting Services", importance: "required" },
    { title: "Compensation", importance: "required" },
    { title: "Expenses", importance: "recommended" },
    { title: "Intellectual Property Rights", importance: "required" },
    { title: "Confidentiality", importance: "required" },
    { title: "Non-Solicitation", importance: "recommended" },
    { title: "Term and Termination", importance: "required" },
    { title: "Limitation of Liability", importance: "recommended" },
    { title: "Governing Law", importance: "recommended" },
  ],
  freelance_service: [
    { title: "Scope of Work and Deliverables", importance: "required" },
    { title: "Payment Terms and Schedule", importance: "required" },
    { title: "Timeline and Deadlines", importance: "required" },
    { title: "Revision Policy", importance: "required" },
    { title: "Intellectual Property Transfer", importance: "required" },
    { title: "Confidentiality", importance: "recommended" },
    { title: "Termination and Kill Fee", importance: "recommended" },
    { title: "Limitation of Liability", importance: "recommended" },
  ],
};

// ============================================================================
// Review Function
// ============================================================================

/**
 * Review a contract template for quality, completeness, and legal accuracy.
 * Uses GPT-5.4 with structured output via the Responses API.
 */
export async function reviewTemplate(
  template: TemplateForReview
): Promise<TemplateReviewResult> {
  const openai = getOpenAI();

  const jurisdictionContext =
    JURISDICTION_CONTEXT[template.jurisdiction] ||
    "Standard contract law principles apply.";

  const expectedClauses = EXPECTED_CLAUSES[template.type] || [];
  const expectedClausesText = expectedClauses.length > 0
    ? expectedClauses
        .map((c) => `- ${c.title} (${c.importance})`)
        .join("\n")
    : "No specific clause expectations defined for this contract type.";

  const typeName = template.type.replace(/_/g, " ").toUpperCase();
  const clausesText = (template.content.clauses || [])
    .map(
      (c, i) =>
        `CLAUSE ${i + 1}: ${c.title}\nType: ${c.type || "standard"}\nContent:\n${c.content}\n---`
    )
    .join("\n\n");

  const systemPrompt = `You are a senior legal quality reviewer with expertise in contract drafting across US and UK jurisdictions. You are reviewing a ${typeName} template for publication on a legal contract marketplace.

${jurisdictionContext}

EXPECTED CLAUSES FOR ${typeName}:
${expectedClausesText}

Your review must evaluate:

1. LEGAL ACCURACY — Are the legal provisions correct for this jurisdiction? Are there any legally problematic statements?

2. COMPLETENESS — Are all required and recommended clauses present? Are clause contents substantive enough (not just headings or stubs)?

3. PLACEHOLDER CORRECTNESS — Templates should use {{placeholders}} like {{party_a_name}}, {{effective_date}}, {{payment_amount}}. Flag any hardcoded names (John Doe, Acme Inc), dates, or amounts that should be placeholders.

4. PROFESSIONAL LANGUAGE — Is the language professional, clear, and free of grammatical errors? Are legal terms used correctly?

5. JURISDICTION COMPLIANCE — Does the template comply with the specific jurisdiction's laws? Are there any provisions that would be unenforceable?

6. CLAUSE DEPTH — Each clause should be substantive (150+ words for major clauses). Flag any thin or stub clauses that need expansion.

SCORING:
- 90-100: Publish as-is. Excellent quality, legally sound, comprehensive.
- 70-89: Minor revisions needed. Good foundation, but some clauses need improvement.
- 50-69: Significant revisions needed. Missing key clauses or has legal issues.
- Below 50: Reject. Fundamental problems with accuracy, completeness, or quality.

VERDICT:
- "publish": Score 85+, no critical issues
- "revise": Score 50-84, fixable issues
- "reject": Score below 50, fundamental problems

Be thorough but fair. A well-drafted template with minor stylistic issues should still score highly.`;

  const userPrompt = `Review this ${typeName} template for ${template.jurisdiction.replace("us_", "").replace("_", " ")}:

TEMPLATE NAME: ${template.name}
TEMPLATE ID: ${template.id}

PREAMBLE:
${template.content.preamble || "(empty)"}

RECITALS:
${template.content.recitals || "(empty)"}

CLAUSES:
${clausesText || "(no clauses)"}

SIGNATURE BLOCK:
${template.content.signatureBlock || "(empty)"}

Provide a comprehensive quality review.`;

  const reviewSchema = {
    type: "object" as const,
    properties: {
      qualityScore: { type: "number" as const, description: "Quality score 0-100" },
      verdict: { type: "string" as const, enum: ["publish", "revise", "reject"] },
      summary: { type: "string" as const, description: "2-3 sentence executive summary" },
      clauseReviews: {
        type: "array" as const,
        items: {
          type: "object" as const,
          properties: {
            clauseTitle: { type: "string" as const },
            score: { type: "number" as const, description: "Score 0-10" },
            strengths: { type: "array" as const, items: { type: "string" as const } },
            weaknesses: { type: "array" as const, items: { type: "string" as const } },
            suggestion: { type: "string" as const },
          },
          required: ["clauseTitle", "score", "strengths", "weaknesses"],
        },
      },
      missingClauses: {
        type: "array" as const,
        items: {
          type: "object" as const,
          properties: {
            title: { type: "string" as const },
            importance: { type: "string" as const, enum: ["required", "recommended", "optional"] },
            reason: { type: "string" as const },
          },
          required: ["title", "importance", "reason"],
        },
      },
      jurisdictionIssues: {
        type: "array" as const,
        items: {
          type: "object" as const,
          properties: {
            severity: { type: "string" as const, enum: ["critical", "warning", "info"] },
            title: { type: "string" as const },
            description: { type: "string" as const },
            legalReference: { type: "string" as const },
            affectedClause: { type: "string" as const },
          },
          required: ["severity", "title", "description"],
        },
      },
      placeholderIssues: {
        type: "array" as const,
        items: {
          type: "object" as const,
          properties: {
            type: { type: "string" as const, enum: ["missing", "hardcoded", "malformed"] },
            location: { type: "string" as const },
            description: { type: "string" as const },
            suggestion: { type: "string" as const },
          },
          required: ["type", "location", "description", "suggestion"],
        },
      },
      languageIssues: {
        type: "array" as const,
        items: {
          type: "object" as const,
          properties: {
            severity: { type: "string" as const, enum: ["error", "warning", "suggestion"] },
            location: { type: "string" as const },
            description: { type: "string" as const },
            suggestion: { type: "string" as const },
          },
          required: ["severity", "location", "description", "suggestion"],
        },
      },
      recommendations: {
        type: "array" as const,
        items: { type: "string" as const },
        description: "Top 3-5 actionable recommendations to improve the template",
      },
    },
    required: [
      "qualityScore",
      "verdict",
      "summary",
      "clauseReviews",
      "missingClauses",
      "jurisdictionIssues",
      "placeholderIssues",
      "languageIssues",
      "recommendations",
    ],
    additionalProperties: false,
  };

  const response = await openai.responses.create({
    model: REVIEW_MODEL,
    reasoning: { effort: REASONING_EFFORT as "medium" },
    instructions: systemPrompt,
    input: userPrompt,
    text: {
      format: {
        type: "json_schema",
        name: "template_review",
        schema: reviewSchema,
        strict: true,
      },
    },
  });

  const outputText = response.output_text;
  if (!outputText) {
    throw new Error("No output from GPT-5.4 template review");
  }

  return JSON.parse(outputText) as TemplateReviewResult;
}

/**
 * Quick pre-publish check — lighter review for basic quality gates.
 * Uses GPT-5.4 with low reasoning effort.
 */
export async function quickReviewTemplate(
  template: TemplateForReview
): Promise<{
  pass: boolean;
  score: number;
  blockers: string[];
}> {
  const openai = getOpenAI();

  const clauseCount = template.content.clauses?.length ?? 0;
  const clauseTitles = (template.content.clauses || [])
    .map((c) => c.title)
    .join(", ");

  const response = await openai.responses.create({
    model: REVIEW_MODEL,
    reasoning: { effort: "low" },
    instructions:
      "You are a legal template quality gate. Perform a quick pass/fail check. Focus only on blockers: missing required clauses, hardcoded names/dates, legal errors, or empty sections.",
    input: `Quick review: ${template.type} template for ${template.jurisdiction}. ${clauseCount} clauses: ${clauseTitles}. Preamble: ${(template.content.preamble || "").slice(0, 300)}`,
    text: {
      format: {
        type: "json_schema",
        name: "quick_review",
        schema: {
          type: "object" as const,
          properties: {
            pass: { type: "boolean" as const },
            score: { type: "number" as const },
            blockers: {
              type: "array" as const,
              items: { type: "string" as const },
            },
          },
          required: ["pass", "score", "blockers"],
          additionalProperties: false,
        },
        strict: true,
      },
    },
  });

  return JSON.parse(response.output_text) as {
    pass: boolean;
    score: number;
    blockers: string[];
  };
}
