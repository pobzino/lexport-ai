# Lexport AI — Production Launch Checklist

> Items marked `[x]` have been verified during development/testing.
> Items marked `[ ]` still need manual verification before launch.

## Critical Path (Must Pass Before Launch)

### Authentication & Accounts
- [ ] Google OAuth login works end-to-end
- [ ] Email/password registration works
- [ ] Email/password login works
- [ ] Password reset flow sends email and completes
- [ ] Logout clears session properly
- [x] Protected routes redirect unauthenticated users to login
- [ ] OAuth callback handles errors gracefully
- [x] Session persists across page refreshes

### Contract Creation (Core Flow)
- [x] Smart intake: type a description → AI analyzes and recommends contract type
- [x] Intake follow-up questions appear and are required
- [x] Details step: signers, agreement details, optional clauses all render
- [x] Review step: summary displays correctly (no raw JSON, no "null" values)
- [ ] AI generation completes successfully (streaming) — *OpenAI transient error hit during testing, retry needed*
- [x] Generated contract renders in editor with all clauses
- [x] Template match: instant generation from pre-built templates works
- [ ] Contract saved to database after generation
- [ ] Contract appears in dashboard contracts list
- [x] Stale draft data cleared on new intake (no cross-type field corruption)

### Contract Editor
- [x] All clauses render with correct formatting
- [x] Labeled blanks display with descriptive labels (not generic "fill in")
- [x] Fill Blanks side panel opens and lists all blanks with labels
- [ ] Filling a blank updates the document inline
- [x] Blanks counter updates (e.g., "0/15 completed")
- [ ] AI chat panel opens and responds to questions
- [ ] Edit clause inline works
- [ ] Save/auto-save works
- [ ] PDF export/download works
- [ ] Version history accessible

### E-Signatures
- [ ] "Send for Signature" flow: add signers, set signing order
- [ ] Signer receives email notification with signing link
- [ ] Signing page loads for external signers (no auth required)
- [ ] Signature canvas works (draw signature, coordinates correct)
- [ ] Type signature option works
- [ ] Upload signature option works
- [ ] All required fields must be completed before submitting
- [ ] Signed document saved and status updated
- [ ] Completion certificate generated (or button hidden if not ready)
- [ ] Auto-reminder emails send for pending signatures

### Payments & Billing
- [ ] Stripe checkout: upgrade from free to pro works
- [ ] Stripe checkout: upgrade from free to team works
- [ ] Stripe webhook processes subscription events correctly
- [x] Post-checkout verification syncs subscription status
- [x] Subscription tier reflected in UI (dashboard, settings)
- [x] Usage limits enforced per tier (free: 1 contract/month)
- [x] Upgrade prompt shown when limit reached
- [ ] Stripe customer portal accessible from settings
- [ ] Payment collection in contracts (if enabled) works

### Invoices
- [ ] Create invoice works
- [ ] Send invoice via email works
- [ ] Invoice payment page loads for recipient
- [ ] Stripe payment completes and status updates
- [ ] Invoice list displays correctly with pagination

---

## Infrastructure & Deployment

### Environment Variables
- [x] `NEXT_PUBLIC_SUPABASE_URL` set in Netlify
- [x] `NEXT_PUBLIC_SUPABASE_ANON_KEY` set in Netlify
- [x] `SUPABASE_SERVICE_ROLE_KEY` set in Netlify
- [x] `OPENAI_API_KEY` set and valid (check balance/quota)
- [ ] `STRIPE_SECRET_KEY` set (production key, not test)
- [ ] `NEXT_PUBLIC_STRIPE_PUBLISHABLE_KEY` set (production)
- [ ] `STRIPE_WEBHOOK_SECRET` set for production endpoint
- [x] `RESEND_API_KEY` set and verified domain
- [x] `NEXT_PUBLIC_GTM_ID` set for Google Tag Manager
- [x] `NEXT_PUBLIC_POSTHOG_KEY` set for analytics
- [ ] No test/development keys in production env

### Supabase
- [x] All migrations applied to production database
- [x] RLS policies enabled on all tables
- [x] RLS policies tested (users can only access own data)
- [ ] Storage buckets configured with correct permissions
- [ ] Auth email templates customized (not default Supabase)
- [x] Auth redirect URLs set to production domain (lexportai.com)
- [ ] Google OAuth redirect URI points to production
- [ ] Database backups enabled / point-in-time recovery on

### Stripe
- [ ] Webhook endpoint registered: `https://lexportai.com/api/webhooks/stripe`
- [ ] Webhook events configured: `checkout.session.completed`, `customer.subscription.updated`, `customer.subscription.deleted`, `invoice.payment_succeeded`, `invoice.payment_failed`
- [ ] Product/price IDs match production Stripe dashboard
- [ ] Test a real checkout flow with Stripe test card
- [ ] Verify webhook delivery in Stripe dashboard

