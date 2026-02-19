# Stripe Webhook Configuration

## Overview

Lexport uses TWO Stripe webhook endpoints, each handling different event types.  
Both must be configured in the Stripe Dashboard under Developers → Webhooks.

---

## Endpoint 1: Payment Webhooks

**URL:** `https://lexportai.com/api/webhooks/stripe`  
**Secret env var:** `STRIPE_WEBHOOK_SECRET`  
**File:** `apps/web/src/app/api/webhooks/stripe/route.ts`

### Events to subscribe:

| Event | Purpose |
|-------|---------|
| `payment_intent.succeeded` | Mark contract/invoice payment as succeeded, auto-create receipt invoice, send receipt email |
| `payment_intent.payment_failed` | Mark payment as failed, log error |
| `payment_intent.processing` | Update payment status to processing |
| `charge.refunded` | Mark payment as refunded |
| `checkout.session.completed` | Handle template purchases (one-time payments) |
| `account.updated` | Update Stripe Connect account status |
| `account.application.deauthorized` | Log Connect deauthorization |
| `payout.paid` | Log successful payouts (monitoring) |
| `payout.failed` | Log failed payouts (monitoring) |

---

## Endpoint 2: Billing/Subscription Webhooks

**URL:** `https://lexportai.com/api/billing/webhook`  
**Secret env var:** `STRIPE_WEBHOOK_SECRET` (same key used for signature verification)  
**File:** `apps/web/src/app/api/billing/webhook/route.ts`

### Events to subscribe:

| Event | Purpose |
|-------|---------|
| `checkout.session.completed` | Activate subscription after checkout (Pro/Business), handle template purchases |
| `customer.subscription.updated` | Update user tier when subscription changes (upgrade/downgrade) |
| `customer.subscription.deleted` | Downgrade user to free tier on cancellation |
| `invoice.payment_failed` | Mark subscription as past_due |

---

## Important Notes

1. **Both endpoints share `STRIPE_WEBHOOK_SECRET`** — both must be registered with the same signing secret, OR use separate secrets per endpoint.

2. **`checkout.session.completed` is handled by BOTH endpoints** — Endpoint 1 handles template purchases, Endpoint 2 handles subscription creation. Logic differentiates based on `session.mode` and `session.metadata.type`.

3. **Production setup:** In Stripe Dashboard, create TWO webhook endpoints.

4. **Recommended refactor (post-launch):** Consolidate into a single webhook endpoint to avoid overlap.

---

## Environment Variables Required

```env
STRIPE_SECRET_KEY=sk_live_...
STRIPE_WEBHOOK_SECRET=whsec_...
NEXT_PUBLIC_STRIPE_PUBLISHABLE_KEY=pk_live_...
STRIPE_PRO_PRICE_ID=price_...
STRIPE_TEAM_PRICE_ID=price_...
```

## Testing Webhooks Locally

```bash
brew install stripe/stripe-cli/stripe
stripe login
stripe listen --forward-to localhost:3000/api/webhooks/stripe --forward-to localhost:3000/api/billing/webhook
stripe trigger payment_intent.succeeded
```
