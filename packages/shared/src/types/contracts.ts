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

// Contract entity from database
export interface Contract {
  id: string;
  userId: string;
  type: ContractType;
  title: string;
  status: ContractStatus;
  jurisdiction: Jurisdiction;
  content: ContractContent;
  createdAt: Date;
  updatedAt: Date;
}

// Signature types
export interface Signatory {
  id: string;
  contractId: string;
  name: string;
  email: string;
  role: "party_a" | "party_b" | "witness";
  status: "pending" | "signed" | "declined";
  signedAt?: Date;
  signatureData?: string;
}
