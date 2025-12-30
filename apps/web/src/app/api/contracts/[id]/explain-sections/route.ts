import { NextRequest, NextResponse } from "next/server";
import { createClient } from "@/lib/supabase/server";
import OpenAI from "openai";

const openai = new OpenAI({
    apiKey: process.env.OPENAI_API_KEY,
});

interface ClauseInput {
    id: string;
    title: string;
    content: string;
}

interface ClauseExplanation {
    title: string;
    summary: string;
    keyPoints: string[];
}

type ExplanationsCache = Record<string, ClauseExplanation>;

/**
 * Generate explanations only for the specified clauses
 */
async function generateExplanationsForClauses(
    clauses: ClauseInput[]
): Promise<ExplanationsCache> {
    if (clauses.length === 0) return {};

    const clauseList = clauses.map((c) =>
        `## ${c.title}\n${c.content}`
    ).join("\n\n");

    const response = await openai.chat.completions.create({
        model: "gpt-4.1-mini",
        messages: [
            {
                role: "system",
                content: `You are a legal document explainer. For each contract section, provide:
1. A brief 1-2 sentence summary in plain English (no legal jargon)
2. 2-3 key points a non-lawyer should understand

Respond in JSON format:
{
  "sectionTitle": {
    "summary": "Plain English explanation",
    "keyPoints": ["Point 1", "Point 2"]
  }
}`
            },
            {
                role: "user",
                content: `Explain these contract sections:\n\n${clauseList}`
            }
        ],
        response_format: { type: "json_object" },
        temperature: 0.3,
    });

    const explanationsRaw = JSON.parse(response.choices[0].message.content || "{}");

    // Map by clause ID
    const explanations: ExplanationsCache = {};
    clauses.forEach((clause) => {
        const explanation = explanationsRaw[clause.title];
        if (explanation) {
            explanations[clause.id] = {
                title: clause.title,
                summary: explanation.summary || "",
                keyPoints: explanation.keyPoints || []
            };
        }
    });

    return explanations;
}

export async function POST(
    request: NextRequest,
    { params }: { params: Promise<{ id: string }> }
) {
    try {
        const supabase = await createClient();
        const { data: { user }, error: authError } = await supabase.auth.getUser();

        if (authError || !user) {
            return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
        }

        const { id: contractId } = await params;
        const { clauses } = await request.json() as { clauses: ClauseInput[] };

        // Get existing cache from contract
        const { data: contract, error: contractError } = await supabase
            .from("contracts")
            .select("section_explanations")
            .eq("id", contractId)
            .eq("user_id", user.id)
            .single();

        // Parse existing cache
        let existingCache: ExplanationsCache = {};
        if (contract?.section_explanations) {
            try {
                existingCache = typeof contract.section_explanations === 'string'
                    ? JSON.parse(contract.section_explanations)
                    : contract.section_explanations;
            } catch {
                existingCache = {};
            }
        }

        // Find which clauses are missing from cache
        const requestedClauseIds = new Set(clauses.map(c => c.id));
        const cachedClauseIds = new Set(Object.keys(existingCache));

        console.log("[Smart Cache] Requested clause IDs:", Array.from(requestedClauseIds));
        console.log("[Smart Cache] Cached clause IDs:", Array.from(cachedClauseIds));

        const missingClauses = clauses.filter(c => !cachedClauseIds.has(c.id));
        console.log("[Smart Cache] Missing clauses:", missingClauses.map(c => ({ id: c.id, title: c.title })));

        // Also remove any cached explanations for clauses that no longer exist
        // (e.g., if a clause was deleted)
        const validCache: ExplanationsCache = {};
        for (const [id, explanation] of Object.entries(existingCache)) {
            if (requestedClauseIds.has(id)) {
                validCache[id] = explanation;
            }
        }

        // If all clauses are cached, return immediately
        if (missingClauses.length === 0) {
            console.log("[Smart Cache] ✅ All clauses cached - returning immediately");
            return NextResponse.json({
                explanations: validCache,
                cached: true,
                regeneratedCount: 0
            });
        }

        console.log(`[Smart Cache] 🔄 Regenerating ${missingClauses.length} of ${clauses.length} clauses`);

        // Generate explanations only for missing clauses
        const newExplanations = await generateExplanationsForClauses(missingClauses);

        // Merge with existing cache
        const mergedExplanations: ExplanationsCache = {
            ...validCache,
            ...newExplanations
        };

        // Save merged cache to contract
        await supabase
            .from("contracts")
            .update({ section_explanations: mergedExplanations })
            .eq("id", contractId)
            .eq("user_id", user.id);

        return NextResponse.json({
            explanations: mergedExplanations,
            cached: false,
            regeneratedCount: missingClauses.length,
            totalCount: clauses.length
        });
    } catch (error) {
        console.error("Error generating section explanations:", error);
        return NextResponse.json(
            { error: "Failed to generate explanations" },
            { status: 500 }
        );
    }
}
