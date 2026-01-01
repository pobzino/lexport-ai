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
  "letter_of_intent",
  "cofounder_agreement",
  "sales_contract",
  "ip_assignment",
  "advisor_agreement",
  "employment_offer",
  "sow",
  "msa",
  "custom", // For custom contracts without a template match
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
  role: z.enum([
    "discloser", "recipient", "client", "contractor", "consultant", "investor", "company",
    "proposing_party", "receiving_party",  // LOI
    "cofounder",                            // Co-Founder Agreement
    "seller", "buyer",                      // Sales Contract
  ]),
  company: z.string().optional(),
  title: z.string().optional(),
  address: z.string().optional(),
});

export type Party = z.infer<typeof PartySchema>;

// ============================================================================
// Multi-Signatory Schemas (for 3+ signer support)
// ============================================================================

export const SignerSchema = z.object({
  id: z.string(),
  name: z.string(),
  email: z.string(),
  title: z.string().optional(),
});

export type Signer = z.infer<typeof SignerSchema>;

export const SignerGroupSchema = z.object({
  role: z.string(),
  roleLabel: z.string(),
  signers: z.array(SignerSchema),
  minSigners: z.number().optional(),
  maxSigners: z.number().optional(),
});

export type SignerGroup = z.infer<typeof SignerGroupSchema>;

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
  signerGroups: z.array(SignerGroupSchema).optional(), // Multi-signatory support
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
  signerGroups: z.array(SignerGroupSchema).optional(), // Multi-signatory support
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
  signerGroups: z.array(SignerGroupSchema).optional(), // Multi-signatory support
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
  signerGroups: z.array(SignerGroupSchema).optional(), // Multi-signatory support
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
  signerGroups: z.array(SignerGroupSchema).optional(), // Multi-signatory support
});

export type FreelanceMetadata = z.infer<typeof FreelanceMetadataSchema>;

// Letter of Intent Metadata
export const LOIMetadataSchema = z.object({
  contractType: z.literal("letter_of_intent"),
  proposingParty: PartySchema,
  receivingParty: PartySchema,
  transactionType: z.enum(["acquisition", "investment", "partnership", "real_estate", "employment", "other"]),
  transactionDescription: z.string().min(20, "Please describe the proposed transaction"),
  proposedTerms: z.object({
    purchasePrice: z.number().optional(),
    equityPercentage: z.number().min(0).max(100).optional(),
    keyConditions: z.array(z.string()).optional(),
  }).optional(),
  exclusivityPeriod: z.number().optional(), // days
  dueDiligencePeriod: z.number().optional(), // days
  effectiveDate: z.string(),
  expirationDate: z.string().optional(),
  isBindingTerms: z.array(z.string()).optional(), // Which terms are binding (e.g., confidentiality, exclusivity)
  jurisdiction: JurisdictionEnum,
  signerGroups: z.array(SignerGroupSchema).optional(),
});

export type LOIMetadata = z.infer<typeof LOIMetadataSchema>;

// Co-Founder Agreement Metadata
export const CofounderMetadataSchema = z.object({
  contractType: z.literal("cofounder_agreement"),
  companyName: z.string().min(1, "Company name required"),
  companyType: z.enum(["llc", "corporation", "partnership", "not_yet_formed"]),
  cofounders: z.array(z.object({
    party: PartySchema,
    equityPercentage: z.number().min(0).max(100),
    vestingSchedule: z.object({
      totalMonths: z.number().default(48),
      cliffMonths: z.number().default(12),
      accelerationOnChange: z.boolean().default(false),
    }).optional(),
    role: z.string(), // CEO, CTO, etc.
    responsibilities: z.string().optional(),
    initialContribution: z.object({
      cash: z.number().optional(),
      ipDescription: z.string().optional(),
      otherAssets: z.string().optional(),
    }).optional(),
  })).min(2, "At least 2 co-founders required"),
  decisionMaking: z.object({
    majorDecisionThreshold: z.number().min(50).max(100).default(66), // percentage
    deadlockResolution: z.enum(["mediation", "buyout", "dissolution", "third_party"]).default("mediation"),
  }),
  salaryProvisions: z.object({
    initialSalaries: z.boolean().default(false),
    salaryDetails: z.string().optional(),
  }).optional(),
  ipAssignment: z.boolean().default(true),
  nonCompetePeriod: z.number().optional(), // months
  exitProvisions: z.object({
    rightOfFirstRefusal: z.boolean().default(true),
    dragAlong: z.boolean().default(true),
    tagAlong: z.boolean().default(true),
  }),
  effectiveDate: z.string(),
  jurisdiction: JurisdictionEnum,
  signerGroups: z.array(SignerGroupSchema).optional(),
});

