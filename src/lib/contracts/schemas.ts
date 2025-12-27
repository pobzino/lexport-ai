/**
 * Contract Type Schemas
 *
 * Each contract type has a defined structure with:
 * - Metadata schema (parties, dates, terms)
 * - Clause definitions (standard, negotiable, optional)
 * - Jurisdiction-specific variations
 */

import { z } from "zod";

// ============================================================================
// Base Types
// ============================================================================

export const JurisdictionEnum = z.enum([
  "us_california",
  "us_texas",
  "us_new_york",
  "uk",
]);

export type Jurisdiction = z.infer<typeof JurisdictionEnum>;

export const ContractTypeEnum = z.enum([
  "nda_mutual",
  "nda_one_way",
  "independent_contractor",
  "consulting_agreement",
  "safe_note",
  "freelance_service",
]);

export type ContractType = z.infer<typeof ContractTypeEnum>;

export const ClauseTypeEnum = z.enum([
  "standard",      // Required, rarely modified
  "negotiable",    // Common to modify
  "optional",      // Can be removed entirely
]);

export type ClauseType = z.infer<typeof ClauseTypeEnum>;

// ============================================================================
// Clause Schema
// ============================================================================

export const ClauseSchema = z.object({
  id: z.string(),
  title: z.string(),
  content: z.string(),
  type: ClauseTypeEnum,
  order: z.number(),
  isEdited: z.boolean().default(false),
  originalContent: z.string().optional(),
  notes: z.string().optional(),
});

export type Clause = z.infer<typeof ClauseSchema>;

// ============================================================================
// Party Schema
// ============================================================================

export const PartySchema = z.object({
  name: z.string().min(1, "Name is required"),
  email: z.string().email("Valid email required"),
  role: z.enum(["discloser", "recipient", "client", "contractor", "consultant", "investor", "company"]),
  company: z.string().optional(),
  title: z.string().optional(),
  address: z.string().optional(),
});

export type Party = z.infer<typeof PartySchema>;

// ============================================================================
// Contract Metadata Schemas (per type)
// ============================================================================

// NDA Metadata
export const NDAMetadataSchema = z.object({
  contractType: z.literal("nda_mutual").or(z.literal("nda_one_way")),
  disclosingParty: PartySchema,
  receivingParty: PartySchema,
  effectiveDate: z.string(),
  expirationDate: z.string().optional(),
  confidentialityPeriod: z.number().default(2), // years
  purpose: z.string().min(10, "Please describe the purpose"),
  jurisdiction: JurisdictionEnum,
  includeNonSolicit: z.boolean().default(false),
  includeNonCompete: z.boolean().default(false),
  nonCompetePeriod: z.number().optional(), // months
  geographicScope: z.string().optional(),
});

export type NDAMetadata = z.infer<typeof NDAMetadataSchema>;

// Independent Contractor Metadata
export const ContractorMetadataSchema = z.object({
  contractType: z.literal("independent_contractor"),
  client: PartySchema,
  contractor: PartySchema,
  effectiveDate: z.string(),
  endDate: z.string().optional(),
  isOngoing: z.boolean().default(false),
  servicesDescription: z.string().min(20, "Please describe the services"),
  paymentAmount: z.number().min(0),
  paymentFrequency: z.enum(["hourly", "daily", "weekly", "monthly", "project", "milestone"]),
  paymentTerms: z.number().default(30), // days
  jurisdiction: JurisdictionEnum,
  includeIPAssignment: z.boolean().default(true),
  includeConfidentiality: z.boolean().default(true),
  terminationNoticeDays: z.number().default(14),
});

export type ContractorMetadata = z.infer<typeof ContractorMetadataSchema>;

// Consulting Agreement Metadata
export const ConsultingMetadataSchema = z.object({
  contractType: z.literal("consulting_agreement"),
  client: PartySchema,
  consultant: PartySchema,
  effectiveDate: z.string(),
  endDate: z.string().optional(),
  isOngoing: z.boolean().default(false),
  consultingScope: z.string().min(20, "Please describe the consulting scope"),
  deliverables: z.array(z.string()).optional(),
  retainerAmount: z.number().optional(),
  hourlyRate: z.number().optional(),
  maxHours: z.number().optional(),
  paymentTerms: z.number().default(30),
  jurisdiction: JurisdictionEnum,
  includeIPAssignment: z.boolean().default(true),
  includeConfidentiality: z.boolean().default(true),
  includeNonCompete: z.boolean().default(false),
  nonCompetePeriod: z.number().optional(),
});

export type ConsultingMetadata = z.infer<typeof ConsultingMetadataSchema>;

