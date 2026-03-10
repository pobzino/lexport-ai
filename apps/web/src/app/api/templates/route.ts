import { NextRequest, NextResponse } from "next/server";
import { createClient } from "@/lib/supabase/server";
import { z } from "zod";
import type { ContractType, Jurisdiction } from "@/lib/contracts/schemas";
import { createAdminClient } from "@/lib/supabase/admin";
import {
  buildSystemTemplateSemanticText,
  buildTemplateSemanticText,
  createEmbedding,
  createEmbeddings,
  persistUserTemplateEmbedding,
  toPgVector,
} from "@/lib/templates/semantic-search";

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

    const trimmedSearch = search?.trim();
    if (trimmedSearch) {
      const semanticResult = await listTemplatesSemantic({
        supabase,
        userId: user.id,
        type: type || null,
        jurisdiction: jurisdiction || null,
        search: trimmedSearch,
        publicFilter,
        limit,
        offset,
      });

      if (semanticResult) {
        return NextResponse.json(semanticResult);
      }
    }

    const lexicalResult = await listTemplatesLexical({
      supabase,
      userId: user.id,
      type: type || null,
      jurisdiction: jurisdiction || null,
      search: trimmedSearch || null,
      publicFilter,
      limit,
      offset,
    });

    return NextResponse.json(lexicalResult);
  } catch (error) {
    console.error("Templates GET error:", error);
    return NextResponse.json({ error: "Internal server error" }, { status: 500 });
  }
}

type ListTemplatesArgs = {
  supabase: any;
  userId: string;
  type: string | null;
  jurisdiction: string | null;
  search: string | null;
  publicFilter: "true" | "false" | "all";
  limit: number;
  offset: number;
};

type SemanticRankRow = {
  source: "user" | "system";
  template_id: string;
  score: number;
};

function mapSystemTemplateToTemplateShape(systemTemplate: {
  id: string;
  title: string;
  contract_type: string;
  jurisdiction: string;
  preamble: string;
  recitals: string;
  clauses: unknown;
  signature_block: string;
  placeholders: unknown;
  created_at: string;
  updated_at: string;
}) {
  return {
    id: `system_${systemTemplate.id}`,
    name: systemTemplate.title,
    description: `Pre-built ${systemTemplate.title} template for ${formatJurisdictionName(systemTemplate.jurisdiction)}`,
    type: systemTemplate.contract_type,
    jurisdiction: systemTemplate.jurisdiction,
    content: {
      preamble: systemTemplate.preamble,
      recitals: systemTemplate.recitals,
      clauses: systemTemplate.clauses,
      signatureBlock: systemTemplate.signature_block,
      placeholders: systemTemplate.placeholders,
    },
    is_public: true,
    is_system: true,
    created_by_id: null,
    created_at: systemTemplate.created_at,
    updated_at: systemTemplate.updated_at,
    usage_count: 0,
  };
}

function applyUserTemplateVisibilityFilter(
  query: any,
  userId: string,
  publicFilter: "true" | "false" | "all"
) {
  if (publicFilter === "true") {
    return query.eq("is_public", true);
  }
  if (publicFilter === "false") {
    return query.eq("created_by_id", userId);
  }
  return query.or(`created_by_id.eq.${userId},is_public.eq.true`);
}

async function listTemplatesLexical({
  supabase,
  userId,
  type,
  jurisdiction,
  search,
  publicFilter,
  limit,
  offset,
}: ListTemplatesArgs) {
  let userQuery = supabase
    .from("templates")
    .select("*", { count: "exact" });

  userQuery = applyUserTemplateVisibilityFilter(userQuery, userId, publicFilter);

  if (type) {
    userQuery = userQuery.eq("type", type);
  }
  if (jurisdiction) {
    userQuery = userQuery.eq("jurisdiction", jurisdiction);
  }
  if (search) {
    userQuery = userQuery.or(`name.ilike.%${search}%,description.ilike.%${search}%`);
  }

  userQuery = userQuery
    .order("usage_count", { ascending: false })
    .order("created_at", { ascending: false })
    .range(offset, offset + limit - 1);

  let systemQuery = supabase
    .from("contract_templates")
    .select("*")
    .eq("is_active", true);

  if (type) {
    systemQuery = systemQuery.eq("contract_type", type);
  }
  if (jurisdiction) {
    systemQuery = systemQuery.eq("jurisdiction", jurisdiction);
  }
  if (search) {
    systemQuery = systemQuery.ilike("title", `%${search}%`);
  }

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
  const systemTemplates = ((systemResult.data || []) as Array<{
    id: string;
    title: string;
    contract_type: string;
    jurisdiction: string;
    preamble: string;
    recitals: string;
    clauses: unknown;
    signature_block: string;
    placeholders: unknown;
    created_at: string;
    updated_at: string;
  }>).map(mapSystemTemplateToTemplateShape);

  const allTemplates = [...systemTemplates, ...userTemplates];

  return {
    templates: allTemplates,
    total: (userResult.count || 0) + systemTemplates.length,
    limit,
    offset,
  };
}

