# Lexport AI — Launch Implementation Plan

**Created:** 2026-02-18  
**Purpose:** Step-by-step guide for Kimi K2.5 to execute all pre-launch fixes  
**Audit Status:** 85-90% ready — this plan covers the remaining 10-15%  

---

## Executive Summary

Lexport AI is a production-ready SaaS for AI-powered legal contracts and e-signatures. An audit identified 12 items (6 P0 blockers, 6 P1 quality) that must be fixed before charging customers. This plan provides exact file paths, line numbers, and copy-paste changes for each task. P0 items fix revenue-critical bugs (pricing mismatches, usage limits). P1 items add launch polish (monitoring, tests, emails, SEO).

**Canonical pricing:**
- Free: $0/mo (3 contracts/month)
- Pro: $19.99/mo
- Business: $39.99/mo

---

## P0 Tasks (Must Fix Before Charging Money)

---

### LEX-LAUNCH-001: Fix Pricing in Paywall Component

**Priority:** P0  
**Estimated time:** 2 minutes  
**Files to modify:**
- `apps/web/src/components/paywall/ContractPaywall.tsx`

**Current state:**
Line 68 says `$25/mo` — should be `$19.99/mo`

**Find the exact line:**
```bash
grep -n '\$25' apps/web/src/components/paywall/ContractPaywall.tsx
```

Expected output:
```
68:              Upgrade to Pro - $25/mo
```

**Change:**
In `apps/web/src/components/paywall/ContractPaywall.tsx`, replace the exact string on line 68:

```
OLD: Upgrade to Pro - $25/mo
NEW: Upgrade to Pro - $19.99/mo
```

The full line context (to ensure exact match):
```tsx
// OLD LINE:
              Upgrade to Pro - $25/mo

// NEW LINE:
              Upgrade to Pro - $19.99/mo
```

**Verification:**
```bash
grep -n '\$25' apps/web/src/components/paywall/ContractPaywall.tsx
# Should return nothing

grep -n '19.99' apps/web/src/components/paywall/ContractPaywall.tsx
# Should return line 68 with "$19.99/mo"
```

---

### LEX-LAUNCH-002: Fix Pricing in MONETIZATION.md

**Priority:** P0  
**Estimated time:** 3 minutes  
**Files to modify:**
- `docs/MONETIZATION.md`

**Current state:**
The document uses £ (GBP) pricing: £29/mo for Pro, £79/mo for Team, and various £ amounts for pay-per-contract.

**Changes (use sed or manual edit):**

```bash
cd ~/Desktop/projects/lexport-ai

# 1. Fix Pro Subscription header and price
sed -i '' 's/### ⭐ Pro Subscription - £29\/month/### ⭐ Pro Subscription - $19.99\/month/' docs/MONETIZATION.md

# 2. Fix Team Subscription header and price
sed -i '' 's/### 🏢 Team Subscription - £79\/month/### 🏢 Business Subscription - $39.99\/month/' docs/MONETIZATION.md

# 3. Fix pay-per-contract prices (£5 -> $5, £7 -> $7, £3 -> $3)
# These are fine to keep at round numbers in USD — just change the currency symbol
sed -i '' 's/£5/\$5/g' docs/MONETIZATION.md
sed -i '' 's/£7/\$7/g' docs/MONETIZATION.md
sed -i '' 's/£3/\$3/g' docs/MONETIZATION.md

# 4. Fix Stripe products section
sed -i '' 's/Amount: £29\/month/Amount: $19.99\/month/' docs/MONETIZATION.md
sed -i '' 's/Amount: £79\/month/Amount: $39.99\/month/' docs/MONETIZATION.md

# 5. Fix the paywall modal UI mockup
sed -i '' 's/\[ Subscribe - £29\/month \]/[ Subscribe - $19.99\/month ]/' docs/MONETIZATION.md

# 6. Fix Pay-Per-Contract table and all remaining £ references to $
# The document has many £ references in revenue calculations — change them all
sed -i '' 's/£/$/g' docs/MONETIZATION.md

# 7. Fix currency references  
sed -i '' "s/currency TEXT DEFAULT 'gbp'/currency TEXT DEFAULT 'usd'/" docs/MONETIZATION.md
sed -i '' "s/\"currency\": \"gbp\"/\"currency\": \"usd\"/" docs/MONETIZATION.md
```

**Also update the free tier table in MONETIZATION.md:**
The free tier table says "2 per month" for contract generation. Change to 3:

```bash
sed -i '' 's/| Contract generation | 2 per month |/| Contract generation | 3 per month |/' docs/MONETIZATION.md
```

**Verification:**
```bash
# No more £ symbols should remain
grep -c '£' docs/MONETIZATION.md
# Should output: 0

# Should find $19.99 and $39.99
grep '19.99\|39.99' docs/MONETIZATION.md
# Should return the Pro and Team/Business prices

# Free tier should say 3
grep 'Contract generation' docs/MONETIZATION.md | head -1
# Should show "3 per month"
```

---

### LEX-LAUNCH-003: Fix Pricing in PRD.md Appendix B

**Priority:** P0  
**Estimated time:** 2 minutes  
**Files to modify:**
- `docs/PRD.md`

**Current state:**
Appendix B "Pricing Strategy" table uses old prices: $29/mo for Pro, $79/mo for Team.

**Find the exact lines:**
```bash
grep -n '\$29\|\$79' docs/PRD.md
```

**Changes:**
In the Appendix B pricing table (around line 570+), change:

```
OLD: | Pro | $29/mo | 20 | 50 | All templates, AI generation, no watermark |
NEW: | Pro | $19.99/mo | 50 | Unlimited | All templates, AI generation, no watermark |

OLD: | Team | $79/mo | Unlimited | 200 | Team features, priority support |
NEW: | Business | $39.99/mo | 200 | Unlimited | Team features, priority support |
```

