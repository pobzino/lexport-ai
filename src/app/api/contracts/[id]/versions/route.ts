import { NextRequest, NextResponse } from "next/server";
import { createClient } from "@/lib/supabase/server";
import type { ContractVersion } from "@/db/types";

// GET - List all versions for a contract
export async function GET(
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

    // First verify user owns the contract
    const { data: contract, error: contractError } = await supabase
      .from("contracts")
      .select("id, user_id, version")
      .eq("id", contractId)
      .eq("user_id", user.id)
      .single();

    if (contractError || !contract) {
      return NextResponse.json({ error: "Contract not found" }, { status: 404 });
    }

    // Fetch all versions ordered by version number descending
    const { data: versions, error: versionsError } = await supabase
      .from("contract_versions")
      .select("*")
      .eq("contract_id", contractId)
      .order("version_number", { ascending: false });

    if (versionsError) {
      console.error("Error fetching versions:", versionsError);
      return NextResponse.json(
        { error: "Failed to fetch versions" },
        { status: 500 }
      );
    }

    return NextResponse.json({
      versions: versions || [],
      currentVersion: contract.version,
    });
  } catch (error) {
    console.error("Error in versions GET:", error);
    return NextResponse.json(
      { error: "Failed to fetch versions" },
      { status: 500 }
    );
  }
}
