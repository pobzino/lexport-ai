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
export type ContractSourceType = "generated" | "uploaded";
export type UploadedFileType = "pdf" | "docx" | "jpg" | "png";
export type ProcessingMode = "full";
export type InvoiceStatus = "draft" | "sent" | "paid" | "overdue" | "cancelled" | "void";
export type InvoiceTemplateType = "hourly" | "fixed_fee" | "milestone" | "retainer" | "custom";
export type RetainerPeriod = "weekly" | "monthly" | "quarterly";
export type ContractGenerationJobStatus = "queued" | "processing" | "completed" | "failed" | "timed_out";
export type AuditEventType =
  // Contract lifecycle events
  | "contract_created"
  | "contract_updated"
  | "contract_deleted"
  | "contract_sent"
  | "contract_viewed"
  | "contract_completed"
  | "contract_expired"
  | "contract_downloaded"
  // Signature events
  | "signature_requested"
  | "signature_request_sent"
  | "signature_request_viewed"
  | "signature_request_resent"
  | "signature_completed"
  | "signature_declined"
  // Document events
  | "document_viewed"
  | "document_printed"
  | "pdf_generated"
  | "pdf_downloaded"
  // Payment events
  | "payment_initiated"
  | "payment_completed"
  | "payment_failed"
  | "payment_refunded"
  | "invoice_created"
  | "invoice_sent"
  | "invoice_paid"
  // Field events
  | "field_added"
  | "field_updated"
  | "field_deleted"
  | "field_value_entered"
  // Access events
  | "access_granted"
  | "access_revoked"
  | "link_shared"
  | "reminder_sent";

// Geo location data from IP lookup
export interface GeoLocation {
  ip: string;
  city?: string;
  region?: string;
  country?: string;
  countryCode?: string;
  timezone?: string;
  latitude?: number;
  longitude?: number;
  isp?: string;
}

// Device information parsed from user agent
export interface DeviceInfo {
  browser?: string;
  browserVersion?: string;
  os?: string;
  osVersion?: string;
  device?: string;
  deviceType?: "desktop" | "mobile" | "tablet" | "unknown";
  isMobile?: boolean;
}

// Version history types
export type VersionChangeType = "create" | "edit" | "ai_modification" | "rollback";
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

// Subscription types
export type SubscriptionTier = "free" | "pro" | "team";
export type SubscriptionStatus = "active" | "past_due" | "canceled" | "trialing";

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
  // Profile fields for autofill
  company_name: string | null;
  job_title: string | null;
  address: string | null;
  phone: string | null;
  default_jurisdiction: string | null;
  // Stripe Connect
  stripe_connect_account_id: string | null;
  stripe_connect_status: StripeConnectStatus;
  stripe_connect_onboarding_complete: boolean;
  // Subscription fields
  subscription_tier: SubscriptionTier;
  subscription_status: SubscriptionStatus;
  stripe_customer_id: string | null;
  stripe_subscription_id: string | null;
  subscription_started_at: string | null;
  subscription_ends_at: string | null;
  trial_ends_at: string | null;
  // Usage tracking
  ai_contracts_used: number;
  ai_contracts_limit: number;
  signatures_used: number;
  signatures_limit: number;
  usage_reset_at: string | null;
  created_at: string;
  updated_at: string;
}

export interface Organization {
  id: string;
  name: string;
  plan: Plan;
  stripe_customer_id: string | null;
  stripe_subscription_id: string | null;
  // Subscription fields
  subscription_tier: SubscriptionTier;
  subscription_status: SubscriptionStatus;
  subscription_started_at: string | null;
  subscription_ends_at: string | null;
  trial_ends_at: string | null;
  seats_included: number;
  seats_used: number;
  created_at: string;
  updated_at: string;
}

// Usage history for analytics and audit
export interface UsageHistory {
  id: string;
  user_id: string | null;
  organization_id: string | null;
  period_start: string;
  period_end: string;
  ai_contracts_used: number;
  signatures_used: number;
  created_at: string;
}

// Effective subscription (result of get_effective_subscription RPC)
export interface EffectiveSubscription {
  effective_tier: SubscriptionTier;
  effective_status: SubscriptionStatus;
  source: "user" | "organization";
  is_unlimited: boolean;
  contracts_limit: number;
  signatures_limit: number;
  contracts_used: number;
  signatures_used: number;
  usage_reset_at: string | null;
  organization_name: string | null;
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
  reminder_count: number;
  max_reminders: number;
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
  // Upload support
  source_type: ContractSourceType;
  source_file_url: string | null;
  source_file_type: UploadedFileType | null;
  processing_mode: ProcessingMode | null;
  extracted_text: string | null;
  // Section explanations cache
  section_explanations: Record<string, ClauseExplanation> | null;
  created_at: string;
  updated_at: string;
}

export interface ContractGenerationJob {
  id: string;
  user_id: string;
  contract_type: string;
  metadata: Record<string, unknown>;
  payment_config: Record<string, unknown> | null;
  status: ContractGenerationJobStatus;
  progress_percent: number;
  progress_status: string;
  error_message: string | null;
  contract_id: string | null;
  attempt_count: number;
  started_at: string | null;
  completed_at: string | null;
  created_at: string;
  updated_at: string;
}

export interface ContractContent {
  preamble: string;
  recitals: string;
  clauses: ContractClause[];
  signatureBlock: string;
}