Also update the free tier row in the same table:
```
OLD: | Free | $0 | 3 | 5 | Basic templates, watermark |
NEW: | Free | $0/mo | 3 | 5 | Basic templates, watermark |
```

**Note:** The contract/signature limits in the PRD table should match the actual code (rate-limits.ts). Pro gets 50 contracts and unlimited signatures. Business gets 200 contracts and unlimited signatures.

**Verification:**
```bash
grep -n '\$29\|\$79' docs/PRD.md
# Should return nothing (old prices gone)

grep -n '19.99\|39.99' docs/PRD.md
# Should return the updated Appendix B rows
```

---

### LEX-LAUNCH-004: Fix Free Tier Contract Limit in rate-limits.ts

**Priority:** P0  
**Estimated time:** 1 minute  
**Files to modify:**
- `apps/web/src/lib/rate-limits.ts`

**Current state:**
Line 35: `contractsPerMonth: 2` — should be `3` to match the subscription API (which already says 3).

**Find the exact line:**
```bash
grep -n 'contractsPerMonth: 2' apps/web/src/lib/rate-limits.ts
```

Expected output:
```
35:        contractsPerMonth: 2,
```

**Change:**
```
OLD:         contractsPerMonth: 2,
NEW:         contractsPerMonth: 3,
```

**Verification:**
```bash
grep -n 'contractsPerMonth' apps/web/src/lib/rate-limits.ts
# Line 35 should now show: contractsPerMonth: 3,
# Other tiers (pro=50, team=200, enterprise=10000) should be unchanged

# Run existing tests
cd apps/web && npx vitest run src/__tests__/rate-limits.test.ts 2>/dev/null || echo "Test file may need update too"
```

**Also check if the rate-limits test needs updating:**
```bash
grep -n 'contractsPerMonth.*2\|free.*2' apps/web/src/__tests__/rate-limits.test.ts
```
If the test asserts `contractsPerMonth === 2`, change it to `3`.

---

### LEX-LAUNCH-005: Add Usage Reset Mechanism (Reset-on-Read)

**Priority:** P0  
**Estimated time:** 15 minutes  
**Files to modify:**
- `apps/web/src/app/api/user/subscription/route.ts`

**Current state:**
The subscription API already has `usage_reset_at` and `calculateDaysUntilReset()`, but there's no logic to actually reset usage counters when the reset date has passed. Users who hit their free limit in January will still be blocked in February.

**Implementation — Reset-on-Read pattern:**
Add a helper function and call it in the GET handler after fetching user data. This resets `ai_contracts_used`, `signatures_used`, and `ai_chat_messages_used` to 0 and advances `usage_reset_at` by one month when the reset date has passed.

**Add this function before the `export async function GET()` function (around line 38):**

```typescript
// Reset usage counters if the reset date has passed (reset-on-read pattern)
async function checkAndResetUsage(
  supabase: Awaited<ReturnType<typeof import("@/lib/supabase/server").createClient>>,
  userId: string,
  usageResetAt: string | null | undefined
): Promise<boolean> {
  if (!usageResetAt) {
    // No reset date set — initialize it to the 1st of next month
    const nextMonth = new Date();
    nextMonth.setMonth(nextMonth.getMonth() + 1);
    nextMonth.setDate(1);
    nextMonth.setHours(0, 0, 0, 0);

    await supabase
      .from("users")
      .update({ usage_reset_at: nextMonth.toISOString() })
      .eq("id", userId);

    return false; // No reset needed, just initialized
  }

  const resetDate = new Date(usageResetAt);
  const now = new Date();

  if (now >= resetDate) {
    // Reset date has passed — reset counters and advance to next month
    const nextReset = new Date(now);
    nextReset.setMonth(nextReset.getMonth() + 1);
    nextReset.setDate(1);
    nextReset.setHours(0, 0, 0, 0);

    await supabase
      .from("users")
      .update({
        ai_contracts_used: 0,
        signatures_used: 0,
        ai_chat_messages_used: 0,
        usage_reset_at: nextReset.toISOString(),
      })
      .eq("id", userId);

    return true; // Usage was reset
  }

  return false; // Not yet time to reset
}
```

**Then, in the GET handler, call this function after fetching user data via the fallback path (around line 82, after `if (userError) throw userError;`):**

Add immediately after `if (userError) throw userError;` (around line 82):

```typescript
    // Check if usage needs to be reset (reset-on-read)
    const wasReset = await checkAndResetUsage(supabase, user.id, userData?.usage_reset_at);
```

And then modify the usage variables to account for the reset. Change:
```typescript
      const contractsUsed = userData?.ai_contracts_used ?? 0;
      const signaturesUsed = userData?.signatures_used ?? 0;
      const chatMessagesUsed = userData?.ai_chat_messages_used ?? 0;
```

To:
```typescript
      const contractsUsed = wasReset ? 0 : (userData?.ai_contracts_used ?? 0);
      const signaturesUsed = wasReset ? 0 : (userData?.signatures_used ?? 0);
      const chatMessagesUsed = wasReset ? 0 : (userData?.ai_chat_messages_used ?? 0);
```

**Also add the same check in the RPC path** (around line 130, after `const chatMessagesUsed = chatData?.ai_chat_messages_used ?? 0;`):

```typescript
    // Check if usage needs to be reset (reset-on-read) for RPC path too
    const wasResetRpc = await checkAndResetUsage(supabase, user.id, effectiveData?.usage_reset_at);
```

And modify the RPC path usage variables similarly:
```typescript
    const contractsUsed = wasResetRpc ? 0 : (effectiveData?.contracts_used ?? 0);
    const signaturesUsed = wasResetRpc ? 0 : (effectiveData?.signatures_used ?? 0);
```

And update the `chatMessagesUsed` variable too:
```typescript
    const chatMessagesUsed = wasResetRpc ? 0 : (chatData?.ai_chat_messages_used ?? 0);
```

