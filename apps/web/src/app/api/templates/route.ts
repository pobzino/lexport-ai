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
  // Contract metadata containing filled values to convert back to placeholders
  metadata: z.record(z.string(), z.unknown()).optional(),
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

    // Execute queries - only fetch system templates if not filtering for "My Templates"
    const shouldIncludeSystemTemplates = publicFilter !== "false";

    const [userResult, systemResult] = await Promise.all([
      userQuery,
      shouldIncludeSystemTemplates ? systemQuery : Promise.resolve({ data: [], error: null }),
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

// Map contract jurisdiction values to template enum values
function mapJurisdictionToEnum(jurisdiction: string): string {
  const mapping: Record<string, string> = {
    us_california: "CA",
    us_texas: "TX",
    us_new_york: "NY",
    uk: "UK",
    // Handle already-correct values
    CA: "CA",
    TX: "TX",
    NY: "NY",
    UK: "UK",
  };
  return mapping[jurisdiction] || "other";
}

// Map contract type values to template enum values
function mapContractTypeToEnum(type: string): string {
  const mapping: Record<string, string> = {
    nda_mutual: "nda_mutual",
    nda_one_way: "nda_oneway",
    nda_oneway: "nda_oneway",
    independent_contractor: "contractor_agreement",
    contractor_agreement: "contractor_agreement",
    consulting_agreement: "consulting_agreement",
    safe_note: "safe_note",
    freelance_service: "service_agreement",
    service_agreement: "service_agreement",
  };
  return mapping[type] || type;
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

    const { name, description, type, jurisdiction, content, metadata, is_public } = parseResult.data;

    // Convert filled values back to placeholders for template reusability
    const templateContent = sanitizeContentForTemplate(content, metadata);

    // Map values to database enum values
    const mappedJurisdiction = mapJurisdictionToEnum(jurisdiction);
    const mappedType = mapContractTypeToEnum(type);

    const { data: template, error } = await supabase
      .from("templates")
      .insert({
        name,
        description,
        type: mappedType as ContractType,
        jurisdiction: mappedJurisdiction as Jurisdiction,
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

// Mapping from contract metadata keys to placeholder tokens
const METADATA_TO_PLACEHOLDER: Record<string, string> = {
  // Party A (disclosing party in NDAs, client in service agreements)
  "disclosingParty.name": "{{party_a_name}}",
  "disclosingParty.email": "{{party_a_email}}",
  "disclosingParty.company": "{{party_a_company}}",
  "disclosingParty.title": "{{party_a_title}}",
  "disclosingParty.address": "{{party_a_address}}",
  "client.name": "{{party_a_name}}",
  "client.email": "{{party_a_email}}",
  "client.company": "{{party_a_company}}",
  "company.name": "{{party_a_name}}",
  "company.email": "{{party_a_email}}",
  "investor.name": "{{party_b_name}}",
  "investor.email": "{{party_b_email}}",

  // Party B (receiving party in NDAs, contractor in service agreements)
  "receivingParty.name": "{{party_b_name}}",
  "receivingParty.email": "{{party_b_email}}",
  "receivingParty.company": "{{party_b_company}}",
  "receivingParty.title": "{{party_b_title}}",
  "receivingParty.address": "{{party_b_address}}",
  "contractor.name": "{{party_b_name}}",
  "contractor.email": "{{party_b_email}}",
  "consultant.name": "{{party_b_name}}",
  "consultant.email": "{{party_b_email}}",
  "freelancer.name": "{{party_b_name}}",
  "freelancer.email": "{{party_b_email}}",
  "startup.name": "{{party_b_name}}",
  "startup.email": "{{party_b_email}}",

  // Dates
  "effectiveDate": "{{effective_date}}",
  "expirationDate": "{{expiration_date}}",
  "signatureDate": "{{signature_date}}",

  // Terms
  "confidentialityPeriod": "{{confidentiality_period}}",
  "noticePeriod": "{{notice_period}}",
  "purpose": "{{purpose}}",

  // Financial
  "paymentAmount": "{{payment_amount}}",
  "hourlyRate": "{{hourly_rate}}",
  "depositAmount": "{{deposit_amount}}",
  "investmentAmount": "{{investment_amount}}",
  "valuationCap": "{{valuation_cap}}",
  "discountRate": "{{discount_rate}}",

  // Project
  "projectName": "{{project_name}}",
  "servicesDescription": "{{services_description}}",
  "deliverables": "{{deliverables}}",
};

// Extract values from metadata using dot notation paths
function extractMetadataValues(metadata: Record<string, unknown>): Record<string, string> {
  const values: Record<string, string> = {};

  function traverse(obj: Record<string, unknown>, prefix = "") {
    for (const [key, value] of Object.entries(obj)) {
      const path = prefix ? `${prefix}.${key}` : key;

      if (typeof value === "string" && value.trim()) {
        values[path] = value;
      } else if (typeof value === "number") {
        values[path] = String(value);
      } else if (value && typeof value === "object" && !Array.isArray(value)) {
        traverse(value as Record<string, unknown>, path);
      }
    }
  }

  traverse(metadata);
  return values;
}

// Helper function to escape regex special characters
function escapeRegexChars(string: string): string {
  return string.replace(/[.*+?^${}()|[\]\\]/g, "\\$&");
}

// Replace filled values with placeholders in text
function replaceWithPlaceholders(text: string, metadataValues: Record<string, string>): string {
  let result = text;

  // Build a list of replacements sorted by value length (longest first)
  // This prevents shorter values from matching inside longer values
  const replacements: Array<{ value: string; placeholder: string }> = [];

  for (const [metadataPath, placeholder] of Object.entries(METADATA_TO_PLACEHOLDER)) {
    const value = metadataValues[metadataPath];
    if (value && value.trim().length >= 2) { // Only replace values with 2+ characters
      replacements.push({ value, placeholder });
    }
  }

  // Sort by value length (longest first)
  replacements.sort((a, b) => b.value.length - a.value.length);

  // Apply replacements
  for (const { value, placeholder } of replacements) {
    // Create a regex that matches the value with word boundaries or common punctuation
    // This prevents partial matches within other words
    const escapedValue = escapeRegexChars(value);
    const regex = new RegExp(escapedValue, "gi");
    result = result.replace(regex, placeholder);
  }

  return result;
}

// Helper to sanitize content - converts filled values back to placeholders
function sanitizeContentForTemplate(
  content: {
    preamble: string;
    recitals: string;
    clauses: Array<{ id: string; title: string; content: string; type?: string; order?: number }>;
    signatureBlock: string;
  },
  metadata?: Record<string, unknown>
) {
  // If no metadata provided, keep content as-is
  if (!metadata || Object.keys(metadata).length === 0) {
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

  // Extract all values from metadata
  const metadataValues = extractMetadataValues(metadata);

  // Replace filled values with placeholders in all content sections
  return {
    preamble: replaceWithPlaceholders(content.preamble, metadataValues),
    recitals: replaceWithPlaceholders(content.recitals, metadataValues),
    clauses: content.clauses.map((c, i) => ({
      id: c.id || `clause_${i + 1}`,
      title: c.title,
      content: replaceWithPlaceholders(c.content, metadataValues),
      type: c.type || "standard",
      order: c.order || i + 1,
    })),
    signatureBlock: replaceWithPlaceholders(content.signatureBlock, metadataValues),
  };
}
