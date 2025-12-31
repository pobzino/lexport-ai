import { NextRequest, NextResponse } from "next/server";
import { createClient } from "@/lib/supabase/server";
import { z } from "zod";

// Validation schema for signature fields
const SignatureFieldSchema = z.object({
  type: z.enum(["signature", "initials", "date", "text"]),
  label: z.string().optional(),
  signerRole: z.string().min(1, "Signer role is required"),
  required: z.boolean().default(true),
  positionX: z.number().min(0).max(100),
  positionY: z.number().min(0).max(100),
  width: z.number().min(50).max(400).default(200),
  height: z.number().min(20).max(200).default(60),
  page: z.number().min(1).default(1),
  order: z.number().min(1).default(1),
});

const UpdateFieldSchema = SignatureFieldSchema.partial();

// GET - Fetch all signature fields for a contract
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

    // Verify contract ownership
    const { data: contract, error: contractError } = await supabase
      .from("contracts")
      .select("id")
      .eq("id", contractId)
      .eq("user_id", user.id)
      .single();

    if (contractError || !contract) {
      return NextResponse.json({ error: "Contract not found" }, { status: 404 });
    }

    // Fetch signature fields
    const { data: fields, error } = await supabase
      .from("signature_fields")
      .select("*")
      .eq("contract_id", contractId)
      .order("order", { ascending: true });

    if (error) {
      console.error("Error fetching signature fields:", error);
      return NextResponse.json(
        { error: "Failed to fetch signature fields" },
        { status: 500 }
      );
    }

    return NextResponse.json({ fields: fields || [] });
  } catch (error) {
    console.error("Error fetching signature fields:", error);
    return NextResponse.json(
      { error: "Failed to fetch signature fields" },
      { status: 500 }
    );
  }
}

// POST - Create a new signature field
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

    // Verify contract ownership
    const { data: contract, error: contractError } = await supabase
      .from("contracts")
      .select("id")
      .eq("id", contractId)
      .eq("user_id", user.id)
      .single();

    if (contractError || !contract) {
      return NextResponse.json({ error: "Contract not found" }, { status: 404 });
    }

    // Parse and validate request body
    const body = await request.json();
    const parseResult = SignatureFieldSchema.safeParse(body);

    if (!parseResult.success) {
      return NextResponse.json(
        { error: "Invalid field data", details: parseResult.error.flatten() },
        { status: 400 }
      );
    }

    const fieldData = parseResult.data;

    // Insert the new field (round position values to integers)
    const { data: field, error } = await supabase
      .from("signature_fields")
      .insert({
        contract_id: contractId,
        type: fieldData.type,
        label: fieldData.label,
        signer_role: fieldData.signerRole,
        required: fieldData.required,
        position_x: Math.round(fieldData.positionX),
        position_y: Math.round(fieldData.positionY),
        width: Math.round(fieldData.width),
        height: Math.round(fieldData.height),
        page: fieldData.page || 1,
        order: fieldData.order,
      })
      .select()
      .single();

    if (error) {
      console.error("Error creating signature field:", error);
      return NextResponse.json(
        { error: "Failed to create signature field" },
        { status: 500 }
      );
    }

    return NextResponse.json({ field }, { status: 201 });
  } catch (error) {
    console.error("Error creating signature field:", error);
    return NextResponse.json(
      { error: "Failed to create signature field" },
      { status: 500 }
    );
  }
}

// PATCH - Update a signature field (expects fieldId in body)
export async function PATCH(
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

    // Verify contract ownership
    const { data: contract, error: contractError } = await supabase
      .from("contracts")
      .select("id")
      .eq("id", contractId)
      .eq("user_id", user.id)
      .single();

    if (contractError || !contract) {
      return NextResponse.json({ error: "Contract not found" }, { status: 404 });
    }

    // Parse request body
    const body = await request.json();
    const { fieldId, ...updateData } = body;

    if (!fieldId) {
      return NextResponse.json({ error: "Field ID required" }, { status: 400 });
    }

    // Validate update data
    const parseResult = UpdateFieldSchema.safeParse(updateData);
    if (!parseResult.success) {
      return NextResponse.json(
        { error: "Invalid field data", details: parseResult.error.flatten() },
        { status: 400 }
      );
    }

    // Build update object with snake_case keys (round position values to integers)
    const dbUpdateData: Record<string, unknown> = {};
    if (parseResult.data.type !== undefined) dbUpdateData.type = parseResult.data.type;
    if (parseResult.data.label !== undefined) dbUpdateData.label = parseResult.data.label;
    if (parseResult.data.signerRole !== undefined) dbUpdateData.signer_role = parseResult.data.signerRole;
    if (parseResult.data.required !== undefined) dbUpdateData.required = parseResult.data.required;
    if (parseResult.data.positionX !== undefined) dbUpdateData.position_x = Math.round(parseResult.data.positionX);
    if (parseResult.data.positionY !== undefined) dbUpdateData.position_y = Math.round(parseResult.data.positionY);
    if (parseResult.data.width !== undefined) dbUpdateData.width = Math.round(parseResult.data.width);
    if (parseResult.data.height !== undefined) dbUpdateData.height = Math.round(parseResult.data.height);
    if (parseResult.data.page !== undefined) dbUpdateData.page = parseResult.data.page;
    if (parseResult.data.order !== undefined) dbUpdateData.order = parseResult.data.order;

    // Update the field
    const { data: field, error } = await supabase
      .from("signature_fields")
      .update(dbUpdateData)
      .eq("id", fieldId)
      .eq("contract_id", contractId)
      .select()
      .single();

    if (error || !field) {
      console.error("Error updating signature field:", error);
      return NextResponse.json(
        { error: "Field not found or update failed" },
        { status: 404 }
      );
    }

    return NextResponse.json({ field });
  } catch (error) {
    console.error("Error updating signature field:", error);
    return NextResponse.json(
      { error: "Failed to update signature field" },
      { status: 500 }
    );
  }
}

// DELETE - Delete a signature field (expects fieldId in query params)
export async function DELETE(
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

    // Verify contract ownership
    const { data: contract, error: contractError } = await supabase
      .from("contracts")
      .select("id")
      .eq("id", contractId)
      .eq("user_id", user.id)
      .single();

    if (contractError || !contract) {
      return NextResponse.json({ error: "Contract not found" }, { status: 404 });
    }

    // Get fieldId from query params
    const { searchParams } = new URL(request.url);
    const fieldId = searchParams.get("fieldId");

    if (!fieldId) {
      return NextResponse.json({ error: "Field ID required" }, { status: 400 });
    }

    // Delete the field
    const { error } = await supabase
      .from("signature_fields")
      .delete()
      .eq("id", fieldId)
      .eq("contract_id", contractId);

    if (error) {
      console.error("Error deleting signature field:", error);
      return NextResponse.json(
        { error: "Failed to delete signature field" },
        { status: 500 }
      );
    }

    return NextResponse.json({ success: true });
  } catch (error) {
    console.error("Error deleting signature field:", error);
    return NextResponse.json(
      { error: "Failed to delete signature field" },
      { status: 500 }
    );
  }
}
