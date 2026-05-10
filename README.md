# 🚀 DevBrand: The Career OS for Engineers

**Turn invisible engineering work into verifiable career leverage.**

[![Stack: TanStack Start](https://img.shields.io/badge/Stack-TanStack_Start-FF4154?style=for-the-badge&logo=react)](https://tanstack.com/start)
[![Architecture: Edge-First](https://img.shields.io/badge/Arch-Edge--First-00ADD8?style=for-the-badge&logo=cloudflare)](https://workers.cloudflare.com/)
[![License: MIT](https://img.shields.io/badge/License-MIT-green?style=for-the-badge)](LICENSE)

DevBrand analyzes your GitHub Pull Requests, computes architectural impact scores, and transforms technical diffs into high-leverage LinkedIn posts, resume bullets, and interview hooks. **No hype. No emoji. Just evidence.**

---

## 💎 The 7-Layer Intelligence Pipeline

Unlike generic AI wrappers, DevBrand uses a multi-stage **7-Layer Analysis Engine** designed for engineering precision:

1.  **Layer 0 (Ingestion)**: Robust GitHub PR data retrieval with symbol extraction and AST awareness.
2.  **Layer 1 (Static Metrics)**: Quantifies cyclomatic complexity, churn, and Halstead effort.
3.  **Layer 2 (Graph Engine)**: Builds a recursive dependency graph using **PageRank** and **HITS** centrality metrics to identify "load-bearing" infrastructure.
4.  **Layer 3 (Impact Scoring)**: Computes the **ArchScore™** by weighting code changes against their network centrality.
5.  **Layer 4 (Invisible Work)**: AST-informed classification of refactors, tech debt, and performance tuning.
6.  **Layer 5 (Narrative Generation)**: Multi-stage LLM pipeline (Claude 3.5) focused on "No-Hype" evidence-backed engineering impact.
7.  **Layer 6 (Verification)**: Automated claim validation against structural and metric signals.
8.  **Layer 7 (Feedback Loop)**: Behavioral calibration using user edit-history to modulate confidence and hype.

*   **Evidence Citations**: Every generated claim is anchored to specific file paths and commit SHAs. Your reputation is backed by the git log.

## ✨ Key Features

- **PR Transformation**: Paste a PR URL; get 3 LinkedIn variations (Problem/Outcome, Tradeoffs, Learnings).
- **GitHub Roast**: A brutally honest (but technically accurate) analysis of your engineering habits.
- **Verified Impact Feed**: A public profile that showcases only your best, verified engineering stories.
- **Privacy First**: You control which stories are public. Everything else is encrypted and private by default.

---

## 🏗️ Technical Stack

DevBrand is built for maximum performance and near-zero COGS:

| Layer | Technology |
| :--- | :--- |
| **Framework** | [TanStack Start](https://tanstack.com/start) (Vite + React 18) |
| **Runtime** | Cloudflare Workers / Nitro (Edge-Native) |
| **Database** | [Neon Postgres](https://neon.tech/) (Serverless-optimized) |
| **ORM** | [Drizzle ORM](https://orm.drizzle.team/) |
| **Cache/Safety** | [Upstash Redis](https://upstash.com/) (Distributed Rate Limiting) |
| **Auth** | HMAC-Signed Sessions (SHA-256) |
| **Payments** | Stripe (Subscription Lifecycle + Webhooks) |

---

## 🛠️ Rapid Setup

### 1. Environment Configuration
```bash
cp .env.example .env
```
Ensure you have the following keys:
- `GITHUB_TOKEN`: For repository scanning.
- `ANTHROPIC_API_KEY`: Claude 3.5 Sonnet access.
- `SESSION_SECRET`: Min 32 chars for HMAC signing.
- `UPSTASH_REDIS_REST_URL`: For atomic rate limiting.

### 2. Installation & DB Sync
```bash
npm install
npm run db:push
```

### 3. Local Development
```bash
npm run dev
```

---

## 🛡️ Hardened for Production

DevBrand isn't just a prototype; it's a hardened SaaS:
- **CSRF Protection**: Verified OAuth state tokens.
- **Secure Cookies**: `__Secure-` prefixed, `HttpOnly`, `SameSite=Strict`.
- **Webhook Idempotency**: Stripe events are tracked to prevent duplicate processing.
- **AI Resilience**: Automatic retries for malformed JSON and token-budgeting for large diffs.

## 📈 Unit Economics
- **Avg. Generation Cost**: ~$0.009 (Claude + Upstash).
- **Gross Margin**: ~99% at $12/mo Pro tier.
- **Infrastructure**: Optimized for the free tier of Neon/Upstash for the first 500 users.

---

## 📜 License
MIT © [DevBrand](https://devbrand.ai)