**Verification:**
```bash
# Ensure the function exists and is called
grep -n 'checkAndResetUsage' apps/web/src/app/api/user/subscription/route.ts
# Should find: function definition + 2 calls

# Build check
cd apps/web && npx tsc --noEmit --pretty 2>&1 | head -20
```

---

### LEX-LAUNCH-006: Add AI-Generated Contract Disclaimer

**Priority:** P0  
**Estimated time:** 20 minutes  
**Files to modify:**
- `apps/web/src/app/api/contracts/[id]/pdf/route.ts` (PDF generation)
- `apps/web/src/app/contracts/[id]/edit/page.tsx` (Editor view)

**Context:**
The PRD (Section "Legal & Compliance > Disclaimer Requirements") mandates this disclaimer on all AI-generated contracts:

> *DISCLAIMER: This document was generated using Lexport AI. While our templates are reviewed by legal professionals, this does not constitute legal advice. For complex or high-value transactions, we recommend consulting with a qualified attorney in your jurisdiction.*

Currently, no disclaimer is rendered in the PDF or the editor view.

#### Part A: Add disclaimer to PDF generation

**File:** `apps/web/src/app/api/contracts/[id]/pdf/route.ts`

In the `generateContractPDF` function, add the disclaimer **after the signature block section and before the page footer logic**. Find the comment `// Footer on all pages` (approximately line 340 in the current file).

**Add this block BEFORE the `// Footer on all pages` comment:**

```typescript
  // AI-Generated Contract Disclaimer
  checkPageBreak(lineHeight * 6);
  yPosition -= lineHeight * 2;

  // Draw a horizontal rule
  currentPage.drawLine({
    start: { x: margin, y: yPosition },
    end: { x: pageWidth - margin, y: yPosition },
    thickness: 0.5,
    color: rgb(0.7, 0.7, 0.7),
  });
  yPosition -= lineHeight * 1.5;

  drawText("DISCLAIMER", {
    font: timesRomanBoldFont,
    size: 8,
    color: { r: 0.5, g: 0.5, b: 0.5 },
  });
  yPosition -= lineHeight * 0.5;

  drawText(
    "This document was generated using Lexport AI. While our templates are reviewed by legal professionals, this does not constitute legal advice. For complex or high-value transactions, we recommend consulting with a qualified attorney in your jurisdiction.",
    {
      font: timesRomanItalicFont,
      size: 8,
      color: { r: 0.5, g: 0.5, b: 0.5 },
    }
  );
```

#### Part B: Add disclaimer banner to editor view

**File:** `apps/web/src/app/contracts/[id]/edit/page.tsx`

This is a large file (~2800 lines). We need to add a disclaimer banner in the contract content area. The best place is at the bottom of the contract content, just before the signature block display.

**Strategy:** Since the editor file is very large and complex, add a reusable disclaimer component. Create a new small component:

**Create new file:** `apps/web/src/components/contracts/AIDisclaimer.tsx`

```tsx
import { AlertTriangle } from "lucide-react";

export function AIDisclaimer() {
  return (
    <div className="mt-6 p-4 bg-amber-50 border border-amber-200 rounded-lg">
      <div className="flex items-start gap-3">
        <AlertTriangle className="w-4 h-4 text-amber-600 flex-shrink-0 mt-0.5" />
        <p className="text-xs text-amber-800 leading-relaxed">
          <strong>Disclaimer:</strong> This document was generated using Lexport AI. While our
          templates are reviewed by legal professionals, this does not constitute legal advice.
          For complex or high-value transactions, we recommend consulting with a qualified
          attorney in your jurisdiction.
        </p>
      </div>
    </div>
  );
}
```

Then, in `apps/web/src/app/contracts/[id]/edit/page.tsx`:

1. Add the import at the top of the file (after the other component imports, around line 23):
```tsx
import { AIDisclaimer } from "@/components/contracts/AIDisclaimer";
```

2. Render the component in the contract content area. Search for `SignatureBlockDisplay` in the file and add `<AIDisclaimer />` just below the signature block section (before the closing tag of the contract content wrapper). The exact insertion point should be after the signature block / field editor section — search for the string `{/* Signature Block */}` or the `<SignatureBlockDisplay` component usage and add `<AIDisclaimer />` right after that block closes.

**Verification:**
```bash
# Check PDF generation has disclaimer
grep -n 'DISCLAIMER' apps/web/src/app/api/contracts/*/pdf/route.ts
# Should find the new disclaimer section

# Check component exists
cat apps/web/src/components/contracts/AIDisclaimer.tsx
# Should show the component

# Check import in editor
grep -n 'AIDisclaimer' apps/web/src/app/contracts/*/edit/page.tsx
# Should find the import and usage

# TypeScript check
cd apps/web && npx tsc --noEmit --pretty 2>&1 | head -20
```

---

### LEX-LAUNCH-007: Remove Duplicate File

**Priority:** P0  
**Estimated time:** 1 minute  
**Files to modify:**
- DELETE: `apps/web/src/lib/contracts/generator-streaming 2.ts`

**Current state:**
```bash
ls -la "apps/web/src/lib/contracts/generator-streaming 2.ts"
```
This is a macOS copy artifact (same size: 19989 bytes as the original).

**Verify it's a duplicate:**
```bash
diff "apps/web/src/lib/contracts/generator-streaming.ts" "apps/web/src/lib/contracts/generator-streaming 2.ts"
# Should show no differences (identical files)
```

**Remove it:**
```bash
rm "apps/web/src/lib/contracts/generator-streaming 2.ts"
```

**Verify no imports reference it:**
```bash
grep -rn "generator-streaming 2" apps/web/src/ --include="*.ts" --include="*.tsx"
# Should return nothing — only generator-streaming.ts is imported (confirmed: only in stream/route.ts)
```

**Verification:**
```bash
ls "apps/web/src/lib/contracts/generator-streaming 2.ts" 2>/dev/null && echo "STILL EXISTS" || echo "REMOVED OK"
# Should say "REMOVED OK"
```

---

### LEX-LAUNCH-008: Document Stripe Webhook Endpoints