// SAFE Note Metadata (US only)
export const SAFEMetadataSchema = z.object({
  contractType: z.literal("safe_note"),
  company: PartySchema,
  investor: PartySchema,
  investmentAmount: z.number().min(1000, "Minimum investment $1,000"),
  valuationCap: z.number().optional(),
  discountRate: z.number().min(0).max(100).optional(), // percentage
  safeType: z.enum(["valuation_cap", "discount", "mfn", "cap_and_discount"]),
  proRataRights: z.boolean().default(false),
  effectiveDate: z.string(),
  jurisdiction: z.enum(["us_california", "us_texas", "us_new_york"]), // US only
});

export type SAFEMetadata = z.infer<typeof SAFEMetadataSchema>;

// Freelance Service Agreement Metadata
export const FreelanceMetadataSchema = z.object({
  contractType: z.literal("freelance_service"),
  client: PartySchema,
  freelancer: PartySchema,
  projectName: z.string().min(3, "Project name required"),
  projectDescription: z.string().min(20, "Please describe the project"),
  deliverables: z.array(z.object({
    description: z.string(),
    dueDate: z.string().optional(),
    amount: z.number().optional(),
  })).min(1, "At least one deliverable required"),
  totalAmount: z.number().min(0),
  depositAmount: z.number().optional(),
  paymentSchedule: z.enum(["upfront", "milestone", "completion", "split"]),
  revisionRounds: z.number().default(2),
  effectiveDate: z.string(),
  deadline: z.string().optional(),
  jurisdiction: JurisdictionEnum,
  includeIPAssignment: z.boolean().default(true),
});

export type FreelanceMetadata = z.infer<typeof FreelanceMetadataSchema>;

// Union type for all metadata
export type ContractMetadata =
  | NDAMetadata
  | ContractorMetadata
  | ConsultingMetadata
  | SAFEMetadata
  | FreelanceMetadata;

// ============================================================================
// Payment Configuration Schema
// ============================================================================

export const PaymentConfigSchema = z.object({
  paymentRequired: z.boolean().default(false),
  paymentAmount: z.number().min(0).optional(),
  paymentCurrency: z.enum(["usd", "eur", "gbp"]).default("usd"),
  paymentStructure: z.enum(["full", "deposit_balance", "bnpl"]).default("full"),
  depositPercentage: z.number().min(10).max(90).optional(),
});

export type PaymentConfig = z.infer<typeof PaymentConfigSchema>;

// ============================================================================
// Full Contract Schema
// ============================================================================

export const ContractDocumentSchema = z.object({
  id: z.string(),
  version: z.number().default(1),
  status: z.enum(["draft", "review", "pending_signature", "signed", "expired", "cancelled"]),
  metadata: z.union([
    NDAMetadataSchema,
    ContractorMetadataSchema,
    ConsultingMetadataSchema,
    SAFEMetadataSchema,
    FreelanceMetadataSchema,
  ]),
  clauses: z.array(ClauseSchema),
  createdAt: z.string(),
  updatedAt: z.string(),
});

export type ContractDocument = z.infer<typeof ContractDocumentSchema>;

// ============================================================================
// Contract Type Definitions (for UI and generation)
// ============================================================================

export interface ContractTypeDefinition {
  id: ContractType;
  name: string;
  description: string;
  icon: string;
  estimatedTime: string;
  jurisdictions: Jurisdiction[];
  requiredFields: string[];
  clauseTemplates: ClauseTemplate[];
}

export interface ClauseTemplate {
  id: string;
  title: string;
  type: ClauseType;
  order: number;
  description: string;
  defaultContent?: string;
  variations?: Record<Jurisdiction, string>;
}

// ============================================================================
// Contract Type Registry
// ============================================================================

