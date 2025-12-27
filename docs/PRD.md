# Lexport AI - Product Requirements Document

## Executive Summary

Lexport is an AI-powered legal platform that enables startup founders and freelancers to create, manage, and sign legally binding contracts without needing a lawyer. The platform combines intelligent contract generation with a seamless e-signature experience, targeting users in California, Texas, New York, and the United Kingdom.

**Mission**: Democratize access to legal documents for entrepreneurs and independent professionals.

**Vision**: Become the default legal infrastructure for the modern workforce.

---

## Table of Contents

1. [Market Analysis](#market-analysis)
2. [Target Users](#target-users)
3. [Product Overview](#product-overview)
4. [Feature Specifications](#feature-specifications)
5. [Technical Architecture](#technical-architecture)
6. [Legal & Compliance](#legal--compliance)
7. [User Flows](#user-flows)
8. [Data Models](#data-models)
9. [API Specifications](#api-specifications)
10. [Security Requirements](#security-requirements)
11. [MVP Scope](#mvp-scope)
12. [Roadmap](#roadmap)
13. [Success Metrics](#success-metrics)
14. [Risks & Mitigations](#risks--mitigations)

---

## Market Analysis

### Market Size

| Segment | US Market | UK Market | Total Addressable |
|---------|-----------|-----------|-------------------|
| Freelancers | 73.3M (2023) | 4.4M | 77.7M |
| Startup Founders | ~5M active | ~800K | 5.8M |
| **Target States (CA, TX, NY)** | ~25M freelancers | - | 25M |
| **Serviceable Market** | ~2M high-frequency users | ~500K | 2.5M |

### Competitive Landscape

| Competitor | Strengths | Weaknesses | Our Differentiation |
|------------|-----------|------------|---------------------|
| **LegalZoom** | Brand trust, comprehensive | Expensive, slow, lawyer-dependent | AI-first, instant, affordable |
| **Rocket Lawyer** | Subscription model | Generic templates, complex UX | Tailored for founders/freelancers |
| **DocuSign** | E-signature leader | No contract creation | End-to-end solution |
| **PandaDoc** | Good UX, proposals | Enterprise-focused, expensive | SMB/individual pricing |
| **Ironclad** | AI contracts | Enterprise only | Consumer/SMB focus |

### Opportunity

The intersection of **AI contract generation** + **e-signatures** + **founder/freelancer focus** is underserved. Existing solutions are either:
- Too expensive (LegalZoom: $299+ per document)
- Too generic (templates don't fit startup needs)
- Missing half the solution (DocuSign = signatures only)

---

## Target Users

### Primary Persona: Startup Founder

```
Name: Alex Chen
Age: 28-40
Location: San Francisco, CA / Austin, TX / New York, NY
Company Stage: Pre-seed to Series A
Team Size: 1-20

Pain Points:
- Spending $500-2000 per contract with lawyers
- 3-5 day turnaround for simple agreements
- Managing contracts across email, Drive, Dropbox
- Uncertainty about legal validity

Contract Needs (Monthly):
- NDAs: 5-10
- Contractor Agreements: 2-5
- SAFE Notes: 1-2 (during fundraising)
- IP Assignments: 1-3
- Advisor Agreements: 1-2

Willingness to Pay: $29-99/month
```

### Secondary Persona: Freelancer/Consultant

```
Name: Jordan Martinez
Age: 25-45
Location: Remote (based in TX, FL, or UK)
Specialization: Design, Development, Marketing, Consulting
Annual Revenue: $50K-300K

Pain Points:
- Clients send unfavorable contracts
- No leverage to negotiate terms
- Chasing signatures via email
- Tracking payment terms across clients

Contract Needs (Monthly):
- Service Agreements: 2-4
- Project Contracts: 1-3
- NDAs: 2-5
- Statements of Work: 2-4

Willingness to Pay: $15-39/month
```

### Tertiary Persona: UK Startup/Freelancer

```
Similar to above but with UK-specific needs:
- IR35 compliance for contractors
- GDPR data processing agreements
- UK-specific employment terms
- Shareholder agreements under UK law
```

---

## Product Overview

### Core Value Propositions

1. **AI-Powered Contract Creation**: Generate customized, legally sound contracts in minutes
2. **Seamless E-Signatures**: Send, track, and complete signatures without leaving the platform
3. **Smart Contract Management**: Dashboard to track all contracts, expirations, and obligations
4. **Multi-Jurisdiction Support**: Templates validated for CA, TX, NY, and UK law

### Product Principles

1. **Speed over Perfection**: Users want contracts fast; offer quick generation with optional refinement
2. **Plain English**: Explain legal terms; don't assume legal knowledge
3. **Mobile-First Signing**: 60%+ of signatures happen on mobile
4. **Trust Through Transparency**: Show what each clause means and why it matters

---

## Feature Specifications

### F1: AI Contract Generator

**Description**: Users describe their needs in natural language; AI generates a complete, customized contract.

**User Story**: As a startup founder, I want to describe my contractor arrangement and get a complete agreement so I can onboard talent quickly.

**Functional Requirements**:

| ID | Requirement | Priority |
|----|-------------|----------|
| F1.1 | Natural language input for contract requirements | P0 |
| F1.2 | AI generates complete contract draft | P0 |
| F1.3 | Section-by-section customization | P0 |
| F1.4 | Plain English explanations for each clause | P0 |
| F1.5 | Jurisdiction selection (CA, TX, NY, UK) | P0 |
| F1.6 | Smart suggestions based on contract type | P1 |
| F1.7 | Risk highlighting (unfavorable terms) | P1 |
| F1.8 | Version comparison | P2 |
| F1.9 | Contract negotiation mode (redlines) | P2 |

**AI Prompt Engineering Requirements**:
- Must generate legally accurate language for selected jurisdiction
- Must include all required clauses for contract type
- Must avoid hallucinating legal citations
- Must explain trade-offs when presenting options

**Contract Types (MVP)**:

| Contract Type | US (CA/TX/NY) | UK | Priority |
|---------------|---------------|-----|----------|
| Non-Disclosure Agreement (NDA) | ✓ | ✓ | P0 |
| Independent Contractor Agreement | ✓ | ✓ | P0 |
| Consulting Agreement | ✓ | ✓ | P0 |
| SAFE Note | ✓ | - | P0 |
| Freelance Service Agreement | ✓ | ✓ | P0 |
| IP Assignment | ✓ | ✓ | P1 |
| Advisor Agreement | ✓ | - | P1 |
| Employment Offer Letter | ✓ | ✓ | P1 |
| Statement of Work | ✓ | ✓ | P1 |
| Partnership Agreement | ✓ | ✓ | P2 |
| Shareholder Agreement | ✓ | ✓ | P2 |

---

### F2: Template Library

**Description**: Pre-built, lawyer-reviewed templates that users can customize.

**User Story**: As a freelancer, I want to start from a proven template so I don't miss important protections.

**Functional Requirements**:

| ID | Requirement | Priority |
|----|-------------|----------|
| F2.1 | Browse templates by category | P0 |
| F2.2 | Filter by jurisdiction | P0 |
| F2.3 | Preview template before using | P0 |
| F2.4 | One-click customize with AI | P0 |
| F2.5 | Save custom templates | P1 |
| F2.6 | Share templates within team | P2 |
| F2.7 | Community templates (vetted) | P3 |

---

### F3: E-Signature System

**Description**: Legally compliant electronic signature collection with full audit trail.

**User Story**: As a founder, I want to send contracts for signature and track their status so deals don't stall.

**Functional Requirements**:

| ID | Requirement | Priority |
|----|-------------|----------|
| F3.1 | Add signature fields to documents | P0 |
| F3.2 | Add date, initial, text fields | P0 |
| F3.3 | Set signing order (sequential/parallel) | P0 |
| F3.4 | Email invitation to signers | P0 |
| F3.5 | Mobile-optimized signing experience | P0 |
| F3.6 | Draw, type, or upload signature | P0 |
| F3.7 | Real-time signing status tracking | P0 |
| F3.8 | Automatic reminders | P1 |
| F3.9 | Signing deadline enforcement | P1 |
| F3.10 | In-person signing mode | P2 |
| F3.11 | Bulk send (same doc, multiple recipients) | P2 |

**Compliance Requirements**:

| Requirement | US (ESIGN/UETA) | UK (ECA 2000) |
|-------------|-----------------|---------------|
| Intent to sign captured | ✓ | ✓ |
| Consent to e-signature | ✓ | ✓ |
| Association of signature with record | ✓ | ✓ |
| Record retention | ✓ | ✓ |
| Audit trail with timestamps | ✓ | ✓ |
| IP address logging | ✓ | ✓ |
| Email verification | ✓ | ✓ |

#### F3.1-F3.2: Signature Field Placement System (Implemented)

**Field Types Supported:**

| Type | Description | Use Case |
|------|-------------|----------|
| `signature` | Full signature capture (draw/type/upload) | Primary signing |
| `initials` | Abbreviated signature | Page acknowledgment |
| `date` | Auto-filled or manual date | Execution date |
| `text` | Free-form text input | Name, title, company |

**Field Placement UI:**
- Visual editor overlaid on signature block section
- Click-to-place fields at desired location
- Drag to reposition existing fields
- Assign each field to a signer role
- Set required/optional status

**Position System:**
- Percentage-based positioning (0-100 for X and Y)
- Relative to signature block container
- Responsive across screen sizes
- Preserved in PDF generation

**Components:**
- `SignatureFieldEditor` - Drag & drop field placement
- `SignatureBlockDisplay` - Inline signature rendering
- `SignerStatusPanel` - Signer progress tracking

#### F3.7: Signer Status Tracking (Implemented)

**Status Panel Features:**
- Per-signer status: pending → viewed → signed → declined
- Timestamp for each status change
- Progress indicator (e.g., "2 of 3 signed")
- Quick actions: copy signing link, resend invite
- Decline reason display if applicable

**Sign Page Field-Guided Flow:**
- Shows fields assigned to current signer
- Progress bar for field completion
- Click field to complete it
- Automatic date field population
- Signature applied to designated fields

**PDF Generation with Fields:**
- Signatures positioned at field coordinates
- Empty fields shown as placeholders
- Labels and signer roles displayed
- Falls back to legacy layout for contracts without fields

---

### F4: Contract Dashboard

**Description**: Central hub for all contracts with status tracking and smart alerts.

**User Story**: As a user, I want to see all my contracts in one place so I never miss a deadline or renewal.

**Functional Requirements**:

| ID | Requirement | Priority |
|----|-------------|----------|
| F4.1 | List all contracts with status | P0 |
| F4.2 | Filter by status, type, date | P0 |
| F4.3 | Search contracts by content | P0 |
| F4.4 | View contract details and history | P0 |
| F4.5 | Download signed PDFs | P0 |
| F4.6 | Expiration/renewal alerts | P1 |
| F4.7 | Obligation tracking (payment dates, deliverables) | P2 |
| F4.8 | Contract analytics (avg sign time, etc.) | P2 |
| F4.9 | Folder organization | P1 |
| F4.10 | Tags and labels | P1 |

---

### F5: User & Team Management

**Description**: Account management, team collaboration, and access controls.

**Functional Requirements**:

| ID | Requirement | Priority |
|----|-------------|----------|
| F5.1 | Email/password registration | P0 |
| F5.2 | Google OAuth | P0 |
| F5.3 | Email verification | P0 |
| F5.4 | Password reset | P0 |
| F5.5 | User profile management | P0 |
| F5.6 | Team/organization creation | P1 |
| F5.7 | Invite team members | P1 |
| F5.8 | Role-based permissions (admin, member, viewer) | P1 |
| F5.9 | Team billing | P2 |
| F5.10 | SSO (Google Workspace, Okta) | P3 |

---

### F6: Notifications & Integrations

**Description**: Keep users informed and connect with their workflow.

**Functional Requirements**:

| ID | Requirement | Priority |
|----|-------------|----------|
| F6.1 | Email notifications (signature requests, completions) | P0 |
| F6.2 | In-app notifications | P0 |
| F6.3 | Slack integration | P2 |
| F6.4 | Google Drive integration | P2 |
| F6.5 | Zapier integration | P2 |
| F6.6 | API for custom integrations | P2 |
| F6.7 | Webhook events | P2 |

---

## Technical Architecture

### System Overview

```
┌─────────────────────────────────────────────────────────────────────────┐
│                              CLIENTS                                     │
├─────────────────────────────────────────────────────────────────────────┤
│  ┌──────────────┐  ┌──────────────┐  ┌──────────────┐                   │
│  │   Web App    │  │  Mobile Web  │  │   API Users  │                   │
│  │  (Next.js)   │  │  (Responsive)│  │              │                   │
│  └──────────────┘  └──────────────┘  └──────────────┘                   │
└─────────────────────────────────────────────────────────────────────────┘
                                    │
                                    ▼
┌─────────────────────────────────────────────────────────────────────────┐
│                           EDGE / CDN                                     │
│                         (Vercel Edge)                                    │
└─────────────────────────────────────────────────────────────────────────┘
                                    │
                                    ▼
┌─────────────────────────────────────────────────────────────────────────┐
│                         API LAYER (Next.js API Routes)                   │
├─────────────────────────────────────────────────────────────────────────┤
│  ┌──────────────┐  ┌──────────────┐  ┌──────────────┐  ┌─────────────┐  │
│  │     Auth     │  │  Contracts   │  │  Signatures  │  │   Billing   │  │
│  │   Service    │  │   Service    │  │   Service    │  │   Service   │  │
│  └──────────────┘  └──────────────┘  └──────────────┘  └─────────────┘  │
└─────────────────────────────────────────────────────────────────────────┘
                                    │
                    ┌───────────────┼───────────────┐
                    ▼               ▼               ▼
┌──────────────────────┐ ┌──────────────────┐ ┌──────────────────────────┐
│      PostgreSQL      │ │   Redis Cache    │ │      AI Services         │
│   (Neon/Supabase)    │ │   (Upstash)      │ │  (Anthropic Claude API)  │
└──────────────────────┘ └──────────────────┘ └──────────────────────────┘
                                    │
                                    ▼
┌─────────────────────────────────────────────────────────────────────────┐
│                         STORAGE & SERVICES                               │
├─────────────────────────────────────────────────────────────────────────┤
│  ┌──────────────┐  ┌──────────────┐  ┌──────────────┐  ┌─────────────┐  │
│  │  S3/R2 Blob  │  │   Resend     │  │    Stripe    │  │  PostHog    │  │
│  │   Storage    │  │   (Email)    │  │  (Payments)  │  │ (Analytics) │  │
│  └──────────────┘  └──────────────┘  └──────────────┘  └─────────────┘  │
└─────────────────────────────────────────────────────────────────────────┘
```

### Tech Stack

| Layer | Technology | Rationale |
|-------|------------|-----------|
| **Frontend** | Next.js 14 (App Router) | SSR, SEO, React ecosystem |
| **Styling** | Tailwind CSS + shadcn/ui | Rapid development, consistent design |
| **State** | Zustand + TanStack Query | Simple, performant state management |
| **Backend** | Next.js API Routes + tRPC | Type-safe API, co-located with frontend |
| **Database** | PostgreSQL (Neon) | Relational data, JSON support, scalable |
| **ORM** | Drizzle ORM | Type-safe, performant, great DX |
| **Auth** | NextAuth.js v5 | Flexible, supports multiple providers |
| **File Storage** | Cloudflare R2 / AWS S3 | Cost-effective, S3-compatible |
| **AI** | Anthropic Claude API | Best-in-class for legal text generation |
| **Email** | Resend | Developer-friendly, reliable |
| **Payments** | Stripe | Industry standard, subscription support |
| **Analytics** | PostHog | Product analytics, feature flags |
| **PDF Generation** | pdf-lib + React-PDF | Client-side PDF manipulation |
| **Hosting** | Vercel | Optimal for Next.js, global edge |
| **Cache** | Upstash Redis | Serverless Redis, rate limiting |

### Key Technical Decisions

1. **Serverless-First**: No server management, auto-scaling, pay-per-use
2. **Edge Rendering**: Fast global performance for signing pages
3. **Type Safety End-to-End**: TypeScript + tRPC + Drizzle = no runtime type errors
4. **PDF-Native**: Contracts stored as structured data, rendered to PDF on demand
5. **Event-Driven Signatures**: Webhook-based architecture for signature events

---

## Legal & Compliance

### E-Signature Compliance

**US Compliance (ESIGN Act + UETA)**:

| Requirement | Implementation |
|-------------|----------------|
| Intent to sign | Explicit "I agree to sign" checkbox + click |
| Consent to electronic records | Consent captured during signing flow |
| Association | Signature cryptographically linked to document hash |
| Record retention | Documents stored for 7+ years |
| Opt-out option | Users can request paper process |

**UK Compliance (Electronic Communications Act 2000)**:

| Requirement | Implementation |
|-------------|----------------|
| Admissibility | E-signatures admissible as evidence |
| Authentication | Email verification + audit trail |
| Reliability | Timestamping + document hashing |

### Audit Trail Requirements

Each signature event must capture:

```typescript
interface AuditEvent {
  eventId: string;
  timestamp: ISO8601;
  eventType: 'viewed' | 'signed' | 'declined' | 'delegated';
  userId: string;
  documentId: string;
  documentHash: SHA256;
  ipAddress: string;
  userAgent: string;
  geoLocation?: {
    country: string;
    region: string;
    city: string;
  };
  consentText: string;
  signatureData?: {
    type: 'draw' | 'type' | 'upload';
    imageHash: SHA256;
  };
}
```

### Data Protection

**GDPR Compliance (UK)**:
- Clear privacy policy
- Data processing agreements for enterprise
- Right to deletion (with legal hold exceptions)
- Data export functionality

**CCPA Compliance (California)**:
- Privacy policy disclosures
- Opt-out of data sales (N/A - we don't sell data)
- Data access requests

### Disclaimer Requirements

All generated contracts must include:

```
DISCLAIMER: This document was generated using Lexport AI. While our
templates are reviewed by legal professionals, this does not constitute
legal advice. For complex or high-value transactions, we recommend
consulting with a qualified attorney in your jurisdiction.
```

---

## User Flows

### UF1: New User Onboarding

```
┌─────────────┐     ┌─────────────┐     ┌─────────────┐     ┌─────────────┐
│   Landing   │────▶│   Sign Up   │────▶│  Onboarding │────▶│  Dashboard  │
│    Page     │     │   (Email/   │     │   Survey    │     │   (Empty    │
│             │     │   Google)   │     │             │     │    State)   │
└─────────────┘     └─────────────┘     └─────────────┘     └─────────────┘
                                               │
                                               ▼
                                        ┌─────────────┐
                                        │  Questions: │
                                        │  - Role     │
                                        │  - Location │
                                        │  - Use case │
                                        └─────────────┘
```

**Onboarding Survey Questions**:
1. What best describes you? (Startup Founder / Freelancer / Consultant / Other)
2. Where are you based? (California / Texas / New York / UK / Other)
3. What's your first contract need? (NDA / Contractor Agreement / Service Agreement / Other)

### UF2: Create Contract with AI

```
┌─────────────┐     ┌─────────────┐     ┌─────────────┐     ┌─────────────┐
│  Dashboard  │────▶│   Select    │────▶│  Describe   │────▶│   Review    │
│  "+ New"    │     │  Contract   │     │   Needs     │     │   Draft     │
│             │     │    Type     │     │ (AI Chat)   │     │             │
└─────────────┘     └─────────────┘     └─────────────┘     └─────────────┘
                                                                   │
                    ┌─────────────────────────────────────────────┘
                    ▼
             ┌─────────────┐     ┌─────────────┐     ┌─────────────┐
             │   Refine    │────▶│    Save     │────▶│   Send for  │
             │  (Section   │     │  Contract   │     │  Signature  │
             │   by Sec)   │     │             │     │             │
             └─────────────┘     └─────────────┘     └─────────────┘
```

**AI Interaction Model**:

```
User: "I need a contractor agreement for a React developer in California.
       They'll work 20 hours/week at $100/hour for 3 months."

AI Response:
"I'll create an Independent Contractor Agreement with these terms:
 - Contractor Type: Software Developer (React)
 - Location: California
 - Engagement: Part-time (20 hrs/week)
 - Rate: $100/hour
 - Duration: 3 months (with renewal option)

 I'll include standard California-compliant clauses for:
 ✓ Work-for-hire IP assignment
 ✓ Confidentiality
 ✓ Independent contractor status (important for CA AB5 compliance)
 ✓ Termination with 14-day notice

 Shall I proceed with this draft?"
```

### UF3: Sign Contract (Signer's Perspective)

```
┌─────────────┐     ┌─────────────┐     ┌─────────────┐     ┌─────────────┐
│   Email     │────▶│   Review    │────▶│   Accept    │────▶│    Sign     │
│  Received   │     │  Document   │     │   Terms     │     │  Document   │
│             │     │             │     │             │     │             │
└─────────────┘     └─────────────┘     └─────────────┘     └─────────────┘
                                                                   │
                                                                   ▼
                                                            ┌─────────────┐
                                                            │  Download   │
                                                            │   Signed    │
                                                            │    Copy     │
                                                            └─────────────┘
```

**Signing Page Components**:
1. Document viewer (PDF-like)
2. Field-by-field navigation
3. Signature input (draw/type/upload)
4. Legal consent checkbox
5. "Finish" button
6. Confirmation + download

---

## Data Models

### Core Entities

```typescript
// User
interface User {
  id: string; // UUID
  email: string;
  emailVerified: boolean;
  name: string;
  avatarUrl?: string;
  role: 'founder' | 'freelancer' | 'consultant' | 'other';
  jurisdiction: 'CA' | 'TX' | 'NY' | 'UK' | 'other';
  organizationId?: string;
  createdAt: Date;
  updatedAt: Date;
}

// Organization (for teams)
interface Organization {
  id: string;
  name: string;
  plan: 'free' | 'pro' | 'team' | 'enterprise';
  stripeCustomerId?: string;
  stripeSubscriptionId?: string;
  createdAt: Date;
  updatedAt: Date;
}

// Contract
interface Contract {
  id: string;
  title: string;
  type: ContractType;
  jurisdiction: Jurisdiction;
  status: 'draft' | 'pending_signature' | 'partially_signed' | 'completed' | 'expired' | 'cancelled';
  content: ContractContent; // Structured JSON
  pdfUrl?: string;
  createdById: string;
  organizationId?: string;
  expiresAt?: Date;
  completedAt?: Date;
  createdAt: Date;
  updatedAt: Date;
}

type ContractType =
  | 'nda'
  | 'contractor_agreement'
  | 'consulting_agreement'
  | 'safe_note'
  | 'service_agreement'
  | 'ip_assignment'
  | 'advisor_agreement'
  | 'employment_offer'
  | 'sow';

type Jurisdiction = 'CA' | 'TX' | 'NY' | 'UK';

// Contract Content (structured for AI + rendering)
interface ContractContent {
  version: string;
  sections: ContractSection[];
  variables: Record<string, string | number | Date>;
  metadata: {
    generatedBy: 'ai' | 'template';
    templateId?: string;
    aiPrompt?: string;
  };
}

interface ContractSection {
  id: string;
  title: string;
  content: string; // Markdown or rich text
  isRequired: boolean;
  order: number;
}

// Signature Request
interface SignatureRequest {
  id: string;
  contractId: string;
  recipientEmail: string;
  recipientName: string;
  role: 'signer' | 'viewer' | 'approver';
  order: number; // For sequential signing
  status: 'pending' | 'viewed' | 'signed' | 'declined';
  signedAt?: Date;
  declinedAt?: Date;
  declineReason?: string;
  accessToken: string; // For email link
  expiresAt: Date;
  createdAt: Date;
  updatedAt: Date;
}

// Signature
interface Signature {
  id: string;
  signatureRequestId: string;
  type: 'draw' | 'type' | 'upload';
  imageUrl: string;
  imageHash: string; // SHA256
  createdAt: Date;
}

// Audit Log
interface AuditLog {
  id: string;
  contractId: string;
  signatureRequestId?: string;
  userId?: string;
  eventType: AuditEventType;
  ipAddress: string;
  userAgent: string;
  geoLocation?: GeoLocation;
  metadata?: Record<string, unknown>;
  createdAt: Date;
}

type AuditEventType =
  | 'contract_created'
  | 'contract_updated'
  | 'contract_sent'
  | 'signature_requested'
  | 'document_viewed'
  | 'signature_completed'
  | 'signature_declined'
  | 'contract_completed'
  | 'contract_downloaded';

// Template
interface Template {
  id: string;
  name: string;
  description: string;
  type: ContractType;
  jurisdiction: Jurisdiction;
  content: ContractContent;
  isPublic: boolean;
  createdById: string;
  usageCount: number;
  createdAt: Date;
  updatedAt: Date;
}
```

### Database Schema (Drizzle ORM)

```typescript
// See /src/db/schema.ts for full implementation
```

---

## API Specifications

### API Design Principles

1. **tRPC for Internal**: Type-safe, auto-generated client
2. **REST for External**: Public API for integrations
3. **Versioned**: `/api/v1/` prefix for REST endpoints

### Core Endpoints

#### Contracts

| Method | Endpoint | Description |
|--------|----------|-------------|
| POST | `/api/trpc/contracts.create` | Create new contract |
| GET | `/api/trpc/contracts.list` | List user's contracts |
| GET | `/api/trpc/contracts.get` | Get single contract |
| PATCH | `/api/trpc/contracts.update` | Update contract |
| DELETE | `/api/trpc/contracts.delete` | Delete contract |
| POST | `/api/trpc/contracts.generateWithAI` | Generate contract with AI |
| POST | `/api/trpc/contracts.sendForSignature` | Send for signatures |

#### Signatures

| Method | Endpoint | Description |
|--------|----------|-------------|
| GET | `/api/sign/:token` | Get signing page data |
| POST | `/api/sign/:token/complete` | Complete signature |
| POST | `/api/sign/:token/decline` | Decline to sign |

#### Templates

| Method | Endpoint | Description |
|--------|----------|-------------|
| GET | `/api/trpc/templates.list` | List available templates |
| GET | `/api/trpc/templates.get` | Get template details |
| POST | `/api/trpc/templates.createFromContract` | Save contract as template |

---

## Security Requirements

### Authentication & Authorization

| Requirement | Implementation |
|-------------|----------------|
| Password hashing | Argon2id |
| Session management | HTTP-only cookies, 7-day expiry |
| Rate limiting | 100 req/min for API, 10 req/min for auth |
| CSRF protection | Double-submit cookie pattern |
| OAuth security | PKCE flow for Google OAuth |

### Data Security

| Requirement | Implementation |
|-------------|----------------|
| Encryption at rest | AES-256 for S3/database |
| Encryption in transit | TLS 1.3 |
| Document hashing | SHA-256 for integrity |
| PII handling | Encrypted, access-logged |
| Secrets management | Environment variables, Vercel secrets |

### Infrastructure Security

| Requirement | Implementation |
|-------------|----------------|
| DDoS protection | Cloudflare |
| WAF | Vercel Firewall |
| Vulnerability scanning | Dependabot, Snyk |
| Audit logging | All sensitive operations logged |

---

## MVP Scope

### MVP Features (8-10 weeks)

**Must Have (P0)**:
- [ ] User registration and login (email + Google)
- [ ] Create contract with AI (NDA, Contractor Agreement, Consulting Agreement)
- [ ] Basic template library (5 templates per contract type)
- [ ] E-signature flow (single signer)
- [ ] Contract dashboard with status
- [ ] Email notifications (signature requests, completions)
- [ ] PDF download of signed contracts
- [ ] Basic audit trail

**Should Have (P1)** - Include if time permits:
- [ ] Multiple signers (sequential)
- [ ] Signature reminders
- [ ] Team/organization support
- [ ] SAFE Note template

**Won't Have (Post-MVP)**:
- [ ] API access
- [ ] Integrations (Slack, Google Drive)
- [ ] Advanced analytics
- [ ] Bulk operations
- [ ] SSO

### MVP Contract Types

| Contract | CA | TX | NY | UK |
|----------|----|----|----|----|
| NDA (Mutual) | ✓ | ✓ | ✓ | ✓ |
| NDA (One-way) | ✓ | ✓ | ✓ | ✓ |
| Contractor Agreement | ✓ | ✓ | ✓ | ✓ |
| Consulting Agreement | ✓ | ✓ | ✓ | ✓ |
| SAFE Note | ✓ | ✓ | ✓ | - |

### MVP Tech Scope

```
Frontend:
├── Landing page
├── Auth pages (login, register, forgot password)
├── Dashboard
├── Contract creation wizard
├── Contract editor
├── Signing page (public)
└── Settings (basic)

Backend:
├── Auth (NextAuth)
├── Contract CRUD
├── AI generation endpoint
├── Signature management
├── PDF generation
├── Email sending
└── Audit logging

Database:
├── Users
├── Contracts
├── SignatureRequests
├── Signatures
├── AuditLogs
└── Templates
```

---

## Roadmap

### Phase 1: MVP (Weeks 1-10)

```
Week 1-2: Foundation
- Project setup, CI/CD
- Database schema
- Auth implementation
- Basic UI components

Week 3-4: Contract Engine
- AI integration
- Contract data model
- Template system
- Contract editor UI

Week 5-6: Signature System
- Signing flow
- Signature capture
- Audit logging
- Email notifications

Week 7-8: Polish & Testing
- PDF generation
- Dashboard
- Error handling
- Testing

Week 9-10: Launch Prep
- Security audit
- Performance optimization
- Documentation
- Soft launch
```

### Phase 2: Growth (Weeks 11-20)

- Additional contract types (IP Assignment, Advisor Agreement, SOW)
- Team/organization features
- Multiple signers
- Reminders and deadlines
- Stripe billing integration

### Phase 3: Scale (Weeks 21-30)

- API access for developers
- Integrations (Slack, Google Drive, Notion)
- Advanced analytics
- Contract negotiation (redlines)
- Enterprise features (SSO, custom branding)

---

## Success Metrics

### North Star Metric

**Contracts Completed per Month**: Number of contracts that reach "signed" status

### Primary Metrics

| Metric | Definition | Target (Month 3) |
|--------|------------|------------------|
| Monthly Active Users | Users who log in | 1,000 |
| Contracts Created | New contracts started | 3,000 |
| Contracts Completed | Fully signed contracts | 1,500 |
| Completion Rate | Completed / Created | 50% |
| Time to Signature | Creation to completion | < 24 hours |

### Secondary Metrics

| Metric | Definition | Target |
|--------|------------|--------|
| User Activation | % who create first contract within 7 days | 40% |
| Retention (M1) | % returning after 30 days | 30% |
| NPS | Net Promoter Score | 40+ |
| Conversion to Paid | Free to paid users | 5% |
| Support Tickets | Per 100 users | < 10 |

### Tracking Implementation

- **PostHog**: Product analytics, funnels, feature flags
- **Sentry**: Error tracking
- **Custom Audit Logs**: Signature events, contract lifecycle

---

## Risks & Mitigations

### Technical Risks

| Risk | Likelihood | Impact | Mitigation |
|------|------------|--------|------------|
| AI generates incorrect legal terms | Medium | High | Lawyer review of outputs, disclaimer, validation layer |
| E-signature legal challenge | Low | High | Strict compliance with ESIGN/UETA, robust audit trail |
| Data breach | Low | Critical | Encryption, security audit, minimal PII |
| Scaling issues | Medium | Medium | Serverless architecture, CDN for signing pages |

### Business Risks

| Risk | Likelihood | Impact | Mitigation |
|------|------------|--------|------------|
| Low initial adoption | Medium | High | Focused niche (founders/freelancers), content marketing |
| Competitor response | Medium | Medium | Speed, UX differentiation, niche focus |
| Pricing too high/low | Medium | Medium | A/B testing, user research |
| Legal liability | Low | High | Strong ToS, disclaimers, insurance |

### Regulatory Risks

| Risk | Likelihood | Impact | Mitigation |
|------|------------|--------|------------|
| E-signature law changes | Low | Medium | Monitor legislation, flexible architecture |
| Unauthorized practice of law claims | Low | High | Clear disclaimers, no specific legal advice, template-based |

---

## Appendix

### A. Competitive Feature Matrix

| Feature | Lexport | LegalZoom | DocuSign | PandaDoc | Rocket Lawyer |
|---------|---------|-----------|----------|----------|---------------|
| AI Contract Generation | ✓ | ✗ | ✗ | Limited | ✗ |
| E-Signatures | ✓ | ✗ | ✓ | ✓ | ✓ |
| Founder-Focused Templates | ✓ | Limited | ✗ | ✗ | Limited |
| Self-Serve (No Lawyer) | ✓ | ✗ | N/A | N/A | Limited |
| Modern UX | ✓ | ✗ | ✓ | ✓ | ✗ |
| Affordable | ✓ | ✗ | ✓ | ✗ | ✓ |

### B. Pricing Strategy (Draft)

| Plan | Price | Contracts/Mo | Signatures/Mo | Features |
|------|-------|--------------|---------------|----------|
| Free | $0 | 3 | 5 | Basic templates, watermark |
| Pro | $29/mo | 20 | 50 | All templates, AI generation, no watermark |
| Team | $79/mo | Unlimited | 200 | Team features, priority support |
| Enterprise | Custom | Unlimited | Unlimited | SSO, API, custom branding |

### C. Go-to-Market Strategy

**Launch Channels**:
1. Product Hunt launch
2. Indie Hackers / Hacker News
3. Twitter/X (founder audience)
4. SEO (long-tail contract keywords)
5. Partnerships (accelerators, coworking spaces)

**Content Strategy**:
- Blog: "Legal basics for founders"
- Templates: Free downloadable templates (lead gen)
- Comparison pages: "Lexport vs LegalZoom"

---

## Document History

| Version | Date | Author | Changes |
|---------|------|--------|---------|
| 1.0 | 2024-XX-XX | Lexport Team | Initial PRD |

---

*This is a living document. Last updated: [Auto-generated]*
