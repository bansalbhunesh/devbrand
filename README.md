# DevBrand 🚀
### Make the invisible labor of engineering visible. Deniable no more.

DevBrand is an elite engineering reputation platform that transforms raw technical output into high-fidelity, verifiable career leverage. By analyzing PRs, architectural shifts, and complex refactors using neural signal processing (AI), DevBrand generates "Systems of Proof" that speak the language of impact.

![DevBrand Hero](./docs/assets/hero.png)

## ⚡ The Problem
Traditional resumes and LinkedIn profiles are built on hype and buzzwords. They fail to capture:
- **Architectural Depth**: The subtle shift from cookie-based auth to stateless JWT pipelines.
- **Reliability Wins**: Implementing exponential backoff with jitter that saved a production cluster.
- **Engineering Rigor**: The thousands of lines of "invisible" refactoring that enabled a new feature.

## 💎 The Solution: Systems of Proof
DevBrand analyzed your GitHub activity and generates narrative-driven impact stories, **strictly backed by code citations**.

### Key Features:
- **Neural Impact Analysis**: AI that understands *intent*, not just line counts.
- **Evidence Citations**: Every claim links directly to specific files and commit SHAs.
- **Elite Aesthetic**: A cinematic, high-contrast UI designed for the staff-plus engineering tier.
- **Radar Feed**: A global stream of verifiable architectural transformations across the industry.

![Intelligence Section](./docs/assets/intelligence.png)

## 🛠️ Tech Stack
- **Framework**: [TanStack Start](https://tanstack.com/router/v1/docs/start/overview) (Full-stack React)
- **Routing**: [TanStack Router](https://tanstack.com/router)
- **State & Data**: [TanStack Query](https://tanstack.com/query)
- **Styling**: Vanilla CSS + Tailwind (Custom Tokens)
- **Animation**: [Framer Motion](https://www.framer.com/motion/) (Physics-based)
- **Database**: Drizzle ORM + PostgreSQL
- **Real-time**: Upstash Redis (Job Queues & Rate Limiting)

## 🚀 Getting Started

### Prerequisites
- Node.js 18+
- PostgreSQL
- Redis (Upstash recommended)

### Installation

1. **Clone and Install**
   ```bash
   git clone https://github.com/bansalbhunesh/devbrand.git
   cd devbrand
   npm install
   ```

2. **Environment Setup**
   Create a `.env` file based on the environment requirements:
   ```env
   DATABASE_URL=postgres://...
   UPSTASH_REDIS_REST_URL=...
   UPSTASH_REDIS_REST_TOKEN=...
   GITHUB_CLIENT_ID=...
   GITHUB_CLIENT_SECRET=...
   SESSION_SECRET=...
   APP_URL=http://localhost:5173
   ```

3. **Database Migration**
   ```bash
   npm run db:push
   ```

4. **Run Development Server**
   ```bash
   npm run dev
   ```

## 🗺️ Product Roadmap
- [x] **Cinematic Landing Page**: High-fidelity interactive hero and neural background.
- [x] **Evidence Engine**: Verifiable PR-to-Narrative transformation.
- [x] **Engineering Radar**: Public feed of architectural wins.
- [ ] **Voice-over Walkthroughs**: AI-generated audio explainers for complex PRs.
- [ ] **Multi-Repo Context**: Cross-repository impact analysis.

---

### **Visual Walkthrough**

#### **The Radar (Explore Feed)**
Stay ahead of the industry by observing how elite teams are refactoring their core services.
![Explore Feed](./docs/assets/explore.png)

#### **The Forge (Dashboard)**
Drop a PR link, select your tone, and watch DevBrand forge a System of Proof.
![Dashboard](./docs/assets/dashboard.png)

---
*Built for engineers who care about the craft.*
**DevBrand — deniable no more.**
