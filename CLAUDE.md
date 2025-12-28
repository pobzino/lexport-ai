# Lexport AI - Project Guide

## Overview

Lexport is an AI-powered legal platform for startup founders and freelancers. Create legally binding contracts, collect e-signatures, and manage documents - all in one place.

## Tech Stack

- **Framework**: Next.js 16 (App Router)
- **Runtime**: Bun
- **Backend**: Supabase (PostgreSQL, Auth, Storage)
- **Styling**: Tailwind CSS v4
- **AI**: OpenAI (GPT-5-mini for generation, GPT-4o for analysis/chat)
- **Hosting**: Netlify

## Project Structure

```
src/
├── app/                    # Next.js App Router
│   ├── (auth)/            # Auth pages (login, register)
│   ├── (dashboard)/       # Protected dashboard pages
│   ├── auth/callback/     # OAuth callback handler
│   └── globals.css        # Global styles
├── components/
│   ├── ui/                # Reusable UI components
│   └── providers.tsx      # React context providers
├── db/
│   ├── types.ts           # Database types (mirrors Supabase schema)
│   └── index.ts           # Type exports
├── lib/
│   ├── supabase/          # Supabase client (client, server, middleware)
│   └── utils.ts           # Utility functions
└── types/
    └── contracts.ts       # TypeScript types for contracts
```

## Commands

```bash
# Development
bun run dev          # Start dev server
bun run build        # Build for production
bun run start        # Start production server
bun run lint         # Run ESLint
bun run typecheck    # Type check
```

## Database

This project uses **Supabase** for all database operations:

- **Queries**: Use Supabase client directly (`@/lib/supabase/server` or `@/lib/supabase/client`)
- **Migrations**: Managed via Supabase MCP or Supabase Dashboard
- **Types**: Defined in `src/db/types.ts`

### Example Query

```typescript
import { createClient } from "@/lib/supabase/server";

const supabase = await createClient();
const { data, error } = await supabase
  .from("contracts")
  .select("*")
  .eq("user_id", userId);
```

## Key Files

- `src/db/types.ts` - Database types (users, contracts, signatures, etc.)
- `src/lib/supabase/` - Supabase client configuration
- `src/middleware.ts` - Auth middleware for protected routes
- `src/types/contracts.ts` - Contract types and metadata
- `netlify.toml` - Netlify deployment configuration

## Environment Variables

Copy `.env.example` to `.env` and fill in:

- `NEXT_PUBLIC_SUPABASE_URL` - Supabase project URL
- `NEXT_PUBLIC_SUPABASE_ANON_KEY` - Supabase anon key
- `OPENAI_API_KEY` - OpenAI API key for contract generation
- `STRIPE_SECRET_KEY` - Stripe secret key for payments
- `NEXT_PUBLIC_STRIPE_PUBLISHABLE_KEY` - Stripe publishable key

## Supabase Setup

1. Create project at supabase.com
2. Enable Google OAuth in Authentication > Providers
3. Set redirect URL to `https://yourdomain.com/auth/callback`
4. Copy credentials to `.env`

## Target Markets

- **US States**: California, Texas, New York
- **International**: United Kingdom
- **Users**: Startup founders, freelancers, consultants

## Contract Types (MVP)

1. NDA (Mutual & One-way)
2. Independent Contractor Agreement
3. Consulting Agreement
4. SAFE Note (US only)
5. Freelance Service Agreement

## Features

### E-Signature System
- Signature field types: signature, initials, date, text, checkbox, dropdown, attachment, payment
- Sequential or parallel signing order
- Auto-reminders for pending signatures
- Certificate of Completion generation

### Payment Collection
- Stripe integration for contract payments
- Payment status tracking
- Payment fields in signature flow

### AI Contract Generation
- **GPT-5-mini**: Contract generation with manifest-based prompts (~$0.009/contract)
- **GPT-4o**: Risk analysis, clause explanations, chat, modifications
- Clause manifests in `src/lib/contracts/manifests/` define required clauses per contract type
- Jurisdiction-aware prompts (CA non-competes unenforceable, UK GDPR, etc.)

### Risk Analysis
- AI-powered contract review for unusual clauses, missing protections
- Severity levels: critical, warning, info
- Cached by content hash to avoid redundant API calls
- Results stored in `contract_risk_analysis` table

## Development Guidelines

- Use Bun instead of npm/yarn for all operations
- Follow the existing component patterns in `src/components/ui/`
- Database migrations via Supabase MCP (`mcp__supabase__apply_migration`)
- Keep contracts jurisdiction-aware (CA, TX, NY, UK)
- Use Supabase client from `@/lib/supabase/server` for server components
- Use Supabase client from `@/lib/supabase/client` for client components
