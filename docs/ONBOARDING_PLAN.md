# User Onboarding Plan

A comprehensive onboarding strategy to activate new users and drive them to their first successful contract.

---

## Goals

| Metric | Target | Timeframe |
|--------|--------|-----------|
| Time to first contract | < 5 minutes | First session |
| Activation rate | 60%+ | First 24 hours |
| First signature sent | 40%+ | First week |
| 7-day retention | 50%+ | Week 1 |

---

## User Personas

### 1. Startup Founder (Primary)
- **Needs**: NDAs, contractor agreements, SAFE notes
- **Pain**: Legal feels expensive and slow
- **Motivation**: Move fast, protect IP, look professional
- **Onboarding focus**: Speed, templates, payment collection

### 2. Freelancer/Consultant
- **Needs**: Service agreements, NDAs, invoices
- **Pain**: Clients don't take them seriously without contracts
- **Motivation**: Get paid, protect scope, look professional
- **Onboarding focus**: Templates, e-signatures, invoicing

### 3. Small Agency Owner
- **Needs**: MSAs, SOWs, contractor agreements
- **Pain**: Managing multiple contracts manually
- **Motivation**: Standardize, scale, reduce admin
- **Onboarding focus**: Templates, bulk features, team (future)

---

## Onboarding Flow

### Phase 1: Welcome (First 30 seconds)

```
┌─────────────────────────────────────────────────────────────┐
│                    Welcome to Lexport!                       │
│                                                              │
│  Let's get you set up in under a minute.                    │
│                                                              │
│  What best describes you?                                    │
│                                                              │
│  ┌──────────────┐  ┌──────────────┐  ┌──────────────┐       │
│  │   Startup    │  │  Freelancer  │  │    Agency    │       │
│  │   Founder    │  │  Consultant  │  │    Owner     │       │
│  └──────────────┘  └──────────────┘  └──────────────┘       │
│                                                              │
│  This helps us recommend the right contracts for you.       │
└─────────────────────────────────────────────────────────────┘
```

**Purpose**: Personalize the experience, set expectations.

**Data captured**:
- `user_type`: startup_founder | freelancer | agency
- `onboarding_started_at`: timestamp

---

### Phase 2: Quick Win - First Contract (2-3 minutes)

After role selection, immediately show the smart intake:

```
┌─────────────────────────────────────────────────────────────┐
│              Let's create your first contract               │
│                                                              │
│  Describe what you need in plain English:                   │
│                                                              │
│  ┌───────────────────────────────────────────────────────┐  │
│  │ I need to hire a developer to build...                │  │
│  └───────────────────────────────────────────────────────┘  │
│                                                              │
│  Popular for [Startup Founders]:                            │
│  • "NDA to share my business plan with investors"          │
│  • "Hire a contractor for a 3-month project"               │
│  • "SAFE note for angel investment"                         │
│                                                              │
│                              [Create My Contract →]          │
└─────────────────────────────────────────────────────────────┘
```

**Key elements**:
- Role-specific example prompts
- No friction - just describe and go
- Progress indicator showing they're close to done

---

### Phase 3: Guided Generation (1-2 minutes)

Walk through the generation with contextual tips:

```
Step 1: Smart intake analyzes their description
        → Tooltip: "Our AI understands plain English and picks the right contract type"

Step 2: Show recommended contract + extracted details
        → Tooltip: "We found these details in your description. Edit anything that's wrong."

Step 3: Answer follow-up questions (if any)
        → Tooltip: "These are the essential details we need. Everything else is optional."

Step 4: Generate contract
        → Celebration: "Your contract is ready! That was fast, right?"
```

---

### Phase 4: Activation Checklist (Persistent)

After first contract, show a subtle checklist in the dashboard:

```
┌─────────────────────────────────────────┐
│  Getting Started                    2/5 │
│  ────────────────────────────────────── │
│  ✓ Create your first contract           │
│  ✓ Preview your contract                │
│  ○ Send for signature                   │
│  ○ Save a template (optional)           │
│  ○ Set up payments (optional)           │
│                                         │
│  [Dismiss] [Continue →]                 │
└─────────────────────────────────────────┘
```

**Checklist items by priority**:

| Step | Action | Why |
|------|--------|-----|
| 1 | Create first contract | Core value |
| 2 | Preview contract | See the quality |
| 3 | Send for signature | Complete the loop |
| 4 | Save as template | Build library |
| 5 | Set up Stripe | Enable payments |

---

## Contextual Tips (Tooltips)

Show once, dismissable, stored in user preferences.

| Location | Tip | Trigger |
|----------|-----|---------|
| Smart intake | "Describe your situation naturally - our AI will figure out the rest" | First visit to /contracts/new |
| Contract editor | "Click any clause to see AI explanation and suggestions" | First time viewing generated contract |
| Signature fields | "Drag fields to position them, or let AI place them automatically" | First time on signature setup |
| Risk analysis | "We analyze every contract for potential issues" | First time viewing risk tab |
| Payments | "Collect deposits and payments directly through your contracts" | First time on payment settings |

---

## Email Sequence

