# Monetization & Access Control System

A comprehensive guide to Lexport's freemium monetization model with pay-per-contract and subscription options.

---

## Overview

Lexport uses a **hybrid monetization model** combining:
1. **Freemium** - Limited free tier to acquire users
2. **Subscription** - Monthly plans for power users
3. **Pay-Per-Contract** - One-time purchase for casual users

This maximizes revenue capture across different user segments while maintaining a low barrier to entry.

---

## User Tiers

### 🆓 Free Tier

| Feature | Limit |
|---------|-------|
| Contract generation | 2 per month |
| AI chat assistance | 5 messages per contract |
| Contract preview | ✅ Full (not blurred) |
| PDF download | ❌ Requires payment |
| E-signatures | ❌ Requires payment |
| Payment collection | ❌ Requires payment |
| Templates | Basic only |

**Purpose**: Let users experience the AI generation quality before paying.

---

### 💳 Pay-Per-Contract

Users who don't want a subscription can unlock individual contracts.

| Action | Price |
|--------|-------|
| Download PDF | £5 |
| Send for signature | £5 |
| Download + Signature bundle | £7 |

**How it works**:
1. User generates a contract (free)
2. Clicks "Download PDF" or "Send for Signature"
3. Paywall appears with options:
   - Pay £5 for this contract
   - Subscribe for unlimited
4. After payment, contract is permanently unlocked

---

### ⭐ Pro Subscription - £29/month

| Feature | Included |
|---------|----------|
| Contract generation | Unlimited |
| AI chat assistance | Unlimited |
| PDF downloads | Unlimited |
| E-signatures | Unlimited |
| Payment collection | ✅ |
| All templates | ✅ |
| Priority support | ✅ |
| Team members | 1 user |

---

### 🏢 Team Subscription - £79/month

| Feature | Included |
|---------|----------|
| Everything in Pro | ✅ |
| Team members | Up to 5 |
| Shared templates | ✅ |
| Admin controls | ✅ |
| Audit logs | ✅ |
| API access | ✅ |

---

## Gating Logic

### Contract Actions Paywall

```
┌─────────────────────────────────────────────────────────────┐
│                    User clicks action                        │
│         (Download PDF / Send for Signature)                  │
└─────────────────────────────┬───────────────────────────────┘
                              │
                              ▼
                    ┌─────────────────┐
                    │  Has active     │
                    │  subscription?  │
                    └────────┬────────┘
                             │
              ┌──────────────┴──────────────┐
              │                             │
              ▼                             ▼
           ┌─────┐                      ┌─────┐
           │ YES │                      │ NO  │
           └──┬──┘                      └──┬──┘
              │                            │
              ▼                            ▼
        ┌──────────┐              ┌────────────────┐
        │ Allow    │              │ Is contract    │
        │ action   │              │ already paid?  │
        └──────────┘              └───────┬────────┘
                                          │
                           ┌──────────────┴──────────────┐
                           │                             │
                           ▼                             ▼
                        ┌─────┐                      ┌─────┐
                        │ YES │                      │ NO  │
                        └──┬──┘                      └──┬──┘
                           │                            │
                           ▼                            ▼
                     ┌──────────┐              ┌────────────────┐
                     │ Allow    │              │ Show paywall   │
                     │ action   │              │ modal          │
                     └──────────┘              └────────────────┘
```

---

## Database Schema Changes

### Users Table (additions)

```sql
ALTER TABLE users ADD COLUMN subscription_status TEXT DEFAULT 'free';
-- Values: 'free', 'pro', 'team', 'cancelled'

ALTER TABLE users ADD COLUMN subscription_id TEXT;
-- Stripe subscription ID

ALTER TABLE users ADD COLUMN subscription_ends_at TIMESTAMPTZ;
-- When current period ends (for cancelled subs)

ALTER TABLE users ADD COLUMN free_contracts_used INTEGER DEFAULT 0;
-- Track monthly free tier usage

ALTER TABLE users ADD COLUMN free_contracts_reset_at TIMESTAMPTZ;
-- When to reset the counter (monthly)
```

### Contracts Table (additions)

```sql
ALTER TABLE contracts ADD COLUMN is_unlocked BOOLEAN DEFAULT false;
-- True if user paid for this specific contract

ALTER TABLE contracts ADD COLUMN unlock_payment_id TEXT;
-- Stripe payment ID for pay-per-contract purchase
```

### New Table: contract_purchases

```sql
CREATE TABLE contract_purchases (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  contract_id UUID REFERENCES contracts(id) ON DELETE CASCADE,
  user_id UUID REFERENCES users(id) ON DELETE CASCADE,
  stripe_payment_intent_id TEXT,
  amount INTEGER NOT NULL, -- in cents
  currency TEXT DEFAULT 'gbp',
  purchase_type TEXT NOT NULL, -- 'download', 'signature', 'bundle'
  status TEXT DEFAULT 'pending', -- 'pending', 'succeeded', 'failed'
  created_at TIMESTAMPTZ DEFAULT NOW(),
  
  UNIQUE(contract_id, user_id, purchase_type)
);
```

---

## API Endpoints

### Check Access

```
GET /api/contracts/[id]/access

Response:
{
  "canDownload": boolean,
  "canSign": boolean,
  "reason": "subscribed" | "purchased" | "free_tier" | "requires_payment",
  "purchaseOptions": {
    "download": { "price": 500, "currency": "gbp" },
    "signature": { "price": 500, "currency": "gbp" },
    "bundle": { "price": 700, "currency": "gbp" }
  }
}
```

