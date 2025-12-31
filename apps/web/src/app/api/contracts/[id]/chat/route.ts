import { NextRequest, NextResponse } from "next/server";
import { createClient } from "@/lib/supabase/server";
import {
  streamText,
  convertToModelMessages,
  UIMessage,
  tool,
} from "ai";
import { openai } from "@ai-sdk/openai";
import { z } from "zod";
import type { Clause } from "@/lib/contracts/schemas";

// Force dynamic to prevent build-time API key validation
export const dynamic = "force-dynamic";

// Allow streaming responses up to 60 seconds
export const maxDuration = 60;

// ============================================================================
// Types
// ============================================================================

type ContractContent = {
  preamble: string;
  recitals: string;
  clauses: Clause[];
  signatureBlock: string;
};

// ============================================================================
// Tool Schemas
// ============================================================================

const ModificationSchema = z.object({
  action: z.enum(["modify", "remove"]),
  section: z.enum(["preamble", "recitals", "clause", "signatureBlock"]),
  clauseId: z.string().optional(),
  clauseTitle: z.string().optional(),
  searchText: z.string().optional(),
  replaceText: z.string().optional(),
  newContent: z.string().optional(),
  before: z.string().optional(),
  after: z.string().optional(),
});

// ============================================================================
// System Prompt Builder
// ============================================================================

function buildSystemPrompt(
  contract: {
    type: string;
    jurisdiction: string;
  },
  content: ContractContent | null
): string {
  if (!content || !content.clauses) {
    return `You are an AI assistant. This contract has no structured content available.`;
  }

  return `You are an AI assistant helping a user edit their ${contract.type} contract governed by ${contract.jurisdiction} law.

CURRENT CONTRACT CONTENT:

**Preamble:**
${content.preamble}

**Recitals:**
${content.recitals}

**Clauses:**
${content.clauses.map((c: Clause) => `[clauseId: "${c.id}"] ${c.title}:\n${c.content}`).join("\n\n")}

**Signature Block:**
${content.signatureBlock}

TOOL SELECTION GUIDE:
1. modifyContract: Use when user wants to CHANGE, UPDATE, MODIFY, REPLACE, EDIT, SHORTEN, SIMPLIFY, REWRITE, REMOVE, DELETE, ADD, EXPAND, or REVISE content.
2. explainClause: Use when user asks about what a specific clause MEANS, its IMPLICATIONS, or wants CLARIFICATION.
3. analyzeRisks: Use when user asks about RISKS, PROBLEMS, ISSUES, or wants a contract REVIEW.
4. answerQuestion: Use for simple questions that don't need structured UI.

CRITICAL RULES:
- The clauseId is shown in brackets (e.g., [clauseId: "12"]). Use the EXACT clauseId string.
- For modifications, populate the 'before' and 'after' fields to show the diff.
- Always maintain legal validity when making changes.
- Be concise but thorough in your analysis.`;
}

// ============================================================================
// Main Handler
// ============================================================================

