# Production Deployment Checklist

## Pre-Deployment

### Environment Variables (all required for production)

#### Supabase
- [ ] `NEXT_PUBLIC_SUPABASE_URL`
- [ ] `NEXT_PUBLIC_SUPABASE_ANON_KEY`
- [ ] `SUPABASE_SERVICE_ROLE_KEY`
- [ ] `DATABASE_URL`

#### AI
- [ ] `OPENAI_API_KEY`

#### Stripe
- [ ] `STRIPE_SECRET_KEY` — Live secret key (`sk_live_`)
- [ ] `STRIPE_WEBHOOK_SECRET` — Webhook signing secret (`whsec_...`)
- [ ] `NEXT_PUBLIC_STRIPE_PUBLISHABLE_KEY` — Live publishable key (`pk_live_`)
- [ ] `STRIPE_PRO_PRICE_ID` — Price ID for Pro ($19.99/mo)
- [ ] `STRIPE_TEAM_PRICE_ID` — Price ID for Business ($39.99/mo)

#### Email
- [ ] `RESEND_API_KEY`
- [ ] `EMAIL_FROM` — Verified sender (e.g., `Lexport <noreply@lexportai.com>`)
- [ ] `SUPPORT_EMAIL`

#### Analytics & Monitoring
- [ ] `NEXT_PUBLIC_POSTHOG_KEY`
- [ ] `NEXT_PUBLIC_POSTHOG_HOST`
- [ ] `NEXT_PUBLIC_SENTRY_DSN`
- [ ] `SENTRY_ORG`
- [ ] `SENTRY_PROJECT`
- [ ] `SENTRY_AUTH_TOKEN`

#### App
- [ ] `NEXT_PUBLIC_APP_URL` — Production URL (e.g., `https://lexportai.com`)

### Stripe Setup
- [ ] Create Pro product & price ($19.99/mo recurring)
- [ ] Create Business product & price ($39.99/mo recurring)
- [ ] Webhook endpoint 1: `https://lexportai.com/api/webhooks/stripe` (see STRIPE_WEBHOOKS.md)
- [ ] Webhook endpoint 2: `https://lexportai.com/api/billing/webhook` (see STRIPE_WEBHOOKS.md)
- [ ] Enable Stripe Connect

### DNS & Domain
- [ ] Domain pointing to hosting
- [ ] SSL certificate active
- [ ] www redirect configured

### Supabase
- [ ] Database migrations applied
- [ ] RLS policies verified
- [ ] Auth redirect URLs configured
- [ ] Optional: custom SMTP for auth emails

### Email
- [ ] Domain verified in Resend
- [ ] SPF, DKIM, DMARC records configured

## Post-Deployment Verification

- [ ] Homepage loads, pricing shows $19.99/$39.99
- [ ] Register flow works (email + Google OAuth)
- [ ] Contract creation works (AI generation)
- [ ] E-signature flow end-to-end
- [ ] Stripe checkout works
- [ ] PDF download works
- [ ] Email notifications deliver
- [ ] Sentry receives test error
- [ ] Terms and Privacy pages accessible

## Monitoring (First 48 Hours)

- [ ] Sentry dashboard — watch for new errors
- [ ] Stripe dashboard — monitor webhook delivery
- [ ] Supabase — monitor database connections
- [ ] Resend — monitor email delivery rates
