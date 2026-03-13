# Lexport AI — Production Launch Checklist

## Critical Path (Must Pass Before Launch)

### Authentication & Accounts
- [ ] Google OAuth login works end-to-end
- [ ] Email/password registration works
- [ ] Email/password login works
- [ ] Password reset flow sends email and completes
- [ ] Logout clears session properly
- [ ] Protected routes redirect unauthenticated users to login
- [ ] OAuth callback handles errors gracefully
- [ ] Session persists across page refreshes

### Contract Creation (Core Flow)
- [ ] Smart intake: type a description → AI analyzes and recommends contract type
- [ ] Intake follow-up questions appear and are required
- [ ] Details step: signers, agreement details, optional clauses all render
- [ ] Review step: summary displays correctly (no raw JSON, no "null" values)
- [ ] AI generation completes successfully (streaming)
- [ ] Generated contract renders in editor with all clauses
- [ ] Template match: instant generation from pre-built templates works
- [ ] Contract saved to database after generation
- [ ] Contract appears in dashboard contracts list

### Contract Editor
- [ ] All clauses render with correct formatting
- [ ] Labeled blanks display with descriptive labels (not generic "fill in")
- [ ] Fill Blanks side panel opens and lists all blanks with labels
- [ ] Filling a blank updates the document inline
- [ ] Blanks counter updates (e.g., "3/15 completed")
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
- [ ] Post-checkout verification syncs subscription status
- [ ] Subscription tier reflected in UI (dashboard, settings)
- [ ] Usage limits enforced per tier (free: 1 contract/month)
- [ ] Upgrade prompt shown when limit reached
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
- [ ] `NEXT_PUBLIC_SUPABASE_URL` set in Netlify
- [ ] `NEXT_PUBLIC_SUPABASE_ANON_KEY` set in Netlify
- [ ] `SUPABASE_SERVICE_ROLE_KEY` set in Netlify
- [ ] `OPENAI_API_KEY` set and valid (check balance/quota)
- [ ] `STRIPE_SECRET_KEY` set (production key, not test)
- [ ] `NEXT_PUBLIC_STRIPE_PUBLISHABLE_KEY` set (production)
- [ ] `STRIPE_WEBHOOK_SECRET` set for production endpoint
- [ ] `RESEND_API_KEY` set and verified domain
- [ ] `NEXT_PUBLIC_GTM_ID` set for Google Tag Manager
- [ ] `NEXT_PUBLIC_POSTHOG_KEY` set for analytics
- [ ] No test/development keys in production env

### Supabase
- [ ] All migrations applied to production database
- [ ] RLS policies enabled on all tables
- [ ] RLS policies tested (users can only access own data)
- [ ] Storage buckets configured with correct permissions
- [ ] Auth email templates customized (not default Supabase)
- [ ] Auth redirect URLs set to production domain (lexportai.com)
- [ ] Google OAuth redirect URI points to production
- [ ] Database backups enabled / point-in-time recovery on

### Stripe
- [ ] Webhook endpoint registered: `https://lexportai.com/api/webhooks/stripe`
- [ ] Webhook events configured: `checkout.session.completed`, `customer.subscription.updated`, `customer.subscription.deleted`, `invoice.payment_succeeded`, `invoice.payment_failed`
- [ ] Product/price IDs match production Stripe dashboard
- [ ] Test a real checkout flow with Stripe test card
- [ ] Verify webhook delivery in Stripe dashboard

### Netlify / Hosting
- [ ] Production build succeeds (`bun run build`)
- [ ] No TypeScript errors (`bun run typecheck`)
- [ ] No lint errors (`bun run lint`)
- [ ] Custom domain `lexportai.com` configured and SSL active
- [ ] `www.lexportai.com` redirects to `lexportai.com`
- [ ] Netlify environment variables set (not committed to repo)
- [ ] Deploy previews disabled or restricted (to avoid leaking env vars)
- [ ] Edge functions / serverless function timeout adequate (contract generation ~45s)

### DNS & Email
- [ ] DNS records point to Netlify
- [ ] SPF, DKIM, DMARC records set for `lexportai.com`
- [ ] Resend domain verified for sending from `@lexportai.com`
- [ ] Test email delivery (signature requests, invoice emails, password reset)
- [ ] Emails not landing in spam

---

## SEO & Marketing Site

### Meta & OG Tags
- [ ] `og:image` is PNG format (not SVG) — 1200x630
- [ ] `apple-touch-icon` is PNG format (not SVG) — 180x180
- [ ] Title and description set on all public pages
- [ ] OG tags render correctly (test with opengraph.xyz or Twitter card validator)
- [ ] Favicon renders in all browsers

### Homepage
- [ ] Hero section renders, CTA buttons work
- [ ] Pricing section shows correct tiers and prices
- [ ] FAQ section loads, accordion opens/closes
- [ ] Footer links all resolve (no broken links)
- [ ] `#faq` anchor scrolls to FAQ section
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
- [ ] No native `alert()` or `confirm()` calls anywhere (all replaced with toast/confirm dialog)
- [ ] Destructive actions use confirmation dialog (delete contract, delete template, etc.)
- [ ] Success/error feedback via toast notifications
- [ ] Error states show meaningful messages (not raw error objects)

### Responsive / Mobile
- [ ] Homepage renders correctly on 375px viewport
- [ ] Dashboard navigation works on mobile (hamburger menu)
- [ ] Contract creation wizard works on mobile
- [ ] Contract editor readable on tablet
- [ ] Signing page works on mobile (canvas, form fields)

### Loading & Error States
- [ ] Dashboard routes have `loading.tsx` (skeleton/spinner)
- [ ] Dashboard routes have `error.tsx` (error boundary with retry)
- [ ] Contract generation shows progress overlay
- [ ] API errors don't show blank screens

### Brand & Visual
- [ ] `--color-brand-600` is Lexport blue (#529ec6), not gray
- [ ] Stripe embedded forms use Lexport blue (not purple #7c3aed)
- [ ] Google OAuth button shows proper Google logo colors
- [ ] Consistent typography and spacing across pages

---

## Security

### Data Protection
- [ ] All API routes verify authenticated user
- [ ] All API routes verify user owns the resource (contract, invoice, etc.)
- [ ] No hardcoded admin emails in source (use env var or DB flag)
- [ ] Rate limiting active on AI generation endpoints
- [ ] Rate limiting active on email-sending endpoints
- [ ] Input sanitization on user-generated content
- [ ] No secrets in client-side code or localStorage

### Headers & Config
- [ ] HTTPS enforced (HTTP redirects to HTTPS)
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
- [ ] Stripe webhook failures logged

### Analytics
- [ ] PostHog tracking active on production
- [ ] GTM loads via `next/script` (not `dangerouslySetInnerHTML`)
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