export async function POST(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const { id } = await params;
    const supabase = await createClient();
    const {
      data: { user },
      error: authError,
    } = await supabase.auth.getUser();

    if (authError || !user) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    }

    // Parse request - expecting UIMessage format from AI SDK
    const { messages }: { messages: UIMessage[] } = await request.json();

    // Fetch contract
    const { data: contract, error: contractError } = await supabase
      .from("contracts")
      .select("*")
      .eq("id", id)
      .eq("user_id", user.id)
      .single();

    if (contractError || !contract) {
      return NextResponse.json({ error: "Contract not found" }, { status: 404 });
    }

    const content: ContractContent | null = contract.content as ContractContent;

    const systemPrompt = buildSystemPrompt(contract, content);

    // Define tools with execute functions that have access to contract context
    const tools = {
      modifyContract: tool({
        description:
          "Modify contract content. Use when user wants to change, edit, or remove content.",
        inputSchema: z.object({
          modifications: z.array(ModificationSchema),
          explanation: z.string(),
        }),
        execute: async ({ modifications, explanation }: { modifications: z.infer<typeof ModificationSchema>[]; explanation: string }) => {
          if (!content || !content.clauses) {
            return {
              success: false,
              error: "This contract cannot be modified through chat.",
            };
          }

          // Apply modifications
          const updatedContent = { ...content, clauses: [...content.clauses] };
          const modifiedClauseIds = new Set<string>();
          const changes: Array<{
            section: string;
            clauseId?: string;
            clauseTitle?: string;
            before: string;
            after: string;
          }> = [];

          for (const mod of modifications) {
            if (
              mod.action === "remove" &&
              mod.section === "clause" &&
              mod.clauseId
            ) {
              const removedClause = updatedContent.clauses.find(
                (c) => c.id === mod.clauseId
              );
              if (removedClause) {
                changes.push({
                  section: "clause",
                  clauseId: mod.clauseId,
                  clauseTitle: removedClause.title,
                  before: removedClause.content,
                  after: "[REMOVED]",
                });
              }
              updatedContent.clauses = updatedContent.clauses.filter(
                (c: Clause) => c.id !== mod.clauseId
              );
              modifiedClauseIds.add(mod.clauseId);
              continue;
            }

            if (mod.section === "preamble") {
              const before = updatedContent.preamble;
              if (mod.searchText && mod.replaceText) {
                updatedContent.preamble = updatedContent.preamble.replace(
                  mod.searchText,
                  mod.replaceText
                );
              } else if (mod.newContent) {
                updatedContent.preamble = mod.newContent;
              }
              changes.push({
                section: "preamble",
                before: mod.before || before.substring(0, 200),
                after: mod.after || updatedContent.preamble.substring(0, 200),
              });
            } else if (mod.section === "recitals") {
              const before = updatedContent.recitals;
              if (mod.searchText && mod.replaceText) {
                updatedContent.recitals = updatedContent.recitals.replace(
                  mod.searchText,
                  mod.replaceText
                );
              } else if (mod.newContent) {
                updatedContent.recitals = mod.newContent;
              }
              changes.push({
                section: "recitals",
                before: mod.before || before.substring(0, 200),
                after: mod.after || updatedContent.recitals.substring(0, 200),
              });
            } else if (mod.section === "clause" && mod.clauseId) {
              modifiedClauseIds.add(mod.clauseId);
              updatedContent.clauses = updatedContent.clauses.map(
                (c: Clause) => {
                  if (c.id === mod.clauseId) {
                    const before = c.content;
                    let newClauseContent = c.content;
                    if (mod.searchText && mod.replaceText) {
                      newClauseContent = c.content.replace(
                        mod.searchText,
                        mod.replaceText
                      );
                    } else if (mod.newContent) {
                      newClauseContent = mod.newContent;
                    }
                    changes.push({
                      section: "clause",
                      clauseId: c.id,
                      clauseTitle: c.title,
                      before: mod.before || before.substring(0, 200),
                      after: mod.after || newClauseContent.substring(0, 200),
                    });
                    return { ...c, content: newClauseContent, isEdited: true };
                  }
                  return c;
                }
              );
            } else if (mod.section === "signatureBlock") {
              const before = updatedContent.signatureBlock;
              if (mod.searchText && mod.replaceText) {
                updatedContent.signatureBlock =
                  updatedContent.signatureBlock.replace(
                    mod.searchText,
                    mod.replaceText
                  );
              } else if (mod.newContent) {
                updatedContent.signatureBlock = mod.newContent;
              }
              changes.push({
                section: "signatureBlock",
                before: mod.before || before.substring(0, 200),
                after:
                  mod.after || updatedContent.signatureBlock.substring(0, 200),
              });
            }
          }

          // Smart cache invalidation
          let updatedExplanations = contract.section_explanations;
          if (updatedExplanations && modifiedClauseIds.size > 0) {
            try {
              const existingCache =
                typeof updatedExplanations === "string"
                  ? JSON.parse(updatedExplanations)
                  : updatedExplanations;
              for (const clauseId of modifiedClauseIds) {
                delete existingCache[clauseId];
              }
              updatedExplanations =
                Object.keys(existingCache).length > 0 ? existingCache : null;
            } catch {
              updatedExplanations = null;
            }
          }

          // Create version snapshot
          const newVersionNumber = (contract.version || 0) + 1;
          await supabase.from("contract_versions").insert({
            contract_id: id,
            version_number: contract.version || 1,
            content: content,
            change_type: "ai_modification",
            change_summary: explanation,
            created_by: user.id,
          });

          // Save to database
          const { error: updateError } = await supabase
            .from("contracts")
            .update({
              content: updatedContent,
              version: newVersionNumber,
              updated_at: new Date().toISOString(),
              section_explanations: updatedExplanations,
            })
            .eq("id", id);

          if (updateError) {
            return {
              success: false,
              error: "Failed to save changes. Please try again.",
            };
          }

          return {
            success: true,
            changes,
            explanation,
            newVersion: newVersionNumber,
          };
        },
      }),

      explainClause: tool({
        description:
          "Explain a specific clause. Use when user asks what a clause means.",
        inputSchema: z.object({
          clauseId: z.string(),
          clauseTitle: z.string(),
          summary: z.string(),
          explanation: z.string(),
          keyPoints: z.array(z.string()),
          risks: z.array(z.string()).optional(),
          negotiationTips: z.array(z.string()).optional(),
        }),
        execute: async (params: {
          clauseId: string;
          clauseTitle: string;
          summary: string;
          explanation: string;
          keyPoints: string[];
          risks?: string[];
          negotiationTips?: string[];
        }) => params,
      }),

      analyzeRisks: tool({
        description:
          "Analyze contract for risks. Use when user asks about risks, problems, or wants a review.",
        inputSchema: z.object({
          overallRiskLevel: z.enum(["low", "medium", "high"]),
          overallSummary: z.string(),
          clauseRisks: z.array(
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
          ),
          missingProtections: z.array(
            z.object({
              severity: z.enum(["info", "warning", "critical"]),
              title: z.string(),
              description: z.string(),
              standardFor: z.array(z.string()).optional(),
              suggestion: z.string(),
            })
          ),
          jurisdictionAlerts: z.array(
            z.object({
              severity: z.enum(["info", "warning", "critical"]),
              jurisdiction: z.string(),
              title: z.string(),
              description: z.string(),
              legalReference: z.string().optional(),
              affectedClauseId: z.string().optional(),
            })
          ),
          stats: z.object({
            total: z.number(),
            critical: z.number(),
            warning: z.number(),
            info: z.number(),
          }),
        }),
        execute: async (params) => params,
      }),

      answerQuestion: tool({
        description: "Answer a simple question about the contract.",
        inputSchema: z.object({
          response: z.string(),
        }),
        execute: async ({ response }: { response: string }) => ({ response }),
      }),
    };

    // All contracts have full editing capabilities
    const availableTools = tools;

    // Stream the response
    const result = streamText({
      model: openai("gpt-4.1-mini"),
      system: systemPrompt,
      messages: await convertToModelMessages(messages),
      tools: availableTools,
    });

    return result.toUIMessageStreamResponse();
  } catch (error) {
    console.error("Chat error:", error);
    return NextResponse.json(
      { error: "Failed to process chat" },
      { status: 500 }
    );
  }
}
