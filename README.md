# DevBrand

GitHub → LinkedIn posts + resume bullets. No hype. No emoji.

## Stack
- Next.js 14 (App Router)
- NextAuth with GitHub OAuth
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
  page.tsx                    # Landing (redirects to /dashboard if authed)
  dashboard/page.tsx          # Main dashboard (protected)
  api/
    auth/[...nextauth]/       # NextAuth handler
    generate/route.ts         # Core: GitHub scan → Claude → outputs
    history/route.ts          # Fetch past outputs
    upgrade/route.ts          # Stripe checkout
    webhook/route.ts          # Stripe webhook (plan upgrades)

lib/
  github.ts                   # PR fetcher + scorer + stack detector
  claude.ts                   # Prompt builder + Claude API caller
  db.ts                       # Postgres queries
  auth.ts                     # NextAuth config
  stripe.ts                   # Stripe helpers

components/
  Landing.tsx                 # Landing page
  Dashboard.tsx               # Main UI
  Providers.tsx               # SessionProvider wrapper

schema.sql                    # Postgres schema
```

## Cost math
- Claude API: ~$0.009 per generation session
- At 10 sessions/month per user: $0.09 COGS
- At $15/mo: ~99% gross margin
- Neon free tier: 0.5GB, enough for first 500 users
- Stripe: 2.9% + 30¢ per transaction

## Deploy
Push to GitHub → connect to Vercel → add env vars → done.
Set Stripe webhook URL to: https://yourdomain.com/api/webhook
