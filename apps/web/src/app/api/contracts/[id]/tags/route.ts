import { NextRequest, NextResponse } from "next/server";
import { createClient } from "@/lib/supabase/server";

// GET /api/contracts/[id]/tags - Get contract's tags
export async function GET(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const supabase = await createClient();

    const { data: { user }, error: authError } = await supabase.auth.getUser();
    if (authError || !user) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    }

    const { id } = await params;

    // Verify contract ownership
    const { data: contract, error: contractError } = await supabase
      .from("contracts")
      .select("id")
      .eq("id", id)
      .eq("user_id", user.id)
      .single();

    if (contractError || !contract) {
      return NextResponse.json({ error: "Contract not found" }, { status: 404 });
    }

    // Get contract's tags
    const { data, error } = await supabase
      .from("contract_tags")
      .select("tag_id, tags(id, name, color)")
      .eq("contract_id", id);

    if (error) {
      console.error("Error fetching contract tags:", error);
      return NextResponse.json({ error: error.message }, { status: 500 });
    }

    const tags = (data || []).map((ct: any) => ct.tags).filter((tag: any) => tag);

    return NextResponse.json({ tags });
  } catch (error) {
    console.error("Error in contract tags GET:", error);
    return NextResponse.json({ error: "Internal server error" }, { status: 500 });
  }
}

// POST /api/contracts/[id]/tags - Add a tag to contract
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

    const { id } = await params;
    const body = await request.json();
    const { tagId } = body;

    if (!tagId) {
      return NextResponse.json({ error: "Tag ID is required" }, { status: 400 });
    }

    // Verify contract ownership
    const { data: contract, error: contractError } = await supabase
      .from("contracts")
      .select("id")
      .eq("id", id)
      .eq("user_id", user.id)
      .single();

    if (contractError || !contract) {
      return NextResponse.json({ error: "Contract not found" }, { status: 404 });
    }

    // Verify tag ownership
    const { data: tag, error: tagError } = await supabase
      .from("tags")
      .select("id")
      .eq("id", tagId)
      .eq("user_id", user.id)
      .single();

    if (tagError || !tag) {
      return NextResponse.json({ error: "Tag not found" }, { status: 404 });
    }

    // Add tag to contract
    const { error } = await supabase
      .from("contract_tags")
      .insert({ contract_id: id, tag_id: tagId });

    if (error) {
      // Ignore duplicate key errors (tag already assigned)
      if (error.code !== "23505") {
        console.error("Error adding tag to contract:", error);
        return NextResponse.json({ error: error.message }, { status: 500 });
      }
    }

    return NextResponse.json({ success: true });
  } catch (error) {
    console.error("Error in contract tags POST:", error);
    return NextResponse.json({ error: "Internal server error" }, { status: 500 });
  }
}

// DELETE /api/contracts/[id]/tags - Remove a tag from contract
export async function DELETE(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const supabase = await createClient();

    const { data: { user }, error: authError } = await supabase.auth.getUser();
    if (authError || !user) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    }

    const { id } = await params;
    const body = await request.json();
    const { tagId } = body;

    if (!tagId) {
      return NextResponse.json({ error: "Tag ID is required" }, { status: 400 });
    }

    // Verify contract ownership
    const { data: contract, error: contractError } = await supabase
      .from("contracts")
      .select("id")
      .eq("id", id)
      .eq("user_id", user.id)
      .single();

    if (contractError || !contract) {
      return NextResponse.json({ error: "Contract not found" }, { status: 404 });
    }

    // Remove tag from contract
    const { error } = await supabase
      .from("contract_tags")
      .delete()
      .eq("contract_id", id)
      .eq("tag_id", tagId);

    if (error) {
      console.error("Error removing tag from contract:", error);
      return NextResponse.json({ error: error.message }, { status: 500 });
    }

    return NextResponse.json({ success: true });
  } catch (error) {
    console.error("Error in contract tags DELETE:", error);
    return NextResponse.json({ error: "Internal server error" }, { status: 500 });
  }
}
