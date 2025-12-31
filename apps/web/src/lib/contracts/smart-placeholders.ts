/**
 * Smart Placeholder System for Contract Templates
 *
 * Enhanced placeholder handling with:
 * - Rich input types (phone, address, duration, percentage, etc.)
 * - Auto-fill from user profile and saved contacts
 * - Conditional visibility based on other field values
 * - Smart validation and formatting
 * - Grouped layouts for better UX
 */

import type { ContractType } from "./schemas";

// ============================================================================
// Enhanced Placeholder Types
// ============================================================================

export type PlaceholderInputType =
  // Basic types
  | "text"
  | "textarea"
  | "number"
  | "date"
  | "email"
  // Enhanced types
  | "phone"
  | "address"
  | "currency"
  | "percentage"
  | "duration"      // e.g., "30 days", "6 months"
  | "select"
  | "radio"
  | "party"         // Special: Name + Email + Company combo
  | "payment_terms" // Special: Amount + Schedule combo
  | "url";

export type PlaceholderCategory =
  | "your_details"   // User's info (auto-fillable)
  | "other_party"    // Counterparty info (contacts)
  | "dates"
  | "financial"
  | "terms"
  | "project"
  | "legal";

export interface PlaceholderValidation {
  required?: boolean;
  minLength?: number;
  maxLength?: number;
  min?: number;
  max?: number;
  pattern?: RegExp;
  patternMessage?: string;
}

export interface PlaceholderCondition {
  // Show this field only if another field has a specific value
  dependsOn: string;
  showWhen: string | string[] | boolean;
}

export interface SmartPlaceholder {
  key: string;
  token: string;           // {{key}}
  label: string;
  description?: string;
  type: PlaceholderInputType;
  category: PlaceholderCategory;

  // Validation
  validation?: PlaceholderValidation;

  // Auto-fill
  autofillFrom?: "profile" | "contact";
  autofillKey?: string;    // Key in user profile or contact

  // For select/radio types
  options?: Array<{ value: string; label: string }>;

  // For duration type
  durationUnits?: ("days" | "weeks" | "months" | "years")[];

  // For currency type
  currencyCode?: string;   // Default: based on jurisdiction

  // Conditional visibility
  condition?: PlaceholderCondition;

  // Default value
  defaultValue?: string | number;

  // For grouped fields (party, payment_terms)
  subFields?: SmartPlaceholder[];

  // Contract type restrictions
  contractTypes?: ContractType[];

  // Display hints
  placeholder?: string;
  helpText?: string;
  width?: "full" | "half" | "third";
}

// ============================================================================
// Placeholder Definitions
// ============================================================================

