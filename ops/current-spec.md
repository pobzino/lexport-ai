# LEX-005 RETRY: Fix TS Errors + Missing Signature Reminder Features

## Context
LEX-005 backend (commit dd38221) is mostly complete. The cron job processes signature reminders and expires deadline-passed requests. BUT: build fails with 2 TS errors, and several spec requirements were not implemented.

## CRITICAL: Fix TypeScript Errors First

### TS Error 1 — Line 283: `contract?.users?.name`
**File:** `apps/web/src/app/api/reminders/process/route.ts`
**Problem:** Supabase join `contracts!inner(id, title, user_id, users(name))` returns `users` as `{ name: any }[]` (array), not a single object.
**Fix:** Change `contract?.users?.name` to handle array: `(contract?.users as any)?.[0]?.name` or use type assertion.

### TS Error 2 — Line 339: `sigRequest.reminder_interval_days`
**File:** `apps/web/src/app/api/reminders/process/route.ts`
**Problem:** `reminder_interval_days` is NOT in the select query. The column exists in DB (added by migration) but was omitted from the select.
**Fix:** Add `reminder_interval_days` to the select query string at line 264:
```
id, contract_id, signer_email, signer_name, token,
reminder_enabled, reminder_count, max_reminders,
next_reminder_at, expires_at, created_at, reminder_interval_days,
contracts!inner(id, title, user_id, users(name))
```

### Additional Backend Fix
**Line 271:** `.lt("reminder_count", 5)` is hardcoded. Should use the per-request `max_reminders` column value. Remove this filter and add the check inside the loop instead (compare `sigRequest.reminder_count < sigRequest.max_reminders`).

## AFTER TS fixes pass, implement these missing features:

### 1. Sign Page — Expired State
**File:** `apps/web/src/app/sign/[token]/page.tsx`

When the signing page loads and the signature request status is 'expired':
- Show a clear "This signature request has expired" message
- Display the expiration date
- Hide the signing interface
- Show a message: "Please contact the sender to request a new signing link"
- Style with red/warning colors (consistent with existing alert patterns)

### 2. Expiration Notifications
**File:** `apps/web/src/app/api/reminders/process/route.ts` (expiration section, ~line 380)

Currently the expiration processing just marks requests as expired and logs an audit event. Add:
1. Send notification email to signer: "This signature request has expired. Contact the sender for a new link."
2. Send notification email to contract owner: "Signature request for [contract] expired. [Signer name] did not sign before the deadline. You can re-send from your dashboard."
3. Use existing email patterns from `@/lib/email` — you may need to create `sendExpirationNotificationToSigner` and `sendExpirationNotificationToOwner` functions.

### 3. Dashboard — Reminder Settings Panel
**File:** `apps/web/src/app/dashboard/contracts/[id]/page.tsx` (or the contract detail page)

Add a "Signature Reminders" section to the contract detail view:
1. **Auto-reminder toggle** — show current state, call API to toggle `reminder_enabled`
2. **Reminder history** — query `signature_reminder_history` and display as a timeline (date, type, recipient)
3. **Expiration countdown** — for pending signature requests, show "Expires in X days" or "Expired" with appropriate styling
4. **Re-send button** — for expired requests, show "Re-send" button that creates a new signature request with a fresh token (call existing `/api/contracts/[id]/send` endpoint)

Keep the UI simple — a collapsible panel or card section. Use existing Tailwind patterns from the codebase.

### 4. API: Toggle Reminder Setting
Create or extend an endpoint to toggle auto-reminders:
**POST** `/api/contracts/[id]/reminders/toggle`
- Body: `{ signatureRequestId: string, reminderEnabled: boolean }`
- Update `signature_requests.reminder_enabled`
- Auth: verify user owns the contract

## Acceptance Criteria (for retry)
1. `npx tsc --noEmit` passes with 0 new errors
2. Sign page shows clear expired state for expired requests
3. Expiration sends email to both signer and owner
4. Contract detail page shows reminder settings panel
5. Re-send button works for expired requests
6. `max_reminders` used from DB, not hardcoded

## Files to Modify
1. `apps/web/src/app/api/reminders/process/route.ts` — TS fixes + expiration notifications
2. `apps/web/src/app/sign/[token]/page.tsx` — expired state handling
3. `apps/web/src/app/dashboard/contracts/[id]/page.tsx` — reminder settings panel
4. `apps/web/src/lib/email.ts` — new expiration notification functions (if needed)
5. `apps/web/src/app/api/contracts/[id]/reminders/toggle/route.ts` — new toggle endpoint

## Priority Order
1. Fix TS errors (MUST DO FIRST — verify build passes)
2. Sign page expired state
3. Expiration notifications
4. Dashboard panel + toggle API