export interface ClauseExplanation {
  title: string;
  summary: string;
  keyPoints: string[];
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
  page: number; // Page number (1-indexed) where field is placed
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
  contract_id: string | null;
  signature_request_id: string | null;
  user_id: string | null;
  event_type: AuditEventType;
  ip_address: string | null;
  user_agent: string | null;
  // Actor information
  actor_email: string | null;
  actor_name: string | null;
  // Enhanced tracking
  geo_location: GeoLocation | null;
  device_info: DeviceInfo | null;
  // Change tracking
  affected_fields: string[] | null;
  old_value: Record<string, unknown> | null;
  new_value: Record<string, unknown> | null;
  // Context
  page_url: string | null;
  session_id: string | null;
  metadata: Record<string, unknown> | null;
  created_at: string;
}

// Enhanced audit log for API responses with computed fields
export interface AuditLogWithDetails extends AuditLog {
  actor_display_name: string;
  event_description: string;
  time_ago: string;
}

export interface Template {
  id: string;
  name: string;
  description: string | null;
  type: ContractType;
  jurisdiction: Jurisdiction;
  content: ContractContent;
  is_public: boolean;
  is_premium: boolean;
  price: number | null; // cents - null means use default ($10.00)
  created_by_id: string | null;
  usage_count: number;
  created_at: string;
  updated_at: string;
}

export interface TemplatePurchase {
  id: string;
  user_id: string;
  template_id: string;
  amount: number; // cents
  status: "pending" | "succeeded" | "failed";
  stripe_payment_intent_id: string | null;
  purchased_at: string;
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
  contract_id: string | null; // Nullable to support standalone invoices
  template_id: string | null; // Reference to invoice template used
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
  // External payment tracking
  payment_method: string | null; // bank_transfer, cash, check, other
  payment_reference: string | null; // Reference number for external payments
  // Reminder tracking
  reminder_enabled: boolean;
  reminder_interval_days: number;
  next_reminder_at: string | null;
  reminder_count: number;
  max_reminders: number;
  last_reminder_sent_at: string | null;
  created_at: string;
  updated_at: string;
}

export interface InvoiceLineItem {
  description: string;
  quantity: number;
  unit_price: number; // cents
  amount: number; // cents
}

export interface InvoiceSettings {
  user_id: string;
  // Numbering settings
  number_prefix: string;
  next_number: number;
  number_year: number;
  // Branding
  company_name: string | null;
  company_address: string | null;
  company_logo_url: string | null;
  // Default settings
  default_due_days: number;
  default_notes: string | null;
  default_payment_terms: string | null;
  // Timestamps
  created_at: string;
  updated_at: string;
}

// Invoice Template types
export interface MilestoneConfig {
  name: string;
  percentage: number;
  description?: string;
}

export interface InvoiceTemplate {
  id: string;
  user_id: string | null; // Null for system templates
  name: string;
  description: string | null;
  template_type: InvoiceTemplateType;
  is_system: boolean;
  is_public: boolean;
  // Template configuration
  default_line_items: InvoiceLineItem[];
  default_notes: string | null;
  default_due_days: number;
  default_payment_terms: string | null;
  // Type-specific fields
  hourly_rate: number | null; // cents - for hourly templates
  milestones: MilestoneConfig[] | null; // for milestone templates
  retainer_amount: number | null; // cents - for retainer templates
  retainer_period: RetainerPeriod | null; // for retainer templates
  // Metadata
  usage_count: number;
  created_at: string;
  updated_at: string;
}

// Comments/Annotations
export interface Comment {
  id: string;
  contract_id: string;
  clause_id: string;
  user_id: string;
  parent_comment_id: string | null;
  content: string;
  selection_start: number | null;
  selection_end: number | null;
  selected_text: string | null;
  is_resolved: boolean;
  resolved_by: string | null;
  resolved_at: string | null;
  created_at: string;
  updated_at: string;
  // Populated relations (optional)
  user?: User;
  replies?: Comment[];
}

export interface CommentMention {
  id: string;
  comment_id: string;
  mentioned_user_id: string;
  is_read: boolean;
  read_at: string | null;
  created_at: string;
  // Populated relations (optional)
  user?: User;
  comment?: Comment;
}

// Comment with user info for display
export interface CommentWithUser extends Omit<Comment, 'user' | 'replies'> {
  user: {
    id: string;
    name: string | null;
    email: string;
    image: string | null;
  };
  replies?: CommentWithUser[];
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
export type NewInvoiceTemplate = Omit<InvoiceTemplate, "id" | "created_at" | "updated_at" | "usage_count">;
export type NewComment = Omit<Comment, "id" | "created_at" | "updated_at" | "user" | "replies">;
export type NewCommentMention = Omit<CommentMention, "id" | "created_at" | "user" | "comment">;

// Contract Version interface
export interface ContractVersion {
  id: string;
  contract_id: string;
  version_number: number;
  content: ContractContent;
  metadata: Record<string, unknown> | null;
  change_summary: string | null;
  change_type: VersionChangeType;
  created_by: string | null;
  created_at: string;
}

export type NewContractVersion = Omit<ContractVersion, "id" | "created_at">;

// Version comparison types
export interface VersionDiff {
  type: "added" | "removed" | "unchanged" | "modified";
  value: string;
  oldValue?: string;
}

export interface ClauseDiff {
  clauseId: string;
  clauseTitle: string;
  status: "added" | "removed" | "modified" | "unchanged";
  titleDiff?: VersionDiff[];
  contentDiff?: VersionDiff[];
}

export interface VersionComparison {
  fromVersion: number;
  toVersion: number;
  preambleDiff: VersionDiff[];
  recitalsDiff: VersionDiff[];
  clausesDiff: ClauseDiff[];
  signatureBlockDiff: VersionDiff[];
}
