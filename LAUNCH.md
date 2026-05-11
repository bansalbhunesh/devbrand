# 🚀 DevBrand: Zero-to-Production Guide

Follow these simple, detailed steps to get DevBrand live for your users.

## 1. Infrastructure Preparation

You will need accounts on these 4 platforms (all have free tiers):

1. **GitHub**: For OAuth and PR scanning.
2. **Neon.tech**: For your Postgres database.
3. **Upstash.com**: For Redis (Rate limiting).
4. **Razorpay.com**: For processing payments.

## 2. GitHub OAuth Setup

1. Go to **Settings > Developer Settings > OAuth Apps > New OAuth App**.
2. **Homepage URL**: `http://localhost:3000` (Local) or `https://your-domain.vercel.app` (Prod).
3. **Authorization Callback URL**: `https://your-domain.vercel.app/api/auth/callback/github`.
4. Copy your **Client ID** and **Client Secret**.

## 3. Razorpay Configuration

1. Go to the **Razorpay Dashboard**.
2. Copy your **Key ID** and **Key Secret**.
3. Set up a **Webhook**:
   - URL: `https://your-domain.vercel.app/api/webhook/razorpay`.
   - Events: `payment.captured`.
   - Copy the **Webhook Secret**.

## 4. Environment Secrets

Create a `.env` file and fill in these values:

```env
# Infrastructure
DATABASE_URL="postgres://..."
UPSTASH_REDIS_REST_URL="https://..."
UPSTASH_REDIS_REST_TOKEN="..."

# Auth
GITHUB_CLIENT_ID="..."
GITHUB_CLIENT_SECRET="..."
SESSION_SECRET="..." # Run: openssl rand -base64 32
APP_URL="https://your-domain.vercel.app"

# Intelligence
ANTHROPIC_API_KEY="sk-ant-..."

# Billing
RAZORPAY_KEY_ID="..."
RAZORPAY_KEY_SECRET="..."
RAZORPAY_WEBHOOK_SECRET="..."
```

## 5. Deployment Steps

### Local

1. `npm install`
2. `npm run db:push` (Syncs schema to Neon)
3. `npm run dev`

### Production (Vercel)

1. Link your GitHub repo to **Vercel**.
2. Vercel will auto-detect **TanStack Start**.
3. Add all variables from your `.env` to the **Vercel Project Settings > Environment Variables**.
4. Deploy!

## 6. Verification Checklist

- [ ] **Login**: Sign in with GitHub works.
- [ ] **Transform**: Pasting a public PR URL generates social posts.
- [ ] **Roast**: The terminal roast works for your GitHub username.
- [ ] **Billing**: Clicking "Upgrade" opens the Razorpay checkout.
