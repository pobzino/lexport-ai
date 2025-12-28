import { NextRequest, NextResponse } from "next/server";
import { createClient } from "@/lib/supabase/server";
import { compareVersions } from "@/lib/version-diff";
import type { ContractContent, ContractVersion } from "@/db/types";

// POST - Compare two versions
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
    const { fromVersionNumber, toVersionNumber } = body;

    if (fromVersionNumber === undefined || toVersionNumber === undefined) {
      return NextResponse.json(
        { error: "Both fromVersionNumber and toVersionNumber are required" },
        { status: 400 }
      );
    }

    // First verify user owns the contract
    const { data: contract, error: contractError } = await supabase
      .from("contracts")
      .select("id, user_id, content, version")
      .eq("id", contractId)
      .eq("user_id", user.id)
      .single();

    if (contractError || !contract) {
      return NextResponse.json({ error: "Contract not found" }, { status: 404 });
    }

    // Get both versions
    let fromContent: ContractContent;
    let toContent: ContractContent;

    // Handle case where we're comparing with current version
    if (toVersionNumber === contract.version) {
      toContent = contract.content;
    } else {
      const { data: toVersion, error: toError } = await supabase
        .from("contract_versions")
        .select("content")
        .eq("contract_id", contractId)
        .eq("version_number", toVersionNumber)
        .single();

      if (toError || !toVersion) {
        return NextResponse.json(
          { error: `Version ${toVersionNumber} not found` },
          { status: 404 }
        );
      }
      toContent = toVersion.content as ContractContent;
    }

    // Get from version
    const { data: fromVersion, error: fromError } = await supabase
      .from("contract_versions")
      .select("content")
      .eq("contract_id", contractId)
      .eq("version_number", fromVersionNumber)
      .single();

    if (fromError || !fromVersion) {
      return NextResponse.json(
        { error: `Version ${fromVersionNumber} not found` },
        { status: 404 }
      );
    }
    fromContent = fromVersion.content as ContractContent;

    // Compute the comparison
    const comparison = compareVersions(
      fromContent,
      toContent,
      fromVersionNumber,
      toVersionNumber
    );

    return NextResponse.json({ comparison });
  } catch (error) {
    console.error("Error comparing versions:", error);
    return NextResponse.json(
      { error: "Failed to compare versions" },
      { status: 500 }
    );
  }
}