export const SMART_PLACEHOLDERS: SmartPlaceholder[] = [
  // ========================
  // YOUR DETAILS (Auto-fill from profile)
  // ========================
  {
    key: "client_name",
    token: "{{client_name}}",
    label: "Your Name / Company",
    type: "text",
    category: "your_details",
    validation: { required: true, minLength: 2 },
    autofillFrom: "profile",
    autofillKey: "name",
    placeholder: "Your full name or company name",
  },
  {
    key: "client_email",
    token: "{{client_email}}",
    label: "Your Email",
    type: "email",
    category: "your_details",
    validation: { required: true },
    autofillFrom: "profile",
    autofillKey: "email",
  },
  {
    key: "client_address",
    token: "{{client_address}}",
    label: "Your Address",
    type: "address",
    category: "your_details",
    autofillFrom: "profile",
    autofillKey: "address",
  },
  {
    key: "client_phone",
    token: "{{client_phone}}",
    label: "Your Phone",
    type: "phone",
    category: "your_details",
    autofillFrom: "profile",
    autofillKey: "phone",
  },

  // ========================
  // OTHER PARTY (Auto-fill from contacts)
  // ========================
  {
    key: "freelancer_name",
    token: "{{freelancer_name}}",
    label: "Freelancer / Contractor Name",
    type: "text",
    category: "other_party",
    validation: { required: true, minLength: 2 },
    autofillFrom: "contact",
    autofillKey: "name",
    placeholder: "Full legal name",
    contractTypes: ["freelance_service", "independent_contractor"],
  },
  {
    key: "freelancer_email",
    token: "{{freelancer_email}}",
    label: "Freelancer Email",
    type: "email",
    category: "other_party",
    validation: { required: true },
    autofillFrom: "contact",
    autofillKey: "email",
    contractTypes: ["freelance_service", "independent_contractor"],
  },
  {
    key: "counterparty_name",
    token: "{{counterparty_name}}",
    label: "Other Party Name",
    type: "text",
    category: "other_party",
    validation: { required: true },
    autofillFrom: "contact",
    autofillKey: "name",
  },
  {
    key: "counterparty_email",
    token: "{{counterparty_email}}",
    label: "Other Party Email",
    type: "email",
    category: "other_party",
    validation: { required: true },
    autofillFrom: "contact",
    autofillKey: "email",
  },
  {
    key: "counterparty_company",
    token: "{{counterparty_company}}",
    label: "Other Party Company",
    type: "text",
    category: "other_party",
    autofillFrom: "contact",
    autofillKey: "company",
  },

  // ========================
  // DATES
  // ========================
  {
    key: "effective_date",
    token: "{{effective_date}}",
    label: "Effective Date",
    description: "When does this agreement start?",
    type: "date",
    category: "dates",
    validation: { required: true },
    defaultValue: new Date().toISOString().split("T")[0],
  },
  {
    key: "start_date",
    token: "{{start_date}}",
    label: "Start Date",
    description: "When does work begin?",
    type: "date",
    category: "dates",
    validation: { required: true },
    contractTypes: ["freelance_service", "consulting_agreement"],
  },
  {
    key: "end_date",
    token: "{{end_date}}",
    label: "End Date",
    description: "Target completion date",
    type: "date",
    category: "dates",
    contractTypes: ["freelance_service", "consulting_agreement"],
  },
  {
    key: "expiration_date",
    token: "{{expiration_date}}",
    label: "Expiration Date",
    type: "date",
    category: "dates",
    helpText: "Leave blank for no expiration",
  },

  // ========================
  // FINANCIAL
  // ========================
  {
    key: "payment_amount",
    token: "{{payment_amount}}",
    label: "Payment Amount",
    type: "currency",
    category: "financial",
    validation: { required: true, min: 0 },
    placeholder: "5,000.00",
    contractTypes: ["freelance_service", "consulting_agreement", "independent_contractor"],
  },
  {
    key: "payment_schedule",
    token: "{{payment_schedule}}",
    label: "Payment Schedule",
    type: "select",
    category: "financial",
    options: [
      { value: "50% upfront, 50% on completion", label: "50/50 Split" },
      { value: "100% on completion", label: "100% on Completion" },
      { value: "100% upfront", label: "100% Upfront" },
      { value: "Monthly", label: "Monthly" },
      { value: "Upon milestones", label: "Milestone-Based" },
      { value: "Net 30", label: "Net 30" },
      { value: "custom", label: "Custom..." },
    ],
    defaultValue: "50% upfront, 50% on completion",
    contractTypes: ["freelance_service", "consulting_agreement"],
  },
  {
    key: "custom_payment_schedule",
    token: "{{custom_payment_schedule}}",
    label: "Custom Payment Terms",
    type: "textarea",
    category: "financial",
    condition: { dependsOn: "payment_schedule", showWhen: "custom" },
    placeholder: "Describe your payment schedule...",
  },
  {
    key: "hourly_rate",
    token: "{{hourly_rate}}",
    label: "Hourly Rate",
    type: "currency",
    category: "financial",
    validation: { min: 0 },
    placeholder: "150.00",
    contractTypes: ["freelance_service", "consulting_agreement"],
  },
  {
    key: "late_fee_rate",
    token: "{{late_fee_rate}}",
    label: "Late Fee Rate",
    type: "percentage",
    category: "financial",
    defaultValue: 1.5,
    helpText: "Monthly interest on late payments",
    validation: { min: 0, max: 25 },
    width: "half",
  },
  {
    key: "deposit_percentage",
    token: "{{deposit_percentage}}",
    label: "Deposit Percentage",
    type: "percentage",
    category: "financial",
    defaultValue: 50,
    validation: { min: 0, max: 100 },
    width: "half",
  },

  // SAFE Note specific
  {
    key: "investment_amount",
    token: "{{investment_amount}}",
    label: "Investment Amount",
    type: "currency",
    category: "financial",
    validation: { required: true, min: 1000 },
    contractTypes: ["safe_note"],
  },
  {
    key: "valuation_cap",
    token: "{{valuation_cap}}",
    label: "Valuation Cap",
    type: "currency",
    category: "financial",
    validation: { min: 0 },
    helpText: "Maximum valuation for equity conversion",
    contractTypes: ["safe_note"],
  },
  {
    key: "discount_rate",
    token: "{{discount_rate}}",
    label: "Discount Rate",
    type: "percentage",
    category: "financial",
    defaultValue: 20,
    validation: { min: 0, max: 50 },
    contractTypes: ["safe_note"],
  },

  // ========================
  // TERMS
  // ========================
  {
    key: "notice_period",
    token: "{{notice_period}}",
    label: "Notice Period",
    description: "Days notice required for termination",
    type: "duration",
    category: "terms",
    durationUnits: ["days", "weeks"],
    defaultValue: "14 days",
    width: "half",
  },
  {
    key: "revision_rounds",
    token: "{{revision_rounds}}",
    label: "Included Revisions",
    type: "number",
    category: "terms",
    defaultValue: 2,
    validation: { min: 0, max: 10 },
    helpText: "Number of free revision rounds",
    width: "half",
    contractTypes: ["freelance_service"],
  },
  {
    key: "acceptance_period",
    token: "{{acceptance_period}}",
    label: "Acceptance Period",
    description: "Days to review deliverables",
    type: "duration",
    category: "terms",
    durationUnits: ["days"],
    defaultValue: "7 days",
    width: "half",
  },
  {
    key: "confidentiality_period",
    token: "{{confidentiality_period}}",
    label: "Confidentiality Period",
    type: "duration",
    category: "terms",
    durationUnits: ["years"],
    defaultValue: "2 years",
    contractTypes: ["nda_mutual", "nda_one_way"],
  },
  {
    key: "vat_status",
    token: "{{vat_status}}",
    label: "VAT Status",
    type: "select",
    category: "terms",
    options: [
      { value: "plus VAT", label: "+ VAT (standard)" },
      { value: "VAT inclusive", label: "VAT Inclusive" },
      { value: "VAT not applicable", label: "Not VAT Registered" },
    ],
    defaultValue: "plus VAT",
    // UK only - we'll handle this in the form
  },

  // ========================
  // PROJECT DETAILS
  // ========================
  {
    key: "services_description",
    token: "{{services_description}}",
    label: "Services Description",
    description: "What work will be performed?",
    type: "textarea",
    category: "project",
    validation: { required: true, minLength: 20 },
    placeholder: "Describe the services in detail...",
    contractTypes: ["freelance_service", "consulting_agreement", "independent_contractor"],
  },
  {
    key: "deliverables",
    token: "{{deliverables}}",
    label: "Deliverables",
    description: "What will be delivered?",
    type: "textarea",
    category: "project",
    validation: { required: true },
    placeholder: "List all deliverables...",
    contractTypes: ["freelance_service", "consulting_agreement"],
  },
  {
    key: "project_name",
    token: "{{project_name}}",
    label: "Project Name",
    type: "text",
    category: "project",
    placeholder: "Website Redesign, Mobile App, etc.",
    contractTypes: ["freelance_service", "consulting_agreement"],
  },

  // ========================
  // LEGAL
  // ========================
  {
    key: "county",
    token: "{{county}}",
    label: "County for Disputes",
    type: "text",
    category: "legal",
    placeholder: "Los Angeles",
    validation: { required: true },
  },
  {
    key: "governing_law",
    token: "{{governing_law}}",
    label: "Governing Law",
    type: "text",
    category: "legal",
    placeholder: "State of California",
    validation: { required: true },
  },
];

