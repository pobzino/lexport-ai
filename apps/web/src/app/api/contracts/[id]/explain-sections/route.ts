import { NextRequest, NextResponse } from "next/server";
import { auth } from "@clerk/nextjs/server";
import { createClient } from "@/lib/supabase/server";
import OpenAI from "openai";

const openai = new OpenAI({
    apiKey: process.env.OPENAI_API_KEY,
});

export async function POST(
    request: NextRequest,
    { params }: { params: Promise<{ id: string }> }
) {
    try {
        const { userId } = await auth();
        if (!userId) {
            return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
        }

        const { id: contractId } = await params;
        const { clauses } = await request.json();
        const supabase = await createClient();

        // Check if explanations already exist in cache (contract metadata)
        const { data: contract } = await supabase
            .from("contracts")
            .select("section_explanations, template_id")
            .eq("id", contractId)
            .single();

        // If cached explanations exist, return them
        if (contract?.section_explanations) {
            try {
                const cached = typeof contract.section_explanations === 'string'
                    ? JSON.parse(contract.section_explanations)
                    : contract.section_explanations;
                if (Object.keys(cached).length > 0) {
                    return NextResponse.json({ explanations: cached, cached: true });
                }
            } catch {
                // Invalid cache, regenerate
            }
        }

        // If this is from a template, check template cache
        if (contract?.template_id) {
            const { data: template } = await supabase
                .from("templates")
                .select("section_explanations")
                .eq("id", contract.template_id)
                .single();

            if (template?.section_explanations) {
                try {
                    const cached = typeof template.section_explanations === 'string'
                        ? JSON.parse(template.section_explanations)
                        : template.section_explanations;
                    if (Object.keys(cached).length > 0) {
                        // Copy to contract for faster access next time
                        await supabase
                            .from("contracts")
                            .update({ section_explanations: cached })
                            .eq("id", contractId);
                        return NextResponse.json({ explanations: cached, cached: true });
                    }
                } catch {
                    // Invalid cache, regenerate
                }
            }
        }

        // Generate new explanations
        const clauseList = clauses.map((c: { title: string; content: string }) =>
            `## ${c.title}\n${c.content}`
        ).join("\n\n");

        const response = await openai.chat.completions.create({
            model: "gpt-4o-mini",
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
        const explanations: Record<string, { title: string; summary: string; keyPoints: string[] }> = {};
        clauses.forEach((clause: { id: string; title: string }) => {
            const explanation = explanationsRaw[clause.title];
            if (explanation) {
                explanations[clause.id] = {
                    title: clause.title,
                    summary: explanation.summary || "",
                    keyPoints: explanation.keyPoints || []
                };
            }
        });

        // Cache in contract
        await supabase
            .from("contracts")
            .update({ section_explanations: explanations })
            .eq("id", contractId);

        // If from template, also cache in template
        if (contract?.template_id) {
            await supabase
                .from("templates")
                .update({ section_explanations: explanations })
                .eq("id", contract.template_id);
        }

        return NextResponse.json({ explanations, cached: false });
    } catch (error) {
        console.error("Error generating section explanations:", error);
        return NextResponse.json(
            { error: "Failed to generate explanations" },
            { status: 500 }
        );
    }
}
