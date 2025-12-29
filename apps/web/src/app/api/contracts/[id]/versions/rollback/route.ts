import { NextRequest, NextResponse } from "next/server";
import { createClient } from "@/lib/supabase/server";
import type { ContractContent, VersionChangeType } from "@/db/types";

// POST - Rollback to a previous version
export async function POST(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const { id: contractId } = await params;
    const supabase = await createClient();
    const {
      data: { user },
      error: authError,
    } = await supabase.auth.getUser();

    if (authError || !user) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    }

    const body = await request.json();
    const { targetVersionNumber } = body;

    if (targetVersionNumber === undefined) {
      return NextResponse.json(
        { error: "targetVersionNumber is required" },
        { status: 400 }
      );
    }

    // First verify user owns the contract
    const { data: contract, error: contractError } = await supabase
      .from("contracts")
      .select("*")
      .eq("id", contractId)
      .eq("user_id", user.id)
      .single();

    if (contractError || !contract) {
      return NextResponse.json({ error: "Contract not found" }, { status: 404 });
    }

    // Get the target version content
    const { data: targetVersion, error: targetError } = await supabase
      .from("contract_versions")
      .select("*")
      .eq("contract_id", contractId)
      .eq("version_number", targetVersionNumber)
      .single();

    if (targetError || !targetVersion) {
      return NextResponse.json(
        { error: `Version ${targetVersionNumber} not found` },
        { status: 404 }
      );
    }

    const newVersionNumber = contract.version + 1;
    const targetContent = targetVersion.content as ContractContent;

    // Save current state as a version before rollback
    const { error: snapshotError } = await supabase
      .from("contract_versions")
      .insert({
        contract_id: contractId,
        version_number: contract.version,
        content: contract.content,
        metadata: contract.metadata,
        change_summary: `State before rollback to version ${targetVersionNumber}`,
        change_type: "edit" as VersionChangeType,
        created_by: user.id,
      });

    if (snapshotError) {
      console.error("Error creating pre-rollback snapshot:", snapshotError);
      // Continue anyway - the rollback is more important
    }

    // Update the contract with the target version's content
    const { data: updatedContract, error: updateError } = await supabase
      .from("contracts")
      .update({
        content: targetContent,
        version: newVersionNumber,
        updated_at: new Date().toISOString(),
      })
      .eq("id", contractId)
      .eq("user_id", user.id)
      .select()
      .single();

    if (updateError || !updatedContract) {
      return NextResponse.json(
        { error: "Failed to rollback contract" },
        { status: 500 }
      );
    }

    // Create a new version entry for the rollback
    const { error: versionError } = await supabase
      .from("contract_versions")
      .insert({
        contract_id: contractId,
        version_number: newVersionNumber,
        content: targetContent,
        metadata: updatedContract.metadata,
        change_summary: `Rolled back to version ${targetVersionNumber}`,
        change_type: "rollback" as VersionChangeType,
        created_by: user.id,
      });

    if (versionError) {
      console.error("Error creating rollback version entry:", versionError);
      // Contract was already updated, so just log the error
    }

    return NextResponse.json({
      contract: updatedContract,
      message: `Successfully rolled back to version ${targetVersionNumber}`,
      newVersion: newVersionNumber,
    });
  } catch (error) {
    console.error("Error in rollback:", error);
    return NextResponse.json(
      { error: "Failed to rollback to version" },
      { status: 500 }
    );
  }
}
