/**
 * AI Chat Tools for Contract Editing
 *
 * Defines typed tools for the contract chat using Vercel AI SDK.
 * These tools enable Generative UI by returning structured data
 * that can be rendered as React components.
 */

import { tool } from "ai";
import { z } from "zod";

// ============================================================================
// Tool Schemas
// ============================================================================

const ModificationSchema = z.object({
  action: z
    .enum(["modify", "remove"])
    .describe("modify = change content, remove = delete clause"),
  section: z
    .enum(["preamble", "recitals", "clause", "signatureBlock"])
    .describe("Which section to modify"),
  clauseId: z
    .string()
    .optional()
    .describe("Clause ID if modifying/removing a clause"),
  clauseTitle: z
    .string()
    .optional()
    .describe("Title of the clause being modified"),
  searchText: z
    .string()
    .optional()
    .describe("Exact text to find and replace"),
  replaceText: z
    .string()
    .optional()
    .describe("New text to replace with"),
  newContent: z
    .string()
    .optional()
    .describe("Full new content for entire section"),
  before: z
    .string()
    .optional()
    .describe("Original text before modification (for diff display)"),
  after: z
    .string()
    .optional()
    .describe("New text after modification (for diff display)"),
});

// ============================================================================
// Tool Definitions
// ============================================================================

/**
 * Tool for modifying contract content
 * Returns structured data for ContractDiff component
 */
export const modifyContractTool = tool({
  description:
    "Modify contract content. Use when user wants to change, update, edit, replace, modify, shorten, simplify, rewrite, remove, delete, add, expand, or revise any part of the contract.",
  inputSchema: z.object({
    modifications: z
      .array(ModificationSchema)
      .describe("List of modifications to make"),
    explanation: z
      .string()
      .describe("Brief explanation of what was changed"),
  }),
});

/**
 * Tool for answering questions about the contract
 * Returns structured explanation for ClauseExplanationCard
 */
export const explainClauseTool = tool({
  description:
    "Explain a specific clause or section of the contract. Use when user asks about what a clause means, its implications, or wants clarification.",
  inputSchema: z.object({
    clauseId: z.string().describe("ID of the clause being explained"),
    clauseTitle: z.string().describe("Title of the clause"),
    summary: z.string().describe("One-sentence summary of the clause"),
    explanation: z.string().describe("Detailed plain-English explanation"),
    keyPoints: z
      .array(z.string())
      .describe("3-5 key points about this clause"),
    risks: z
      .array(z.string())
      .optional()
      .describe("Potential risks or concerns with this clause"),
    negotiationTips: z
      .array(z.string())
      .optional()
      .describe("Tips for negotiating this clause"),
  }),
});

/**
 * Tool for analyzing contract risks
 * Returns structured data for risk analysis components
 */
export const analyzeRisksTool = tool({
  description:
    "Analyze the contract for legal risks, unusual terms, missing protections, and jurisdiction issues. Use when user asks about risks, problems, issues, or wants a contract review.",
  inputSchema: z.object({
    overallRiskLevel: z
      .enum(["low", "medium", "high"])
      .describe("Overall risk assessment"),
    overallSummary: z
      .string()
      .describe("2-3 sentence executive summary of findings"),
    clauseRisks: z
      .array(
        z.object({
          clauseId: z.string(),
          clauseTitle: z.string(),
          severity: z.enum(["info", "warning", "critical"]),
          category: z.enum([
            "unusual_terms",
            "missing_protection",
            "one_sided",
            "jurisdiction_issue",
            "ambiguity",
            "liability_exposure",
          ]),
          title: z.string(),
          description: z.string(),
          problematicText: z.string().optional(),
          suggestion: z.string().optional(),
          affectedParty: z.enum(["client", "contractor", "both"]).optional(),
        })
      )
      .describe("Risks in specific clauses"),
    missingProtections: z
      .array(
        z.object({
          severity: z.enum(["info", "warning", "critical"]),
          title: z.string(),
          description: z.string(),
          standardFor: z.array(z.string()).optional(),
          suggestion: z.string(),
        })
      )
      .describe("Standard protections that are absent"),
    jurisdictionAlerts: z
      .array(
        z.object({
          severity: z.enum(["info", "warning", "critical"]),
          jurisdiction: z.string(),
          title: z.string(),
          description: z.string(),
          legalReference: z.string().optional(),
          affectedClauseId: z.string().optional(),
        })
      )
      .describe("Jurisdiction-specific legal issues"),
    stats: z.object({
      total: z.number(),
      critical: z.number(),
      warning: z.number(),
      info: z.number(),
    }),
  }),
});

/**
 * Tool for simple text responses
 * Used when no special UI is needed
 */
export const answerQuestionTool = tool({
  description:
    "Answer a general question about the contract without making changes or doing deep analysis. Use for simple clarifications and quick answers.",
  inputSchema: z.object({
    response: z.string().describe("The response to the user's question"),
  }),
});

// ============================================================================
// Tools Export
// ============================================================================

export const contractChatTools = {
  modifyContract: modifyContractTool,
  explainClause: explainClauseTool,
  analyzeRisks: analyzeRisksTool,
  answerQuestion: answerQuestionTool,
};

// Type inference helpers
export type ContractChatTools = typeof contractChatTools;
