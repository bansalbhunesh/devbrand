# DevBrand

GitHub → LinkedIn posts + resume bullets. No hype. No emoji.

## Stack
- Next.js 14 (App Router)
- NextAuth v4 with GitHub OAuth
- Claude API (claude-sonnet-4-6)
- Postgres (Neon free tier)
- Stripe for $15/mo billing

## Setup

### 1. Clone and install
```bash
npm install
```

### 2. Environment variables
```bash
cp .env.example .env.local
```

Fill in:
- `GITHUB_CLIENT_ID` / `GITHUB_CLIENT_SECRET` — create at github.com/settings/applications/new
  - Homepage URL: http://localhost:3000
  - Callback URL: http://localhost:3000/api/auth/callback/github
- `NEXTAUTH_SECRET` — run `openssl rand -base64 32`
- `ANTHROPIC_API_KEY` — console.anthropic.com
- `DATABASE_URL` — Neon free tier: neon.tech
- `STRIPE_SECRET_KEY` / `STRIPE_PRO_PRICE_ID` / `STRIPE_WEBHOOK_SECRET` — dashboard.stripe.com
- `CRON_SECRET` — run `openssl rand -base64 32`

### 3. Database
```bash
psql $DATABASE_URL -f schema.sql
```

### 4. Stripe webhook (local dev)
```bash
stripe listen --forward-to localhost:3000/api/webhook
```

### 5. Run
```bash
npm run dev
```

## File structure
```
app/
  layout.tsx                    # Root layout with metadata + providers
  page.tsx                      # Landing page
  globals.css                   # Full design system
  providers.tsx                 # SessionProvider wrapper
  dashboard/
    page.tsx                    # Main dashboard (protected by middleware)
    loading.tsx                 # Loading skeleton
  api/
    auth/[...nextauth]/route.ts # NextAuth handler
    generate/route.ts           # Core: GitHub scan → Claude → outputs
    history/route.ts            # Fetch past outputs
    upgrade/route.ts            # Stripe checkout / billing portal
    webhook/route.ts            # Stripe webhook (plan upgrades)
    cron/reset/route.ts         # Monthly generation reset (Vercel cron)

lib/
  auth.ts                       # NextAuth config + GitHub OAuth
  github.ts                     # PR fetcher + scorer + stack detector
  claude.ts                     # Prompt builder + Claude API caller
  db.ts                         # Postgres queries + shared pool
  stripe.ts                     # Stripe helpers (lazy init)
  rate-limit.ts                 # In-memory rate limiter

components/
  Landing.tsx                   # Landing page with pricing
  Dashboard.tsx                 # Main UI with generate + history tabs

types/
  next-auth.d.ts                # Session type augmentation

middleware.ts                   # Route protection for /dashboard
schema.sql                      # Postgres schema
vercel.json                     # Cron job config
```

## Features
- Smart PR scoring — filters noise, ranks by impact
- Seniority-aware tone — junior/mid/senior
- 3 LinkedIn post variations per PR (Problem / Tradeoff / Learnings)
- STAR-format resume bullets
- Interview hook generation
- Generation history with copy-to-clipboard
- Free (3/mo) and Pro (unlimited) plans
- Stripe billing with customer portal
- Rate limiting (5 req/min per user)
- Monthly generation auto-reset

## Cost math
- Claude API: ~$0.009 per generation session
- At 10 sessions/month per user: $0.09 COGS
- At $15/mo: ~99% gross margin
- Neon free tier: 0.5GB, enough for first 500 users
- Stripe: 2.9% + 30¢ per transaction

## Deploy
Push to GitHub → connect to Vercel → add env vars → done.
Set Stripe webhook URL to: https://yourdomain.com/api/webhook
