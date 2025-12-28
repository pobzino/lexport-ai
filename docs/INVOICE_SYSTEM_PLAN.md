# Invoice System Plan

## Overview

Lexport's invoice system provides seamless payment tracking for legal contracts. Invoices are automatically generated when payments occur, creating a complete financial paper trail for both contract owners and clients.

---

## Goals

### Primary Goal
Enable freelancers and businesses to get paid for their contracts without needing a separate invoicing tool.

### Success Metrics
- 100% of payments have corresponding invoices
- Invoice PDFs are professional and downloadable
- Clients receive timely payment reminders
- Contract owners can track payment status at a glance

---

## Current State

### What's Built
- [x] Invoice database table with line items
- [x] Invoice PDF generation (pdf-lib)
- [x] Invoice panel in contract editor
- [x] Auto-invoice creation on payment success (Stripe webhook)
- [x] Payment-type aware invoices (deposit/balance/full)
- [x] Manual invoice creation option
- [x] Payment status display in contracts list

### Payment Structures Supported
- **Full Payment**: Single payment for entire contract amount
- **Deposit + Balance**: Split payment (default 30%/70%)

---

## Phase 1: Polish & Complete (Current)

**Timeline**: 1-2 weeks
**Goal**: Make the existing invoice flow production-ready

### 1.1 Invoice Email Delivery ✅
- [x] Send invoice PDF to client after payment (receipt)
- [x] Include payment confirmation details
- [x] Professional email template with branding

**Implementation Notes (Dec 2024):**
- Added `sendPaymentReceiptEmail()` in `/src/lib/email.ts`
- Integrated into Stripe webhook `createInvoiceForPayment()`
- Sends automatically when `payment_intent.succeeded` fires
- Includes PDF download link, payment type awareness, deposit note

### 1.2 Balance Payment Reminders ✅
- [x] Manual reminder emails for unpaid balance (first/second/final types)
- [x] Automated reminder schedule (cron job for 7 days, 3 days, 1 day before due)
- [x] Include payment link in reminder emails
- [x] Track reminder history in `payment_reminders` table
- [x] UI: Send Reminder button in InvoicePanel with type selector
- [x] Balance due date field in contract editor

**Implementation Notes (Dec 2024):**
- Added `sendBalanceReminderEmail()` in `/src/lib/email.ts` with urgency levels
- Created `/api/contracts/[id]/balance-reminder` endpoint (POST to send, GET for history)
- Added `payment_reminders` table with 24-hour rate limiting
- InvoicePanel shows "Balance Due" card with Send Reminder button when deposit paid
- Reminder types: first (blue), second (amber), final (red) with different urgency
- Created `/api/reminders/process` endpoint for automated cron processing
- Netlify scheduled function runs hourly to send automated reminders
- Reminder schedule: 7 days, 3 days, 1 day before due; on due date; 1, 3, 7 days overdue
- Added `balance_due_date` field to contracts table and UI in editor

### 1.3 Invoice PDF Improvements
- [ ] Add company logo/branding option
- [ ] Include payment method used
- [ ] Add "PAID" watermark for paid invoices
- [ ] QR code linking to payment (for unpaid)

### 1.4 Dashboard Enhancements
- [ ] Invoice summary on dashboard (total invoiced, paid, pending)
- [ ] Quick view of recent invoices
- [ ] Filter contracts by payment status

### 1.5 Client Portal Invoice View
- [ ] Clients can view their invoices in portal
- [ ] Download invoice PDFs
- [ ] See payment history

### 1.6 Invoice Numbering & Settings
- [ ] Customizable invoice number prefix (e.g., "INV-", "ACME-")
- [ ] Sequential numbering per user
- [ ] Default payment terms (Net 30, Due on receipt, etc.)

---

## Phase 2: Milestone Payments (Future)

**Timeline**: 4-6 weeks
**Goal**: Support complex payment schedules tied to project milestones
**Trigger**: User demand or Pro tier feature

### 2.1 Payment Schedule Builder
```
Contract: Website Redesign - $10,000

Payment Schedule:
├── Deposit (on signing)      $3,000  30%
├── Design Approval           $3,500  35%
└── Final Delivery            $3,500  35%
```

- [ ] UI to define multiple payment milestones
- [ ] Set amount or percentage per milestone
- [ ] Due type: on signing, on date, on milestone completion

### 2.2 Milestone Tracking
- [ ] List of milestones in contract editor
- [ ] Mark milestone as complete (triggers invoice)
- [ ] Milestone completion notifications to client
- [ ] Optional: require client approval of milestone

### 2.3 Stripe Payment Links
- [ ] Generate unique payment link per invoice
- [ ] Client pays via link (no login required)
- [ ] Webhook marks specific invoice as paid
- [ ] Works for reminder emails

### 2.4 Invoice-First Flow
```
Milestone Complete → Invoice Created (PENDING) →
Client Receives Email → Client Pays → Invoice (PAID)
```

- [ ] Create invoice before payment
- [ ] Track invoice status: draft, sent, viewed, paid, overdue
- [ ] Overdue notifications