async function listTemplatesSemantic({
  supabase,
  userId,
  type,
  jurisdiction,
  search,
  publicFilter,
  limit,
  offset,
}: ListTemplatesArgs): Promise<{ templates: unknown[]; total: number; limit: number; offset: number } | null> {
  const queryEmbedding = await createEmbedding(search || "");
  if (!queryEmbedding) {
    return null;
  }

  await hydrateMissingTemplateEmbeddings({
    supabase,
    userId,
    type,
    jurisdiction,
    search,
    publicFilter,
  });

  const { data: ranked, error: rankedError } = await supabase.rpc("search_templates_semantic", {
    p_user_id: userId,
    p_query_embedding: toPgVector(queryEmbedding),
    p_type: type,
    p_jurisdiction: jurisdiction,
    p_public_filter: publicFilter,
    p_limit: limit,
    p_offset: offset,
  });

  if (rankedError) {
    console.warn("Semantic template search unavailable; falling back to lexical search.", rankedError);
    return null;
  }

  const rows = (ranked || []) as SemanticRankRow[];
  if (rows.length === 0) {
    return null;
  }

  const userIds = rows.filter((row) => row.source === "user").map((row) => row.template_id);
  const systemIds = rows.filter((row) => row.source === "system").map((row) => row.template_id);

  const [userTemplatesResult, systemTemplatesResult] = await Promise.all([
    userIds.length > 0
      ? supabase.from("templates").select("*").in("id", userIds)
      : Promise.resolve({ data: [], error: null }),
    systemIds.length > 0
      ? supabase
        .from("contract_templates")
        .select("*")
        .eq("is_active", true)
        .in("id", systemIds)
      : Promise.resolve({ data: [], error: null }),
  ]);

  if (userTemplatesResult.error) {
    console.error("Error fetching semantic-ranked user templates:", userTemplatesResult.error);
  }
  if (systemTemplatesResult.error) {
    console.error("Error fetching semantic-ranked system templates:", systemTemplatesResult.error);
  }

  const userById = new Map(
    (userTemplatesResult.data || []).map((template: { id: string }) => [template.id, template])
  );
  const systemById = new Map(
    ((systemTemplatesResult.data || []) as Array<{
      id: string;
      title: string;
      contract_type: string;
      jurisdiction: string;
      preamble: string;
      recitals: string;
      clauses: unknown;
      signature_block: string;
      placeholders: unknown;
      created_at: string;
      updated_at: string;
    }>).map((template) => [template.id, mapSystemTemplateToTemplateShape(template)])
  );

  const orderedTemplates = rows
    .map((row) => (row.source === "user" ? userById.get(row.template_id) : systemById.get(row.template_id)))
    .filter(Boolean);

  if (orderedTemplates.length < limit) {
    const lexical = await listTemplatesLexical({
      supabase,
      userId,
      type,
      jurisdiction,
      search,
      publicFilter,
      limit,
      offset: 0,
    });

    const seenIds = new Set(
      orderedTemplates.map((template) => String((template as { id?: string }).id || ""))
    );

    for (const template of lexical.templates) {
      const id = String((template as { id?: string }).id || "");
      if (!id || seenIds.has(id)) continue;
      orderedTemplates.push(template);
      seenIds.add(id);
      if (orderedTemplates.length >= limit) break;
    }
  }

  return {
    templates: orderedTemplates.slice(0, limit),
    total: orderedTemplates.length,
    limit,
    offset,
  };
}