export type CofounderMetadata = z.infer<typeof CofounderMetadataSchema>;

// Sales Contract Metadata
export const SalesContractMetadataSchema = z.object({
  contractType: z.literal("sales_contract"),
  seller: PartySchema,
  buyer: PartySchema,
  productDescription: z.string().min(10, "Please describe the product(s)"),
  products: z.array(z.object({
    name: z.string(),
    description: z.string().optional(),
    quantity: z.number().min(1),
    unitPrice: z.number().min(0),
    specifications: z.string().optional(),
  })).min(1, "At least one product required"),
  totalAmount: z.number().min(0),
  currency: z.enum(["usd", "eur", "gbp"]).default("usd"),
  paymentTerms: z.object({
    method: z.enum(["full_upfront", "net_30", "net_60", "installments", "on_delivery"]),
    depositPercentage: z.number().min(0).max(100).optional(),
    installmentSchedule: z.string().optional(),
  }),
  deliveryTerms: z.object({
    method: z.enum(["pickup", "delivery", "shipping"]),
    location: z.string().optional(),
    estimatedDate: z.string().optional(),
    shippingTerms: z.enum(["fob_origin", "fob_destination", "cif", "exw"]).optional(),
    riskOfLoss: z.enum(["on_shipment", "on_delivery"]).default("on_delivery"),
  }),
  warranty: z.object({
    included: z.boolean().default(true),
    periodMonths: z.number().default(12),
    scope: z.string().optional(),
  }).optional(),
  returnPolicy: z.object({
    allowed: z.boolean().default(false),
    periodDays: z.number().optional(),
    conditions: z.string().optional(),
  }).optional(),
  effectiveDate: z.string(),
  jurisdiction: JurisdictionEnum,
  signerGroups: z.array(SignerGroupSchema).optional(),
});

export type SalesContractMetadata = z.infer<typeof SalesContractMetadataSchema>;

// IP Assignment Metadata
export const IPAssignmentMetadataSchema = z.object({
  contractType: z.literal("ip_assignment"),
  assignor: PartySchema,
  assignee: PartySchema,
  ipDescription: z.string().min(10, "Please describe the intellectual property"),
  ipType: z.enum(["patent", "trademark", "copyright", "trade_secret", "software", "other"]),
  consideration: z.object({
    type: z.enum(["cash", "equity", "royalty", "work_for_hire", "other"]),
    amount: z.number().optional(),
    description: z.string().optional(),
  }),
  priorWorks: z.boolean().default(false),
  priorWorksDescription: z.string().optional(),
  effectiveDate: z.string(),
  jurisdiction: JurisdictionEnum,
  signerGroups: z.array(SignerGroupSchema).optional(),
});

export type IPAssignmentMetadata = z.infer<typeof IPAssignmentMetadataSchema>;

// Advisor Agreement Metadata
export const AdvisorMetadataSchema = z.object({
  contractType: z.literal("advisor_agreement"),
  company: PartySchema,
  advisor: PartySchema,
  advisorRole: z.string().min(3, "Advisor role required"),
  advisorResponsibilities: z.string().optional(),
  timeCommitment: z.string().optional(), // e.g., "4 hours/month"
  compensationType: z.enum(["equity", "cash", "both", "none"]),
  equityGrant: z.object({
    percentage: z.number().min(0).max(100).optional(),
    vestingMonths: z.number().default(24),
    cliffMonths: z.number().default(0),
  }).optional(),
  cashCompensation: z.object({
    amount: z.number().optional(),
    frequency: z.enum(["monthly", "quarterly", "annually", "per_meeting"]).optional(),
  }).optional(),
  termMonths: z.number().optional(),
  effectiveDate: z.string(),
  jurisdiction: JurisdictionEnum,
  includeConfidentiality: z.boolean().default(true),
  includeIPAssignment: z.boolean().default(true),
  signerGroups: z.array(SignerGroupSchema).optional(),
});

export type AdvisorMetadata = z.infer<typeof AdvisorMetadataSchema>;

