import { NextResponse } from "next/server";
import { createClient } from "@/lib/supabase/server";
import OpenAI from "openai";

const openai = new OpenAI({
    apiKey: process.env.OPENAI_API_KEY,
});

export async function POST(request: Request) {
    try {
        const supabase = await createClient();

        // Check authentication
        const {
            data: { user },
            error: authError,
        } = await supabase.auth.getUser();

        if (authError || !user) {
            return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
        }

        const { contractId, instruction, clauseId } = await request.json();

        if (!contractId || !instruction) {
            return NextResponse.json(
                { error: "Missing required fields" },
                { status: 400 }
            );
        }

        // Fetch the contract
        const { data: contract, error: contractError } = await supabase
            .from("contracts")
            .select("*")
            .eq("id", contractId)
            .single();

        if (contractError || !contract) {
            return NextResponse.json(
                { error: "Contract not found" },
                { status: 404 }
            );
        }

        // Get the specific clause if provided
        let targetClause = null;
        if (clauseId && contract.content?.clauses) {
            targetClause = contract.content.clauses.find(
                (c: { id: string }) => c.id === clauseId
            );
        }

        // Create the prompt for AI
        const systemPrompt = `You are a legal contract editor. Your job is to modify contract clauses based on instructions while maintaining legal accuracy and proper formatting.

IMPORTANT RULES:
1. Only modify what's necessary to address the instruction
2. Maintain the same writing style and tone
3. Keep all other terms and conditions intact
4. Ensure the modification is legally sound
5. Return ONLY the updated clause text, nothing else`;

        const userPrompt = targetClause
            ? `Edit this contract clause based on the following instruction:

INSTRUCTION: ${instruction}

CURRENT CLAUSE:
Title: ${targetClause.title}
Content: ${targetClause.content}

Return ONLY the updated clause content (not the title).`
            : `Edit the contract based on the following instruction:

INSTRUCTION: ${instruction}

CONTRACT TITLE: ${contract.title}
CONTRACT TYPE: ${contract.type}

Provide the specific clause modification or addition needed.`;

        const response = await openai.chat.completions.create({
            model: "gpt-4.1-mini",
            messages: [
                { role: "system", content: systemPrompt },
                { role: "user", content: userPrompt },
            ],
            temperature: 0.3,
            max_tokens: 2000,
        });

        const updatedContent = response.choices[0]?.message?.content?.trim();

        if (!updatedContent) {
            return NextResponse.json(
                { error: "AI did not return a valid response" },
                { status: 500 }
            );
        }

        // If we have a clause ID, update that specific clause
        if (clauseId && contract.content?.clauses) {
            const updatedClauses = contract.content.clauses.map(
                (c: { id: string; content: string }) =>
                    c.id === clauseId ? { ...c, content: updatedContent } : c
            );

            // Save the updated contract
            const { error: updateError } = await supabase
                .from("contracts")
                .update({
                    content: { ...contract.content, clauses: updatedClauses },
                    updated_at: new Date().toISOString(),
                })
                .eq("id", contractId);

            if (updateError) {
                console.error("Failed to update contract:", updateError);
                return NextResponse.json(
                    { error: "Failed to save changes" },
                    { status: 500 }
                );
            }

            return NextResponse.json({
                success: true,
                updatedClause: updatedContent,
                clauseId,
            });
        }

        // Return the suggestion without auto-saving if no specific clause
        return NextResponse.json({
            success: true,
            suggestion: updatedContent,
        });
    } catch (error) {
        console.error("AI edit error:", error);
        return NextResponse.json(
            { error: "Failed to process AI edit request" },
            { status: 500 }
        );
    }
}