// ============================================================================
// Helper Functions
// ============================================================================

/**
 * Get placeholders relevant to a contract type
 */
export function getPlaceholdersForContract(
  contractType: ContractType,
  jurisdiction?: string
): SmartPlaceholder[] {
  return SMART_PLACEHOLDERS.filter((p) => {
    // Check contract type restriction
    if (p.contractTypes && !p.contractTypes.includes(contractType)) {
      return false;
    }
    // Check jurisdiction-specific fields
    if (p.key === "vat_status" && jurisdiction !== "GB") {
      return false;
    }
    return true;
  });
}

/**
 * Group placeholders by category
 */
export function groupPlaceholdersByCategory(
  placeholders: SmartPlaceholder[]
): Record<PlaceholderCategory, SmartPlaceholder[]> {
  const grouped: Record<PlaceholderCategory, SmartPlaceholder[]> = {
    your_details: [],
    other_party: [],
    dates: [],
    financial: [],
    terms: [],
    project: [],
    legal: [],
  };

  for (const p of placeholders) {
    grouped[p.category].push(p);
  }

  return grouped;
}

/**
 * Format category name for display
 */
export function formatCategoryLabel(category: PlaceholderCategory): string {
  const labels: Record<PlaceholderCategory, string> = {
    your_details: "Your Details",
    other_party: "Other Party",
    dates: "Dates & Timeline",
    financial: "Payment & Fees",
    terms: "Contract Terms",
    project: "Project Details",
    legal: "Legal & Jurisdiction",
  };
  return labels[category];
}

/**
 * Get category icon name (for lucide-react)
 */
export function getCategoryIcon(category: PlaceholderCategory): string {
  const icons: Record<PlaceholderCategory, string> = {
    your_details: "User",
    other_party: "Users",
    dates: "Calendar",
    financial: "DollarSign",
    terms: "FileText",
    project: "Briefcase",
    legal: "Scale",
  };
  return icons[category];
}

/**
 * Check if a field should be visible based on conditions
 */
