/**
 * Public Template Queries
 *
 * Server-side queries for public template pages. Uses admin client to bypass RLS
 * since these pages are accessed by unauthenticated visitors.
 *
 * IMPORTANT: Only expose non-sensitive template metadata. Never expose full content
 * to unauthenticated users.
 */

import { createAdminClient } from "@/lib/supabase/admin";
import { getValidContractTypes, getValidJurisdictions } from "./slugs";

// ============================================================================
// Types
// ============================================================================

export interface TemplateSummary {
  byType: Record<
    string,
    {
      count: number;
      jurisdictions: string[];
      hasPremium: boolean;
    }
  >;
  totalCount: number;
}

export interface TemplateTypeDetail {
  contractType: string;
  jurisdictions: Array<{
    jurisdiction: string;
    templateCount: number;
    hasSystemTemplate: boolean;
  }>;
  totalTemplates: number;
}

export interface TemplatePreviewData {
  id: string;
  title: string;
  contractType: string;
  jurisdiction: string;
  clauseTitles: string[];
  previewText: string; // truncated preamble
  isPremium: boolean;
  price: number | null; // cents
  usageCount: number;
}

// ============================================================================
// Queries
// ============================================================================

/**
 * Get template counts by type and jurisdiction for the hub page.
 * Combines system templates (contract_templates) and public user templates.
 */
export async function getPublicTemplatesSummary(): Promise<TemplateSummary> {
  const supabase = createAdminClient();
  const types = getValidContractTypes();
  const jurisdictions = getValidJurisdictions();

  const byType: TemplateSummary["byType"] = {};
  let totalCount = 0;

  // Query system templates
  const { data: systemTemplates } = await supabase
    .from("contract_templates")
    .select("contract_type, jurisdiction, is_active")
    .eq("is_active", true);

  // Query public user templates
  const { data: userTemplates } = await supabase
    .from("templates")
    .select("type, jurisdiction, is_premium")
    .eq("is_public", true);

  // Build summary
  for (const type of types) {
    const systemForType = systemTemplates?.filter(
      (t) => t.contract_type === type
    ) ?? [];
    const userForType = userTemplates?.filter((t) => t.type === type) ?? [];

    const typeJurisdictions = new Set<string>();
    for (const t of systemForType) typeJurisdictions.add(t.jurisdiction);
    for (const t of userForType) typeJurisdictions.add(t.jurisdiction);

    // Also include all supported jurisdictions for types that should have full coverage
    for (const j of jurisdictions) typeJurisdictions.add(j);

    const count = systemForType.length + userForType.length;
    const hasPremium = userForType.some((t) => t.is_premium);

    byType[type] = {
      count: Math.max(count, jurisdictions.length), // At minimum, show jurisdiction count
      jurisdictions: Array.from(typeJurisdictions),
      hasPremium,
    };
    totalCount += byType[type].count;
  }

  return { byType, totalCount };
}

/**
 * Get templates and jurisdiction breakdown for a specific contract type.
 */
export async function getTemplatesByType(
  contractType: string
): Promise<TemplateTypeDetail> {
  const supabase = createAdminClient();
  const jurisdictions = getValidJurisdictions();

  // Get system templates for this type
  const { data: systemTemplates } = await supabase
    .from("contract_templates")
    .select("jurisdiction")
    .eq("contract_type", contractType)
    .eq("is_active", true);

  // Get public user templates for this type
  const { data: userTemplates } = await supabase
    .from("templates")
    .select("jurisdiction")
    .eq("type", contractType)
    .eq("is_public", true);

  const jurisdictionDetails = jurisdictions.map((j) => {
    const systemCount = systemTemplates?.filter(
      (t) => t.jurisdiction === j
    ).length ?? 0;
    const userCount = userTemplates?.filter(
      (t) => t.jurisdiction === j
    ).length ?? 0;

    return {
      jurisdiction: j,
      templateCount: systemCount + userCount,
      hasSystemTemplate: systemCount > 0,
    };
  });

  return {
    contractType,
    jurisdictions: jurisdictionDetails,
    totalTemplates:
      (systemTemplates?.length ?? 0) + (userTemplates?.length ?? 0),
  };
}

/**
 * Get preview data for a specific type+jurisdiction template page.
 * Returns clause titles and a truncated preview — never full content.
 */
export async function getTemplateForTypeAndJurisdiction(
  contractType: string,
  jurisdiction: string
): Promise<TemplatePreviewData | null> {
  const supabase = createAdminClient();

  // Try system template first
  const { data: systemTemplate } = await supabase
    .from("contract_templates")
    .select("id, title, clauses, preamble, metadata")
    .eq("contract_type", contractType)
    .eq("jurisdiction", jurisdiction)
    .eq("is_active", true)
    .order("version", { ascending: false })
    .limit(1)
    .single();

  if (systemTemplate) {
    const clauses = (systemTemplate.clauses as Array<{ title?: string }>) ?? [];
    const clauseTitles = clauses
      .map((c) => c.title)
      .filter((t): t is string => !!t);

    const preamble = (systemTemplate.preamble as string) ?? "";
    const previewText = preamble.slice(0, 200) + (preamble.length > 200 ? "..." : "");

    return {
      id: `system_${systemTemplate.id}`,
      title: systemTemplate.title ?? "",
      contractType,
      jurisdiction,
      clauseTitles,
      previewText,
      isPremium: false,
      price: null,
      usageCount: 0,
    };
  }

  // Fallback to public user template
  const { data: userTemplate } = await supabase
    .from("templates")
    .select("id, name, content, is_premium, price, usage_count")
    .eq("type", contractType)
    .eq("jurisdiction", jurisdiction)
    .eq("is_public", true)
    .order("usage_count", { ascending: false })
    .limit(1)
    .single();

  if (userTemplate) {
    const content = userTemplate.content as {
      preamble?: string;
      clauses?: Array<{ title?: string }>;
    } | null;

    const clauseTitles = (content?.clauses ?? [])
      .map((c) => c.title)
      .filter((t): t is string => !!t);

    const preamble = content?.preamble ?? "";
    const previewText = preamble.slice(0, 200) + (preamble.length > 200 ? "..." : "");

    return {
      id: userTemplate.id,
      title: userTemplate.name ?? "",
      contractType,
      jurisdiction,
      clauseTitles,
      previewText,
      isPremium: userTemplate.is_premium ?? false,
      price: userTemplate.price ?? null,
      usageCount: userTemplate.usage_count ?? 0,
    };
  }

  return null;
}
