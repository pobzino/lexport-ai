/**
 * Placeholder System for Contract Templates
 *
 * Standardized placeholder tokens that can be:
 * - Detected and highlighted in template content
 * - Replaced with actual values when using a template
 * - Autofilled from user profile data
 */

import type { ContractType } from "./schemas";

// ============================================================================
// Placeholder Definitions
// ============================================================================

export interface PlaceholderDefinition {
  token: string;
  label: string;
  description: string;
  category: "party_a" | "party_b" | "dates" | "terms" | "financial" | "project";
  type: "text" | "date" | "number" | "currency" | "email" | "textarea";
  required: boolean;
  // Which contract types use this placeholder
  contractTypes?: ContractType[];
  // Can be autofilled from user profile
  autofillKey?: keyof UserProfileData;
}

export interface UserProfileData {
  name: string;
  email: string;
  company_name: string;
  job_title: string;
  address: string;
  phone: string;
  default_jurisdiction: string;
}

// All available placeholders
export const PLACEHOLDERS: PlaceholderDefinition[] = [
  // Party A (typically the user/client/company)
  {
    token: "{{party_a_name}}",
    label: "Your Name",
    description: "Full legal name of the first party",
    category: "party_a",
    type: "text",
    required: true,
    autofillKey: "name",
  },
  {
    token: "{{party_a_email}}",
    label: "Your Email",
    description: "Email address of the first party",
    category: "party_a",
    type: "email",
    required: true,
    autofillKey: "email",
  },
  {
    token: "{{party_a_company}}",
    label: "Your Company",
    description: "Company or organization name",
    category: "party_a",
    type: "text",
    required: false,
    autofillKey: "company_name",
  },
  {
    token: "{{party_a_title}}",
    label: "Your Title",
    description: "Job title or role",
    category: "party_a",
    type: "text",
    required: false,
    autofillKey: "job_title",
  },
  {
    token: "{{party_a_address}}",
    label: "Your Address",
    description: "Business or mailing address",
    category: "party_a",
    type: "textarea",
    required: false,
    autofillKey: "address",
  },

  // Party B (typically the other party)
  {
    token: "{{party_b_name}}",
    label: "Other Party Name",
    description: "Full legal name of the second party",
    category: "party_b",
    type: "text",
    required: true,
  },
  {
    token: "{{party_b_email}}",
    label: "Other Party Email",
    description: "Email address of the second party",
    category: "party_b",
    type: "email",
    required: true,
  },
  {
    token: "{{party_b_company}}",
    label: "Other Party Company",
    description: "Company or organization name",
    category: "party_b",
    type: "text",
    required: false,
  },
  {
    token: "{{party_b_title}}",
    label: "Other Party Title",
    description: "Job title or role",
    category: "party_b",
    type: "text",
    required: false,
  },
  {
    token: "{{party_b_address}}",
    label: "Other Party Address",
    description: "Business or mailing address",
    category: "party_b",
    type: "textarea",
    required: false,
  },

  // Dates
  {
    token: "{{effective_date}}",
    label: "Effective Date",
    description: "When the agreement becomes effective",
    category: "dates",
    type: "date",
    required: true,
  },
  {
    token: "{{expiration_date}}",
    label: "Expiration Date",
    description: "When the agreement ends (if applicable)",
    category: "dates",
    type: "date",
    required: false,
  },
  {
    token: "{{signature_date}}",
    label: "Signature Date",
    description: "Date of signing",
    category: "dates",
    type: "date",
    required: false,
  },

  // Terms
  {
    token: "{{confidentiality_period}}",
    label: "Confidentiality Period",
    description: "Duration of confidentiality obligations (in years)",
    category: "terms",
    type: "number",
    required: false,
    contractTypes: ["nda_mutual", "nda_one_way"],
  },
  {
    token: "{{notice_period}}",
    label: "Notice Period",
    description: "Days notice required for termination",
    category: "terms",
    type: "number",
    required: false,
  },
  {
    token: "{{governing_jurisdiction}}",
    label: "Governing Jurisdiction",
    description: "State/country whose laws govern the agreement",
    category: "terms",
    type: "text",
    required: true,
  },
  {
    token: "{{purpose}}",
    label: "Purpose",
    description: "Purpose of the agreement or disclosure",
    category: "terms",
    type: "textarea",
    required: false,
    contractTypes: ["nda_mutual", "nda_one_way"],
  },

  // Financial
  {
    token: "{{payment_amount}}",
    label: "Payment Amount",
    description: "Total payment or fee amount",
    category: "financial",
    type: "currency",
    required: false,
    contractTypes: ["independent_contractor", "consulting_agreement", "freelance_service"],
  },
  {
    token: "{{hourly_rate}}",
    label: "Hourly Rate",
    description: "Rate per hour of work",
    category: "financial",
    type: "currency",
    required: false,
    contractTypes: ["independent_contractor", "consulting_agreement"],
  },
  {
    token: "{{deposit_amount}}",
    label: "Deposit Amount",
    description: "Upfront deposit or retainer",
    category: "financial",
    type: "currency",
    required: false,
    contractTypes: ["freelance_service", "consulting_agreement"],
  },
  {
    token: "{{investment_amount}}",
    label: "Investment Amount",
    description: "Amount being invested",
    category: "financial",
    type: "currency",
    required: true,
    contractTypes: ["safe_note"],
  },
  {
    token: "{{valuation_cap}}",
    label: "Valuation Cap",
    description: "Maximum valuation for conversion",
    category: "financial",
    type: "currency",
    required: false,
    contractTypes: ["safe_note"],
  },
  {
    token: "{{discount_rate}}",
    label: "Discount Rate",
    description: "Discount percentage for conversion",
    category: "financial",
    type: "number",
    required: false,
    contractTypes: ["safe_note"],
  },

  // Project
  {
    token: "{{project_name}}",
    label: "Project Name",
    description: "Name of the project or engagement",
    category: "project",
    type: "text",
    required: false,
    contractTypes: ["freelance_service", "consulting_agreement"],
  },
  {
    token: "{{services_description}}",
    label: "Services Description",
    description: "Description of services to be provided",
    category: "project",
    type: "textarea",
    required: false,
    contractTypes: ["independent_contractor", "consulting_agreement", "freelance_service"],
  },
  {
    token: "{{deliverables}}",
    label: "Deliverables",
    description: "List of expected deliverables",
    category: "project",
    type: "textarea",
    required: false,
    contractTypes: ["freelance_service", "consulting_agreement"],
  },
];