**Priority:** P0  
**Estimated time:** 5 minutes  
**Files to create:**
- `docs/STRIPE_WEBHOOKS.md`

**Current state:**
There are TWO Stripe webhook endpoints, and their responsibilities aren't documented:

1. `/api/webhooks/stripe/route.ts` — Handles payment events (payment_intent.succeeded, payment_intent.payment_failed, charge.refunded, checkout.session.completed for template purchases, Connect account events)
2. `/api/billing/webhook/route.ts` — Handles subscription lifecycle (checkout.session.completed for subscriptions, customer.subscription.updated, customer.subscription.deleted, invoice.payment_failed)

**Create the documentation file:**

```bash
cat > ~/Desktop/projects/lexport-ai/docs/STRIPE_WEBHOOKS.md << 'HEREDOC'
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

1. **Both endpoints share `STRIPE_WEBHOOK_SECRET`** — this means both must be registered with the same webhook signing secret in Stripe, OR you need separate secrets for each endpoint.

2. **`checkout.session.completed` is handled by BOTH endpoints** — Endpoint 1 handles template purchases, Endpoint 2 handles subscription creation. The logic differentiates based on `session.mode` (subscription vs payment) and `session.metadata.type`.

3. **Production setup:** In the Stripe Dashboard, create TWO webhook endpoints:
   - Endpoint 1: Subscribe to payment/connect/payout events
   - Endpoint 2: Subscribe to subscription/invoice events
   - OR: Create ONE endpoint that hits both, using a router (not currently implemented)

4. **Recommended refactor (post-launch):** Consolidate into a single webhook endpoint to avoid the `checkout.session.completed` overlap.

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
# Install Stripe CLI
brew install stripe/stripe-cli/stripe

# Login
stripe login

# Forward events to local endpoints
stripe listen --forward-to localhost:3000/api/webhooks/stripe --forward-to localhost:3000/api/billing/webhook

# Trigger a test event
stripe trigger payment_intent.succeeded
stripe trigger customer.subscription.created
```
HEREDOC
```

**Verification:**
```bash
cat ~/Desktop/projects/lexport-ai/docs/STRIPE_WEBHOOKS.md | head -5
# Should show the header
```

---

## P1 Tasks (Launch Quality)

---

### LEX-LAUNCH-009: Set Up Sentry Properly

**Priority:** P1  
**Estimated time:** 5 minutes  
**Files to modify:**
- `apps/web/.env.example` (already has placeholders — verify)
- `apps/web/.env` (add actual DSN — human must provide)

**Current state:**
Sentry is already well-configured:
- ✅ `sentry.client.config.ts` — Properly configured with replay, filtering, PII scrubbing
- ✅ `sentry.server.config.ts` — Properly configured
- ✅ `sentry.edge.config.ts` — Properly configured
- ✅ `next.config.ts` — `withSentryConfig` wrapper with source maps, tunnel route
- ✅ `.env.example` — Has all 4 Sentry env vars listed
- ❌ `.env` — No Sentry DSN set (not found in grep)

**Action required:**
The code is ready. The human owner needs to:

1. Create a Sentry project at https://sentry.io
2. Get the DSN, org, project name, and auth token
3. Add them to `.env`:

```env
NEXT_PUBLIC_SENTRY_DSN="https://xxx@xxx.ingest.sentry.io/xxx"
SENTRY_ORG="lexport"
SENTRY_PROJECT="lexport-web"
SENTRY_AUTH_TOKEN="sntrys_..."
```

**Create a checklist file for the human:**

```bash
cat > ~/Desktop/projects/lexport-ai/docs/SENTRY_SETUP.md << 'HEREDOC'
# Sentry Setup Checklist

## Status: Code is ready, needs credentials

All three Sentry config files (`sentry.client.config.ts`, `sentry.server.config.ts`, `sentry.edge.config.ts`) and `next.config.ts` are already properly configured.

## Steps for the human:

1. [ ] Go to https://sentry.io and create an account (or use existing)
2. [ ] Create a new project: Platform = Next.js, Name = "lexport-web"
3. [ ] Copy the DSN from Project Settings → Client Keys
4. [ ] Create an auth token at Settings → Auth Tokens
5. [ ] Add to `apps/web/.env`:
   ```
   NEXT_PUBLIC_SENTRY_DSN="your-dsn-here"
   SENTRY_ORG="your-org-slug"
   SENTRY_PROJECT="lexport-web"
   SENTRY_AUTH_TOKEN="your-auth-token"
   ```
6. [ ] Also add these to your Netlify/Vercel environment variables
7. [ ] Deploy and verify errors appear in Sentry dashboard

## What's already configured:
- Client: Session replay (10% sampling, 100% on error), browser tracing, PII scrubbing
- Server: 10% trace sampling, email scrubbing, ignores Next.js internal errors
- Edge: 10% trace sampling
- Build: Source map upload, tunnel route `/monitoring` for ad-blocker bypass
HEREDOC
```

**Verification:**
```bash
# Verify all three config files exist
ls apps/web/sentry.*.config.ts
# Should list 3 files

# Verify next.config.ts wraps with Sentry
grep 'withSentryConfig' apps/web/next.config.ts
# Should find the wrapper
```

---

### LEX-LAUNCH-010: Add Basic E2E Tests with Playwright

**Priority:** P1  
**Estimated time:** 45 minutes  
**Files to create:**
- `apps/web/playwright.config.ts`
- `apps/web/e2e/auth.spec.ts`
- `apps/web/e2e/contract-flow.spec.ts`

**Files to modify:**
- `apps/web/package.json` (add Playwright scripts)

**Step 1: Install Playwright**

```bash
cd ~/Desktop/projects/lexport-ai/apps/web
npm install -D @playwright/test
npx playwright install chromium
```

**Step 2: Create playwright.config.ts**

Create `apps/web/playwright.config.ts`:

```typescript
import { defineConfig, devices } from "@playwright/test";

