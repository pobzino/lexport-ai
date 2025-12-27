import { NextRequest, NextResponse } from "next/server";
import { createClient } from "@/lib/supabase/server";
import { modifyClause, explainClause } from "@/lib/contracts/generator";
import { z } from "zod";
import type { Clause } from "@/lib/contracts/schemas";

// Modify clause request schema
const ModifyClauseSchema = z.object({
  action: z.literal("modify"),
  clauseId: z.string(),
  instruction: z.string().min(5, "Please provide modification instructions"),
});

// Explain clause request schema
const ExplainClauseSchema = z.object({
  action: z.literal("explain"),
  clauseId: z.string(),
});

const RequestSchema = z.union([ModifyClauseSchema, ExplainClauseSchema]);

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
    const parseResult = RequestSchema.safeParse(body);

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
      clauses: Clause[];
      preamble: string;
      recitals: string;
    };
    const clauses = content.clauses || [];

    // Find the clause
    const clause = clauses.find((c: Clause) => c.id === parseResult.data.clauseId);

    if (!clause) {
      return NextResponse.json({ error: "Clause not found" }, { status: 404 });
    }

    if (parseResult.data.action === "explain") {
      // Explain the clause
      const explanation = await explainClause(clause, contract.type);
      return NextResponse.json({ explanation });
    } else {
      // Modify the clause
      const contractContext = `${contract.type} contract for ${contract.jurisdiction}`;
      const modification = await modifyClause(
        clause,
        parseResult.data.instruction,
        contractContext
      );

      // Update the clause in the contract
      const updatedClauses = clauses.map((c: Clause) =>
        c.id === clause.id
          ? {
              ...c,
              title: modification.title,
              content: modification.content,
              isEdited: true,
              originalContent: c.originalContent || c.content,
            }
          : c
      );

      // Save to database
      const { data: updated, error: updateError } = await supabase
        .from("contracts")
        .update({
          content: {
            ...content,
            clauses: updatedClauses,
          },
          updated_at: new Date().toISOString(),
        })
        .eq("id", id)
        .select()
        .single();

      if (updateError) {
        console.error("Error updating contract:", updateError);
        return NextResponse.json(
          { error: "Failed to update contract" },
          { status: 500 }
        );
      }

      return NextResponse.json({
        modification,
        contract: updated,
      });
    }
  } catch (error) {
    console.error("Clause operation error:", error);
    return NextResponse.json(
      { error: "Failed to process clause operation" },
      { status: 500 }
    );
  }
}