// Employment Offer Letter Metadata
export const EmploymentOfferMetadataSchema = z.object({
  contractType: z.literal("employment_offer"),
  employer: PartySchema,
  employee: PartySchema,
  position: z.string().min(2, "Position title required"),
  department: z.string().optional(),
  reportsTo: z.string().optional(),
  startDate: z.string(),
  employmentType: z.enum(["full_time", "part_time", "temporary", "contract"]),
  salary: z.number().min(0),
  salaryFrequency: z.enum(["hourly", "weekly", "biweekly", "monthly", "annually"]).default("annually"),
  bonus: z.object({
    eligible: z.boolean().default(false),
    targetPercentage: z.number().optional(),
    description: z.string().optional(),
  }).optional(),
  equity: z.object({
    granted: z.boolean().default(false),
    shares: z.number().optional(),
    vestingSchedule: z.string().optional(),
  }).optional(),
  benefits: z.array(z.string()).optional(), // List of benefits
  ptoPolicy: z.string().optional(),
  workLocation: z.enum(["onsite", "remote", "hybrid"]).optional(),
  workAddress: z.string().optional(),
  effectiveDate: z.string(),
  jurisdiction: JurisdictionEnum,
  atWillEmployment: z.boolean().default(true),
  signerGroups: z.array(SignerGroupSchema).optional(),
});

export type EmploymentOfferMetadata = z.infer<typeof EmploymentOfferMetadataSchema>;

// Statement of Work Metadata
export const SOWMetadataSchema = z.object({
  contractType: z.literal("sow"),
  client: PartySchema,
  provider: PartySchema,
  projectName: z.string().min(3, "Project name required"),
  projectScope: z.string().min(20, "Please describe the project scope"),
  deliverables: z.array(z.object({
    name: z.string(),
    description: z.string().optional(),
    dueDate: z.string().optional(),
    acceptanceCriteria: z.string().optional(),
  })).min(1, "At least one deliverable required"),
  milestones: z.array(z.object({
    name: z.string(),
    date: z.string(),
    payment: z.number().optional(),
  })).optional(),
  timeline: z.object({
    startDate: z.string(),
    endDate: z.string().optional(),
    estimatedDuration: z.string().optional(),
  }),
  budget: z.object({
    totalAmount: z.number(),
    paymentSchedule: z.enum(["upfront", "milestone", "completion", "monthly"]),
    paymentTerms: z.number().default(30), // days
  }),
  assumptions: z.array(z.string()).optional(),
  outOfScope: z.array(z.string()).optional(),
  effectiveDate: z.string(),
  jurisdiction: JurisdictionEnum,
  masterAgreementId: z.string().optional(), // Reference to MSA if exists
  signerGroups: z.array(SignerGroupSchema).optional(),
});

export type SOWMetadata = z.infer<typeof SOWMetadataSchema>;

// Master Service Agreement Metadata
export const MSAMetadataSchema = z.object({
  contractType: z.literal("msa"),
  client: PartySchema,
  provider: PartySchema,
  servicesDescription: z.string().min(20, "Please describe the services"),
  serviceCategories: z.array(z.string()).optional(),
  pricingStructure: z.enum(["fixed", "time_and_materials", "retainer", "project_based"]),
  paymentTerms: z.number().default(30), // days
  termType: z.enum(["fixed", "ongoing"]),
  termMonths: z.number().optional(),
  autoRenew: z.boolean().default(true),
  terminationNoticeDays: z.number().default(30),
  effectiveDate: z.string(),
  jurisdiction: JurisdictionEnum,
  includeConfidentiality: z.boolean().default(true),
  includeIPAssignment: z.boolean().default(true),
  liabilityCapType: z.enum(["contract_value", "annual_fees", "fixed_amount", "unlimited"]).default("annual_fees"),
  liabilityCapAmount: z.number().optional(),
  indemnificationMutual: z.boolean().default(true),
  insuranceRequired: z.boolean().default(false),
  insuranceMinimum: z.number().optional(),
  signerGroups: z.array(SignerGroupSchema).optional(),
});

export type MSAMetadata = z.infer<typeof MSAMetadataSchema>;