// ============================================================================
// Placeholder Functions
// ============================================================================

/**
 * Extract all placeholders from content
 */
export function extractPlaceholders(content: string): string[] {
  const regex = /\{\{([a-z_]+)\}\}/g;
  const matches = content.match(regex) || [];
  return Array.from(new Set(matches)); // Remove duplicates
}

/**
 * Get placeholder definitions for tokens found in content
 */
export function getPlaceholdersInContent(content: string): PlaceholderDefinition[] {
  const tokens = extractPlaceholders(content);
  return tokens
    .map(token => PLACEHOLDERS.find(p => p.token === token))
    .filter((p): p is PlaceholderDefinition => p !== undefined);
}

/**
 * Get placeholders relevant to a specific contract type
 */
export function getPlaceholdersForContractType(contractType: ContractType): PlaceholderDefinition[] {
  return PLACEHOLDERS.filter(p =>
    !p.contractTypes || p.contractTypes.includes(contractType)
  );
}

/**
 * Replace placeholders in content with actual values
 */
export function replacePlaceholders(
  content: string,
  values: Record<string, string>
): string {
  let result = content;

  for (const [token, value] of Object.entries(values)) {
    // Handle both {{token}} and token formats
    const placeholder = token.startsWith("{{") ? token : `{{${token}}}`;
    result = result.replace(new RegExp(escapeRegex(placeholder), "g"), value);
  }

  return result;
}

/**
 * Replace placeholders in all parts of contract content
 */
export function replaceAllPlaceholders(
  contractContent: {
    preamble: string;
    recitals: string;
    clauses: Array<{ id: string; title: string; content: string; type: string; order: number }>;
    signatureBlock: string;
  },
  values: Record<string, string>
): typeof contractContent {
  return {
    preamble: replacePlaceholders(contractContent.preamble, values),
    recitals: replacePlaceholders(contractContent.recitals, values),
    clauses: contractContent.clauses.map(clause => ({
      ...clause,
      content: replacePlaceholders(clause.content, values),
    })),
    signatureBlock: replacePlaceholders(contractContent.signatureBlock, values),
  };
}

/**
 * Check if all required placeholders have values
 */
export function validatePlaceholderValues(
  content: string,
  values: Record<string, string>
): { valid: boolean; missing: PlaceholderDefinition[] } {
  const placeholders = getPlaceholdersInContent(content);
  const requiredPlaceholders = placeholders.filter(p => p.required);

  const missing = requiredPlaceholders.filter(p => {
    const key = p.token.replace(/\{\{|\}\}/g, "");
    const value = values[key] || values[p.token];
    return !value || value.trim() === "";
  });

  return {
    valid: missing.length === 0,
    missing,
  };
}

/**
 * Autofill placeholder values from user profile
 */
export function autofillFromProfile(
  profile: Partial<UserProfileData>
): Record<string, string> {
  const values: Record<string, string> = {};

  for (const placeholder of PLACEHOLDERS) {
    if (placeholder.autofillKey && profile[placeholder.autofillKey]) {
      const key = placeholder.token.replace(/\{\{|\}\}/g, "");
      values[key] = profile[placeholder.autofillKey] as string;
    }
  }

  return values;
}

/**
 * Get all placeholders grouped by category
 */
export function getPlaceholdersByCategory(): Record<string, PlaceholderDefinition[]> {
  const grouped: Record<string, PlaceholderDefinition[]> = {};

  for (const placeholder of PLACEHOLDERS) {
    if (!grouped[placeholder.category]) {
      grouped[placeholder.category] = [];
    }
    grouped[placeholder.category].push(placeholder);
  }

  return grouped;
}

/**
 * Format category name for display
 */
export function formatCategoryName(category: string): string {
  const names: Record<string, string> = {
    party_a: "Your Information",
    party_b: "Other Party",
    dates: "Dates",
    terms: "Terms",
    financial: "Financial",
    project: "Project Details",
  };
  return names[category] || category;
}

/**
 * Highlight placeholders in HTML content
 */
export function highlightPlaceholders(content: string): string {
  return content.replace(
    /\{\{([a-z_]+)\}\}/g,
    '<span class="bg-yellow-100 text-yellow-800 px-1 rounded font-mono text-sm">{{$1}}</span>'
  );
}

/**
 * Count unfilled placeholders in content
 */
export function countUnfilledPlaceholders(
  content: string,
  values: Record<string, string>
): number {
  const placeholders = extractPlaceholders(content);
  return placeholders.filter(token => {
    const key = token.replace(/\{\{|\}\}/g, "");
    const value = values[key] || values[token];
    return !value || value.trim() === "";
  }).length;
}

// Helper function to escape regex special characters
function escapeRegex(string: string): string {
  return string.replace(/[.*+?^${}()|[\]\\]/g, "\\$&");
}