export function isFieldVisible(
  placeholder: SmartPlaceholder,
  values: Record<string, string | number | boolean>
): boolean {
  if (!placeholder.condition) return true;

  const { dependsOn, showWhen } = placeholder.condition;
  const dependentValue = values[dependsOn];

  if (Array.isArray(showWhen)) {
    return showWhen.includes(String(dependentValue));
  }

  if (typeof showWhen === "boolean") {
    return Boolean(dependentValue) === showWhen;
  }

  return String(dependentValue) === showWhen;
}

/**
 * Format currency based on jurisdiction
 */
export function formatCurrency(
  amount: number | string,
  jurisdiction?: string
): string {
  const numAmount = typeof amount === "string" ? parseFloat(amount) : amount;
  if (isNaN(numAmount)) return "";

  const locale = jurisdiction === "GB" ? "en-GB" : "en-US";
  const currency = jurisdiction === "GB" ? "GBP" : "USD";

  return new Intl.NumberFormat(locale, {
    style: "currency",
    currency,
  }).format(numAmount);
}

/**
 * Parse duration string to value and unit
 */
export function parseDuration(value: string): { value: number; unit: string } | null {
  const match = value.match(/^(\d+)\s*(days?|weeks?|months?|years?)$/i);
  if (!match) return null;
  return {
    value: parseInt(match[1]),
    unit: match[2].toLowerCase().replace(/s$/, ""),
  };
}

/**
 * Format duration for display
 */
export function formatDuration(value: number, unit: string): string {
  const plural = value !== 1 ? "s" : "";
  return `${value} ${unit}${plural}`;
}

/**
 * Validate a placeholder value
 */
export function validatePlaceholderValue(
  placeholder: SmartPlaceholder,
  value: string | number | undefined
): { valid: boolean; error?: string } {
  const { validation } = placeholder;
  if (!validation) return { valid: true };

  const strValue = String(value ?? "");

  if (validation.required && !strValue.trim()) {
    return { valid: false, error: `${placeholder.label} is required` };
  }

  if (!strValue.trim()) return { valid: true }; // Skip other validations if empty and not required

  if (validation.minLength && strValue.length < validation.minLength) {
    return { valid: false, error: `Must be at least ${validation.minLength} characters` };
  }

  if (validation.maxLength && strValue.length > validation.maxLength) {
    return { valid: false, error: `Must be at most ${validation.maxLength} characters` };
  }

  if (validation.min !== undefined && placeholder.type === "number") {
    const numValue = parseFloat(strValue);
    if (!isNaN(numValue) && numValue < validation.min) {
      return { valid: false, error: `Must be at least ${validation.min}` };
    }
  }

  if (validation.max !== undefined && placeholder.type === "number") {
    const numValue = parseFloat(strValue);
    if (!isNaN(numValue) && numValue > validation.max) {
      return { valid: false, error: `Must be at most ${validation.max}` };
    }
  }

  if (validation.pattern && !validation.pattern.test(strValue)) {
    return { valid: false, error: validation.patternMessage || "Invalid format" };
  }

  // Email validation
  if (placeholder.type === "email" && strValue) {
    const emailRegex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
    if (!emailRegex.test(strValue)) {
      return { valid: false, error: "Invalid email address" };
    }
  }

  // Phone validation (basic)
  if (placeholder.type === "phone" && strValue) {
    const phoneRegex = /^[\d\s\-+()]+$/;
    if (!phoneRegex.test(strValue)) {
      return { valid: false, error: "Invalid phone number" };
    }
  }

  return { valid: true };
}

/**
 * Get all validation errors for a set of values
 */
export function validateAllPlaceholders(
  placeholders: SmartPlaceholder[],
  values: Record<string, string | number>
): Record<string, string> {
  const errors: Record<string, string> = {};

  for (const placeholder of placeholders) {
    const result = validatePlaceholderValue(placeholder, values[placeholder.key]);
    if (!result.valid && result.error) {
      errors[placeholder.key] = result.error;
    }
  }

  return errors;
}

/**
 * Format phone number for display
 */
export function formatPhoneNumber(phone: string, jurisdiction?: string): string {
  // Remove all non-digits
  const digits = phone.replace(/\D/g, "");

  if (jurisdiction === "GB") {
    // UK format: 07XXX XXX XXX or 020 XXXX XXXX
    if (digits.length === 11 && digits.startsWith("0")) {
      return `${digits.slice(0, 5)} ${digits.slice(5, 8)} ${digits.slice(8)}`;
    }
  } else {
    // US format: (XXX) XXX-XXXX
    if (digits.length === 10) {
      return `(${digits.slice(0, 3)}) ${digits.slice(3, 6)}-${digits.slice(6)}`;
    }
    if (digits.length === 11 && digits.startsWith("1")) {
      return `+1 (${digits.slice(1, 4)}) ${digits.slice(4, 7)}-${digits.slice(7)}`;
    }
  }

  return phone; // Return original if can't format
}