export default defineConfig({
  testDir: "./e2e",
  fullyParallel: true,
  forbidOnly: !!process.env.CI,
  retries: process.env.CI ? 2 : 0,
  workers: process.env.CI ? 1 : undefined,
  reporter: "html",
  use: {
    baseURL: process.env.PLAYWRIGHT_BASE_URL || "http://localhost:3000",
    trace: "on-first-retry",
    screenshot: "only-on-failure",
  },
  projects: [
    {
      name: "chromium",
      use: { ...devices["Desktop Chrome"] },
    },
  ],
  webServer: process.env.CI
    ? undefined
    : {
        command: "npm run dev",
        url: "http://localhost:3000",
        reuseExistingServer: true,
        timeout: 120 * 1000,
      },
});
```

**Step 3: Create e2e/auth.spec.ts**

Create `apps/web/e2e/auth.spec.ts`:

```typescript
import { test, expect } from "@playwright/test";

test.describe("Authentication", () => {
  test("register page loads and shows form", async ({ page }) => {
    await page.goto("/register");
    await expect(page.getByPlaceholder("Full name")).toBeVisible();
    await expect(page.getByPlaceholder("Email address")).toBeVisible();
    await expect(page.getByPlaceholder("Password")).toBeVisible();
    await expect(page.getByRole("button", { name: "Create account" })).toBeVisible();
  });

  test("login page loads and shows form", async ({ page }) => {
    await page.goto("/login");
    await expect(page.getByPlaceholder("Email address")).toBeVisible();
    await expect(page.getByPlaceholder("Password")).toBeVisible();
    await expect(page.getByRole("button", { name: /sign in/i })).toBeVisible();
  });

  test("register shows validation errors for empty form", async ({ page }) => {
    await page.goto("/register");
    await page.getByRole("button", { name: "Create account" }).click();
    // Should show validation errors (form touched)
    await expect(page.locator("text=Name is required").or(page.locator("text=required"))).toBeVisible({ timeout: 3000 });
  });

  test("login redirects unauthenticated user from dashboard", async ({ page }) => {
    await page.goto("/dashboard");
    // Should redirect to login
    await expect(page).toHaveURL(/\/login/, { timeout: 5000 });
  });
});
```

**Step 4: Create e2e/contract-flow.spec.ts**

Create `apps/web/e2e/contract-flow.spec.ts`:

```typescript
import { test, expect } from "@playwright/test";

test.describe("Landing Page", () => {
  test("homepage loads with correct pricing", async ({ page }) => {
    await page.goto("/");

    // Check Pro price is $19.99
    await expect(page.locator("text=$19.99")).toBeVisible();

    // Check Business price is $39.99
    await expect(page.locator("text=$39.99")).toBeVisible();

    // Check free tier mentions 3 contracts
    await expect(page.locator("text=3 AI contracts/month").first()).toBeVisible();
  });

  test("pricing section shows all three plans", async ({ page }) => {
    await page.goto("/#pricing");
    await expect(page.locator("text=Free").first()).toBeVisible();
    await expect(page.locator("text=Pro").first()).toBeVisible();
    await expect(page.locator("text=Business").first()).toBeVisible();
  });

  test("CTA buttons link to register", async ({ page }) => {
    await page.goto("/");
    const startFreeTrialLink = page.locator('a:has-text("Start free trial")').first();
    await expect(startFreeTrialLink).toHaveAttribute("href", "/register");
  });
});

test.describe("Legal Pages", () => {
  test("terms page loads with real content", async ({ page }) => {
    await page.goto("/terms");
    await expect(page.locator("h1")).toContainText("Terms of Service");
    await expect(page.locator("text=Electronic Signature")).toBeVisible();
    await expect(page.locator("text=ESIGN Act")).toBeVisible();
  });

  test("privacy page loads with real content", async ({ page }) => {
    await page.goto("/privacy");
    await expect(page.locator("h1")).toContainText("Privacy Policy");
    await expect(page.locator("text=GDPR")).toBeVisible();
  });
});

