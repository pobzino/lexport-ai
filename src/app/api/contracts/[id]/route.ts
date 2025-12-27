import { NextRequest, NextResponse } from "next/server";
import { createClient } from "@/lib/supabase/server";

// GET - Fetch a single contract with signature data
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

    // Fetch contract
    const { data: contract, error } = await supabase
      .from("contracts")
      .select("*")
      .eq("id", id)
      .eq("user_id", user.id)
      .single();

    if (error || !contract) {
      return NextResponse.json({ error: "Contract not found" }, { status: 404 });
    }

    // Fetch signature fields
    const { data: signatureFields } = await supabase
      .from("signature_fields")
      .select("*")
      .eq("contract_id", id)
      .order("order", { ascending: true });

    // Fetch signature requests with their status
    const { data: signatureRequests } = await supabase
      .from("signature_requests")
      .select("*")
      .eq("contract_id", id)
      .order("order", { ascending: true });

    // Fetch actual signatures
    const { data: signatures } = await supabase
      .from("signatures")
      .select("*")
      .eq("contract_id", id);

    // Fetch field values (completed fields)
    const { data: fieldValues } = await supabase
      .from("field_values")
      .select("*")
      .in(
        "field_id",
        (signatureFields || []).map((f) => f.id)
      );

    return NextResponse.json({
      contract,
      signatureFields: signatureFields || [],
      signatureRequests: signatureRequests || [],
      signatures: signatures || [],
      fieldValues: fieldValues || [],
    });
  } catch (error) {
    console.error("Error fetching contract:", error);
    return NextResponse.json(
      { error: "Failed to fetch contract" },
      { status: 500 }
    );
  }
}

// PATCH - Update a contract
export async function PATCH(
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

    console.log("PATCH - Auth user:", user?.id, "Contract ID:", id);

    if (authError || !user) {
      console.log("PATCH - Auth error:", authError);
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    }

    const body = await request.json();
    console.log("PATCH - Request body:", JSON.stringify(body, null, 2));

    // Ensure version is a number, default to 1 if not provided
    const updateData = {
      ...body,
      version: body.version || 1,
      updated_at: new Date().toISOString(),
    };
    console.log("PATCH - Update data:", JSON.stringify(updateData, null, 2));

    // Update contract (Supabase RLS handles ownership)
    const { data: updated, error } = await supabase
      .from("contracts")
      .update(updateData)
      .eq("id", id)
      .eq("user_id", user.id)
      .select()
      .single();

    console.log("PATCH - Update result:", updated ? "success" : "failed", "Error:", error);

    if (error || !updated) {
      return NextResponse.json({ error: "Contract not found", details: error?.message }, { status: 404 });
    }

    return NextResponse.json({ contract: updated });
  } catch (error) {
    console.error("Error updating contract:", error);
    return NextResponse.json(
      { error: "Failed to update contract" },
      { status: 500 }
    );
  }
}

// DELETE - Delete a contract
export async function DELETE(
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

    const { error } = await supabase
      .from("contracts")
      .delete()
      .eq("id", id)
      .eq("user_id", user.id);

    if (error) {
      return NextResponse.json({ error: "Failed to delete" }, { status: 500 });
    }

    return NextResponse.json({ success: true });
  } catch (error) {
    console.error("Error deleting contract:", error);
    return NextResponse.json(
      { error: "Failed to delete contract" },
      { status: 500 }
    );
  }
}
