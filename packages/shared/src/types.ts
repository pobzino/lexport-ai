// Database types for Supabase
// These types mirror the database schema

// Enums
export type UserRole = "founder" | "freelancer" | "consultant" | "other";
export type Plan = "free" | "pro" | "team" | "enterprise";
export type ContractStatus = "draft" | "pending_signature" | "signed" | "completed" | "expired";
export type SignatureStatus = "pending" | "viewed" | "signed" | "declined";
export type SignatureType = "draw" | "type" | "upload";
export type SignatureFieldType = "signature" | "initials" | "date" | "text" | "checkbox" | "dropdown" | "attachment" | "payment";
export type PaymentStatus = "pending" | "processing" | "succeeded" | "failed" | "refunded";
export type StripeConnectStatus = "not_connected" | "pending" | "active" | "restricted";
export type PaymentType = "full" | "deposit" | "balance" | "installment";
export type PaymentStructure = "full" | "deposit_balance" | "bnpl";
export type InvoiceStatus = "draft" | "sent" | "paid" | "void";
export type AuditEventType =
  | "contract_created"
  | "contract_updated"
  | "contract_sent"
  | "signature_requested"
  | "document_viewed"
  | "signature_completed"
  | "signature_declined"
  | "contract_completed"
  | "contract_downloaded"
  | "payment_completed"
  | "payment_failed"
  | "payment_refunded"
  | "invoice_sent";
export type Jurisdiction = "CA" | "TX" | "NY" | "UK" | "other";
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

// Table types
export interface User {
  id: string;
  name: string | null;
  email: string;
  email_verified: string | null;
  image: string | null;
  role: UserRole | null;
  jurisdiction: string | null;
  organization_id: string | null;
  // Stripe Connect
  stripe_connect_account_id: string | null;
  stripe_connect_status: StripeConnectStatus;
  stripe_connect_onboarding_complete: boolean;
  created_at: string;
  updated_at: string;
}

export interface Organization {
  id: string;
  name: string;
  plan: Plan;
  stripe_customer_id: string | null;
  stripe_subscription_id: string | null;
  created_at: string;
  updated_at: string;
}

export interface Contract {
  id: string;
  title: string;
  type: string;
  jurisdiction: string;
  status: string;
  content: ContractContent;
  metadata: Record<string, unknown> | null;
  pdf_url: string | null;
  user_id: string;
  organization_id: string | null;
  signed_at: string | null;
  completed_at: string | null;
  expires_at: string | null;
  version: number;
  // Sequential signing
  require_sequential_signing: boolean;
  // Reminders
  reminder_enabled: boolean;
  reminder_interval_days: number;
  last_reminder_sent_at: string | null;
  next_reminder_at: string | null;
  // Payments
  payment_required: boolean;
  payment_amount: number | null;
  payment_currency: string;
  payment_status: PaymentStatus;
  stripe_payment_intent_id: string | null;
  // Payment structure
  payment_structure: PaymentStructure;
  deposit_percentage: number;
  created_at: string;
  updated_at: string;
}

export interface ContractContent {
  preamble: string;
  recitals: string;
  clauses: ContractClause[];
  signatureBlock: string;
}

export interface ContractClause {
  id: string;
  title: string;
  content: string;
  order: number;
}

export interface SignatureRequest {
  id: string;
  contract_id: string;
  signer_email: string;
  signer_name: string;
  signer_role: string;
  order: number;
  status: SignatureStatus;
  token: string;
  message: string | null;
  signed_at: string | null;
  declined_at: string | null;
  decline_reason: string | null;
  viewed_at: string | null;
  last_reminder_sent_at: string | null;
  expires_at: string;
  created_at: string;
  updated_at: string;
}

export interface Signature {
  id: string;
  signature_request_id: string;
  contract_id: string | null;
  type: SignatureType;
  signature_data: string;
  signature_type: string | null;
  image_url: string;
  image_hash: string;
  ip_address: string | null;
  user_agent: string | null;
  signed_at: string | null;
  created_at: string;
}

export interface SignatureField {
  id: string;
  contract_id: string;
  type: SignatureFieldType;
  label: string | null;
  signer_role: string;
  required: boolean;
  position_x: number;
  position_y: number;
  width: number;
  height: number;
  order: number;
  options: FieldOptions | null;
  placeholder: string | null;
  validation: FieldValidation | null;
  created_at: string;
}

export interface FieldOptions {
  choices?: string[]; // For dropdown/checkbox
  multiple?: boolean; // For checkbox allowing multiple selections
  default_value?: string;
}

export interface FieldValidation {
  min_length?: number;
  max_length?: number;
  pattern?: string;
  required_message?: string;
}

export interface FieldValue {
  id: string;
  field_id: string;
  signature_request_id: string;
  value: string | null;
  signature_id: string | null;
  completed_at: string;
}

