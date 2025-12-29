import { NextRequest, NextResponse } from "next/server";
import { createClient } from "@/lib/supabase/server";
import { compareVersions } from "@/lib/version-diff";

export const dynamic = "force-dynamic";

// POST /api/contracts/[id]/versions/compare - Compare two versions
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

    const body = await request.json();
    const { fromVersionNumber, toVersionNumber } = body;

    if (!fromVersionNumber || !toVersionNumber) {
      return NextResponse.json(
        { error: "Both fromVersionNumber and toVersionNumber are required" },
        { status: 400 }
      );
    }

    // Verify contract ownership
    const { data: contract, error: contractError } = await supabase
      .from("contracts")
      .select("id, user_id, content, version")
      .eq("id", id)
      .eq("user_id", user.id)
      .single();

    if (contractError || !contract) {
      return NextResponse.json({ error: "Contract not found" }, { status: 404 });
    }

    // Fetch both versions
    const { data: versions, error: versionsError } = await supabase
      .from("contract_versions")
      .select("*")
      .eq("contract_id", id)
      .in("version_number", [fromVersionNumber, toVersionNumber]);

    if (versionsError) {
      return NextResponse.json(
        { error: "Failed to fetch versions" },
        { status: 500 }
      );
    }

    const fromVersion = versions?.find((v) => v.version_number === fromVersionNumber);
    const toVersion = versions?.find((v) => v.version_number === toVersionNumber);

    // If toVersion is current version, use contract.content
    const fromContent = fromVersion?.content;
    const toContent = toVersionNumber === contract.version 
      ? contract.content 
      : toVersion?.content;

    if (!fromContent || !toContent) {
      return NextResponse.json(
        { error: "One or both versions not found" },
        { status: 404 }
      );
    }

    // Generate diff
    const comparison = compareVersions(
      fromContent,
      toContent,
      fromVersionNumber,
      toVersionNumber
    );

    return NextResponse.json({ comparison });
  } catch (error) {
    console.error("Version comparison error:", error);
    return NextResponse.json(
      { error: "Failed to compare versions" },
      { status: 500 }
    );
  }
}
