import { NextRequest, NextResponse } from "next/server";
import { createClient } from "@/lib/supabase/server";
import { z } from "zod";
import {
  buildTemplateSemanticText,
  createEmbedding,
  persistUserTemplateEmbedding,
} from "@/lib/templates/semantic-search";

const UpdateTemplateSchema = z.object({
  name: z.string().min(1).optional(),
  description: z.string().optional(),
  is_public: z.boolean().optional(),
  content: z.object({
    preamble: z.string(),
    recitals: z.string(),
    clauses: z.array(z.object({
      id: z.string(),
      title: z.string(),
      content: z.string(),
      type: z.string().optional(),
      order: z.number().optional(),
    })),
    signatureBlock: z.string(),
  }).optional(),
});

// GET /api/templates/[id] - Get single template
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
      .from("templates")
      .select("*")
      .eq("id", id)
      .or(`created_by_id.eq.${user.id},is_public.eq.true`)
      .single();

    if (error || !template) {
      return NextResponse.json({ error: "Template not found" }, { status: 404 });
    }

    return NextResponse.json({ template });
  } catch (error) {
    console.error("Template GET error:", error);
    return NextResponse.json({ error: "Internal server error" }, { status: 500 });
  }
}

// PUT /api/templates/[id] - Update template
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
      .from("templates")
      .select("id, created_by_id")
      .eq("id", id)
      .single();

    if (!existing) {
      return NextResponse.json({ error: "Template not found" }, { status: 404 });
    }

    if (existing.created_by_id !== user.id) {
      return NextResponse.json({ error: "Not authorized to update this template" }, { status: 403 });
    }

    const body = await request.json();
    const parseResult = UpdateTemplateSchema.safeParse(body);

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
      .from("templates")
      .update(updates)
      .eq("id", id)
      .select()
      .single();

    if (error) {
      console.error("Error updating template:", error);
      return NextResponse.json({ error: "Failed to update template" }, { status: 500 });
    }

    const semanticText = buildTemplateSemanticText({
      name: template.name,
      description: template.description,
      type: template.type,
      jurisdiction: template.jurisdiction,
      content: template.content,
    });
    const embedding = await createEmbedding(semanticText);
    if (embedding) {
      await persistUserTemplateEmbedding({
        supabase,
        templateId: template.id,
        semanticText,
        embedding,
      });
    }

    return NextResponse.json({ template });
  } catch (error) {
    console.error("Template PUT error:", error);
    return NextResponse.json({ error: "Internal server error" }, { status: 500 });
  }
}

// DELETE /api/templates/[id] - Delete template
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
      .from("templates")
      .select("id, created_by_id")
      .eq("id", id)
      .single();

    if (!existing) {
      return NextResponse.json({ error: "Template not found" }, { status: 404 });
    }

    if (existing.created_by_id !== user.id) {
      return NextResponse.json({ error: "Not authorized to delete this template" }, { status: 403 });
    }

    const { error } = await supabase
      .from("templates")
      .delete()
      .eq("id", id);

    if (error) {
      console.error("Error deleting template:", error);
      return NextResponse.json({ error: "Failed to delete template" }, { status: 500 });
    }

    return NextResponse.json({ success: true });
  } catch (error) {
    console.error("Template DELETE error:", error);
    return NextResponse.json({ error: "Internal server error" }, { status: 500 });
  }
}
