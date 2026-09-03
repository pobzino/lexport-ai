import { NextRequest, NextResponse } from "next/server";
import { createClient } from "@/lib/supabase/server";
import { parseContractText } from "@/lib/upload/parse-contract";

export const maxDuration = 26;

export async function POST(
  _request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const { id } = await params;
    const supabase = await createClient();
    const {
      data: { user },
    } = await supabase.auth.getUser();

    if (!user) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    }

    const { data: contract, error: contractError } = await supabase
      .from("contracts")
      .select("*")
      .eq("id", id)
      .eq("user_id", user.id)
      .single();

    if (contractError || !contract) {
      return NextResponse.json({ error: "Contract not found" }, { status: 404 });
    }

    if (contract.status !== "draft") {
      return NextResponse.json(
        { error: "Only draft contracts can be reparsed" },
        { status: 409 }
      );
    }

    if (
      contract.source_type !== "uploaded" ||
      contract.processing_mode === "sign_only" ||
      !contract.extracted_text
    ) {
      return NextResponse.json(
        { error: "This contract does not have uploaded text available for analysis" },
        { status: 400 }
      );
    }

    const parsed = await parseContractText(contract.extracted_text);
    if (parsed.content.clauses.length < 2) {
      return NextResponse.json(
        {
          error: "We could not reliably detect multiple sections. The current draft was left unchanged.",
        },
        { status: 422 }
      );
    }

    const { data: latestVersion } = await supabase
      .from("contract_versions")
      .select("version_number")
      .eq("contract_id", id)
      .order("version_number", { ascending: false })
      .limit(1)
      .maybeSingle();

    const nextVersion = Math.max(
      Number(contract.version) || 1,
      Number(latestVersion?.version_number) || 1
    ) + 1;
    const genericTitle = /^(uploaded contract|untitled contract)$/i.test(
      contract.title?.trim() || ""
    );

    const { data: updatedContract, error: updateError } = await supabase
      .from("contracts")
      .update({
        content: parsed.content,
        title: genericTitle ? parsed.suggestedTitle : contract.title,
        type: parsed.suggestedType,
        jurisdiction: parsed.suggestedJurisdiction,
        version: nextVersion,
        section_explanations: null,
        updated_at: new Date().toISOString(),
      })
      .eq("id", id)
      .eq("user_id", user.id)
      .select("*")
      .single();

    if (updateError || !updatedContract) {
      console.error("Contract reparse update error:", updateError);
      return NextResponse.json(
        { error: "Failed to update the reparsed contract" },
        { status: 500 }
      );
    }

    const { error: versionError } = await supabase
      .from("contract_versions")
      .insert({
        contract_id: id,
        version_number: nextVersion,
        content: parsed.content,
        change_summary: `Reparsed uploaded document into ${parsed.content.clauses.length} sections`,
        change_type: "edit",
        created_by: user.id,
      });

    if (versionError) {
      console.error("Contract reparse version error:", versionError);
    }

    return NextResponse.json({
      success: true,
      contract: updatedContract,
      clauseCount: parsed.content.clauses.length,
      confidence: parsed.confidence,
    });
  } catch (error) {
    console.error("Contract reparse error:", error);
    return NextResponse.json(
      { error: "Failed to reparse the uploaded contract" },
      { status: 500 }
    );
  }
}