### Netlify / Hosting
- [x] Production build succeeds (`bun run build`)
- [x] No TypeScript errors (`bun run typecheck`)
- [ ] No lint errors (`bun run lint`)
- [x] Custom domain `lexportai.com` configured and SSL active
- [ ] `www.lexportai.com` redirects to `lexportai.com`
- [x] Netlify environment variables set (not committed to repo)
- [ ] Deploy previews disabled or restricted (to avoid leaking env vars)
- [ ] Edge functions / serverless function timeout adequate (contract generation ~45s)

### DNS & Email
- [x] DNS records point to Netlify
- [ ] SPF, DKIM, DMARC records set for `lexportai.com`
- [ ] Resend domain verified for sending from `@lexportai.com`
- [ ] Test email delivery (signature requests, invoice emails, password reset)
- [ ] Emails not landing in spam

---

## SEO & Marketing Site

### Meta & OG Tags
- [x] `og:image` is PNG format (not SVG) — 1200x630
- [x] `apple-touch-icon` is PNG format (not SVG) — 180x180
- [x] Title and description set on all public pages
- [ ] OG tags render correctly (test with opengraph.xyz or Twitter card validator)
- [x] Favicon renders in all browsers

### Homepage
- [ ] Hero section renders, CTA buttons work
- [ ] Pricing section shows correct tiers and prices
- [ ] FAQ section loads, accordion opens/closes
- [x] Footer links all resolve (no broken links)
- [x] `#faq` anchor scrolls to FAQ section
- [ ] Navbar mobile menu opens/closes
- [ ] "Get Started" / "Try Free" CTAs link to `/register`

### Legal Pages
- [ ] Terms of Service page exists and is linked from footer
- [ ] Privacy Policy page exists and is linked from footer
- [ ] Legal disclaimer present (Genie AI style, one-liner on CTA)
- [ ] Cookie consent banner (if required for target market)

---

## UX & Accessibility

### Dialogs & Feedback
- [x] No native `alert()` or `confirm()` calls anywhere (all replaced with toast/confirm dialog)
- [x] Destructive actions use confirmation dialog (delete contract, delete template, etc.)
- [x] Success/error feedback via toast notifications
- [x] Error states show meaningful messages (not raw error objects)

### Responsive / Mobile
- [ ] Homepage renders correctly on 375px viewport
- [ ] Dashboard navigation works on mobile (hamburger menu)
- [ ] Contract creation wizard works on mobile
- [ ] Contract editor readable on tablet
- [ ] Signing page works on mobile (canvas, form fields)

### Loading & Error States
- [x] Dashboard routes have `loading.tsx` (skeleton/spinner)
- [x] Dashboard routes have `error.tsx` (error boundary with retry)
- [x] Contract generation shows progress overlay
- [ ] API errors don't show blank screens

### Brand & Visual
- [x] `--color-brand-600` is Lexport blue (#529ec6), not gray
- [x] Stripe embedded forms use Lexport blue (not purple #7c3aed)
- [x] Invoice email template uses Lexport blue (not purple)
- [ ] Google OAuth button shows proper Google logo colors
- [ ] Consistent typography and spacing across pages

---

## Security

### Data Protection
- [x] All API routes verify authenticated user
- [x] All API routes verify user owns the resource (contract, invoice, etc.)
- [ ] No hardcoded admin emails in source (use env var or DB flag)
- [x] Rate limiting active on AI generation endpoints
- [x] Rate limiting active on email-sending endpoints
- [ ] Input sanitization on user-generated content
- [ ] No secrets in client-side code or localStorage

### Headers & Config
- [x] HTTPS enforced (HTTP redirects to HTTPS)
- [ ] CORS configured correctly (no wildcard in production)
- [ ] Content Security Policy headers set
- [ ] X-Frame-Options set to prevent clickjacking
- [ ] Sensitive cookies marked HttpOnly, Secure, SameSite

---

## Monitoring & Analytics

### Error Tracking
- [ ] Unhandled errors logged (Sentry, LogRocket, or similar)
- [ ] API route errors logged server-side with context
- [ ] OpenAI API failures logged with request IDs
- [x] Stripe webhook failures logged

### Analytics
- [x] PostHog tracking active on production
- [x] GTM loads via `next/script` (not `dangerouslySetInnerHTML`)
- [ ] Key events tracked: sign up, contract created, signature sent, payment completed
- [ ] Conversion funnel visible in analytics dashboard

---

## Pre-Launch Smoke Test (Do This Last)

Run through these flows on the live production URL as a real user:

1. [ ] Visit `lexportai.com` → homepage loads, looks correct
2. [ ] Click "Get Started" → register with email/password
3. [ ] Verify email (if required) → login
4. [ ] Onboarding flow completes (or can be skipped)
5. [ ] Create a contract via smart intake → AI generates successfully
6. [ ] Open contract editor → blanks labeled, fill a few blanks
7. [ ] Send contract for signature → signer email received
8. [ ] Open signing link → sign the document → completion status updates
9. [ ] Visit Settings → Billing → upgrade to Pro → Stripe checkout completes
10. [ ] Verify subscription reflected in dashboard
11. [ ] Create a second contract (verify limit increased after upgrade)
12. [ ] Test on mobile device (iPhone/Android) → core flow works
13. [ ] Test in incognito window → no stale state issues
