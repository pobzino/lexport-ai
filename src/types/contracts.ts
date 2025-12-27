// Contract Types
export type ContractType =
  | "nda_mutual"
  | "nda_oneway"
  | "contractor_agreement"
  | "consulting_agreement"
  | "safe_note"
  | "service_agreement"
  | "ip_assignment"
  | "advisor_agreement"
  | "employment_offer"
  | "sow";

export type Jurisdiction = "CA" | "TX" | "NY" | "UK" | "other";

export type ContractStatus =
  | "draft"
  | "pending_signature"
  | "partially_signed"
  | "completed"
  | "expired"
  | "cancelled";

// Contract Content Structure
export interface ContractSection {
  id: string;
  title: string;
  content: string;
  isRequired: boolean;
  order: number;
}

export interface ContractContent {
  version: string;
  sections: ContractSection[];
  variables: Record<string, string | number | Date>;
  metadata: {
    generatedBy: "ai" | "template";
    templateId?: string;
    aiPrompt?: string;
    aiModel?: string;
    generatedAt?: string;
  };
}

// Contract Display Info
export interface ContractTypeInfo {
  type: ContractType;
  name: string;
  description: string;
  jurisdictions: Jurisdiction[];
  estimatedTime: string;
  category: "protection" | "work" | "investment" | "employment";
}

export const CONTRACT_TYPES: ContractTypeInfo[] = [
  {
    type: "nda_mutual",
    name: "NDA (Mutual)",
    description: "Two-way confidentiality agreement between parties",
    jurisdictions: ["CA", "TX", "NY", "UK"],
    estimatedTime: "2 min",
    category: "protection",
  },
  {
    type: "nda_oneway",
    name: "NDA (One-Way)",
    description: "One party discloses, the other keeps confidential",
    jurisdictions: ["CA", "TX", "NY", "UK"],
    estimatedTime: "2 min",
    category: "protection",
  },
  {
    type: "contractor_agreement",
    name: "Independent Contractor Agreement",
    description: "Hire contractors with clear terms and IP assignment",
    jurisdictions: ["CA", "TX", "NY", "UK"],
    estimatedTime: "5 min",
    category: "work",
  },
  {
    type: "consulting_agreement",
    name: "Consulting Agreement",
    description: "Professional consulting services with defined scope",
    jurisdictions: ["CA", "TX", "NY", "UK"],
    estimatedTime: "5 min",
    category: "work",
  },
  {
    type: "safe_note",
    name: "SAFE Note",
    description: "Simple Agreement for Future Equity (Y Combinator standard)",
    jurisdictions: ["CA", "TX", "NY"],
    estimatedTime: "3 min",
    category: "investment",
  },
  {
    type: "service_agreement",
    name: "Service Agreement",
    description: "General services contract for freelancers",
    jurisdictions: ["CA", "TX", "NY", "UK"],
    estimatedTime: "4 min",
    category: "work",
  },
  {
    type: "ip_assignment",
    name: "IP Assignment",
    description: "Transfer intellectual property rights",
    jurisdictions: ["CA", "TX", "NY", "UK"],
    estimatedTime: "3 min",
    category: "protection",
  },
  {
    type: "advisor_agreement",
    name: "Advisor Agreement",
    description: "Engage advisors with equity compensation",
    jurisdictions: ["CA", "TX", "NY"],
    estimatedTime: "4 min",
    category: "work",
  },
  {
    type: "employment_offer",
    name: "Employment Offer Letter",
    description: "Formal job offer with terms and conditions",
    jurisdictions: ["CA", "TX", "NY", "UK"],
    estimatedTime: "5 min",
    category: "employment",
  },
  {
    type: "sow",
    name: "Statement of Work",
    description: "Detailed project scope and deliverables",
    jurisdictions: ["CA", "TX", "NY", "UK"],
    estimatedTime: "4 min",
    category: "work",
  },
];

export const JURISDICTION_INFO: Record<
  Jurisdiction,
  { name: string; flag: string }
> = {
  CA: { name: "California", flag: "🇺🇸" },
  TX: { name: "Texas", flag: "🇺🇸" },
  NY: { name: "New York", flag: "🇺🇸" },
  UK: { name: "United Kingdom", flag: "🇬🇧" },
  other: { name: "Other", flag: "🌍" },
};