### Create Purchase Session

```
POST /api/contracts/[id]/purchase

Body:
{
  "purchaseType": "download" | "signature" | "bundle"
}

Response:
{
  "checkoutUrl": "https://checkout.stripe.com/..."
}
```

### Webhook Handler

```
POST /api/webhooks/stripe

Handles:
- checkout.session.completed → Mark contract as unlocked
- customer.subscription.created → Update user subscription
- customer.subscription.deleted → Downgrade to free
```

---

## UI Components

### Paywall Modal

Shown when user tries to access a gated feature:

```
┌─────────────────────────────────────────────────────────────┐
│                     🔒 Unlock This Contract                  │
├─────────────────────────────────────────────────────────────┤
│                                                              │
│  To download or send this contract for signature,           │
│  choose an option below:                                     │
│                                                              │
│  ┌────────────────────────────────────────────────────┐     │
│  │  💳  Pay for this contract                          │     │
│  │                                                      │     │
│  │  • Download PDF only ................ £5            │     │
│  │  • Send for signature ............... £5            │     │
│  │  • Both (save £3) ................... £7            │     │
│  │                                                      │     │
│  │              [ Pay £5 - Download ]                   │     │
│  └────────────────────────────────────────────────────┘     │
│                                                              │
│                         ─ or ─                               │
│                                                              │
│  ┌────────────────────────────────────────────────────┐     │
│  │  ⭐  Subscribe for unlimited access                 │     │
│  │                                                      │     │
│  │  • Unlimited contracts                               │     │
│  │  • Unlimited downloads                               │     │
│  │  • Unlimited signatures                              │     │
│  │  • Priority support                                  │     │
│  │                                                      │     │
│  │           [ Subscribe - £29/month ]                  │     │
│  └────────────────────────────────────────────────────┘     │
│                                                              │
│                        [ Maybe Later ]                       │
│                                                              │
└─────────────────────────────────────────────────────────────┘
```

### Contract Preview Badge

Show unlock status on contract cards:

```
┌────────────────────────────────────────────┐
│ 📄 Non-Disclosure Agreement                │
│    Draft • Created Dec 28, 2024            │
│                                            │
│    ┌──────────────┐                        │
│    │ 🔒 Locked    │  ← Not yet purchased   │
│    └──────────────┘                        │
│                                            │
│    [ Edit ]  [ Preview ]  [ Unlock £5 ]    │
└────────────────────────────────────────────┘

┌────────────────────────────────────────────┐
│ 📄 Contractor Agreement                    │
│    Draft • Created Dec 27, 2024            │
│                                            │
│    ┌──────────────┐                        │
│    │ ✅ Unlocked  │  ← Purchased/subscribed│
│    └──────────────┘                        │
│                                            │
│    [ Edit ]  [ Download ]  [ Send ]        │
└────────────────────────────────────────────┘
```

---

## Implementation Checklist

### Phase 1: Database & Backend
- [ ] Add subscription fields to users table
- [ ] Add unlock fields to contracts table
- [ ] Create contract_purchases table
- [ ] Create `/api/contracts/[id]/access` endpoint
- [ ] Create `/api/contracts/[id]/purchase` endpoint
- [ ] Update Stripe webhook handler

### Phase 2: Subscription Flow
- [ ] Create pricing page `/pricing`
- [ ] Create Stripe checkout for subscriptions
- [ ] Add subscription status to user context
- [ ] Create subscription management page in settings

### Phase 3: Paywall UI
- [ ] Create PaywallModal component
- [ ] Gate "Download PDF" button
- [ ] Gate "Send for Signature" button
- [ ] Add unlock badges to contract cards
- [ ] Add "Unlock" quick action to contracts list

### Phase 4: Free Tier Limits
- [ ] Track monthly contract generation count
- [ ] Show usage indicator in dashboard
- [ ] Reset counter monthly (cron job or on-demand)
- [ ] Show upgrade prompt when limit reached

---

## Stripe Configuration

### Products to Create

1. **Pro Subscription**
   - Price ID: `price_pro_monthly`
   - Amount: £29/month
   - Recurring: Monthly

2. **Team Subscription**
   - Price ID: `price_team_monthly`
   - Amount: £79/month
   - Recurring: Monthly

3. **Contract Download**
   - Price ID: `price_contract_download`
   - Amount: £5
   - One-time

4. **Contract Signature**
   - Price ID: `price_contract_signature`
   - Amount: £5
   - One-time

5. **Contract Bundle**
   - Price ID: `price_contract_bundle`
   - Amount: £7
   - One-time

---

## Success Metrics

| Metric | Target |
|--------|--------|
| Free → Paid conversion | 5-10% |
| Pay-per-contract vs subscription | 30% / 70% |
| Monthly churn rate | < 5% |
| Average revenue per user (ARPU) | £15+ |

---

## FAQ

**Q: Can users copy/paste contract text?**
A: Yes, but they can't download the formatted PDF or send for legal signatures. The value is in the workflow, not just the text.

**Q: What if someone cancels mid-contract?**
A: Contracts they've already unlocked remain accessible. Subscription benefits end at period end.

**Q: Do pay-per-contract purchases expire?**
A: No, once purchased, a contract is permanently unlocked for that user.

**Q: Can users share unlocked contracts?**
A: Each contract is tied to the user's account. The PDF can be shared, but signing links are per-signer.