async function hydrateMissingTemplateEmbeddings(args: {
  supabase: any;
  userId: string;
  type: string | null;
  jurisdiction: string | null;
  search: string | null;
  publicFilter: "true" | "false" | "all";
}) {
  const { supabase, userId, type, jurisdiction, search, publicFilter } = args;
  const searchTerm = search || "";

  let userCandidatesQuery = supabase
    .from("templates")
    .select("id, name, description, type, jurisdiction, content, semantic_embedding");

  userCandidatesQuery = applyUserTemplateVisibilityFilter(userCandidatesQuery, userId, publicFilter);

  if (type) {
    userCandidatesQuery = userCandidatesQuery.eq("type", type);
  }
  if (jurisdiction) {
    userCandidatesQuery = userCandidatesQuery.eq("jurisdiction", jurisdiction);
  }
  if (searchTerm) {
    userCandidatesQuery = userCandidatesQuery.or(`name.ilike.%${searchTerm}%,description.ilike.%${searchTerm}%`);
  }

  let systemCandidatesQuery = supabase
    .from("contract_templates")
    .select("id, title, contract_type, jurisdiction, preamble, recitals, clauses, signature_block, semantic_embedding")
    .eq("is_active", true);

  if (type) {
    systemCandidatesQuery = systemCandidatesQuery.eq("contract_type", type);
  }
  if (jurisdiction) {
    systemCandidatesQuery = systemCandidatesQuery.eq("jurisdiction", jurisdiction);
  }
  if (searchTerm) {
    systemCandidatesQuery = systemCandidatesQuery.ilike("title", `%${searchTerm}%`);
  }

  const shouldIncludeSystemTemplates = publicFilter !== "false";
  const [userCandidatesResult, systemCandidatesResult] = await Promise.all([
    userCandidatesQuery.limit(60),
    shouldIncludeSystemTemplates ? systemCandidatesQuery.limit(60) : Promise.resolve({ data: [], error: null }),
  ]);

  if (userCandidatesResult.error) {
    console.warn("Unable to fetch user template candidates for semantic hydration:", userCandidatesResult.error);
    return;
  }
  if (systemCandidatesResult.error) {
    console.warn("Unable to fetch system template candidates for semantic hydration:", systemCandidatesResult.error);
  }

  const missingRows: Array<
    | { source: "user"; id: string; semanticText: string }
    | { source: "system"; id: string; semanticText: string }
  > = [];

  for (const template of (userCandidatesResult.data || []) as Array<{
    id: string;
    name: string;
    description: string | null;
    type: string;
    jurisdiction: string;
    content: unknown;
    semantic_embedding: unknown;
  }>) {
    if (template.semantic_embedding) continue;
    missingRows.push({
      source: "user",
      id: template.id,
      semanticText: buildTemplateSemanticText({
        name: template.name,
        description: template.description,
        type: template.type,
        jurisdiction: template.jurisdiction,
        content: template.content,
      }),
    });
  }

  for (const template of (systemCandidatesResult.data || []) as Array<{
    id: string;
    title: string;
    contract_type: string;
    jurisdiction: string;
    preamble: string | null;
    recitals: string | null;
    clauses: unknown;
    signature_block: string | null;
    semantic_embedding: unknown;
  }>) {
    if (template.semantic_embedding) continue;
    missingRows.push({
      source: "system",
      id: template.id,
      semanticText: buildSystemTemplateSemanticText(template),
    });
  }

  if (missingRows.length === 0) return;

  const embeddings = await createEmbeddings(missingRows.map((row) => row.semanticText));
  if (!embeddings || embeddings.length !== missingRows.length) {
    return;
  }

  let adminClient: ReturnType<typeof createAdminClient> | null = null;
  try {
    adminClient = createAdminClient();
  } catch {
    adminClient = null;
  }

  await Promise.all(
    missingRows.map(async (row, index) => {
      const vector = embeddings[index];
      if (!vector) return;

      if (row.source === "user") {
        await persistUserTemplateEmbedding({
          supabase,
          templateId: row.id,
          semanticText: row.semanticText,
          embedding: vector,
        });
        return;
      }

      if (!adminClient) return;

      const { error } = await adminClient
        .from("contract_templates")
        .update({
          semantic_text: row.semanticText,
          semantic_embedding: toPgVector(vector),
        })
        .eq("id", row.id);

      if (error) {
        console.warn("Failed to persist system template semantic embedding:", error);
      }
    })
  );
}

// Helper to format jurisdiction names
function formatJurisdictionName(jurisdiction: string): string {
  const names: Record<string, string> = {
    us_california: "California, USA",
    us_texas: "Texas, USA",
    us_new_york: "New York, USA",
    us_delaware: "Delaware, USA",
    us_florida: "Florida, USA",
    us_washington: "Washington, USA",
    us_illinois: "Illinois, USA",
    us_georgia: "Georgia, USA",
    us_massachusetts: "Massachusetts, USA",
    us_pennsylvania: "Pennsylvania, USA",
    us_colorado: "Colorado, USA",
    uk: "United Kingdom",
    CA: "California, USA",
    TX: "Texas, USA",
    NY: "New York, USA",
    UK: "United Kingdom",
  };

  if (names[jurisdiction]) return names[jurisdiction];

  // Handle us_* format -> "State, USA"
  if (jurisdiction.startsWith("us_")) {
    const stateName = jurisdiction.slice(3).split("_")
      .map(w => w.charAt(0).toUpperCase() + w.slice(1))
      .join(" ");
    return `${stateName}, USA`;
  }

  // Fallback: format as title case
  return jurisdiction.split("_")
    .map(w => w.charAt(0).toUpperCase() + w.slice(1))
    .join(" ");
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

    const semanticText = buildTemplateSemanticText({
      name,
      description,
      type: mappedType,
      jurisdiction: mappedJurisdiction,
      content: templateContent,
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