### Day 0: Welcome
```
Subject: Welcome to Lexport - Your first contract is waiting

Hi [Name],

Welcome! You've joined 2,000+ founders and freelancers who use Lexport.

Your first contract is just a conversation away. Try describing what you need:

→ "I need an NDA for a potential investor meeting"
→ "Hiring a designer for a website redesign project"

[Create Your First Contract →]

Questions? Just reply to this email.

- The Lexport Team
```

### Day 1: Did they create a contract?

**If yes**:
```
Subject: Nice work! Here's what to do next

You created your first contract - that was fast!

Here's how to get it signed:
1. Click "Send for Signature"
2. Add the signer's email
3. They'll receive a secure link

[Send Your Contract →]
```

**If no**:
```
Subject: Need help getting started?

I noticed you haven't created your first contract yet.

Here are the 3 most popular contracts our users create:

1. NDA (2 min) - Protect confidential discussions
2. Contractor Agreement (3 min) - Hire someone properly
3. Freelance Agreement (3 min) - Define project scope

[Create a Contract →]

Stuck? Reply and I'll help personally.
```

### Day 3: Feature highlight
```
Subject: Did you know? AI risk analysis

Every contract you create gets automatic risk analysis:

✓ Unusual clauses flagged
✓ Missing protections identified
✓ Plain-English explanations

It's like having a lawyer review every contract.

[See It In Action →]
```

### Day 7: Social proof + upgrade nudge
```
Subject: Join 500+ users who upgraded this month

"Lexport saved me $3,000 in legal fees last month alone."
- Sarah K., Agency Owner

Ready to unlock unlimited contracts?

Pro Plan - $29/month
✓ Unlimited contracts
✓ Unlimited signatures
✓ Payment collection
✓ Priority support

[Upgrade to Pro →]
```

---

## Empty States

### Dashboard (No contracts)
```
┌─────────────────────────────────────────────────────────────┐
│                                                              │
│         📄                                                   │
│                                                              │
│      No contracts yet                                        │
│                                                              │
│  Create your first AI-powered contract in under 5 minutes.  │
│                                                              │
│  ┌────────────────────────────────────────────────────────┐ │
│  │ What do you need?                                      │ │
│  │ ________________________________________________      │ │
│  │                                                        │ │
│  │ Example: "NDA for investor meeting"                   │ │
│  └────────────────────────────────────────────────────────┘ │
│                                                              │
│           [Create Contract] or [Browse Templates]           │
│                                                              │
└─────────────────────────────────────────────────────────────┘
```

### Templates (No saved templates)
```
┌─────────────────────────────────────────────────────────────┐
│                                                              │
│      No saved templates yet                                  │
│                                                              │
│  Templates let you reuse contracts with one click.          │
│                                                              │
│  Get started with our pre-built templates:                  │
│                                                              │
│  [NDA Template]  [Contractor]  [Freelance]  [SAFE Note]     │
│                                                              │
│  Or create a contract and save it as a template.            │
│                                                              │
└─────────────────────────────────────────────────────────────┘
```

---

## Database Schema

```sql
-- Track onboarding progress
ALTER TABLE users ADD COLUMN onboarding_completed_at TIMESTAMPTZ;
ALTER TABLE users ADD COLUMN user_type TEXT; -- startup_founder, freelancer, agency

-- Onboarding checklist
CREATE TABLE onboarding_progress (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id UUID REFERENCES users(id) ON DELETE CASCADE,
  step TEXT NOT NULL, -- welcome, first_contract, first_signature, etc.
  completed_at TIMESTAMPTZ DEFAULT NOW(),
  metadata JSONB,
  UNIQUE(user_id, step)
);

-- Dismissed tips
CREATE TABLE dismissed_tips (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id UUID REFERENCES users(id) ON DELETE CASCADE,
  tip_id TEXT NOT NULL,
  dismissed_at TIMESTAMPTZ DEFAULT NOW(),
  UNIQUE(user_id, tip_id)
);
```

---

## Implementation Checklist

### Phase 1: Core Onboarding (MVP)
- [ ] Welcome modal with role selection
- [ ] Onboarding progress tracking (DB)
- [ ] Dashboard empty state with inline contract creation
- [ ] Activation checklist component
- [ ] First-run tooltips (3-5 key locations)

### Phase 2: Email Automation
- [ ] Welcome email (Day 0)
- [ ] Activation emails (Day 1, 3, 7)
- [ ] Integration with email service (Resend/Postmark)

### Phase 3: Analytics & Optimization
- [ ] Track onboarding funnel
- [ ] A/B test welcome flow
- [ ] Identify drop-off points
- [ ] Iterate based on data

---

## Success Metrics

| Metric | How to Measure | Target |
|--------|----------------|--------|
| Onboarding completion | Users completing checklist | 60% |
| Time to first contract | Timestamp diff | < 5 min |
| First-session activation | Contract created in session 1 | 70% |
| 7-day retention | Return visit within 7 days | 50% |
| Signature sent rate | Users who send at least 1 | 40% |

---

## Quick Wins to Implement First

1. **Welcome modal** - 2 hours
   - Role selection
   - Personalized examples

2. **Dashboard empty state** - 1 hour
   - Inline smart intake
   - Quick examples

3. **Activation checklist** - 2 hours
   - Persistent sidebar/banner
   - Progress tracking

4. **First-run tooltips** - 2 hours
   - Smart intake explanation
   - Contract editor tips
   - Signature setup guide

**Total MVP: ~7 hours of development**
