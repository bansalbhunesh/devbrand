<div align="center">
  <img src="https://devbrand.ai/og-main.png" alt="DevBrand Banner" width="100%" />

  <h1>DevBrand</h1>
  <p><b>The Intelligence Layer for Software Systems</b></p>

  [![CI/CD](https://github.com/bansalbhunesh/devbrand/actions/workflows/playwright.yml/badge.svg)](https://github.com/bansalbhunesh/devbrand/actions)
  [![License: MIT](https://img.shields.io/badge/License-MIT-blue.svg)](https://opensource.org/licenses/MIT)
  [![TypeScript](https://img.shields.io/badge/TypeScript-5.0-blue.svg)](https://www.typescriptlang.org/)
</div>

---

## 🛑 The Problem

AI is generating code faster than humans can review it. Pull Requests are bloated with subtle architectural rot, hidden technical debt, and what we call **"AI Slop"**. Engineering teams are losing their grip on system topology because architecture is decaying silently.

## ⚡ The Solution

**DevBrand is an Engineering Judgment Engine.** 
We don't just run linters or summarize diffs. We run deep, multi-model analysis over your codebase to predict maintainability decay, map hidden service coupling, and expose architectural flaws before they hit production. 

Think of it as an aggressively honest Staff Engineer that reviews every PR in milliseconds.

---

## ✨ Core Features

* **🤖 The Verdict Engine**: A 7-layer heuristic and ML engine that analyzes PRs for semantic intent, complexity acceleration, and AI-generated bloat.
* **🗺️ Living System Topology**: A real-time, 3D interactive X-Ray of your repository dependencies and microservice meshes.
* **🏆 The Reputation Economy**: Automatically extracts verifiable "Ego Scores" and engineering traits (e.g. *Ex-FAANG Reliability Engineer*, *Startup Speed Demon*) from commit history.
* **🔥 Repo Roast**: Our viral, brutally honest teardown of public GitHub repositories.

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
  <b>Built for engineers who care about the craft.</b><br>
  <i>Exposing the invisible before it becomes irreversible.</i>
</div>
