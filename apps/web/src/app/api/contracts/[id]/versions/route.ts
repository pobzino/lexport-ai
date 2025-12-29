import { NextRequest, NextResponse } from "next/server";
import { createClient } from "@/lib/supabase/server";

export const dynamic = "force-dynamic";

// GET /api/contracts/[id]/versions - Fetch all versions for a contract
export async function GET(
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

    // Verify contract ownership
    const { data: contract, error: contractError } = await supabase
      .from("contracts")
      .select("id, user_id")
      .eq("id", id)
      .eq("user_id", user.id)
      .single();

    if (contractError || !contract) {
      return NextResponse.json({ error: "Contract not found" }, { status: 404 });
    }

    // Fetch all versions
    const { data: versions, error: versionsError } = await supabase
      .from("contract_versions")
      .select("*")
      .eq("contract_id", id)
      .order("version_number", { ascending: false });

    if (versionsError) {
      console.error("Error fetching versions:", versionsError);
      return NextResponse.json(
        { error: "Failed to fetch versions" },
        { status: 500 }
      );
    }

    return NextResponse.json({ versions: versions || [] });
  } catch (error) {
    console.error("Versions fetch error:", error);
    return NextResponse.json(
      { error: "Failed to fetch versions" },
      { status: 500 }
    );
  }
}

// POST /api/contracts/[id]/versions - Create a new version snapshot
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
    const { change_type, change_summary, content, version_number } = body;

    // Verify contract ownership
    const { data: contract, error: contractError } = await supabase
      .from("contracts")
      .select("id, user_id, version, content")
      .eq("id", id)
      .eq("user_id", user.id)
      .single();

    if (contractError || !contract) {
      return NextResponse.json({ error: "Contract not found" }, { status: 404 });
    }

    // Create version snapshot
    const { data: version, error: versionError } = await supabase
      .from("contract_versions")
      .insert({
        contract_id: id,
        version_number: version_number || contract.version,
        content: content || contract.content,
        change_type: change_type || "edit",
        change_summary: change_summary || null,
        created_by: user.id,
      })
      .select()
      .single();

    if (versionError) {
      console.error("Error creating version:", versionError);
      return NextResponse.json(
        { error: "Failed to create version" },
        { status: 500 }
      );
    }

    return NextResponse.json({ version });
  } catch (error) {
    console.error("Version create error:", error);
    return NextResponse.json(
      { error: "Failed to create version" },
      { status: 500 }
    );
  }
}