export interface AuditLog {
  id: string;
  contract_id: string;
  signature_request_id: string | null;
  user_id: string | null;
  event_type: AuditEventType;
  ip_address: string;
  user_agent: string;
  geo_location: Record<string, unknown> | null;
  metadata: Record<string, unknown> | null;
  created_at: string;
}

export interface Template {
  id: string;
  name: string;
  description: string | null;
  type: ContractType;
  jurisdiction: Jurisdiction;
  content: ContractContent;
  is_public: boolean;
  created_by_id: string | null;
  usage_count: number;
  created_at: string;
  updated_at: string;
}

export interface CompletionCertificate {
  id: string;
  contract_id: string;
  certificate_number: string;
  pdf_url: string | null;
  generated_at: string;
  summary: CertificateSummary;
}

export interface CertificateSummary {
  contract_title: string;
  completed_at: string;
  signers: {
    name: string;
    email: string;
    role: string;
    signed_at: string;
    ip_address: string;
  }[];
  audit_events: {
    event: string;
    timestamp: string;
    actor: string;
  }[];
}

export interface FieldTemplate {
  id: string;
  name: string;
  description: string | null;
  contract_type: string | null;
  fields: SignatureField[];
  is_public: boolean;
  created_by_id: string | null;
  usage_count: number;
  created_at: string;
  updated_at: string;
}

export interface Payment {
  id: string;
  contract_id: string;
  user_id: string;
  stripe_payment_intent_id: string | null;
  stripe_charge_id: string | null;
  amount: number; // cents
  currency: string;
  platform_fee: number; // cents
  net_amount: number | null;
  status: PaymentStatus;
  payment_type: PaymentType;
  payment_method: string | null;
  payer_email: string | null;
  payer_name: string | null;
  description: string | null;
  metadata: Record<string, unknown>;
  refunded_amount: number;
  failure_code: string | null;
  failure_message: string | null;
  created_at: string;
  updated_at: string;
}

export interface PaymentSchedule {
  id: string;
  contract_id: string;
  schedule_type: PaymentStructure;
  total_amount: number; // cents
  currency: string;
  deposit_amount: number | null;
  balance_amount: number | null;
  deposit_due_date: string | null;
  balance_due_date: string | null;
  deposit_payment_id: string | null;
  balance_payment_id: string | null;
  installments: PaymentInstallment[];
  status: string;
  created_at: string;
  updated_at: string;
}

export interface PaymentInstallment {
  amount: number;
  due_date: string;
  status: PaymentStatus;
  payment_id: string | null;
}

export interface Invoice {
  id: string;
  contract_id: string;
  payment_id: string | null;
  user_id: string;
  invoice_number: string;
  amount: number; // cents
  currency: string;
  status: InvoiceStatus;
  line_items: InvoiceLineItem[];
  subtotal: number | null;
  tax_amount: number;
  total: number | null;
  due_date: string | null;
  paid_at: string | null;
  sent_at: string | null;
  pdf_url: string | null;
  recipient_name: string | null;
  recipient_email: string | null;
  recipient_address: Record<string, unknown> | null;
  sender_name: string | null;
  sender_email: string | null;
  sender_address: Record<string, unknown> | null;
  notes: string | null;
  created_at: string;
  updated_at: string;
}

export interface InvoiceLineItem {
  description: string;
  quantity: number;
  unit_price: number; // cents
  amount: number; // cents
}

// Insert types (for creating new records)
export type NewUser = Omit<User, "id" | "created_at" | "updated_at">;
export type NewOrganization = Omit<Organization, "id" | "created_at" | "updated_at">;
export type NewContract = Omit<Contract, "id" | "created_at" | "updated_at" | "version">;
export type NewSignatureRequest = Omit<SignatureRequest, "id" | "created_at" | "updated_at">;
export type NewSignature = Omit<Signature, "id" | "created_at">;
export type NewSignatureField = Omit<SignatureField, "id" | "created_at">;
export type NewFieldValue = Omit<FieldValue, "id">;
export type NewAuditLog = Omit<AuditLog, "id" | "created_at">;
export type NewTemplate = Omit<Template, "id" | "created_at" | "updated_at" | "usage_count">;
export type NewCompletionCertificate = Omit<CompletionCertificate, "id" | "generated_at">;
export type NewFieldTemplate = Omit<FieldTemplate, "id" | "created_at" | "updated_at" | "usage_count">;
export type NewPayment = Omit<Payment, "id" | "created_at" | "updated_at">;
export type NewPaymentSchedule = Omit<PaymentSchedule, "id" | "created_at" | "updated_at">;
export type NewInvoice = Omit<Invoice, "id" | "created_at" | "updated_at" | "invoice_number">;