export const CONTRACT_TYPES: Record<ContractType, ContractTypeDefinition> = {
  nda_mutual: {
    id: "nda_mutual",
    name: "Mutual NDA",
    description: "Both parties agree to keep shared information confidential",
    icon: "shield",
    estimatedTime: "2 min",
    jurisdictions: ["us_california", "us_texas", "us_new_york", "uk"],
    requiredFields: ["disclosingParty", "receivingParty", "purpose", "effectiveDate"],
    clauseTemplates: [
      { id: "definitions", title: "Definitions", type: "standard", order: 1, description: "Defines confidential information" },
      { id: "obligations", title: "Confidentiality Obligations", type: "standard", order: 2, description: "Core obligations of both parties" },
      { id: "exclusions", title: "Exclusions", type: "standard", order: 3, description: "What's not considered confidential" },
      { id: "term", title: "Term and Duration", type: "negotiable", order: 4, description: "How long the agreement lasts" },
      { id: "return_info", title: "Return of Information", type: "standard", order: 5, description: "What happens to info after termination" },
      { id: "non_solicit", title: "Non-Solicitation", type: "optional", order: 6, description: "Restrictions on hiring each other's employees" },
      { id: "non_compete", title: "Non-Compete", type: "optional", order: 7, description: "Restrictions on competing businesses" },
      { id: "remedies", title: "Remedies", type: "standard", order: 8, description: "Legal remedies for breach" },
      { id: "governing_law", title: "Governing Law", type: "standard", order: 9, description: "Which jurisdiction's laws apply" },
      { id: "general", title: "General Provisions", type: "standard", order: 10, description: "Miscellaneous legal provisions" },
    ],
  },
  nda_one_way: {
    id: "nda_one_way",
    name: "One-Way NDA",
    description: "One party discloses, the other keeps it confidential",
    icon: "shield",
    estimatedTime: "2 min",
    jurisdictions: ["us_california", "us_texas", "us_new_york", "uk"],
    requiredFields: ["disclosingParty", "receivingParty", "purpose", "effectiveDate"],
    clauseTemplates: [
      { id: "definitions", title: "Definitions", type: "standard", order: 1, description: "Defines confidential information" },
      { id: "obligations", title: "Confidentiality Obligations", type: "standard", order: 2, description: "Recipient's obligations" },
      { id: "exclusions", title: "Exclusions", type: "standard", order: 3, description: "What's not considered confidential" },
      { id: "term", title: "Term and Duration", type: "negotiable", order: 4, description: "How long the agreement lasts" },
      { id: "return_info", title: "Return of Information", type: "standard", order: 5, description: "What happens to info after termination" },
      { id: "remedies", title: "Remedies", type: "standard", order: 8, description: "Legal remedies for breach" },
      { id: "governing_law", title: "Governing Law", type: "standard", order: 9, description: "Which jurisdiction's laws apply" },
      { id: "general", title: "General Provisions", type: "standard", order: 10, description: "Miscellaneous legal provisions" },
    ],
  },
  independent_contractor: {
    id: "independent_contractor",
    name: "Independent Contractor Agreement",
    description: "Hire a contractor for specific work without employee status",
    icon: "briefcase",
    estimatedTime: "3 min",
    jurisdictions: ["us_california", "us_texas", "us_new_york", "uk"],
    requiredFields: ["client", "contractor", "servicesDescription", "paymentAmount", "effectiveDate"],
    clauseTemplates: [
      { id: "services", title: "Services", type: "negotiable", order: 1, description: "Description of work to be performed" },
      { id: "compensation", title: "Compensation", type: "negotiable", order: 2, description: "Payment terms and amounts" },
      { id: "relationship", title: "Independent Contractor Status", type: "standard", order: 3, description: "Confirms non-employee status" },
      { id: "term", title: "Term and Termination", type: "negotiable", order: 4, description: "Duration and how to end the agreement" },
      { id: "ip_assignment", title: "Intellectual Property", type: "standard", order: 5, description: "Who owns work product" },
      { id: "confidentiality", title: "Confidentiality", type: "standard", order: 6, description: "Keeping information private" },
      { id: "representations", title: "Representations and Warranties", type: "standard", order: 7, description: "Promises about ability to perform" },
      { id: "indemnification", title: "Indemnification", type: "standard", order: 8, description: "Protection from third-party claims" },
      { id: "insurance", title: "Insurance", type: "optional", order: 9, description: "Required insurance coverage" },
      { id: "governing_law", title: "Governing Law", type: "standard", order: 10, description: "Which jurisdiction's laws apply" },
      { id: "general", title: "General Provisions", type: "standard", order: 11, description: "Miscellaneous legal provisions" },
    ],
  },
  consulting_agreement: {
    id: "consulting_agreement",
    name: "Consulting Agreement",
    description: "Engage a consultant for advisory services",
    icon: "users",
    estimatedTime: "3 min",
    jurisdictions: ["us_california", "us_texas", "us_new_york", "uk"],
    requiredFields: ["client", "consultant", "consultingScope", "effectiveDate"],
    clauseTemplates: [
      { id: "engagement", title: "Engagement", type: "standard", order: 1, description: "Scope of consulting services" },
      { id: "deliverables", title: "Deliverables", type: "negotiable", order: 2, description: "Expected outputs and milestones" },
      { id: "compensation", title: "Compensation", type: "negotiable", order: 3, description: "Fees, retainers, and expenses" },
      { id: "term", title: "Term and Termination", type: "negotiable", order: 4, description: "Duration and exit terms" },
      { id: "relationship", title: "Independent Contractor Status", type: "standard", order: 5, description: "Confirms non-employee status" },
      { id: "ip_assignment", title: "Intellectual Property", type: "standard", order: 6, description: "Ownership of work product" },
      { id: "confidentiality", title: "Confidentiality", type: "standard", order: 7, description: "Non-disclosure obligations" },
      { id: "non_compete", title: "Non-Compete", type: "optional", order: 8, description: "Restrictions on competing work" },
      { id: "representations", title: "Representations", type: "standard", order: 9, description: "Warranties and promises" },
      { id: "limitation", title: "Limitation of Liability", type: "standard", order: 10, description: "Caps on damages" },
      { id: "governing_law", title: "Governing Law", type: "standard", order: 11, description: "Applicable jurisdiction" },
      { id: "general", title: "General Provisions", type: "standard", order: 12, description: "Miscellaneous terms" },
    ],
  },
  safe_note: {
    id: "safe_note",
    name: "SAFE Note",
    description: "Simple Agreement for Future Equity (Y Combinator standard)",
    icon: "trending-up",
    estimatedTime: "2 min",
    jurisdictions: ["us_california", "us_texas", "us_new_york"], // US only
    requiredFields: ["company", "investor", "investmentAmount", "safeType"],
    clauseTemplates: [
      { id: "investment", title: "Investment Amount", type: "standard", order: 1, description: "Amount being invested" },
      { id: "conversion", title: "Conversion Terms", type: "standard", order: 2, description: "When and how SAFE converts to equity" },
      { id: "valuation", title: "Valuation Cap / Discount", type: "negotiable", order: 3, description: "Cap and/or discount terms" },
      { id: "pro_rata", title: "Pro Rata Rights", type: "optional", order: 4, description: "Right to maintain ownership percentage" },
      { id: "representations_company", title: "Company Representations", type: "standard", order: 5, description: "Company's warranties" },
      { id: "representations_investor", title: "Investor Representations", type: "standard", order: 6, description: "Investor's warranties" },
      { id: "miscellaneous", title: "Miscellaneous", type: "standard", order: 7, description: "General legal provisions" },
    ],
  },
  freelance_service: {
    id: "freelance_service",
    name: "Freelance Service Agreement",
    description: "Project-based agreement for freelance work",
    icon: "edit",
    estimatedTime: "3 min",
    jurisdictions: ["us_california", "us_texas", "us_new_york", "uk"],
    requiredFields: ["client", "freelancer", "projectName", "projectDescription", "deliverables", "totalAmount"],
    clauseTemplates: [
      { id: "project_scope", title: "Project Scope", type: "negotiable", order: 1, description: "What's included in the project" },
      { id: "deliverables", title: "Deliverables", type: "negotiable", order: 2, description: "Specific items to be delivered" },
      { id: "timeline", title: "Timeline", type: "negotiable", order: 3, description: "Deadlines and milestones" },
      { id: "payment", title: "Payment Terms", type: "negotiable", order: 4, description: "How and when payment is made" },
      { id: "revisions", title: "Revisions", type: "negotiable", order: 5, description: "Included revision rounds" },
      { id: "ip_assignment", title: "Intellectual Property", type: "standard", order: 6, description: "Who owns the final work" },
      { id: "confidentiality", title: "Confidentiality", type: "standard", order: 7, description: "Keeping project details private" },
      { id: "cancellation", title: "Cancellation", type: "negotiable", order: 8, description: "What happens if project is cancelled" },
      { id: "liability", title: "Limitation of Liability", type: "standard", order: 9, description: "Caps on damages" },
      { id: "governing_law", title: "Governing Law", type: "standard", order: 10, description: "Applicable jurisdiction" },
      { id: "general", title: "General Provisions", type: "standard", order: 11, description: "Miscellaneous terms" },
    ],
  },
};

// ============================================================================
// Jurisdiction Display Names
// ============================================================================

export const JURISDICTION_NAMES: Record<Jurisdiction, string> = {
  us_california: "California, USA",
  us_texas: "Texas, USA",
  us_new_york: "New York, USA",
  uk: "United Kingdom",
};

// ============================================================================
// Helper Functions
// ============================================================================

export function getContractTypeDefinition(type: ContractType): ContractTypeDefinition {
  return CONTRACT_TYPES[type];
}

export function getClausesByType(clauses: Clause[], type: ClauseType): Clause[] {
  return clauses.filter(c => c.type === type).sort((a, b) => a.order - b.order);
}

export function getEditedClauses(clauses: Clause[]): Clause[] {
  return clauses.filter(c => c.isEdited);
}
