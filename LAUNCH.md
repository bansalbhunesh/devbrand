# 🚀 DevBrand: Zero-to-Production Guide

Follow these simple, detailed steps to get DevBrand live for your users.

## 1. Infrastructure Preparation
You will need accounts on these 4 platforms (all have free tiers):
1. **GitHub**: For OAuth and PR scanning.
2. **Neon.tech**: For your Postgres database.
3. **Upstash.com**: For Redis (Rate limiting).
4. **Stripe.com**: For processing payments.

## 2. GitHub OAuth Setup
1. Go to **Settings > Developer Settings > OAuth Apps > New OAuth App**.
2. **Homepage URL**: `http://localhost:3000` (Local) or `https://your-domain.com` (Prod).
3. **Authorization Callback URL**: `http://localhost:3000/api/auth/callback/github`.
4. Copy your **Client ID** and **Client Secret**.

## 3. Stripe Configuration
1. Go to the **Stripe Dashboard**.
2. Create a new **Product** called "DevBrand Pro" ($12/month).
3. Copy the **Price ID** (starts with `price_...`).
4. Set up a **Webhook**:
   - URL: `https://your-domain.com/api/webhook`.
   - Events: `checkout.session.completed`, `customer.subscription.updated`, `customer.subscription.deleted`.
   - Copy the **Webhook Signing Secret** (starts with `whsec_...`).

## 4. Environment Secrets
Create a `.env` file and fill in these values:
```env
# Infrastructure
DATABASE_URL="postgres://..."
UPSTASH_REDIS_REST_URL="https://..."
UPSTASH_REDIS_REST_TOKEN="..."

# Auth
GITHUB_TOKEN="ghp_..." # Your Personal Access Token for fallback
GITHUB_CLIENT_ID="..."
GITHUB_CLIENT_SECRET="..."
SESSION_SECRET="..." # Run: openssl rand -base64 32
APP_URL="http://localhost:3000"

# Intelligence
ANTHROPIC_API_KEY="sk-ant-..."
CLAUDE_MODEL="claude-3-5-sonnet-20241022"

# Billing
STRIPE_SECRET_KEY="sk_test_..."
STRIPE_PRO_PRICE_ID="price_..."
STRIPE_WEBHOOK_SECRET="whsec_..."
```

## 5. Deployment Steps
### Local
1. `npm install`
2. `npm run db:push` (Syncs schema to Neon)
3. `npm run dev`

### Production (Cloudflare Pages/Workers)
1. Link your GitHub repo to **Cloudflare Pages**.
2. Select **TanStack Start** (Nitro) as the framework.
3. Add all variables from your `.env` to the **Cloudflare Dashboard > Settings > Variables**.
4. Deploy!

## 6. Verification Checklist
- [ ] **Login**: Sign in with GitHub works.
- [ ] **Transform**: Pasting a public PR URL generates 3 LinkedIn posts.
- [ ] **Sharing**: The `/t/:slug` page displays the impact story with citations.
- [ ] **Roast**: The terminal roast works for your GitHub username.
- [ ] **Billing**: Clicking "Upgrade" redirects to Stripe Checkout.
