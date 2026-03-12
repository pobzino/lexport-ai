/**
 * Template URL slug utilities
 *
 * Bidirectional mapping between contract type/jurisdiction enums and URL-friendly slugs.
 * Used by public template pages, sitemap, and breadcrumbs.
 */

import type { ContractType, Jurisdiction } from "@/lib/contracts/schemas";

// ============================================================================
// Type Slug Mapping
// ============================================================================

const TYPE_TO_SLUG: Record<string, string> = {
  nda_mutual: "nda-mutual",
  nda_one_way: "nda-one-way",
  independent_contractor: "independent-contractor",
  consulting_agreement: "consulting-agreement",
  safe_note: "safe-note",
  freelance_service: "freelance-service",
  letter_of_intent: "letter-of-intent",
  cofounder_agreement: "cofounder-agreement",
  sales_contract: "sales-contract",
  ip_assignment: "ip-assignment",
  advisor_agreement: "advisor-agreement",
  employment_offer: "employment-offer",
  sow: "statement-of-work",
  msa: "master-service-agreement",
} as const;

const SLUG_TO_TYPE: Record<string, ContractType> = Object.fromEntries(
  Object.entries(TYPE_TO_SLUG).map(([k, v]) => [v, k as ContractType])
);

const TYPE_DISPLAY_NAMES: Record<string, string> = {
  nda_mutual: "Mutual NDA",
  nda_one_way: "One-Way NDA",
  independent_contractor: "Independent Contractor Agreement",
  consulting_agreement: "Consulting Agreement",
  safe_note: "SAFE Note",
  freelance_service: "Freelance Service Agreement",
  letter_of_intent: "Letter of Intent",
  cofounder_agreement: "Co-Founder Agreement",
  sales_contract: "Sales Contract",
  ip_assignment: "IP Assignment Agreement",
  advisor_agreement: "Advisor Agreement",
  employment_offer: "Employment Offer Letter",
  sow: "Statement of Work",
  msa: "Master Service Agreement",
};

const TYPE_SHORT_DESCRIPTIONS: Record<string, string> = {
  nda_mutual: "Protect confidential information shared between two parties",
  nda_one_way: "Protect your confidential information shared with another party",
  independent_contractor: "Define terms for hiring independent contractors",
  consulting_agreement: "Formalize consulting engagements with clear scope and terms",
  safe_note: "Simple agreement for future equity investment in startups",
  freelance_service: "Professional service agreements for freelance work",
  letter_of_intent: "Non-binding agreement outlining terms of a proposed deal",
  cofounder_agreement: "Define equity splits, roles, and vesting for co-founders",
  sales_contract: "Terms for the sale of goods or services",
  ip_assignment: "Transfer intellectual property rights between parties",
  advisor_agreement: "Terms for startup advisor relationships and compensation",
  employment_offer: "Formal offer letter for full-time employment",
  sow: "Detailed scope, deliverables, and timeline for a project",
  msa: "Framework agreement governing future transactions between parties",
};

// ============================================================================
// Jurisdiction Slug Mapping
// ============================================================================

const JURISDICTION_TO_SLUG: Record<string, string> = {
  us_california: "california",
  us_texas: "texas",
  us_new_york: "new-york",
  uk: "united-kingdom",
} as const;

const SLUG_TO_JURISDICTION: Record<string, Jurisdiction> = Object.fromEntries(
  Object.entries(JURISDICTION_TO_SLUG).map(([k, v]) => [v, k as Jurisdiction])
);

const JURISDICTION_DISPLAY_NAMES: Record<string, string> = {
  us_california: "California",
  us_texas: "Texas",
  us_new_york: "New York",
  uk: "United Kingdom",
};

const JURISDICTION_SHORT_LABELS: Record<string, string> = {
  us_california: "CA",
  us_texas: "TX",
  us_new_york: "NY",
  uk: "UK",
};

// ============================================================================
// Public API
// ============================================================================

/** Convert a URL slug to a ContractType enum value. Returns null if invalid. */
export function typeSlugToEnum(slug: string): ContractType | null {
  return SLUG_TO_TYPE[slug] ?? null;
}

/** Convert a ContractType enum value to a URL slug. */
export function typeEnumToSlug(type: string): string {
  return TYPE_TO_SLUG[type] ?? type.replace(/_/g, "-");
}

/** Convert a URL slug to a Jurisdiction enum value. Returns null if invalid. */
export function jurisdictionSlugToEnum(slug: string): Jurisdiction | null {
  return SLUG_TO_JURISDICTION[slug] ?? null;
}

/** Convert a Jurisdiction enum value to a URL slug. */
export function jurisdictionEnumToSlug(jurisdiction: string): string {
  return JURISDICTION_TO_SLUG[jurisdiction] ?? jurisdiction.replace(/_/g, "-");
}

/** Get display name for a contract type (e.g., "Mutual NDA"). */
export function getTypeDisplayName(type: string): string {
  return TYPE_DISPLAY_NAMES[type] ?? type;
}

/** Get short description for a contract type. */
export function getTypeShortDescription(type: string): string {
  return TYPE_SHORT_DESCRIPTIONS[type] ?? "";
}

/** Get display name for a jurisdiction (e.g., "California"). */
export function getJurisdictionDisplayName(jurisdiction: string): string {
  return JURISDICTION_DISPLAY_NAMES[jurisdiction] ?? jurisdiction;
}

/** Get short label for a jurisdiction (e.g., "CA"). */
export function getJurisdictionShortLabel(jurisdiction: string): string {
  return JURISDICTION_SHORT_LABELS[jurisdiction] ?? jurisdiction;
}

/** All valid contract types (excludes "custom"). */
export function getValidContractTypes(): ContractType[] {
  return Object.keys(TYPE_TO_SLUG) as ContractType[];
}

/** All valid jurisdictions. */
export function getValidJurisdictions(): Jurisdiction[] {
  return Object.keys(JURISDICTION_TO_SLUG) as Jurisdiction[];
}

/** All valid type + jurisdiction route combinations for generateStaticParams. */
export function getAllTemplateRoutes(): Array<{
  type: string;
  jurisdiction: string;
}> {
  const types = Object.values(TYPE_TO_SLUG);
  const jurisdictions = Object.values(JURISDICTION_TO_SLUG);
  return types.flatMap((type) =>
    jurisdictions.map((jurisdiction) => ({ type, jurisdiction }))
  );
}

/** Get all type slugs for generateStaticParams on the type page. */
export function getAllTypeSlugs(): Array<{ type: string }> {
  return Object.values(TYPE_TO_SLUG).map((slug) => ({ type: slug }));
}
