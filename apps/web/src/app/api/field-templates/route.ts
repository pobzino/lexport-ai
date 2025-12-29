import { NextRequest, NextResponse } from "next/server";
import { createClient } from "@/lib/supabase/server";
import { z } from "zod";

// Field schema matching SignatureField interface
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

const CreateFieldTemplateSchema = z.object({
  name: z.string().min(1),
  description: z.string().optional(),
  contract_type: z.string().optional(),
  fields: z.array(FieldSchema),
  is_public: z.boolean().optional().default(false),
});

// GET /api/field-templates - List field templates
export async function GET(request: NextRequest) {
  try {
    const supabase = await createClient();
    const { data: { user }, error: authError } = await supabase.auth.getUser();

    if (authError || !user) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    }

    const { searchParams } = new URL(request.url);
    const search = searchParams.get("search");
    const contractType = searchParams.get("contract_type");
    const publicFilter = searchParams.get("public") || "all";

    let query = supabase
      .from("field_templates")
      .select("*")
      .order("usage_count", { ascending: false });

    // Apply filters based on public parameter
    if (publicFilter === "true") {
      query = query.eq("is_public", true);
    } else if (publicFilter === "false") {
      query = query.eq("created_by_id", user.id);
    } else {
      // "all" - show user's own and public templates
      query = query.or(`created_by_id.eq.${user.id},is_public.eq.true`);
    }

    if (search) {
      query = query.ilike("name", `%${search}%`);
    }

    if (contractType) {
      query = query.eq("contract_type", contractType);
    }

    const { data: templates, error } = await query;

    if (error) {
      console.error("Error fetching field templates:", error);
      return NextResponse.json({ error: "Failed to fetch field templates" }, { status: 500 });
    }

    return NextResponse.json({ templates });
  } catch (error) {
    console.error("Field templates GET error:", error);
    return NextResponse.json({ error: "Internal server error" }, { status: 500 });
  }
}

// POST /api/field-templates - Create field template
export async function POST(request: NextRequest) {
  try {
    const supabase = await createClient();
    const { data: { user }, error: authError } = await supabase.auth.getUser();

    if (authError || !user) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    }

    const body = await request.json();
    const parseResult = CreateFieldTemplateSchema.safeParse(body);

    if (!parseResult.success) {
      return NextResponse.json(
        { error: "Invalid request", details: parseResult.error.flatten() },
        { status: 400 }
      );
    }

    const { name, description, contract_type, fields, is_public } = parseResult.data;

    const { data: template, error } = await supabase
      .from("field_templates")
      .insert({
        name,
        description,
        contract_type,
        fields,
        is_public,
        created_by_id: user.id,
        usage_count: 0,
      })
      .select()
      .single();

    if (error) {
      console.error("Error creating field template:", error);
      return NextResponse.json({ error: "Failed to create field template" }, { status: 500 });
    }

    return NextResponse.json({ template }, { status: 201 });
  } catch (error) {
    console.error("Field template POST error:", error);
    return NextResponse.json({ error: "Internal server error" }, { status: 500 });
  }
}