test.describe("Public Signing", () => {
  test("sign page with invalid token shows error", async ({ page }) => {
    await page.goto("/sign/invalid-token-abc123");
    // Should show an error or loading state, not crash
    await expect(page.locator("body")).toBeVisible();
  });
});
```

**Step 5: Add scripts to package.json**

In `apps/web/package.json`, add these scripts:

```json
"e2e": "playwright test",
"e2e:ui": "playwright test --ui",
"e2e:headed": "playwright test --headed"
```

Add them after the existing `"test:coverage"` line.

**Verification:**
```bash
# Check files exist
ls apps/web/playwright.config.ts apps/web/e2e/*.spec.ts
# Should list 3 files

# Check scripts are in package.json
grep 'e2e' apps/web/package.json
# Should find the 3 new scripts

# Run the tests (requires dev server)
cd apps/web && npx playwright test --reporter=list 2>&1 | tail -20
```

---

### LEX-LAUNCH-011: Welcome Email on Signup

**Priority:** P1  
**Estimated time:** 20 minutes  
**Files to modify:**
- `apps/web/src/lib/email.ts` (add welcome email function)
- `apps/web/src/app/auth/callback/route.ts` (trigger welcome email on first login)

**Step 1: Add welcome email function to email.ts**

Add the following function at the end of `apps/web/src/lib/email.ts` (before the final closing, or at the very end of the file):

```typescript
// === Welcome Email ===

export interface WelcomeEmailParams {
  to: string;
  userName: string;
}

export async function sendWelcomeEmail({ to, userName }: WelcomeEmailParams) {
  const resend = getResend();
  const baseUrl = process.env.NEXT_PUBLIC_APP_URL || "https://lexportai.com";

  const firstName = userName.split(" ")[0] || "there";

  const html = emailWrapper(`
    <div style="text-align: center; margin-bottom: 24px;">
      <div style="width: 64px; height: 64px; background: linear-gradient(135deg, ${BRAND.emerald} 0%, #059669 100%); border-radius: 50%; display: inline-flex; align-items: center; justify-content: center;">
        <span style="font-size: 32px;">🎉</span>
      </div>
    </div>

    <h2 style="font-size: 24px; font-weight: 700; color: #1e293b; text-align: center; margin: 0 0 8px;">Welcome to Lexport, ${firstName}!</h2>

    <p style="font-size: 16px; color: #475569; text-align: center; margin: 0 0 24px;">
      You're all set to create AI-powered contracts and collect e-signatures.
    </p>

    <div style="background: ${BRAND.lightSlate}; border-radius: 12px; padding: 24px; margin: 24px 0;">
      <h3 style="font-size: 16px; font-weight: 600; color: #1e293b; margin: 0 0 16px;">Get started in 3 steps:</h3>
      <div style="margin-bottom: 12px;">
        <span style="display: inline-block; width: 24px; height: 24px; background: ${BRAND.navy}; color: white; border-radius: 50%; text-align: center; line-height: 24px; font-size: 12px; font-weight: 700; margin-right: 8px;">1</span>
        <span style="color: #475569;">Create your first contract with AI</span>
      </div>
      <div style="margin-bottom: 12px;">
        <span style="display: inline-block; width: 24px; height: 24px; background: ${BRAND.navy}; color: white; border-radius: 50%; text-align: center; line-height: 24px; font-size: 12px; font-weight: 700; margin-right: 8px;">2</span>
        <span style="color: #475569;">Customize and review with AI chat</span>
      </div>
      <div>
        <span style="display: inline-block; width: 24px; height: 24px; background: ${BRAND.navy}; color: white; border-radius: 50%; text-align: center; line-height: 24px; font-size: 12px; font-weight: 700; margin-right: 8px;">3</span>
        <span style="color: #475569;">Send for e-signature and get paid</span>
      </div>
    </div>

    ${primaryButton(`${baseUrl}/contracts/new`, "Create Your First Contract")}

    <p style="font-size: 14px; color: #64748b; text-align: center;">
      Your free plan includes 3 AI contracts and 5 signatures per month.
      <a href="${baseUrl}/settings/billing" style="color: ${BRAND.blue}; text-decoration: none;">Upgrade anytime</a> for unlimited access.
    </p>
  `);

  try {
    await resend.emails.send({
      from: FROM_EMAIL,
      to,
      subject: "Welcome to Lexport — Let's create your first contract 🚀",
      html,
    });
  } catch (error) {
    console.error("Failed to send welcome email:", error);
    // Don't throw — welcome email failure shouldn't block signup
  }
}
```

**Step 2: Trigger welcome email in auth callback**

Modify `apps/web/src/app/auth/callback/route.ts` to send a welcome email on first login:

Replace the entire file with:

```typescript
import { NextResponse } from "next/server";
import { createClient } from "@/lib/supabase/server";
import { sendWelcomeEmail } from "@/lib/email";

export async function GET(request: Request) {
  const { searchParams, origin } = new URL(request.url);
  const code = searchParams.get("code");
  const next = searchParams.get("next") ?? "/dashboard";

  if (code) {
    const supabase = await createClient();
    const { error } = await supabase.auth.exchangeCodeForSession(code);
    if (!error) {
      // Check if this is a new user (first login) and send welcome email
      try {
        const { data: { user } } = await supabase.auth.getUser();
        if (user) {
          // Check if user record exists with contracts used > 0 (returning user)
          const { data: userData } = await supabase
            .from("users")
            .select("ai_contracts_used, welcome_email_sent")
            .eq("id", user.id)
            .single();

          // Send welcome email if not already sent
          if (userData && !userData.welcome_email_sent) {
            const userName = user.user_metadata?.full_name || user.user_metadata?.name || user.email?.split("@")[0] || "there";
            await sendWelcomeEmail({
              to: user.email!,
              userName,
            });

            // Mark welcome email as sent (best effort — column may not exist yet)
            await supabase
              .from("users")
              .update({ welcome_email_sent: true })
              .eq("id", user.id)
              .then(() => {})
              .catch(() => {
                // Column might not exist yet — that's OK
                console.log("welcome_email_sent column may not exist yet — skipping flag update");
              });
          }
        }
      } catch (emailError) {
        // Never block auth flow for email errors
        console.error("Welcome email error (non-blocking):", emailError);
      }

      return NextResponse.redirect(`${origin}${next}`);
    }
  }

  // Return to login with error
  return NextResponse.redirect(`${origin}/login?error=auth_error`);
}
```

**Note:** The `welcome_email_sent` column may not exist in the database yet. The code handles this gracefully. To add it:

```sql
-- Run in Supabase SQL editor (optional, prevents duplicate sends)
ALTER TABLE users ADD COLUMN IF NOT EXISTS welcome_email_sent BOOLEAN DEFAULT false;
```

If the column doesn't exist, the welcome email will be sent on each auth callback but that's a minor issue — the user will just get one extra welcome email at most (subsequent logins won't trigger the callback route unless re-verifying).

**Simpler alternative if column doesn't exist:** Check if `ai_contracts_used` is 0 and `created_at` is within the last 5 minutes:

```typescript
// Alternative check without new column:
const isNewUser = userData && 
  userData.ai_contracts_used === 0 && 
  new Date(userData.created_at) > new Date(Date.now() - 5 * 60 * 1000);
```

**Verification:**
```bash
# Check function exists
grep -n 'sendWelcomeEmail' apps/web/src/lib/email.ts
# Should find the export function

# Check callback imports it
grep -n 'sendWelcomeEmail' apps/web/src/app/auth/callback/route.ts
# Should find the import and usage

# TypeScript check
cd apps/web && npx tsc --noEmit --pretty 2>&1 | head -20
```

---

### LEX-LAUNCH-012: SEO Meta Tags

**Priority:** P1  
**Estimated time:** 5 minutes  
**Files to check:**
- `apps/web/src/app/layout.tsx`
- `apps/web/src/app/page.tsx`
- `apps/web/src/app/sitemap.ts`

**Current state:**
✅ **Already well-implemented!** After inspection:

- `layout.tsx` has comprehensive metadata: title template, description, keywords (10 terms), OpenGraph, Twitter cards, robots, authors, manifest, category
- `sitemap.ts` exists
- Landing page has descriptive content

**Remaining gaps to fix:**

1. **Key sub-pages lack page-specific metadata.** Add `metadata` exports to these pages:

**File: `apps/web/src/app/about/page.tsx`** — Add at top:
```typescript
import { Metadata } from "next";

export const metadata: Metadata = {
  title: "About Lexport",
  description: "Learn about Lexport AI — the AI-powered platform for creating legally binding contracts, e-signatures, and payment collection for startups and freelancers.",
};
```

**File: `apps/web/src/app/contact/page.tsx`** — Add at top:
```typescript
import { Metadata } from "next";

export const metadata: Metadata = {
  title: "Contact Us",
  description: "Get in touch with the Lexport team. Questions about AI contracts, e-signatures, or pricing? We're here to help.",
};
```

**File: `apps/web/src/app/(auth)/login/page.tsx`** — Check if it has metadata, add if missing:
```typescript
import { Metadata } from "next";

export const metadata: Metadata = {
  title: "Log In",
  description: "Sign in to your Lexport account to manage contracts, e-signatures, and payments.",
};
```

**File: `apps/web/src/app/(auth)/register/page.tsx`** — Check if it has metadata, add if missing:
```typescript
import { Metadata } from "next";

export const metadata: Metadata = {
  title: "Create Account",
  description: "Sign up for Lexport — create AI-powered contracts, send e-signatures, and collect payments. Free plan available.",
};
```

2. **The OG image is an SVG** (`/og-image.svg`) — social platforms prefer PNG/JPG. But this is cosmetic and can be fixed post-launch.

**Verification:**
```bash
# Check metadata exports exist
grep -rn "export const metadata" apps/web/src/app/about/page.tsx apps/web/src/app/contact/page.tsx apps/web/src/app/'(auth)'/login/page.tsx apps/web/src/app/'(auth)'/register/page.tsx 2>/dev/null
```

---

### LEX-LAUNCH-013: Verify Terms & Privacy Content

**Priority:** P1  
**Estimated time:** 2 minutes (verification only)  
**Files to check:**
- `apps/web/src/app/terms/page.tsx`
- `apps/web/src/app/privacy/page.tsx`

**Current state:**
✅ **Both pages have real, substantive legal content:**

**Terms of Service (`/terms`)** — 11 sections covering:
- Acceptance of Terms
- Electronic Signature Consent (with ESIGN Act/UETA/ECA 2000 references)
- Legal Validity with jurisdiction callouts (US, EU, UK)
- Identity Verification
- Audit Trail & Record Keeping
- Document Integrity
- Data Protection
- Document Retention (7-year minimum)
- Limitation of Liability
- Governing Law (California)
- Contact Information (legal@lexportai.com)

**Privacy Policy (`/privacy`)** — 13 sections covering:
- Data collection (personal + automatic)
- Usage purposes
- GDPR legal basis
- Data sharing
- Data retention
- User rights (GDPR)
- Cookies
- Security
- International transfers
- Children's privacy
- Contact (privacy@lexport.ai)

**No changes needed.** Both are production-quality.

**One minor note:** The Privacy Policy uses a dynamic date (`new Date().toLocaleDateString(...)`) which means the "Last updated" date changes on every page render. Consider hardcoding:
```tsx
// Optional: replace dynamic date with static
// OLD:
<p className="text-slate-500">Last updated: {new Date().toLocaleDateString("en-US", { month: "long", day: "numeric", year: "numeric" })}</p>
// NEW:
<p className="text-slate-500">Last updated: February 18, 2026</p>
```

---

### LEX-LAUNCH-014: Production Deployment Checklist

**Priority:** P1  
**Estimated time:** 10 minutes  
**Files to create:**
- `docs/DEPLOYMENT_CHECKLIST.md`

```bash
cat > ~/Desktop/projects/lexport-ai/docs/DEPLOYMENT_CHECKLIST.md << 'HEREDOC'
# Production Deployment Checklist

## Pre-Deployment

### Environment Variables (all required for production)

#### Supabase
- [ ] `NEXT_PUBLIC_SUPABASE_URL` — Production Supabase project URL
- [ ] `NEXT_PUBLIC_SUPABASE_ANON_KEY` — Public anon key
- [ ] `SUPABASE_SERVICE_ROLE_KEY` — Service role key (server-side only)
- [ ] `DATABASE_URL` — PostgreSQL connection string

#### AI
- [ ] `OPENAI_API_KEY` — OpenAI API key (for contract generation)

#### Stripe
- [ ] `STRIPE_SECRET_KEY` — Live secret key (starts with `sk_live_`)
- [ ] `STRIPE_WEBHOOK_SECRET` — Webhook signing secret (`whsec_...`)
- [ ] `NEXT_PUBLIC_STRIPE_PUBLISHABLE_KEY` — Live publishable key (`pk_live_`)
- [ ] `STRIPE_PRO_PRICE_ID` — Stripe Price ID for Pro plan ($19.99/mo)
- [ ] `STRIPE_TEAM_PRICE_ID` — Stripe Price ID for Business plan ($39.99/mo)

#### Email
- [ ] `RESEND_API_KEY` — Resend API key
- [ ] `EMAIL_FROM` — Verified sender (e.g., `Lexport <noreply@lexportai.com>`)
- [ ] `SUPPORT_EMAIL` — Support inbox email

#### Analytics & Monitoring
- [ ] `NEXT_PUBLIC_POSTHOG_KEY` — PostHog project API key
- [ ] `NEXT_PUBLIC_POSTHOG_HOST` — PostHog host URL
- [ ] `NEXT_PUBLIC_SENTRY_DSN` — Sentry DSN
- [ ] `SENTRY_ORG` — Sentry organization slug
- [ ] `SENTRY_PROJECT` — Sentry project name
- [ ] `SENTRY_AUTH_TOKEN` — Sentry auth token (for source maps)

#### App
- [ ] `NEXT_PUBLIC_APP_URL` — Production URL (e.g., `https://lexportai.com`)

### Stripe Setup
- [ ] Create Pro product & price ($19.99/mo recurring)
- [ ] Create Business product & price ($39.99/mo recurring)
- [ ] Set up webhook endpoint 1: `https://lexportai.com/api/webhooks/stripe`
  - Events: payment_intent.*, charge.refunded, checkout.session.completed, account.*, payout.*
- [ ] Set up webhook endpoint 2: `https://lexportai.com/api/billing/webhook`
  - Events: checkout.session.completed, customer.subscription.*, invoice.payment_failed
- [ ] Enable Stripe Connect (for payment collection feature)
- [ ] Configure Stripe branding (logo, colors, statement descriptor)

### DNS & Domain
- [ ] Domain `lexportai.com` pointing to hosting provider
- [ ] SSL certificate active (auto with Netlify/Vercel)
- [ ] `www` redirect to apex domain (or vice versa)

### Supabase
- [ ] Database migrations applied
- [ ] RLS policies verified
- [ ] Auth email templates configured
- [ ] Redirect URLs configured for auth callbacks
- [ ] Custom SMTP configured for auth emails (optional but recommended)

### Email
- [ ] Domain verified in Resend (for custom sender)
- [ ] SPF, DKIM, DMARC records configured
- [ ] Test emails sending successfully

## Post-Deployment Verification

- [ ] Homepage loads, pricing shows $19.99/$39.99
- [ ] Register flow works (email + Google OAuth)
- [ ] Login flow works
- [ ] Contract creation works (AI generation)
- [ ] E-signature flow works end-to-end
- [ ] Stripe checkout works (test with Pro plan)
- [ ] Stripe webhook delivers events
- [ ] PDF download works
- [ ] Email notifications deliver
- [ ] Sentry receives test error
- [ ] PostHog receives events
- [ ] Terms and Privacy pages accessible

## Monitoring (First 48 Hours)

- [ ] Sentry dashboard — watch for new errors
- [ ] Stripe dashboard — monitor webhook delivery rate
- [ ] Supabase dashboard — monitor database connections
- [ ] Resend dashboard — monitor email delivery rates
HEREDOC
```

**Verification:**
```bash
cat ~/Desktop/projects/lexport-ai/docs/DEPLOYMENT_CHECKLIST.md | head -5
# Should show the header
```

---

## Execution Order

Tasks can be parallelized where there are no dependencies:

```
Phase 1 — Independent P0 fixes (can all run in parallel):
  LEX-LAUNCH-001 (Paywall price)         ~2 min
  LEX-LAUNCH-002 (MONETIZATION.md)       ~3 min
  LEX-LAUNCH-003 (PRD.md)                ~2 min
  LEX-LAUNCH-004 (rate-limits.ts)        ~1 min
  LEX-LAUNCH-007 (delete duplicate)      ~1 min

Phase 2 — P0 code changes (sequential, more involved):
  LEX-LAUNCH-005 (usage reset)           ~15 min
  LEX-LAUNCH-006 (disclaimer)            ~20 min

Phase 3 — P0 documentation:
  LEX-LAUNCH-008 (Stripe webhooks doc)   ~5 min

Phase 4 — P1 items (can run in parallel):
  LEX-LAUNCH-009 (Sentry doc)            ~5 min
  LEX-LAUNCH-010 (E2E tests)             ~45 min
  LEX-LAUNCH-011 (Welcome email)         ~20 min
  LEX-LAUNCH-012 (SEO meta)              ~5 min
  LEX-LAUNCH-013 (Terms/Privacy verify)  ~2 min (verification only)
  LEX-LAUNCH-014 (Deployment checklist)  ~10 min
```

**Dependencies:**
- LEX-LAUNCH-001 through LEX-LAUNCH-004 have NO dependencies — do them first
- LEX-LAUNCH-005 depends on nothing — can start immediately
- LEX-LAUNCH-006 depends on nothing — can start immediately
- LEX-LAUNCH-010 (E2E tests) should run AFTER pricing fixes (001-004) since tests verify pricing
- LEX-LAUNCH-011 (Welcome email) depends on nothing
- All P1 tasks are independent of each other

---

## Total Estimated Time

| Phase | Time |
|-------|------|
| Phase 1 (parallel P0 fixes) | ~5 min |
| Phase 2 (P0 code changes) | ~35 min |
| Phase 3 (P0 documentation) | ~5 min |
| Phase 4 (P1 items, parallel) | ~45 min |
| **Total (sequential)** | **~2 hours** |
| **Total (with parallelization)** | **~1.5 hours** |

---

## Post-Completion Verification

After all tasks are complete, run:

```bash
cd ~/Desktop/projects/lexport-ai/apps/web

# 1. TypeScript check (no errors)
npx tsc --noEmit --pretty

# 2. Lint check
npm run lint

# 3. Build check
npm run build

# 4. Run existing tests
npm test

# 5. Run E2E tests (requires dev server)
npm run dev &
sleep 10
npx playwright test --reporter=list
kill %1

# 6. Verify no pricing inconsistencies remain
echo "=== Pricing Check ==="
grep -rn '\$25' apps/web/src/ --include="*.tsx" --include="*.ts"
grep -rn '£29\|£79\|£5\|£7' docs/
echo "=== Should be empty above ==="

# 7. Verify free tier limit is consistent
echo "=== Free Tier Check ==="
grep -n 'contractsPerMonth: 3\|contractsLimit: 3' apps/web/src/lib/rate-limits.ts apps/web/src/app/api/user/subscription/route.ts
echo "=== Should show 3 in both files ==="
```
