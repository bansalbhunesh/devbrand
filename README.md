<div align="center">
  <img src="https://devbrand.ai/og-main.png" alt="DevBrand Banner" width="100%" />

  <h1>DevBrand</h1>
  <p><b>Build quietly. Compound publicly.</b></p>

  [![CI/CD](https://github.com/bansalbhunesh/devbrand/actions/workflows/playwright.yml/badge.svg)](https://github.com/bansalbhunesh/devbrand/actions)
  [![License: MIT](https://img.shields.io/badge/License-MIT-blue.svg)](https://opensource.org/licenses/MIT)
  [![TypeScript](https://img.shields.io/badge/TypeScript-5.0-blue.svg)](https://www.typescriptlang.org/)
</div>

---

## 🛑 The Problem

Technical founders and builders are quietly shipping massive architectural wins, but their public visibility doesn't reflect their capabilities. Marketing feels like "cringe." Bragging feels unnatural. As a result, the best engineers remain invisible.

## ⚡ The Solution

**DevBrand is Confidence Software.**
It is an intelligent translation layer that automatically analyzes your pull requests, determines what actually mattered, and generates thoughtful, authentic weekly engineering updates. 

No hype. No emojis. No "engagement bait." Just a calm, clear record of what you shipped, so your reputation compounds while you focus on the code.

---

## ✨ Core Features

* **🧠 Structured Context Engine**: Extracts architectural shifts and true complexity from commits, filtering out minor dependency bumps and noise via a 6-layer pipeline.
* **🛡️ The OBLITERATUS Protocol**: A split-identity prompt architecture that forces the LLM into a cynical, high-competence Staff Engineer persona. Strict firewall rules obliterate emojis, hype language, and engagement bait.
* **🧠 Second Brain "Gap Reporting"**: Actively scans repository diffs to detect removed `// TODO` and `// DEBT` comments, piping concrete evidence of paid architectural debt directly into the digest.
* **📝 Authentic Work Journals**: Generates a single, minimalist UI card every Friday with 3 highly-typed variants: *The Narrative (Trade-offs)*, *The Execution Log*, and *The Minimalist (Algorithmic compression)*.
* **🎛️ Style-Drift Gate**: Quantitatively measures the words-per-sentence of the generated draft against the average of your last 3 digests to prevent the LLM from hallucinating verbosity.
* **🏆 The Reputation Economy**: Automatically extracts verifiable engineering traits from commit history to help you build a credible builder profile.

---

## 🏗️ Architecture

DevBrand is engineered as a highly resilient, distributed monorepo built for scale.

```mermaid
graph TD
    A[GitHub Webhooks / VS Code] -->|Events| B(REST API v1 / GraphQL)
    B --> C{Event Bus (Redis Streams)}
    C --> D[Multi-Model AI Router]
    D -->|Failover/Retry| E[OpenAI / Claude / Local LLM]
    C --> F[AST Parsers Go/Py/TS]
    F --> G[(PostgreSQL/Neon)]
    D --> G
    G --> H[TanStack React UI + 3D Canvas]
```

### The Tech Stack
- **Frontend**: TanStack Start / React 19 / Vite / Framer Motion / React Three Fiber (Web UI)
- **Backend**: Node.js / BullMQ / Redis / Zod
- **Database**: PostgreSQL (Neon) via Drizzle ORM
- **Observability**: Sentry, PostHog, Pino Logging
- **Testing**: Playwright (Exhaustive E2E)

---

## 🚀 Getting Started

To run DevBrand locally, ensure you have **Node 22**, **pnpm**, and **Docker** installed.

### 1. Clone & Install
```bash
git clone https://github.com/bansalbhunesh/devbrand.git
cd devbrand
pnpm install
```

### 2. Environment Setup
Copy the example environment file and add your keys (OpenAI, GitHub App, etc).
```bash
cp .env.example .env
```

### 3. Spin up the Infrastructure
This will start your local Redis and PostgreSQL instances.
```bash
docker-compose up -d
```

### 4. Run the Platform
```bash
pnpm run dev
```
The platform will be live at `http://localhost:3000`.

---

## 🧪 Testing

We rely on **Playwright** for exhaustive End-to-End testing across our entire stack.

```bash
# Run the E2E suite
pnpm exec playwright test

# View the test report
pnpm exec playwright show-report
```

---

<div align="center">
  <b>Visibility for builders who hate marketing.</b><br>
  <i>Your reputation, extracted directly from your commits.</i>
</div>