### 2.5 Deliverables Attachment
- [ ] Attach files to milestones (design mockups, etc.)
- [ ] Client can view deliverables before paying
- [ ] Optional: gate deliverables behind payment

### 2.6 Recurring Invoices (Retainer Contracts)
- [ ] Monthly/weekly recurring payment schedules
- [ ] Auto-generate invoices on schedule
- [ ] Support for retainer-style contracts

---

## Database Schema

### Current Tables
```sql
-- Invoices (exists)
invoices (
  id, contract_id, payment_id, user_id,
  invoice_number, amount, currency, status,
  line_items, subtotal, tax_amount, total,
  due_date, paid_at, sent_at,
  recipient_name, recipient_email,
  sender_name, sender_email, notes
)

-- Payments (exists)
payments (
  id, contract_id, user_id,
  stripe_payment_intent_id, amount, currency,
  payment_type, status, ...
)
```

### Phase 2 Additions
```sql
-- Payment Milestones
payment_milestones (
  id UUID PRIMARY KEY,
  contract_id UUID REFERENCES contracts(id),
  name TEXT,                      -- "Design Approval"
  description TEXT,
  amount INTEGER,                 -- cents
  percentage DECIMAL,             -- alternative to amount
  sequence INTEGER,               -- order of milestones
  due_type TEXT,                  -- "on_signing", "on_date", "on_completion"
  due_date TIMESTAMP,
  status TEXT,                    -- "pending", "invoiced", "paid"
  completed_at TIMESTAMP,
  completed_by UUID,
  invoice_id UUID REFERENCES invoices(id),
  created_at TIMESTAMP
)

-- Invoice Settings (per user)
invoice_settings (
  user_id UUID PRIMARY KEY,
  number_prefix TEXT DEFAULT 'INV-',
  next_number INTEGER DEFAULT 1,
  default_due_days INTEGER DEFAULT 30,
  company_name TEXT,
  company_address TEXT,
  company_logo_url TEXT,
  default_notes TEXT
)

-- Payment Links
ALTER TABLE invoices ADD COLUMN
  stripe_payment_link_id TEXT,
  stripe_payment_link_url TEXT,
  milestone_id UUID REFERENCES payment_milestones(id);
```

---

## API Endpoints

### Current
- `GET /api/contracts/[id]/invoices` - List invoices
- `POST /api/contracts/[id]/invoices` - Create invoice
- `GET /api/invoices/[id]` - Get invoice details
- `GET /api/invoices/[id]?format=pdf` - Download PDF

### Phase 1 Additions
- `POST /api/invoices/[id]/send` - Send invoice email
- `POST /api/invoices/[id]/remind` - Send reminder
- `GET /api/invoices/settings` - Get invoice settings
- `PUT /api/invoices/settings` - Update settings

### Phase 2 Additions
- `GET /api/contracts/[id]/milestones` - List milestones
- `POST /api/contracts/[id]/milestones` - Create milestone
- `PUT /api/milestones/[id]` - Update milestone
- `POST /api/milestones/[id]/complete` - Mark complete
- `POST /api/invoices/[id]/payment-link` - Generate Stripe link

---

## Email Templates Needed

### Phase 1
1. **Payment Receipt** - Sent after successful payment
2. **Balance Reminder** - Reminder for unpaid balance
3. **Invoice Sent** - When manually sending invoice

### Phase 2
4. **Milestone Complete** - Notifying client of completion
5. **Milestone Invoice** - Invoice for completed milestone
6. **Payment Overdue** - Escalated reminder

---

## Technical Considerations

### Stripe Integration
- **Current**: Payment Intents for direct checkout
- **Phase 2**: Payment Links for invoice-based payments
- **Webhook events**: `payment_intent.succeeded`, `checkout.session.completed`

### Email Delivery
- Use existing email service (Resend/SendGrid)
- Queue emails for reliability
- Track email opens/clicks (optional)

### PDF Generation
- Current: pdf-lib (works well)
- Consider: Puppeteer for complex layouts (heavier)

---

## Out of Scope (For Now)

- Tax calculation (Sales tax, VAT)
- Multi-currency conversion
- Partial payments on single invoice
- Credit notes / refund invoices
- Accounting software integration (QuickBooks, Xero)
- Subscription billing

---

## Success Criteria

### Phase 1 Complete When:
- [x] Every payment auto-generates a professional invoice
- [x] Clients receive email receipts
- [x] Balance reminders are sent automatically
- [ ] Contract owners can customize invoice branding

### Phase 2 Complete When:
- [ ] Users can define multi-milestone payment schedules
- [ ] Marking milestone complete triggers invoice
- [ ] Clients can pay via invoice links
- [ ] Full payment lifecycle is tracked

---

## Next Steps

1. **Immediate**: Test current auto-invoice flow end-to-end
2. **This week**: Implement invoice email delivery (Phase 1.1)
3. **Next week**: Balance payment reminders (Phase 1.2)
4. **Ongoing**: Gather user feedback on milestone needs
