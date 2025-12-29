import { NextRequest, NextResponse } from "next/server";
import { createClient } from "@/lib/supabase/server";
import { z } from "zod";

const FieldSchema = z.object({
  type: z.enum(["signature", "initials", "date", "text"]),
  label: z.string().optional(),
  signerRole: z.string(),
  required: z.boolean(),
  positionX: z.number(),
  positionY: z.number(),
  width: z.number(),
  height: z.number(),
  order: z.number(),
});

const UpdateFieldTemplateSchema = z.object({
  name: z.string().min(1).optional(),
  description: z.string().optional(),
  contract_type: z.string().optional(),
  fields: z.array(FieldSchema).optional(),
  is_public: z.boolean().optional(),
});

// GET /api/field-templates/[id] - Get single field template
export async function GET(
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

    const { data: template, error } = await supabase
      .from("field_templates")
      .select("*")
      .eq("id", id)
      .or(`created_by_id.eq.${user.id},is_public.eq.true`)
      .single();

    if (error || !template) {
      return NextResponse.json({ error: "Field template not found" }, { status: 404 });
    }

    return NextResponse.json({ template });
  } catch (error) {
    console.error("Field template GET error:", error);
    return NextResponse.json({ error: "Internal server error" }, { status: 500 });
  }
}

// PUT /api/field-templates/[id] - Update field template
export async function PUT(
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

    // Verify ownership
    const { data: existing } = await supabase
      .from("field_templates")
      .select("id, created_by_id")
      .eq("id", id)
      .single();

    if (!existing) {
      return NextResponse.json({ error: "Field template not found" }, { status: 404 });
    }

    if (existing.created_by_id !== user.id) {
      return NextResponse.json({ error: "Not authorized to update this field template" }, { status: 403 });
    }

    const body = await request.json();
    const parseResult = UpdateFieldTemplateSchema.safeParse(body);

    if (!parseResult.success) {
      return NextResponse.json(
        { error: "Invalid request", details: parseResult.error.flatten() },
        { status: 400 }
      );
    }

    const updates = {
      ...parseResult.data,
      updated_at: new Date().toISOString(),
    };

    const { data: template, error } = await supabase
      .from("field_templates")
      .update(updates)
      .eq("id", id)
      .select()
      .single();

    if (error) {
      console.error("Error updating field template:", error);
      return NextResponse.json({ error: "Failed to update field template" }, { status: 500 });
    }

    return NextResponse.json({ template });
  } catch (error) {
    console.error("Field template PUT error:", error);
    return NextResponse.json({ error: "Internal server error" }, { status: 500 });
  }
}

// DELETE /api/field-templates/[id] - Delete field template
export async function DELETE(
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

    // Verify ownership
    const { data: existing } = await supabase
      .from("field_templates")
      .select("id, created_by_id")
      .eq("id", id)
      .single();

    if (!existing) {
      return NextResponse.json({ error: "Field template not found" }, { status: 404 });
    }

    if (existing.created_by_id !== user.id) {
      return NextResponse.json({ error: "Not authorized to delete this field template" }, { status: 403 });
    }

    const { error } = await supabase
      .from("field_templates")
      .delete()
      .eq("id", id);

    if (error) {
      console.error("Error deleting field template:", error);
      return NextResponse.json({ error: "Failed to delete field template" }, { status: 500 });
    }

    return NextResponse.json({ success: true });
  } catch (error) {
    console.error("Field template DELETE error:", error);
    return NextResponse.json({ error: "Internal server error" }, { status: 500 });
  }
}
