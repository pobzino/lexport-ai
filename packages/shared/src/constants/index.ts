import type { ContractTypeInfo, Jurisdiction } from "../types/contracts";

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
  CA: { name: "California", flag: "US" },
  TX: { name: "Texas", flag: "US" },
  NY: { name: "New York", flag: "US" },
  UK: { name: "United Kingdom", flag: "GB" },
  other: { name: "Other", flag: "GLOBE" },
};

export const APP_CONFIG = {
  name: "Lexport",
  tagline: "AI-Powered Legal Contracts",
  supportEmail: "support@lexport.ai",
} as const;
