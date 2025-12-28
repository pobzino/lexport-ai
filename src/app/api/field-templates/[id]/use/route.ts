import { NextRequest, NextResponse } from "next/server";
import { createClient } from "@/lib/supabase/server";
import { z } from "zod";

const UseFieldTemplateSchema = z.object({
  contractId: z.string().uuid(),
});

// POST /api/field-templates/[id]/use - Apply field template to a contract
export async function POST(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const { id } = await params;
    const supabase = await createClient();
    const { data: { user }, error: authError } = await supabase.auth.getUser();

    if (authError || !user) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    }

    const body = await request.json();
    const parseResult = UseFieldTemplateSchema.safeParse(body);

    if (!parseResult.success) {
      return NextResponse.json(
        { error: "Invalid request", details: parseResult.error.flatten() },
        { status: 400 }
      );
    }

    const { contractId } = parseResult.data;

    // Get the field template (must be owned by user or public)
    const { data: template, error: templateError } = await supabase
      .from("field_templates")
      .select("*")
      .eq("id", id)
      .or(`created_by_id.eq.${user.id},is_public.eq.true`)
      .single();

    if (templateError || !template) {
      return NextResponse.json({ error: "Field template not found" }, { status: 404 });
    }

    // Verify user owns the contract
    const { data: contract, error: contractError } = await supabase
      .from("contracts")
      .select("id, user_id")
      .eq("id", contractId)
      .single();

    if (contractError || !contract) {
      return NextResponse.json({ error: "Contract not found" }, { status: 404 });
    }

    if (contract.user_id !== user.id) {
      return NextResponse.json({ error: "Not authorized to modify this contract" }, { status: 403 });
    }

    // Get the fields from the template
    const templateFields = template.fields as Array<{
      type: string;
      label?: string;
      signerRole: string;
      required: boolean;
      positionX: number;
      positionY: number;
      width: number;
      height: number;
      order: number;
    }>;

    if (!templateFields || templateFields.length === 0) {
      return NextResponse.json({ error: "Field template has no fields" }, { status: 400 });
    }

    // Create signature fields for the contract
    const fieldsToInsert = templateFields.map((field) => ({
      contract_id: contractId,
      type: field.type,
      label: field.label,
      signer_role: field.signerRole,
      required: field.required,
      position_x: field.positionX,
      position_y: field.positionY,
      width: field.width,
      height: field.height,
      order: field.order,
    }));

    const { data: createdFields, error: insertError } = await supabase
      .from("signature_fields")
      .insert(fieldsToInsert)
      .select();

    if (insertError) {
      console.error("Error creating signature fields:", insertError);
      return NextResponse.json({ error: "Failed to apply field template" }, { status: 500 });
    }

    // Increment template usage count
    await supabase
      .from("field_templates")
      .update({
        usage_count: (template.usage_count || 0) + 1,
        updated_at: new Date().toISOString(),
      })
      .eq("id", id);

    return NextResponse.json({
      fields: createdFields,
      message: "Field template applied successfully",
    }, { status: 201 });
  } catch (error) {
    console.error("Use field template error:", error);
    return NextResponse.json({ error: "Internal server error" }, { status: 500 });
  }
}
