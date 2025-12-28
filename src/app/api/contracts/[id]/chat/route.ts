import { NextRequest, NextResponse } from "next/server";
import { createClient } from "@/lib/supabase/server";
import { z } from "zod";
import type { Clause, ContractType, Jurisdiction } from "@/lib/contracts/schemas";
import OpenAI from "openai";

// Force dynamic to prevent build-time API key validation
export const dynamic = 'force-dynamic';

// Lazy initialization of OpenAI client
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

const ChatRequestSchema = z.object({
  messages: z.array(
    z.object({
      role: z.enum(["user", "assistant"]),
      content: z.string(),
    })
  ),
});

// Function definitions for the AI to use
const chatFunctions: OpenAI.Chat.Completions.ChatCompletionTool[] = [
  {
    type: "function",
    function: {
      name: "modify_contract",
      description: "Modify the contract content based on user instructions. Use this when the user wants to change, update, edit, replace, or modify any part of the contract.",
      parameters: {
        type: "object",
        properties: {
          modifications: {
            type: "array",
            description: "List of modifications to make",
            items: {
              type: "object",
              properties: {
                section: {
                  type: "string",
                  enum: ["preamble", "recitals", "clause", "signatureBlock"],
                  description: "Which section to modify",
                },
                clauseId: {
                  type: "string",
                  description: "If modifying a clause, the clause ID (e.g., 'definitions', 'confidentiality_obligations')",
                },
                searchText: {
                  type: "string",
                  description: "The exact text to find and replace (for precise replacements)",
                },
                replaceText: {
                  type: "string",
                  description: "The new text to replace it with",
                },
                newContent: {
                  type: "string",
                  description: "If replacing the entire section/clause content, the new full content",
                },
              },
              required: ["section"],
            },
          },
          explanation: {
            type: "string",
            description: "Brief explanation of what was changed",
          },
        },
        required: ["modifications", "explanation"],
      },
    },
  },
  {
    type: "function",
    function: {
      name: "answer_question",
      description: "Answer a question about the contract without making changes. Use this for explanations, clarifications, or when the user is asking questions.",
      parameters: {
        type: "object",
        properties: {
          response: {
            type: "string",
            description: "The response to the user's question",
          },
        },
        required: ["response"],
      },
    },
  },
];

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

    // Parse request
    const body = await request.json();
    const parseResult = ChatRequestSchema.safeParse(body);

    if (!parseResult.success) {
      return NextResponse.json(
        { error: "Invalid request", details: parseResult.error.flatten() },
        { status: 400 }
      );
    }

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

    const content = contract.content as {
      preamble: string;
      recitals: string;
      clauses: Clause[];
      signatureBlock: string;
    };

    // Build system prompt with full contract content
    const systemPrompt = `You are an AI assistant helping a user edit their ${contract.type} contract governed by ${contract.jurisdiction} law.

CURRENT CONTRACT CONTENT:

**Preamble:**
${content.preamble}

**Recitals:**
${content.recitals}

**Clauses:**
${content.clauses.map((c) => `[${c.id}] ${c.title}:\n${c.content}`).join("\n\n")}

**Signature Block:**
${content.signatureBlock}

INSTRUCTIONS:
- When the user asks to CHANGE, UPDATE, MODIFY, REPLACE, or EDIT any part of the contract, use the modify_contract function.
- When the user asks QUESTIONS or wants explanations, use the answer_question function.
- For modifications, be precise about what text to change.
- Always maintain legal validity when making changes.
- If the user's request is unclear, use answer_question to ask for clarification.`;

    // Call OpenAI with function calling
    const response = await getOpenAI().chat.completions.create({
      model: "gpt-4.1-mini",
      max_tokens: 2000,
      messages: [
        { role: "system", content: systemPrompt },
        ...parseResult.data.messages.map((m) => ({
          role: m.role as "user" | "assistant",
          content: m.content,
        })),
      ],
      tools: chatFunctions,
      tool_choice: "auto",
    });

    const message = response.choices[0]?.message;

    // Check if AI called a function
    if (message?.tool_calls && message.tool_calls.length > 0) {
      const toolCall = message.tool_calls[0];
      if (toolCall.type !== "function") {
        return NextResponse.json({ response: message?.content || "I can help with that.", modifications: null });
      }
      const functionName = toolCall.function.name;
      const args = JSON.parse(toolCall.function.arguments);

      if (functionName === "modify_contract") {
        // Apply modifications to the contract
        let updatedContent = { ...content };

        for (const mod of args.modifications) {
          if (mod.section === "preamble") {
            if (mod.searchText && mod.replaceText) {
              updatedContent.preamble = updatedContent.preamble.replace(mod.searchText, mod.replaceText);
            } else if (mod.newContent) {
              updatedContent.preamble = mod.newContent;
            }
          } else if (mod.section === "recitals") {
            if (mod.searchText && mod.replaceText) {
              updatedContent.recitals = updatedContent.recitals.replace(mod.searchText, mod.replaceText);
            } else if (mod.newContent) {
              updatedContent.recitals = mod.newContent;
            }
          } else if (mod.section === "clause" && mod.clauseId) {
            updatedContent.clauses = updatedContent.clauses.map((c) => {
              if (c.id === mod.clauseId) {
                let newContent = c.content;
                if (mod.searchText && mod.replaceText) {
                  newContent = c.content.replace(mod.searchText, mod.replaceText);
                } else if (mod.newContent) {
                  newContent = mod.newContent;
                }
                return { ...c, content: newContent, isEdited: true };
              }
              return c;
            });
          } else if (mod.section === "signatureBlock") {
            if (mod.searchText && mod.replaceText) {
              updatedContent.signatureBlock = updatedContent.signatureBlock.replace(mod.searchText, mod.replaceText);
            } else if (mod.newContent) {
              updatedContent.signatureBlock = mod.newContent;
            }
          }
        }

        // Save to database
        const { data: updated, error: updateError } = await supabase
          .from("contracts")
          .update({
            content: updatedContent,
            version: (contract.version || 0) + 1,
            updated_at: new Date().toISOString(),
          })
          .eq("id", id)
          .select()
          .single();

        if (updateError) {
          console.error("Error updating contract:", updateError);
          return NextResponse.json(
            { response: "I understood your request but couldn't save the changes. Please try again." }
          );
        }

        return NextResponse.json({
          response: `✅ **Changes Applied!**\n\n${args.explanation}\n\nThe contract has been updated and saved.`,
          contractUpdated: true,
          contract: updated,
        });
      } else if (functionName === "answer_question") {
        return NextResponse.json({ response: args.response });
      }
    }

    // Fallback to regular text response
    return NextResponse.json({
      response: message?.content || "I apologize, I could not generate a response."
    });
  } catch (error) {
    console.error("Chat error:", error);
    return NextResponse.json(
      { error: "Failed to process chat" },
      { status: 500 }
    );
  }
}