// Custom Contract Metadata (for unsupported contract types)
export const CustomMetadataSchema = z.object({
  contractType: z.literal("custom"),
  customContractName: z.string().min(1, "Contract name required"),
  customContractDescription: z.string().optional(),
  effectiveDate: z.string(),
  jurisdiction: JurisdictionEnum,
  signerGroups: z.array(SignerGroupSchema).optional(),
  // Allow any additional fields from intake follow-up questions
}).passthrough();

export type CustomMetadata = z.infer<typeof CustomMetadataSchema>;

// Union type for all metadata
export type ContractMetadata =
  | NDAMetadata
  | ContractorMetadata
  | ConsultingMetadata
  | SAFEMetadata
  | FreelanceMetadata
  | LOIMetadata
  | CofounderMetadata
  | SalesContractMetadata
  | IPAssignmentMetadata
  | AdvisorMetadata
  | EmploymentOfferMetadata
  | SOWMetadata
  | MSAMetadata
  | CustomMetadata;

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
    LOIMetadataSchema,
    CofounderMetadataSchema,
    SalesContractMetadataSchema,
    IPAssignmentMetadataSchema,
    AdvisorMetadataSchema,
    EmploymentOfferMetadataSchema,
    SOWMetadataSchema,
    MSAMetadataSchema,
    CustomMetadataSchema,
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
  letter_of_intent: {
    id: "letter_of_intent",
    name: "Letter of Intent",
    description: "Non-binding agreement outlining terms for a future deal",
    icon: "file-text",
    estimatedTime: "3 min",
    jurisdictions: ["us_california", "us_texas", "us_new_york", "uk"],
    requiredFields: ["proposingParty", "receivingParty", "transactionType", "transactionDescription", "effectiveDate"],
    clauseTemplates: [
      { id: "recitals", title: "Recitals", type: "standard", order: 1, description: "Background and purpose of the LOI" },
      { id: "transaction_summary", title: "Transaction Summary", type: "negotiable", order: 2, description: "Overview of the proposed transaction" },
      { id: "proposed_terms", title: "Proposed Terms", type: "negotiable", order: 3, description: "Key terms of the potential deal" },
      { id: "due_diligence", title: "Due Diligence", type: "negotiable", order: 4, description: "Investigation and review period" },
      { id: "exclusivity", title: "Exclusivity", type: "optional", order: 5, description: "No-shop period for negotiations" },
      { id: "confidentiality", title: "Confidentiality", type: "standard", order: 6, description: "Protection of shared information" },
      { id: "expenses", title: "Expenses", type: "standard", order: 7, description: "Each party bears own costs" },
      { id: "non_binding", title: "Non-Binding Nature", type: "standard", order: 8, description: "Clarifies which terms are non-binding" },
      { id: "binding_provisions", title: "Binding Provisions", type: "standard", order: 9, description: "Identifies binding terms (confidentiality, exclusivity)" },
      { id: "termination", title: "Termination", type: "negotiable", order: 10, description: "When and how the LOI expires" },
      { id: "governing_law", title: "Governing Law", type: "standard", order: 11, description: "Which jurisdiction's laws apply" },
      { id: "general", title: "General Provisions", type: "standard", order: 12, description: "Miscellaneous legal provisions" },
    ],
  },
  cofounder_agreement: {
    id: "cofounder_agreement",
    name: "Co-Founder Agreement",
    description: "Define equity splits, roles, vesting, and exit terms",
    icon: "users",
    estimatedTime: "6 min",
    jurisdictions: ["us_california", "us_texas", "us_new_york", "uk"],
    requiredFields: ["companyName", "companyType", "cofounders", "effectiveDate"],
    clauseTemplates: [
      { id: "recitals", title: "Recitals", type: "standard", order: 1, description: "Background and purpose of the agreement" },
      { id: "company_formation", title: "Company Formation", type: "standard", order: 2, description: "Details of the company being formed or joined" },
      { id: "equity_allocation", title: "Equity Allocation", type: "negotiable", order: 3, description: "Ownership percentages for each co-founder" },
      { id: "vesting", title: "Vesting Schedule", type: "negotiable", order: 4, description: "How equity vests over time" },
      { id: "roles_responsibilities", title: "Roles and Responsibilities", type: "negotiable", order: 5, description: "Each co-founder's duties and authority" },
      { id: "contributions", title: "Initial Contributions", type: "negotiable", order: 6, description: "Cash, IP, and other contributions" },
      { id: "compensation", title: "Compensation", type: "negotiable", order: 7, description: "Salary, benefits, and expense policies" },
      { id: "decision_making", title: "Decision Making", type: "negotiable", order: 8, description: "How major decisions are made" },
      { id: "deadlock", title: "Deadlock Resolution", type: "standard", order: 9, description: "What happens when founders disagree" },
      { id: "ip_assignment", title: "IP Assignment", type: "standard", order: 10, description: "Assignment of intellectual property to company" },
      { id: "confidentiality", title: "Confidentiality", type: "standard", order: 11, description: "Keeping company information private" },
      { id: "non_compete", title: "Non-Compete", type: "optional", order: 12, description: "Restrictions on competing activities" },
      { id: "departure", title: "Departure and Buyout", type: "negotiable", order: 13, description: "What happens when a founder leaves" },
      { id: "transfer_restrictions", title: "Transfer Restrictions", type: "standard", order: 14, description: "ROFR, drag-along, tag-along rights" },
      { id: "dissolution", title: "Dissolution", type: "standard", order: 15, description: "How the company winds down if needed" },
      { id: "governing_law", title: "Governing Law", type: "standard", order: 16, description: "Which jurisdiction's laws apply" },
      { id: "general", title: "General Provisions", type: "standard", order: 17, description: "Miscellaneous legal provisions" },
    ],
  },
  sales_contract: {
    id: "sales_contract",
    name: "Sales Contract",
    description: "Agreement for the sale of goods or products",
    icon: "shopping-cart",
    estimatedTime: "4 min",
    jurisdictions: ["us_california", "us_texas", "us_new_york", "uk"],
    requiredFields: ["seller", "buyer", "productDescription", "products", "totalAmount"],
    clauseTemplates: [
      { id: "recitals", title: "Recitals", type: "standard", order: 1, description: "Background and purpose of the sale" },
      { id: "products", title: "Products", type: "negotiable", order: 2, description: "Description of goods being sold" },
      { id: "price_payment", title: "Price and Payment", type: "negotiable", order: 3, description: "Total price and payment terms" },
      { id: "delivery", title: "Delivery", type: "negotiable", order: 4, description: "How and when goods will be delivered" },
      { id: "risk_of_loss", title: "Risk of Loss", type: "standard", order: 5, description: "When risk transfers from seller to buyer" },
      { id: "inspection", title: "Inspection and Acceptance", type: "negotiable", order: 6, description: "Buyer's right to inspect goods" },
      { id: "warranty", title: "Warranties", type: "negotiable", order: 7, description: "Seller's promises about the goods" },
      { id: "returns", title: "Returns and Refunds", type: "optional", order: 8, description: "Policies for returning goods" },
      { id: "title", title: "Title and Ownership", type: "standard", order: 9, description: "When ownership transfers" },
      { id: "liability", title: "Limitation of Liability", type: "standard", order: 10, description: "Caps on damages" },
      { id: "indemnification", title: "Indemnification", type: "standard", order: 11, description: "Protection from third-party claims" },
      { id: "force_majeure", title: "Force Majeure", type: "standard", order: 12, description: "Events beyond parties' control" },
      { id: "termination", title: "Termination", type: "negotiable", order: 13, description: "When and how to cancel" },
      { id: "governing_law", title: "Governing Law", type: "standard", order: 14, description: "Which jurisdiction's laws apply" },
      { id: "dispute_resolution", title: "Dispute Resolution", type: "standard", order: 15, description: "How disputes will be resolved" },
      { id: "general", title: "General Provisions", type: "standard", order: 16, description: "Miscellaneous legal provisions" },
    ],
  },
  ip_assignment: {
    id: "ip_assignment",
    name: "IP Assignment Agreement",
    description: "Transfer intellectual property rights to another party",
    icon: "file-check",
    estimatedTime: "3 min",
    jurisdictions: ["us_california", "us_texas", "us_new_york", "uk"],
    requiredFields: ["assignor", "assignee", "ipDescription", "consideration", "effectiveDate"],
    clauseTemplates: [
      { id: "recitals", title: "Recitals", type: "standard", order: 1, description: "Background and purpose of the assignment" },
      { id: "ip_description", title: "Intellectual Property Description", type: "negotiable", order: 2, description: "Detailed description of IP being assigned" },
      { id: "assignment", title: "Assignment of Rights", type: "standard", order: 3, description: "Transfer of all rights, title, and interest" },
      { id: "consideration", title: "Consideration", type: "negotiable", order: 4, description: "Payment or other consideration for the IP" },
      { id: "warranties", title: "Warranties and Representations", type: "standard", order: 5, description: "Assignor's promises about the IP" },
      { id: "further_assurances", title: "Further Assurances", type: "standard", order: 6, description: "Obligation to execute additional documents" },
      { id: "indemnification", title: "Indemnification", type: "standard", order: 7, description: "Protection from third-party claims" },
      { id: "governing_law", title: "Governing Law", type: "standard", order: 8, description: "Which jurisdiction's laws apply" },
      { id: "general", title: "General Provisions", type: "standard", order: 9, description: "Miscellaneous legal provisions" },
    ],
  },
  advisor_agreement: {
    id: "advisor_agreement",
    name: "Advisor Agreement",
    description: "Engage advisors with equity or cash compensation",
    icon: "user-check",
    estimatedTime: "4 min",
    jurisdictions: ["us_california", "us_texas", "us_new_york", "uk"],
    requiredFields: ["company", "advisor", "advisorRole", "compensationType", "effectiveDate"],
    clauseTemplates: [
      { id: "engagement", title: "Engagement", type: "standard", order: 1, description: "Scope of advisory services" },
      { id: "duties", title: "Advisor Duties", type: "negotiable", order: 2, description: "Expected time commitment and responsibilities" },
      { id: "compensation", title: "Compensation", type: "negotiable", order: 3, description: "Equity grants, vesting, or cash compensation" },
      { id: "equity_terms", title: "Equity Terms", type: "optional", order: 4, description: "Details of equity grant if applicable" },
      { id: "term", title: "Term and Termination", type: "negotiable", order: 5, description: "Duration and exit provisions" },
      { id: "relationship", title: "Independent Contractor Status", type: "standard", order: 6, description: "Confirms non-employee status" },
      { id: "confidentiality", title: "Confidentiality", type: "standard", order: 7, description: "Non-disclosure obligations" },
      { id: "ip_assignment", title: "Intellectual Property", type: "standard", order: 8, description: "Assignment of work product to company" },
      { id: "non_compete", title: "Non-Compete", type: "optional", order: 9, description: "Restrictions on competing activities" },
      { id: "representations", title: "Representations", type: "standard", order: 10, description: "Warranties and promises" },
      { id: "governing_law", title: "Governing Law", type: "standard", order: 11, description: "Applicable jurisdiction" },
      { id: "general", title: "General Provisions", type: "standard", order: 12, description: "Miscellaneous terms" },
    ],
  },
  employment_offer: {
    id: "employment_offer",
    name: "Employment Offer Letter",
    description: "Formal job offer with terms, compensation, and benefits",
    icon: "briefcase",
    estimatedTime: "4 min",
    jurisdictions: ["us_california", "us_texas", "us_new_york", "uk"],
    requiredFields: ["employer", "employee", "position", "startDate", "salary", "employmentType"],
    clauseTemplates: [
      { id: "offer", title: "Offer of Employment", type: "standard", order: 1, description: "Position and start date" },
      { id: "compensation", title: "Compensation", type: "negotiable", order: 2, description: "Salary, bonus, and payment terms" },
      { id: "benefits", title: "Benefits", type: "negotiable", order: 3, description: "Health, retirement, PTO, and other benefits" },
      { id: "equity", title: "Equity Compensation", type: "optional", order: 4, description: "Stock options or equity grants" },
      { id: "duties", title: "Position and Duties", type: "negotiable", order: 5, description: "Job responsibilities and reporting" },
      { id: "employment_type", title: "Employment Type", type: "standard", order: 6, description: "At-will or fixed term employment" },
      { id: "confidentiality", title: "Confidentiality", type: "standard", order: 7, description: "Protection of company information" },
      { id: "ip_assignment", title: "Intellectual Property", type: "standard", order: 8, description: "Assignment of work product" },
      { id: "non_compete", title: "Non-Compete/Non-Solicit", type: "optional", order: 9, description: "Post-employment restrictions" },
      { id: "background_check", title: "Contingencies", type: "optional", order: 10, description: "Background check, references, etc." },
      { id: "governing_law", title: "Governing Law", type: "standard", order: 11, description: "Applicable jurisdiction" },
      { id: "acceptance", title: "Acceptance", type: "standard", order: 12, description: "Signature and acceptance terms" },
    ],
  },
  sow: {
    id: "sow",
    name: "Statement of Work",
    description: "Detailed project scope, deliverables, and timeline",
    icon: "clipboard-list",
    estimatedTime: "5 min",
    jurisdictions: ["us_california", "us_texas", "us_new_york", "uk"],
    requiredFields: ["client", "provider", "projectName", "projectScope", "deliverables", "timeline", "budget"],
    clauseTemplates: [
      { id: "overview", title: "Project Overview", type: "standard", order: 1, description: "Summary and objectives" },
      { id: "scope", title: "Scope of Work", type: "negotiable", order: 2, description: "Detailed description of work" },
      { id: "deliverables", title: "Deliverables", type: "negotiable", order: 3, description: "Specific outputs and artifacts" },
      { id: "milestones", title: "Milestones and Timeline", type: "negotiable", order: 4, description: "Key dates and deadlines" },
      { id: "acceptance", title: "Acceptance Criteria", type: "negotiable", order: 5, description: "How deliverables are approved" },
      { id: "resources", title: "Resources and Personnel", type: "optional", order: 6, description: "Team members and responsibilities" },
      { id: "budget", title: "Budget and Payment", type: "negotiable", order: 7, description: "Costs and payment schedule" },
      { id: "assumptions", title: "Assumptions and Dependencies", type: "standard", order: 8, description: "Key assumptions and requirements" },
      { id: "change_management", title: "Change Management", type: "standard", order: 9, description: "Process for scope changes" },
      { id: "communication", title: "Communication Plan", type: "optional", order: 10, description: "Reporting and meetings" },
      { id: "risks", title: "Risks and Mitigation", type: "optional", order: 11, description: "Identified risks and plans" },
      { id: "general", title: "General Terms", type: "standard", order: 12, description: "Reference to master agreement" },
    ],
  },
  msa: {
    id: "msa",
    name: "Master Service Agreement",
    description: "Framework agreement for ongoing services relationship",
    icon: "file-text",
    estimatedTime: "6 min",
    jurisdictions: ["us_california", "us_texas", "us_new_york", "uk"],
    requiredFields: ["client", "provider", "servicesDescription", "effectiveDate"],
    clauseTemplates: [
      { id: "recitals", title: "Recitals", type: "standard", order: 1, description: "Background and purpose" },
      { id: "services", title: "Services", type: "negotiable", order: 2, description: "General description of services" },
      { id: "sow_process", title: "Statement of Work Process", type: "standard", order: 3, description: "How SOWs are created and executed" },
      { id: "fees", title: "Fees and Payment", type: "negotiable", order: 4, description: "Pricing structure and payment terms" },
      { id: "term", title: "Term and Termination", type: "negotiable", order: 5, description: "Duration and exit provisions" },
      { id: "confidentiality", title: "Confidentiality", type: "standard", order: 6, description: "Protection of proprietary information" },
      { id: "ip", title: "Intellectual Property", type: "standard", order: 7, description: "Ownership of work product" },
      { id: "warranties", title: "Warranties", type: "standard", order: 8, description: "Service quality commitments" },
      { id: "indemnification", title: "Indemnification", type: "standard", order: 9, description: "Protection from third-party claims" },
      { id: "limitation", title: "Limitation of Liability", type: "standard", order: 10, description: "Caps on damages" },
      { id: "insurance", title: "Insurance", type: "optional", order: 11, description: "Required coverage" },
      { id: "compliance", title: "Compliance", type: "standard", order: 12, description: "Legal and regulatory compliance" },
      { id: "dispute", title: "Dispute Resolution", type: "standard", order: 13, description: "How disputes are resolved" },
      { id: "governing_law", title: "Governing Law", type: "standard", order: 14, description: "Applicable jurisdiction" },
      { id: "general", title: "General Provisions", type: "standard", order: 15, description: "Miscellaneous terms" },
    ],
  },
  custom: {
    id: "custom",
    name: "Custom Contract",
    description: "AI-generated contract tailored to your specific needs",
    icon: "file-text",
    estimatedTime: "3 min",
    jurisdictions: ["us_california", "us_texas", "us_new_york", "uk"],
    requiredFields: ["customContractName", "effectiveDate"],
    clauseTemplates: [], // Custom contracts generate clauses dynamically based on the contract type
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
