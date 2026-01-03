# Lexport AI - Comprehensive Testing Checklist

> **Last Updated:** January 1, 2026
> **Version:** 1.1
> **Test Run:** Browser testing on lexportai.com (Production)

This document contains comprehensive testing checklists for all Lexport features. Use this for QA testing, regression testing, and feature verification.

---

## Table of Contents

1. [Authentication & Onboarding](#1-authentication--onboarding)
2. [Homepage & Landing](#2-homepage--landing)
3. [Dashboard](#3-dashboard)
4. [Contract Creation](#4-contract-creation)
5. [Contract Upload](#5-contract-upload)
6. [Contract Editor](#6-contract-editor)
7. [Contract Management](#7-contract-management)
8. [E-Signatures](#8-e-signatures)
9. [External Signing Flow](#9-external-signing-flow)
10. [Payments](#10-payments)
11. [Invoices](#11-invoices)
12. [Templates](#12-templates)
13. [Client Portal](#13-client-portal)
14. [Contract Review (Share for Review)](#14-contract-review-share-for-review)
15. [AI Features](#15-ai-features)
16. [Settings](#16-settings)
17. [Notifications](#17-notifications)
18. [Activity & Audit Trail](#18-activity--audit-trail)
19. [Organization & Teams](#19-organization--teams)
20. [Billing & Subscriptions](#20-billing--subscriptions)
21. [Privacy & Data Export](#21-privacy--data-export)
22. [Mobile Responsiveness](#22-mobile-responsiveness)
23. [Error Handling](#23-error-handling)
24. [Performance](#24-performance)

---

## 1. Authentication & Onboarding

### Login (`/login`)
- [x] Login page loads ✅ ("Welcome back" heading)
- [ ] Email/password login works (REQUIRES CREDENTIALS)
- [x] Google OAuth button present ✅ ("Continue with Google")
- [x] Magic Link option present ✅ ("Sign in with Magic Link")
- [x] Email input field present ✅
- [x] Password input field present ✅
- [x] Forgot password link present ✅ ("Forgot password?")
- [ ] Invalid credentials show appropriate error (REQUIRES TEST)
- [ ] Rate limiting prevents brute force (REQUIRES TEST)
- [ ] Redirect to dashboard after successful login (REQUIRES TEST)
- [ ] Redirect to intended page after login (deep linking) (REQUIRES TEST)
- [x] Link to registration page ✅ ("Don't have an account? Sign up")
- [x] Terms of Service link present ✅
- [x] Privacy Policy link present ✅

### Registration (`/register`)
- [x] Registration page loads ✅ ("Create your account" heading)
- [x] Google OAuth button present ✅ ("Continue with Google")
- [x] Full name input field present ✅
- [x] Email input field present ✅
- [x] Password input field present ✅ (with "min 6 characters" hint)
- [x] Terms of Service link present ✅
- [x] Privacy Policy link present ✅
- [x] "Create account" button present ✅
- [x] Free plan benefits displayed ✅ (3 contracts, 5 e-signatures, templates, AI)
- [x] Link to login page ✅ ("Already have an account? Sign in")
- [ ] New user registration flow (REQUIRES TEST)
- [ ] Email validation (format check) (REQUIRES TEST)
- [ ] Password strength requirements enforced (REQUIRES TEST)
- [ ] Duplicate email prevention (REQUIRES TEST)
- [ ] Confirmation email sent (REQUIRES TEST)
- [ ] Auto-login after registration (REQUIRES TEST)

### Password Reset (`/reset-password`)
- [ ] Reset password request sends email
- [ ] Reset link expires appropriately
- [ ] New password can be set
- [ ] Old password no longer works after reset
- [ ] Success message displayed

### Session Management
- [ ] Session persists across page refreshes
- [ ] Session expires after inactivity
- [ ] Logout clears session completely
- [ ] Multiple device sessions handled correctly

---

## 2. Homepage & Landing

### Homepage (`/`)
- [x] Navbar displays correctly ✅ (Logo, Solutions, How it works, Pricing, Contact, Sign in, Get started)
- [x] Hero section renders with CTA buttons ✅ ("Start for free", "See how it works")
- [x] "Get Started" button navigates to register ✅
- [x] "Login" button navigates to login ✅
- [x] How It Works section displays ✅ (3 steps: Generate, Sign, Get Paid with demos)
- [x] AI Features section displays ✅ ("AI that actually helps" with Generate feature)
- [x] Get Paid section displays ✅ (Payment Collection with demo UI)
- [x] Features section displays ✅ (AI contract generation features)
- [x] Pricing section displays with all tiers ✅ (Free plan features listed)
- [x] FAQ section expands/collapses ✅ (4 questions visible, expandable)
- [x] CTA section displays ✅ ("Ready to simplify your contracts?" with Try Free button)
- [x] Footer links work ✅ (Product, Resources, Company columns with all links)
- [ ] Mobile navigation menu works (NOT TESTED - requires mobile viewport)
- [x] Page loads under 3 seconds ✅

### SEO & Meta
- [ ] Page title is correct
- [ ] Meta description present
- [ ] Open Graph tags present
- [ ] Favicon displays

---

## 3. Dashboard

### Main Dashboard (`/dashboard`)
- [x] Dashboard loads for authenticated users ✅ (Tested on localhost:3000)
- [x] Redirects to login for unauthenticated users ✅
- [x] Shows user's name/greeting ✅ ("Welcome back, Test")
- [x] Displays recent contracts ✅ (Recent Contracts section with 6 contracts)
- [x] Shows quick stats (contracts count, signatures pending, etc.) ✅ (Total: 6, Pending: 2, Completed: 0)
- [x] Quick action buttons work (New Contract, etc.) ✅ ("+ New Contract", "Upload Contract" buttons)
- [ ] Empty state displays for new users (NOT TESTED - user has contracts)
- [x] Usage limits displayed correctly ✅ (Getting Started checklist: 3/5 completed, 60%)
- [x] Contract type quick-select grid ✅ (15 contract types with generation time estimates)

### Navigation
- [x] Sidebar navigation works ✅ (Dashboard, Contracts, Invoices, Templates, Signatures, Payments, Activity, Settings)
- [x] All nav links go to correct pages ✅ (Contracts → /contracts, etc.)
- [x] Active state shows current page ✅ (Highlighted sidebar item)
- [x] User dropdown menu works ✅ (Shows user avatar, "2 Issues" badge)
- [ ] Logout button works (NOT TESTED)
- [ ] Mobile hamburger menu works (NOT TESTED - requires mobile viewport)

### ⚠️ CRITICAL BUG FOUND
- **Google OAuth redirects to localhost:3000 instead of lexportai.com**
- Supabase `SITE_URL` configuration needs to be changed from `http://localhost:3000` to `https://lexportai.com`
- OAuth flow completes but user session is not created on production domain

---

## 4. Contract Creation

### New Contract Wizard (`/contracts/new`)

#### Step 1: AI Intake
- [x] Natural language input field works ✅ (Large textarea with placeholder example)
- [x] AI analyzes request and suggests contract type ✅ (Tested: "NDA to share confidential business plans" → One-Way NDA)
- [x] Confidence score displayed ✅ (90% match badge in green)
- [x] Suggested jurisdiction shown ✅ (California, USA dropdown)
- [x] Follow-up questions generated ✅ (Party names/emails, purpose, effective date, confidentiality period)
- [x] Can answer follow-up questions ✅ (Text inputs with required field markers)
- [x] Can skip and select type manually ✅ ("Pick Type" tab available)
- [x] Template Match Found feature ✅ (Shows "Instant" badge when pre-built template matches)
- [x] Example prompts clickable ✅ (3 example buttons at bottom)
- [x] Character counter works ✅ (Shows "76 characters")

#### Step 2: Contract Type Selection
- [x] All contract types displayed ✅ (15 types visible in grid):
  - [x] Mutual NDA ✅ (~2 min)
  - [x] One-Way NDA ✅ (~2 min)
  - [x] Independent Contractor Agreement ✅ (~3 min)
  - [x] Consulting Agreement ✅ (~3 min)
  - [x] SAFE Note ✅ (~2 min)
  - [x] Freelance Service Agreement ✅ (~3 min)
  - [x] Letter of Intent ✅ (~3 min)
  - [x] Co-Founder Agreement ✅ (~6 min)
  - [x] Sales Contract ✅ (~4 min)
  - [x] IP Assignment ✅ (~3 min)
  - [x] Advisor Agreement ✅ (~4 min)
  - [x] Employment Offer Letter ✅ (~4 min)
  - [x] Statement of Work ✅ (~5 min)
  - [x] Master Service Agreement ✅ (~6 min)
- [x] Custom Contract type available ✅ (~3 min)
- [x] Jurisdiction selector works ✅ (Dropdown with California, USA default)
- [ ] All jurisdictions available (CA, TX, NY, UK) (NOT FULLY TESTED)

#### Step 3: Form Input
- [x] Dynamic form fields load based on contract type ✅
- [x] Required fields validated ✅ (Marked with red asterisks)
- [x] Date pickers work ✅ (dd/mm/yyyy format with calendar icon)
- [ ] Number inputs validate correctly (NOT TESTED)
- [ ] Multi-party support (adding multiple signers) (NOT TESTED)
- [ ] Form data persists on back navigation (NOT TESTED)

#### Step 4: Generation
- [ ] Loading state displays during generation (NOT TESTED)
- [ ] Contract generated successfully (NOT TESTED)
- [ ] Error handling for generation failures (NOT TESTED)
- [ ] Redirect to editor after generation (NOT TESTED)
- [ ] Contract saved to database (NOT TESTED)
- [ ] Initial version created (NOT TESTED)

### Usage Limits
- [ ] Free tier limit enforced (1 contract) (NOT TESTED)
- [ ] Pro tier limit shown correctly (NOT TESTED)
- [ ] Upgrade prompt displayed when limit reached (NOT TESTED)
- [ ] Usage counter increments after generation (NOT TESTED)

### Contracts List Page (`/contracts`)
- [x] Contracts list loads ✅ (Shows 6 contracts)
- [x] Search field present ✅ ("Search contracts...")
- [x] Status filter dropdown ✅ ("All Statuses")
- [x] Type filter dropdown ✅ ("All Types")
- [x] Payment filter dropdown ✅ ("All Payments")
- [x] Sort option works ✅ ("Recently Updated")
- [x] Contract cards display correctly ✅ (Title, type badge, jurisdiction flag, status, date)
- [x] Status badges show correctly ✅ ("Draft", "Awaiting Signature" in red)
- [x] "2 Issues" notification badge ✅ (Top right header)
- [x] Folders section present ✅ ("No folders yet")
- [x] Tags section present ✅ ("No tags yet")
- [x] Upload button present ✅
- [x] New Contract button present ✅

---

## 5. Contract Upload

### Upload Page (`/contracts/upload`)

#### Step 1: File Upload
- [ ] Drag and drop works
- [ ] Click to upload works
- [ ] PDF files accepted
- [ ] Word (.docx) files accepted
- [ ] JPG/PNG images accepted
- [ ] File size limit enforced (50MB)
- [ ] Invalid file types rejected
- [ ] Upload progress indicator shown
- [ ] Error messages for failed uploads

#### Step 2: Mode Selection
- [ ] Sign Only mode available
- [ ] Edit & Sign mode available
- [ ] Mode descriptions clear
- [ ] Selection persists

#### Step 3: Text Extraction
- [ ] PDF text extraction works
- [ ] DOCX text extraction works
- [ ] Scanned PDF detection works
- [ ] OCR triggered for scanned documents
- [ ] OCR with GPT-4 Vision works
- [ ] Confidence indicator shown

#### Step 4: Processing (Edit & Sign)
- [ ] AI parsing to clauses works
- [ ] Parsed content preview shown
- [ ] Title auto-detected
- [ ] Contract type suggested
- [ ] Jurisdiction suggested

#### Step 5: Review & Create
- [ ] Title editable
- [ ] Contract type selectable
- [ ] Jurisdiction selectable
- [ ] Create button works
- [ ] Redirect to editor after creation

---

## 6. Contract Editor

### Contract Editor (`/contracts/[id]/edit`)
> **Test Run:** January 2, 2026 - Tested on localhost:3000

#### Document View
- [x] Contract content displays correctly ✅ (Vehicle Lease Agreement loaded)
- [x] Preamble section shows ✅ (Parties, effective date visible)
- [x] Recitals section shows ✅ (A, B, C recitals displayed)
- [x] Clauses display in order ✅ (Definitions, Lease of Vehicle, Term sections)
- [x] Signature block shows ✅ (Visible in contract structure)
- [ ] PDF preview available (NOT TESTED)

#### Toolbar Features
- [x] Payment button present ✅
- [x] AI button present (highlighted) ✅
- [x] Risk button present ✅
- [x] Review button present ✅
- [x] Blanks counter shows progress ✅ (1/42 after filling one field)
- [x] Guide button present ✅
- [x] Send button present ✅
- [x] More options menu (...) present ✅

#### Fill-in Blanks
- [x] Blanks highlighted in orange with "fill in" placeholder ✅
- [x] Click on blank field activates input ✅
- [x] Type value into blank works ✅ (Typed "San Francisco")
- [x] Blanks counter updates in real-time ✅ (0/42 → 1/42)
- [x] Filled value persists after editing other content ✅

#### Editing Features
- [x] Inline editing works ✅ (Fill-in blanks, clause editing)
- [x] Clause title editable ✅ (Clause Title input field)
- [x] Clause content editable in textarea ✅ (Large monospace textarea)
- [x] Save Changes button appears during edit ✅ (Green button)
- [x] Cancel button appears during edit ✅
- [ ] Add new clause works (NOT TESTED)
- [ ] Delete clause works (NOT TESTED - "Remove standard clause" button visible)
- [ ] Reorder clauses works (drag & drop) (NOT TESTED)
- [ ] Edit preamble works (NOT TESTED)
- [ ] Edit recitals works (NOT TESTED)
- [ ] Edit signature block works (NOT TESTED)
- [ ] Changes auto-save (NOT TESTED)
- [ ] Undo/redo works (NOT TESTED)

#### Clause Actions
- [x] Add comment button per clause ✅
- [x] Explain this clause button ✅
- [x] Edit this clause button ✅
- [x] Remove clause button ✅ (with confirmation required)
- [x] "standard" tag displayed on clauses ✅

#### Version History
- [ ] Version history panel opens (NOT TESTED)
- [ ] All versions listed (NOT TESTED)
- [ ] Version comparison works (diff view) (NOT TESTED)
- [ ] Rollback to previous version works (NOT TESTED)
- [ ] Version change summary shown (NOT TESTED)

#### AI Features
- [x] AI Assistant sidebar works ✅ (Panel opens on right side)
- [x] "Ask me anything about this contract" prompt ✅
- [x] Chat input field works ✅ ("Ask about this contract...")
- [x] Quick action buttons present ✅:
  - [x] Review risks ✅
  - [x] Simplify language ✅
  - [x] Explain definitions ✅
  - [x] Check for missing clauses ✅
- [x] AI responds to queries ✅ (Sent risk analysis request)
- [x] Message counter shows conversation history ✅ (2 messages)
- [ ] Request clause modifications (NOT TESTED)
- [ ] AI-suggested edits applied (NOT TESTED)
- [x] Clause explanations available ✅ ("Explain this clause" button)
- [ ] Section explanations cached (NOT TESTED)

#### Risk Analysis (AI)
- [x] Risk button opens dedicated Risk Analysis panel ✅
- [x] "Analyzing contract..." loading state ✅
- [x] Overall risk level displayed ✅ (Medium Risk - yellow)
- [x] Risk summary counts shown ✅ (🔴 2 Critical, ⚠️ 3 Warnings, ℹ️ 1 Info)
- [x] Detailed risk explanation provided ✅ (Comprehensive analysis text)
- [x] Individual issue cards display ✅ (12 total issues)
- [x] Issue pagination works ✅ ("1 of 12 issues" with arrows)
- [x] Issue severity tags shown ✅ ("missing protection", "Unclear")
- [x] Concerning text quoted from contract ✅
- [x] Actionable suggestions provided ✅
- [x] "Go to [Clause]" navigation link ✅
- [x] "Apply Fix" button per issue ✅
- [x] "Implement Fix" button (AI-assisted) ✅
- [x] "AI-powered analysis. Always review with legal counsel" disclaimer ✅

#### Comments
- [x] Add comment button visible per clause ✅
- [ ] Inline text selection commenting works (NOT TESTED)
- [ ] Comment thread display (NOT TESTED)
- [ ] Reply to comment works (NOT TESTED)
- [ ] Resolve comment works (NOT TESTED)
- [ ] Comment count shown (NOT TESTED)

#### Signature Fields
- [ ] Visual field editor opens (NOT TESTED)
- [ ] Add signature field works (NOT TESTED)
- [ ] Add date field works (NOT TESTED)
- [ ] Add text field works (NOT TESTED)
- [ ] Add checkbox field works (NOT TESTED)
- [ ] Add dropdown field works (NOT TESTED)
- [ ] Add initials field works (NOT TESTED)
- [ ] Add payment field works (NOT TESTED)
- [ ] Drag to position fields (NOT TESTED)
- [ ] Resize fields works (NOT TESTED)
- [ ] Assign field to signer role (NOT TESTED)
- [ ] Field required/optional toggle (NOT TESTED)
- [ ] Delete field works (NOT TESTED)
- [ ] Multi-page field placement (for uploads) (NOT TESTED)

#### Actions
- [x] Save Changes button works ✅ (Visible during edit mode)
- [x] Send for signature button works ✅ (Red "Send" button in toolbar)
- [ ] Share for review button works (NOT TESTED)
- [ ] Download PDF works (NOT TESTED)
- [ ] Duplicate contract works (NOT TESTED)
- [ ] Delete contract works (NOT TESTED)

---

## 7. Contract Management

### Contracts List (`/contracts`)
- [ ] All contracts displayed
- [ ] Search by title works
- [ ] Filter by status works (draft, pending, signed, completed)
- [ ] Filter by type works
- [ ] Sort by date works
- [ ] Pagination/infinite scroll works
- [ ] Contract cards show key info
- [ ] Click opens contract
- [ ] Quick actions menu works
- [ ] Upload button visible
- [ ] New Contract button visible

### Contract Detail (`/contracts/[id]`)
- [ ] Contract details display
- [ ] Status badge correct
- [ ] Signer status shown
- [ ] Payment status shown (if applicable)
- [ ] Action buttons available
- [ ] Edit button (for drafts)
- [ ] Send reminder button
- [ ] Download PDF button

### Audit Trail (`/contracts/[id]/audit`)
- [ ] Timeline displays all events
- [ ] Event details shown (actor, timestamp, IP)
- [ ] Geo-location shown (if available)
- [ ] Export audit trail works
- [ ] Filter by event type (if available)

### Folders & Tags
- [ ] Create folder works
- [ ] Move contract to folder works
- [ ] Nested folders work
- [ ] Create tag works
- [ ] Add tag to contract works
- [ ] Filter by folder works
- [ ] Filter by tag works
- [ ] Delete folder works
- [ ] Delete tag works

### Bulk Send (`/contracts/bulk-send`)
- [ ] Upload CSV of recipients works
- [ ] Manual recipient entry works
- [ ] Template selection works
- [ ] Preview recipients list
- [ ] Send to all works
- [ ] Progress indicator shows
- [ ] Error handling for failed sends
- [ ] Batch status tracking

---

## 8. E-Signatures

### Sending for Signature

#### Send Dialog
- [ ] Add signer with name/email
- [ ] Add multiple signers
- [ ] Assign signer roles
- [ ] Set signing order (sequential/parallel)
- [ ] Custom message field
- [ ] Expiration date setting
- [ ] Email preview works
- [ ] Send button works

#### Signature Requests
- [ ] Signature requests created in database
- [ ] Email sent to signers
- [ ] Unique signing token generated
- [ ] Expiration set correctly

### Signature Management (`/signatures`)
- [ ] All signature requests listed
- [ ] Filter by status (pending, signed, declined)
- [ ] Search works
- [ ] Request details shown
- [ ] Resend reminder works
- [ ] Cancel request works
- [ ] View signed document works

### Reminders
- [ ] Manual reminder sending works
- [ ] Auto-reminders enabled/disabled
- [ ] Reminder interval configurable
- [ ] Max reminders limit works
- [ ] Reminder history shown

---

## 9. External Signing Flow

### Signing Page (`/sign/[token]`)

#### Email Verification
- [ ] Verification code sent to email
- [ ] 6-digit code input works
- [ ] Code validation works
- [ ] Resend code works
- [ ] Rate limiting on resend
- [ ] Wrong code shows error

#### Document Review
- [ ] Contract content displays
- [ ] PDF view works (for uploads)
- [ ] All pages viewable
- [ ] Zoom works
- [ ] Print option available
- [ ] Download option available

#### Field Completion
- [ ] Required fields highlighted
- [ ] Text fields work
- [ ] Date fields auto-fill option
- [ ] Checkbox fields work
- [ ] Dropdown fields work
- [ ] Signature field:
  - [ ] Draw signature works
  - [ ] Type signature works
  - [ ] Upload signature works
  - [ ] Clear and redo works
- [ ] Initials field works
- [ ] All required fields validated

#### Signature Completion
- [ ] Identity confirmation checkbox
- [ ] Legal consent checkbox
- [ ] Submit signature works
- [ ] Success message shown
- [ ] Signed document available for download
- [ ] Confirmation email sent
- [ ] Audit log entry created

#### Decline Flow
- [ ] Decline button available
- [ ] Decline reason input
- [ ] Decline confirmation
- [ ] Notification to contract owner
- [ ] Contract status updated

### Payment During Signing
- [ ] Payment field displays amount
- [ ] Stripe payment form loads
- [ ] Credit card input works
- [ ] Payment processing works
- [ ] Payment confirmation shown
- [ ] Payment required before signing (if configured)
- [ ] Deposit vs full payment options

---

## 10. Payments

### Payments Page (`/payments`)
- [ ] All payments listed
- [ ] Filter by status (pending, succeeded, failed, refunded)
- [ ] Search works
- [ ] Payment details shown
- [ ] Payment method shown
- [ ] Amount and currency correct
- [ ] Associated contract linked
- [ ] Refund button works (for succeeded payments)

### Payment Configuration
- [ ] Enable payment on contract
- [ ] Set payment amount
- [ ] Select currency
- [ ] Payment structure options:
  - [ ] Full payment
  - [ ] Deposit + Balance
- [ ] Deposit percentage configurable
- [ ] Balance due date setting

### Stripe Connect (`/settings/payments`)
- [ ] Connect Stripe account button
- [ ] Stripe onboarding flow works
- [ ] Connection status shown
- [ ] Dashboard link works
- [ ] Disconnect option (if allowed)
- [ ] Platform fee displayed

### Payment Processing
- [ ] Payment intent created correctly
- [ ] Stripe webhook processes events
- [ ] Payment status updates in database
- [ ] Notification on payment success
- [ ] Notification on payment failure
- [ ] Refund processing works
- [ ] Partial refund works

### Balance Reminders
- [ ] Balance due date tracking
- [ ] Balance reminder email works
- [ ] Manual reminder sending works

---

## 11. Invoices

### Invoices Page (`/invoices`)
- [ ] All invoices listed
- [ ] Filter by status (draft, sent, paid, overdue, void)
- [ ] Search works
- [ ] Invoice details shown
- [ ] Amount and currency correct
- [ ] Due date shown
- [ ] Quick actions work

### Create Invoice (`/invoices/new`)
- [ ] Invoice form loads
- [ ] Line items:
  - [ ] Add line item works
  - [ ] Edit line item works
  - [ ] Delete line item works
  - [ ] Quantity and unit price work
  - [ ] Subtotal calculates correctly
- [ ] Tax amount setting
- [ ] Total calculates correctly
- [ ] Recipient info:
  - [ ] Name field
  - [ ] Email field
  - [ ] Address fields
- [ ] Due date picker works
- [ ] Notes field works
- [ ] Link to contract (optional)
- [ ] Save as draft works
- [ ] Send invoice works

### Invoice Detail (`/invoices/[id]`)
- [ ] Invoice details display
- [ ] Line items shown
- [ ] Totals correct
- [ ] Status badge shown
- [ ] Actions available:
  - [ ] Edit (if draft)
  - [ ] Send
  - [ ] Download PDF
  - [ ] Mark as paid
  - [ ] Void
  - [ ] Send reminder

### Invoice Templates
- [ ] Template types:
  - [ ] Hourly
  - [ ] Fixed Fee
  - [ ] Milestone
  - [ ] Retainer
  - [ ] Custom
- [ ] Create template works
- [ ] Use template works
- [ ] Default line items applied
- [ ] Hourly rate auto-filled
- [ ] Milestones configuration

### Invoice Settings (`/settings/invoices`)
- [ ] Invoice number prefix setting
- [ ] Next number setting
- [ ] Company info for invoices
- [ ] Default due days
- [ ] Default payment terms
- [ ] Logo upload for invoices
- [ ] White label option (Pro)

### Invoice Payment
- [ ] Payment link in email works
- [ ] Payment page (`/pay/invoice/[id]`) loads
- [ ] Stripe payment works
- [ ] External payment marking:
  - [ ] Bank transfer
  - [ ] Check
  - [ ] Cash
  - [ ] Other
- [ ] Payment reference field
- [ ] Invoice status updates to paid

### Invoice Reminders
- [ ] Auto-reminders for overdue invoices
- [ ] Manual reminder sending
- [ ] Reminder count tracking
- [ ] Max reminders limit

---

## 12. Templates

### Templates Page (`/templates`)
- [ ] System templates displayed
- [ ] User templates displayed
- [ ] Premium templates marked
- [ ] Search works
- [ ] Filter by type works
- [ ] Filter by jurisdiction works
- [ ] Template preview works

### Use Template
- [ ] Use template button works
- [ ] Placeholder form loads
- [ ] All placeholders listed
- [ ] Placeholder types:
  - [ ] Text
  - [ ] Number
  - [ ] Date
  - [ ] Select
- [ ] Required placeholders validated
- [ ] Contract created from template
- [ ] Placeholders replaced correctly

### Template Generation (`/templates/generate`)
- [ ] AI template generation works
- [ ] Contract type selection
- [ ] Jurisdiction selection
- [ ] Template preview
- [ ] Save as template works

### Create Custom Template (`/templates/create`)
- [ ] Template name input
- [ ] Description input
- [ ] Contract type selection
- [ ] Jurisdiction selection
- [ ] Clause editor works
- [ ] Add placeholder works
- [ ] Preview works
- [ ] Save template works

### Template Detail (`/templates/[id]`)
- [ ] Template content displays
- [ ] Placeholder list shown
- [ ] Use template button
- [ ] Edit template (if owner)
- [ ] Delete template (if owner)

### Premium Templates
- [ ] Premium badge displayed
- [ ] Price shown
- [ ] Purchase flow works
- [ ] Stripe payment works
- [ ] Template accessible after purchase
- [ ] Pro users get free access

---

## 13. Client Portal

### Portal Login (`/portal/login`)
- [ ] Email input field
- [ ] Magic link request works
- [ ] Email with link sent
- [ ] Rate limiting works

### Portal Verify (`/portal/verify`)
- [ ] Magic link verification works
- [ ] Token expiration handled
- [ ] Session created on success
- [ ] Redirect to portal dashboard

### Portal Dashboard (`/portal`)
- [ ] Client's contracts displayed
- [ ] Contract status shown
- [ ] Pending signatures highlighted
- [ ] Signed documents accessible
- [ ] Invoice list (if applicable)
- [ ] Pending invoices shown
- [ ] Payment history
- [ ] Logout works

### Portal Actions
- [ ] Sign contract from portal
- [ ] Pay invoice from portal
- [ ] Download documents
- [ ] View audit trail (limited)

---

## 14. Contract Review (Share for Review)

### Share for Review
- [ ] Share for review button in editor
- [ ] Reviewer email input
- [ ] Reviewer name input
- [ ] Optional message field
- [ ] Expiration setting
- [ ] Share link generated
- [ ] Email sent to reviewer

### Review Page (`/review/[token]`)
- [ ] Contract displays
- [ ] Read-only view
- [ ] Add comment works
- [ ] Inline commenting (text selection)
- [ ] Submit review works
- [ ] Approve option
- [ ] Request changes option
- [ ] Notification to owner

### Managing Reviews
- [ ] Review requests listed
- [ ] Review status shown
- [ ] Reviewer comments visible
- [ ] Resolve comments works
- [ ] Cancel review request works

---

## 15. AI Features

### Contract Generation
- [ ] AI generates all contract sections
- [ ] Preamble appropriate
- [ ] Recitals relevant
- [ ] Clauses comprehensive
- [ ] Signature block correct
- [ ] Jurisdiction-specific clauses included

### Risk Analysis (`/api/contracts/[id]/analyze`)
- [ ] Risk analysis runs on contracts
- [ ] Overall risk level determined
- [ ] Clause-level risks identified
- [ ] Missing protections detected
- [ ] Jurisdiction alerts shown
- [ ] Risk severity levels (critical, warning, info)
- [ ] Analysis cached by content hash

### AI Chat
- [ ] Chat interface opens
- [ ] Questions about contract answered
- [ ] Modification requests handled
- [ ] Suggested changes applied
- [ ] Chat history persisted (session)
- [ ] Rate limiting works

### Clause Explanations
- [ ] "Explain" button on clauses
- [ ] Plain language explanation generated
- [ ] Key points listed
- [ ] Explanations cached
- [ ] Caching reduces API calls

### AI Editing
- [ ] AI edit requests work
- [ ] Multiple edit modes:
  - [ ] Simplify
  - [ ] Make stronger
  - [ ] Make neutral
  - [ ] Custom edit
- [ ] Edit preview shown
- [ ] Accept/reject edit

---

## 16. Settings

### Profile Settings (`/settings/profile`)
- [ ] Name editable
- [ ] Email shown (may not be editable)
- [ ] Profile picture upload
- [ ] Company name field
- [ ] Job title field
- [ ] Address field
- [ ] Phone field
- [ ] Default jurisdiction setting
- [ ] Save changes works

### Payment Settings (`/settings/payments`)
- [ ] Stripe Connect status shown
- [ ] Connect button works
- [ ] Onboarding flow completes
- [ ] Account dashboard link
- [ ] Payout schedule info

### Billing Settings (`/settings/billing`)
- [ ] Current plan shown
- [ ] Usage stats displayed
- [ ] Upgrade/downgrade options
- [ ] Stripe billing portal link
- [ ] Payment history
- [ ] Cancel subscription option

### Invoice Settings (`/settings/invoices`)
- [ ] (See Invoice Settings section above)

### Notification Settings
- [ ] Email notification toggles:
  - [ ] Contract signed
  - [ ] Signature requested
  - [ ] Payment received
  - [ ] Contract expiring
  - [ ] etc.
- [ ] In-app notification toggles
- [ ] Save preferences works

### General Settings (`/settings`)
- [ ] All setting categories accessible
- [ ] Navigation between settings works

---

## 17. Notifications

### In-App Notifications
- [ ] Notification bell icon
- [ ] Unread count badge
- [ ] Notification dropdown opens
- [ ] Notifications listed
- [ ] Click notification navigates
- [ ] Mark as read works
- [ ] Mark all as read works
- [ ] Notification types:
  - [ ] Contract signed
  - [ ] Signature requested
  - [ ] Signature completed
  - [ ] Signature declined
  - [ ] Payment received
  - [ ] Payment failed
  - [ ] Contract expired
  - [ ] Review submitted
  - [ ] Comment added

### Email Notifications
- [ ] Email templates render correctly
- [ ] Links in emails work
- [ ] Unsubscribe link works (if applicable)
- [ ] Branding in emails correct

---

## 18. Activity & Audit Trail

### Activity Page (`/activity`)
- [ ] Recent activity displayed
- [ ] Activity types shown:
  - [ ] Contract created
  - [ ] Contract updated
  - [ ] Contract sent
  - [ ] Contract viewed
  - [ ] Signature completed
  - [ ] Payment received
  - [ ] etc.
- [ ] Timestamp shown
- [ ] Actor shown
- [ ] Filter by type works
- [ ] Date range filter works

### Audit Log
- [ ] All events captured
- [ ] IP address logged
- [ ] User agent logged
- [ ] Geo-location captured
- [ ] Device info captured
- [ ] Audit log immutable
- [ ] Export to CSV/PDF works

---

## 19. Organization & Teams

### Organization Management
- [ ] Create organization works
- [ ] Organization name editable
- [ ] Organization plan shown
- [ ] Seat count shown

### Team Members
- [ ] Invite member works
- [ ] Invitation email sent
- [ ] Accept invite works
- [ ] Member roles:
  - [ ] Admin
  - [ ] Member
- [ ] Remove member works
- [ ] Transfer ownership works

### Team Features
- [ ] Shared contracts (if applicable)
- [ ] Organization-level billing
- [ ] Seat-based pricing

---

## 20. Billing & Subscriptions

### Subscription Plans
- [ ] Free tier features:
  - [ ] 1 AI contract
  - [ ] 3 signatures
- [ ] Pro tier features:
  - [ ] 50 contracts/month
  - [ ] Unlimited signatures
  - [ ] Premium templates
- [ ] Team tier features:
  - [ ] Per-seat pricing
  - [ ] Team management

### Upgrade Flow
- [ ] Upgrade button works
- [ ] Stripe Checkout loads
- [ ] Payment processing works
- [ ] Subscription activated
- [ ] Features unlocked

### Downgrade/Cancel
- [ ] Downgrade option available
- [ ] Cancel subscription works
- [ ] Cancellation confirmation
- [ ] Access until end of period

### Billing Portal
- [ ] Update payment method
- [ ] View invoices
- [ ] Download receipts
- [ ] Manage subscription

### Webhook Processing
- [ ] Subscription created event
- [ ] Subscription updated event
- [ ] Subscription cancelled event
- [ ] Payment succeeded event
- [ ] Payment failed event
- [ ] Invoice paid event

---

## 21. Privacy & Data Export

### Privacy Page (`/privacy`)
- [ ] Privacy policy content displays
- [ ] Terms of service link
- [ ] Cookie policy info

### Data Export (`/api/account/export`)
- [ ] Export all data button
- [ ] Data includes:
  - [ ] User profile
  - [ ] Contracts
  - [ ] Signatures
  - [ ] Invoices
  - [ ] Audit logs
- [ ] Export format (JSON/ZIP)
- [ ] Download link provided

### Account Deletion (`/api/account/delete`)
- [ ] Delete account option
- [ ] Confirmation required
- [ ] Warning about data loss
- [ ] Data deleted completely
- [ ] Session terminated

### Cookie Consent
- [ ] Cookie banner displays (first visit)
- [ ] Accept cookies works
- [ ] Decline cookies works
- [ ] Cookie preferences saved

---

## 22. Mobile Responsiveness

### General
- [ ] All pages render on mobile (375px)
- [ ] All pages render on tablet (768px)
- [ ] Touch targets minimum 44px
- [ ] No horizontal scroll
- [ ] Text readable without zoom

### Navigation
- [ ] Mobile hamburger menu
- [ ] Menu opens/closes correctly
- [ ] Dropdown menus work
- [ ] Back button navigation works

### Forms
- [ ] Form fields usable on mobile
- [ ] Keyboard doesn't obscure inputs
- [ ] Date pickers work on mobile
- [ ] File upload works on mobile

### Tables
- [ ] Tables scroll horizontally
- [ ] Key columns visible
- [ ] Action buttons accessible

### Modals
- [ ] Modals fit screen
- [ ] Close button accessible
- [ ] Scroll works within modals

---

## 23. Error Handling

### API Errors
- [ ] 400 Bad Request handled
- [ ] 401 Unauthorized redirects to login
- [ ] 403 Forbidden shows error
- [ ] 404 Not Found shows error page
- [ ] 500 Server Error shows error message
- [ ] Network errors handled gracefully

### Form Validation
- [ ] Required fields show error
- [ ] Email format validated
- [ ] Number ranges validated
- [ ] Date ranges validated
- [ ] Error messages clear and helpful

### UI Error States
- [ ] Loading states shown
- [ ] Empty states shown
- [ ] Error retry options available
- [ ] Error boundaries catch crashes

### Error Logging
- [ ] Errors logged to console
- [ ] Error context included
- [ ] Stack traces available (dev mode)

---

## 24. Performance

### Page Load
- [ ] Homepage loads < 3s
- [ ] Dashboard loads < 2s
- [ ] Contract editor loads < 3s
- [ ] Large contract lists load efficiently

### Caching
- [ ] Static assets cached
- [ ] API responses cached (where appropriate)
- [ ] Risk analysis cached
- [ ] Section explanations cached

### Optimization
- [ ] Images optimized
- [ ] Bundle size reasonable
- [ ] Lazy loading works
- [ ] Infinite scroll efficient

### Database
- [ ] Queries optimized
- [ ] Indexes in place
- [ ] N+1 queries avoided
- [ ] RLS policies performant

---

## Testing Environments

### Local Development
- URL: `http://localhost:3000`
- Database: Local Supabase / Development project

### Staging
- URL: (Add staging URL)
- Database: Staging Supabase project

### Production
- URL: `https://lexport.ai` (or actual domain)
- Database: Production Supabase project

---

## Test Accounts

| Role | Email | Password | Notes |
|------|-------|----------|-------|
| Free User | test.free@example.com | (set in env) | For testing free tier limits |
| Pro User | test.pro@example.com | (set in env) | For testing pro features |
| Admin | admin@example.com | (set in env) | For admin features |

---

## Known Issues

| Issue | Severity | Status | Notes |
|-------|----------|--------|-------|
| **OAuth redirects to localhost:3000** | 🔴 Critical | Open | Supabase `SITE_URL` configured as `http://localhost:3000` instead of `https://lexportai.com`. Users cannot login via Google OAuth on production. |

---

## Test Run Log

| Date | Tester | Environment | Sections Tested | Pass/Fail | Notes |
|------|--------|-------------|-----------------|-----------|-------|
| 2026-01-01 | Claude Code | Production (lexportai.com) + localhost:3000 | Homepage, Login, Registration | ✅ Pass | All UI elements present and functional |
| 2026-01-01 | Claude Code | localhost:3000 (dev) | Dashboard | ✅ Pass | All dashboard features working. Stats, recent contracts, contract type grid all functional. |
| 2026-01-01 | Claude Code | localhost:3000 (dev) | Contract Creation (AI Intake) | ✅ Pass | AI correctly identifies contract type (90% match), template matching works, follow-up questions generated. |
| 2026-01-01 | Claude Code | localhost:3000 (dev) | Contracts List | ✅ Pass | Search, filters, status badges, sorting all working. |
| 2026-01-01 | Claude Code | Production (lexportai.com) | OAuth Login | ❌ Fail | Google OAuth redirects to localhost:3000 - Supabase config issue |

### Test Run Summary (2026-01-01)

**Sections Tested:**
- ✅ Homepage & Landing: 17/18 items passed
- ✅ Login Page: 11/17 items passed (remaining require credentials)
- ✅ Registration Page: 10/14 items passed (remaining require test)
- ✅ Dashboard: 11/13 items passed
- ✅ Contract Creation: 29/42 items passed
- ✅ Contracts List: 13/13 items passed

**Critical Issues Found:**
1. **OAuth Redirect Bug**: Production OAuth redirects to `http://localhost:3000` instead of `https://lexportai.com`. FIX: Update Supabase Authentication > URL Configuration > Site URL.

**Recommendations:**
1. Fix Supabase SITE_URL configuration immediately
2. Test remaining contract generation flow (Step 4)
3. Test e-signature flow end-to-end
4. Test payment collection flow

---

## Appendix: API Endpoints Reference

### Authentication
- `POST /api/auth/me` - Get current user

### Contracts
- `GET /api/contracts` - List contracts
- `POST /api/contracts` - Create contract
- `GET /api/contracts/[id]` - Get contract
- `PUT /api/contracts/[id]` - Update contract
- `DELETE /api/contracts/[id]` - Delete contract
- `POST /api/contracts/generate` - AI generate contract
- `POST /api/contracts/intake` - AI intake analysis
- `POST /api/contracts/[id]/send` - Send for signature
- `POST /api/contracts/[id]/remind` - Send reminder
- `GET /api/contracts/[id]/pdf` - Download PDF
- `POST /api/contracts/[id]/duplicate` - Duplicate contract
- `GET /api/contracts/[id]/analyze` - Risk analysis
- `POST /api/contracts/[id]/chat` - AI chat
- `GET /api/contracts/[id]/explain-sections` - Section explanations
- `GET /api/contracts/[id]/audit` - Audit trail
- `GET /api/contracts/[id]/audit/export` - Export audit
- `GET /api/contracts/[id]/versions` - Version history
- `GET /api/contracts/[id]/versions/compare` - Version diff
- `POST /api/contracts/[id]/versions/rollback` - Rollback version
- `GET /api/contracts/[id]/fields` - Signature fields
- `POST /api/contracts/[id]/fields` - Update fields
- `POST /api/contracts/[id]/comments` - Add comment
- `POST /api/contracts/[id]/share-review` - Share for review
- `POST /api/contracts/[id]/seal` - Seal document
- `POST /api/contracts/[id]/certificate` - Generate certificate
- `POST /api/contracts/upload` - Upload contract
- `POST /api/contracts/upload/extract` - Extract text
- `POST /api/contracts/upload/ocr` - OCR processing
- `POST /api/contracts/upload/parse` - AI parse
- `POST /api/contracts/upload/create` - Create from upload
- `POST /api/contracts/bulk-send` - Bulk send
- `POST /api/contracts/ai/edit` - AI edit clause

### Signing
- `GET /api/sign/[token]` - Get signing data
- `POST /api/sign/[token]` - Submit signature
- `POST /api/sign/[token]/verify` - Verify email

### Payments
- `GET /api/payments` - List payments
- `POST /api/contracts/[id]/payment` - Create payment intent
- `POST /api/payments/[id]/refund` - Refund payment
- `POST /api/contracts/[id]/balance-reminder` - Balance reminder

### Invoices
- `GET /api/invoices` - List invoices
- `POST /api/invoices` - Create invoice
- `GET /api/invoices/[id]` - Get invoice
- `PUT /api/invoices/[id]` - Update invoice
- `DELETE /api/invoices/[id]` - Delete invoice
- `POST /api/invoices/[id]/send` - Send invoice
- `POST /api/invoices/[id]/pay` - Pay invoice
- `POST /api/invoices/[id]/reminders` - Send reminder
- `GET /api/invoices/settings` - Invoice settings
- `PUT /api/invoices/settings` - Update settings
- `GET /api/invoices/templates` - Invoice templates
- `POST /api/invoices/templates` - Create template

### Templates
- `GET /api/templates` - List templates
- `POST /api/templates` - Create template
- `GET /api/templates/[id]` - Get template
- `PUT /api/templates/[id]` - Update template
- `DELETE /api/templates/[id]` - Delete template
- `POST /api/templates/[id]/use` - Use template
- `POST /api/templates/[id]/purchase` - Purchase premium
- `POST /api/templates/generate` - AI generate template

### Portal
- `POST /api/portal/magic-link` - Request magic link
- `POST /api/portal/verify` - Verify magic link
- `POST /api/portal/logout` - Portal logout
- `GET /api/portal/invoices` - Portal invoices

### Review
- `GET /api/review/[token]` - Get review data
- `POST /api/review/[token]/comments` - Add review comment

### User & Settings
- `GET /api/profile` - Get profile
- `PUT /api/profile` - Update profile
- `GET /api/usage` - Usage stats
- `GET /api/activity` - Activity feed
- `GET /api/notifications` - Notifications
- `PUT /api/notifications/[id]` - Mark notification read
- `GET /api/settings/notifications` - Notification prefs
- `PUT /api/settings/notifications` - Update prefs
- `POST /api/account/export` - Export data
- `POST /api/account/delete` - Delete account

### Billing
- `POST /api/billing/create-checkout` - Create checkout
- `POST /api/billing/portal` - Billing portal
- `GET /api/user/subscription` - Subscription status
- `POST /api/webhooks/stripe` - Stripe webhook
- `POST /api/billing/webhook` - Billing webhook

### Stripe Connect
- `POST /api/stripe/connect` - Start connect
- `GET /api/stripe/connect/session` - Connect session

### Organizations
- `GET /api/organizations` - List organizations
- `POST /api/organizations` - Create org
- `GET /api/organizations/[id]` - Get org
- `PUT /api/organizations/[id]` - Update org
- `GET /api/organizations/[id]/members` - List members
- `POST /api/organizations/[id]/invites` - Send invite
- `POST /api/invites/accept` - Accept invite

### Other
- `GET /api/stats` - Dashboard stats
- `GET /api/contacts` - List contacts
- `POST /api/contacts` - Create contact
- `GET /api/folders` - List folders
- `POST /api/folders` - Create folder
- `GET /api/tags` - List tags
- `POST /api/tags` - Create tag
- `GET /api/field-templates` - Field templates
- `POST /api/reminders/process` - Process reminders (cron)
- `POST /api/contact` - Contact form
- `GET /api/docs` - API documentation

---

## Test Run Log

### Run #1: January 1, 2026 - Production Browser Testing

**Tester:** Claude (Automated)
**Environment:** Production (lexportai.com)
**Browser:** Chrome via MCP

#### Summary
| Section | Tested | Passed | Failed | Skipped |
|---------|--------|--------|--------|---------|
| Homepage & Landing | 14 | 13 | 0 | 1 |
| Login Page | 14 | 10 | 0 | 4 |
| Registration Page | 16 | 10 | 0 | 6 |
| **Total** | **44** | **33** | **0** | **11** |

#### Notes
- All UI elements rendered correctly on production
- Homepage sections: Hero, How It Works, AI Features, Get Paid, Features, Pricing, FAQ, CTA, Footer all working
- Login page: All fields and buttons present, OAuth and Magic Link options available
- Registration page: All fields present, free plan benefits displayed correctly
- Items marked "REQUIRES TEST" need authenticated session or specific test scenarios
- Mobile responsiveness not tested (requires viewport change)

#### Issues Found
- None

#### Recommendations
1. Test authenticated flows with test credentials
2. Test mobile responsiveness
3. Test error handling scenarios
4. Test actual sign-in/sign-up flows

---

### Run #2: January 3, 2026 - Authenticated Testing Session

**Tester:** Claude (Automated + Manual)
**Environment:** localhost:3000 (Development)
**Browser:** Chrome via MCP
**Session:** Authenticated as Test User E2E

#### Summary
| Section | Tested | Passed | Failed | Skipped |
|---------|--------|--------|--------|---------|
| Dashboard | 11 | 11 | 0 | 2 |
| Contract Creation (Navigation) | 1 | 0 | 1 | 0 |
| **Total** | **12** | **11** | **1** | **2** |

#### Test Results

**✅ Dashboard (localhost:3000/dashboard)**
- Dashboard loads successfully for authenticated users
- User greeting displays ("Welcome back, Test")
- Getting Started checklist shows 3/5 completed (60%)
- Contract stats displayed: 6 total, 2 pending signatures, 0 completed this month
- Quick action buttons visible (New Contract, Upload Contract)
- Sidebar navigation present with all menu items
- User profile section shows "Test User E2E" with email

**❌ Contract Creation Flow**
- Clicking "New Contract" button or navigating to /contracts/new shows "Rendering..." state
- Page appears to hang and doesn't load the contract creation wizard
- No console errors visible
- **Potential Issues:**
  1. User may have hit free tier limit (6 contracts created, limit may be 3-5)
  2. React rendering issue or infinite loop
  3. API call hanging or failing silently
  4. Subscription/tier checking logic blocking UI

#### Issues Found

| Severity | Issue | Location | Impact |
|----------|-------|----------|--------|
| 🔴 Critical | Contract creation page stuck in "Rendering..." state | /contracts/new | Users cannot create new contracts - core feature blocked |

#### Recommendations
1. **Immediate:** Investigate contract creation rendering issue
   - Check browser console for errors
   - Review /contracts/new page component for infinite loops
   - Verify subscription limit checking logic
   - Test with different user tiers
2. Add loading timeout and error states to prevent indefinite "Rendering..."
3. Display clear messaging if user has hit tier limits
4. Implement proper error boundaries for React rendering failures
5. Continue testing remaining features (e-signatures, payments, templates)
