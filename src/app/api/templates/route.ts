import { NextRequest, NextResponse } from "next/server";
import { createClient } from "@/lib/supabase/server";
import { z } from "zod";
import type { ContractType, Jurisdiction } from "@/lib/contracts/schemas";

// Request schemas
const ListTemplatesSchema = z.object({
  type: z.string().optional(),
  jurisdiction: z.string().optional(),
  search: z.string().optional(),
  public: z.enum(["true", "false", "all"]).optional().default("all"),
  limit: z.coerce.number().optional().default(50),
  offset: z.coerce.number().optional().default(0),
});

const CreateTemplateSchema = z.object({
  name: z.string().min(1, "Template name is required"),
  description: z.string().optional(),
  type: z.string(),
  jurisdiction: z.string(),
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
  }),
  is_public: z.boolean().optional().default(false),
});

// GET /api/templates - List templates (both user templates and system templates)
export async function GET(request: NextRequest) {
  try {
    const supabase = await createClient();
    const { data: { user }, error: authError } = await supabase.auth.getUser();

    if (authError || !user) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    }

    // Parse query params
    const searchParams = Object.fromEntries(request.nextUrl.searchParams);
    const parseResult = ListTemplatesSchema.safeParse(searchParams);

    if (!parseResult.success) {
      return NextResponse.json(
        { error: "Invalid parameters", details: parseResult.error.flatten() },
        { status: 400 }
      );
    }

    const { type, jurisdiction, search, public: publicFilter, limit, offset } = parseResult.data;

    // Fetch user templates from 'templates' table
    let userQuery = supabase
      .from("templates")
      .select("*", { count: "exact" });

    // Filter by ownership/public
    if (publicFilter === "true") {
      userQuery = userQuery.eq("is_public", true);
    } else if (publicFilter === "false") {
      userQuery = userQuery.eq("created_by_id", user.id);
    } else {
      // "all" - show user's templates and public templates
      userQuery = userQuery.or(`created_by_id.eq.${user.id},is_public.eq.true`);
    }

    // Optional filters
    if (type) {
      userQuery = userQuery.eq("type", type);
    }
    if (jurisdiction) {
      userQuery = userQuery.eq("jurisdiction", jurisdiction);
    }
    if (search) {
      userQuery = userQuery.or(`name.ilike.%${search}%,description.ilike.%${search}%`);
    }

    // Pagination and ordering
    userQuery = userQuery
      .order("usage_count", { ascending: false })
      .order("created_at", { ascending: false })
      .range(offset, offset + limit - 1);

    // Fetch system templates from 'contract_templates' table
    let systemQuery = supabase
      .from("contract_templates")
      .select("*")
      .eq("is_active", true);

    // Apply filters to system templates
    if (type) {
      systemQuery = systemQuery.eq("contract_type", type);
    }
    if (jurisdiction) {
      systemQuery = systemQuery.eq("jurisdiction", jurisdiction);
    }
    if (search) {
      systemQuery = systemQuery.ilike("title", `%${search}%`);
    }

    // Execute both queries in parallel
    const [userResult, systemResult] = await Promise.all([
      userQuery,
      systemQuery,
    ]);

    if (userResult.error) {
      console.error("Error fetching user templates:", userResult.error);
    }
    if (systemResult.error) {
      console.error("Error fetching system templates:", systemResult.error);
    }

    const userTemplates = userResult.data || [];
    const systemTemplates = (systemResult.data || []).map((st) => ({
      // Map system template to match user template shape
      id: `system_${st.id}`,
      name: st.title,
      description: `Pre-built ${st.title} template for ${formatJurisdictionName(st.jurisdiction)}`,
      type: st.contract_type,
      jurisdiction: st.jurisdiction,
      content: {
        preamble: st.preamble,
        recitals: st.recitals,
        clauses: st.clauses,
        signatureBlock: st.signature_block,
        placeholders: st.placeholders,
      },
      is_public: true,
      is_system: true, // Flag to identify system templates
      created_by_id: null,
      created_at: st.created_at,
      updated_at: st.updated_at,
      usage_count: 0,
    }));

    // Combine: system templates first, then user templates
    const allTemplates = [...systemTemplates, ...userTemplates];

    return NextResponse.json({
      templates: allTemplates,
      total: (userResult.count || 0) + systemTemplates.length,
      limit,
      offset,
    });
  } catch (error) {
    console.error("Templates GET error:", error);
    return NextResponse.json({ error: "Internal server error" }, { status: 500 });
  }
}

// Helper to format jurisdiction names
function formatJurisdictionName(jurisdiction: string): string {
  const names: Record<string, string> = {
    us_california: "California, USA",
    us_texas: "Texas, USA",
    us_new_york: "New York, USA",
    uk: "United Kingdom",
  };
  return names[jurisdiction] || jurisdiction;
}

// POST /api/templates - Create template
export async function POST(request: NextRequest) {
  try {
    const supabase = await createClient();
    const { data: { user }, error: authError } = await supabase.auth.getUser();

    if (authError || !user) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    }

    const body = await request.json();
    const parseResult = CreateTemplateSchema.safeParse(body);

    if (!parseResult.success) {
      return NextResponse.json(
        { error: "Invalid request", details: parseResult.error.flatten() },
        { status: 400 }
      );
    }

    const { name, description, type, jurisdiction, content, is_public } = parseResult.data;

    // Strip personal data from content for template
    const templateContent = sanitizeContentForTemplate(content);

    const { data: template, error } = await supabase
      .from("templates")
      .insert({
        name,
        description,
        type: type as ContractType,
        jurisdiction: jurisdiction as Jurisdiction,
        content: templateContent,
        is_public,
        created_by_id: user.id,
        usage_count: 0,
      })
      .select()
      .single();

    if (error) {
      console.error("Error creating template:", error);
      return NextResponse.json({ error: "Failed to create template" }, { status: 500 });
    }

    return NextResponse.json({ template }, { status: 201 });
  } catch (error) {
    console.error("Templates POST error:", error);
    return NextResponse.json({ error: "Internal server error" }, { status: 500 });
  }
}

// Helper to sanitize content - strips personal data but keeps structure
function sanitizeContentForTemplate(content: {
  preamble: string;
  recitals: string;
  clauses: Array<{ id: string; title: string; content: string; type?: string; order?: number }>;
  signatureBlock: string;
}) {
  // For now, keep content as-is but you could strip specific PII patterns
  // In the future, could use regex to replace names/emails with placeholders
  return {
    preamble: content.preamble,
    recitals: content.recitals,
    clauses: content.clauses.map((c, i) => ({
      id: c.id || `clause_${i + 1}`,
      title: c.title,
      content: c.content,
      type: c.type || "standard",
      order: c.order || i + 1,
    })),
    signatureBlock: content.signatureBlock,
  };
}
