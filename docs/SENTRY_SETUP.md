# Sentry Setup Checklist

## Status: Code is ready, needs credentials

All three Sentry config files (`sentry.client.config.ts`, `sentry.server.config.ts`, `sentry.edge.config.ts`) and `next.config.ts` are already properly configured.

## Steps:

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
6. [ ] Also add these to Netlify/Vercel environment variables
7. [ ] Deploy and verify errors appear in Sentry dashboard

## What's already configured:
- Client: Session replay (10% sampling, 100% on error), browser tracing, PII scrubbing
- Server: 10% trace sampling, email scrubbing, ignores Next.js internal errors
- Edge: 10% trace sampling
- Build: Source map upload, tunnel route `/monitoring` for ad-blocker bypass
