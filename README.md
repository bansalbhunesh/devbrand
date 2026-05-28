<div align="center">
  <div style="background: linear-gradient(to right, #f59e0b, #ea580c); border-radius: 20px; padding: 2px;">
    <div style="background: #09090b; border-radius: 18px; padding: 40px 20px;">
      <h1 style="margin: 0; font-size: 3em; color: #fff; letter-spacing: -1px;">DevBrand</h1>
      <p style="color: #a1a1aa; font-size: 1.2em; font-weight: 300;">Turn your PRs into <b>LinkedIn clout.</b></p>
    </div>
  </div>
  <br />

  [![TypeScript](https://img.shields.io/badge/TypeScript-5.0-blue.svg)](https://www.typescriptlang.org/)
  [![License: MIT](https://img.shields.io/badge/License-MIT-blue.svg)](https://opensource.org/licenses/MIT)
  [![Vite](https://img.shields.io/badge/Vite-7.3.3-646CFF.svg)](https://vitejs.dev/)
</div>

---

## 🛑 The Problem

You just spent 40 hours fixing a devastating race condition in the distributed caching layer. Your reward? A single `LGTM` from a junior engineer who didn't even read the diff.

Meanwhile, a PM on LinkedIn just got 500 likes for writing an article about "Synergy".

The tech industry does not reward invisible labor. If you don't hype it, it never happened.

## ⚡ The Solution

**DevBrand is The Brutal Truth vs. LinkedIn Spin Engine.**

Drop any public GitHub Pull Request URL into the engine. Our heavily constrained AI system (OBLITERATUS) will analyze the raw diff and deliver two things:

1. **The Brutal Truth:** A cynical, unfiltered roast of what your code *actually* does, written by a burned-out Staff Engineer who hates your variable names.
2. **The LinkedIn Spin:** A corporate, emoji-filled, aggressively positive translation of that truth designed to instantly farm engagement on LinkedIn.

Copy. Paste. Compound your career capital publicly.

---

## ✨ Core Features

* **🧠 Dual-Prompt Architecture**: Powered by Anthropic (or local Gemini/Ollama fallbacks), executing two conflicting personas synchronously against a single PR diff.
* **⚡ Frictionless UX**: No login. No OAuth. No database schemas. Just paste a GitHub PR URL and let the engine rip.
* **🚀 TanStack Server Functions**: Zero API routes. The backend execution is baked directly into the route via highly optimized Server Functions (`createServerFn`).
* **🎨 Glassmorphism UI**: A stunning, cinematic UI built with Framer Motion, Tailwind CSS, and Lucide React. Because if you're going to generate slop, it should look beautiful.
* **🛡️ Fallback Mode**: Don't want to pay for an Anthropic API key? DevBrand detects missing keys and automatically falls back to an ultra-realistic local mock mode so you can test the UI instantly.

---

## 🏗️ Architecture

We executed a "Ruthless Cut" on the original bloated monorepo. It is now a single, surgical, highly-performant React application.

### The Tech Stack
- **Framework**: TanStack Start / React 19 / Vite
- **Styling**: Tailwind CSS + Framer Motion
- **AI Gateway**: `@anthropic-ai/sdk` via custom Prompt Registry
- **Deployment**: Zero-config ready (Cloudflare / Vercel)

---

## 🚀 Getting Started

To run the engine locally, ensure you have **Node 22** and **pnpm** installed.

### 1. Clone & Install
```bash
git clone https://github.com/bansalbhunesh/devbrand.git
cd devbrand
pnpm install
```

### 2. Environment Setup
Copy the example environment file.
```bash
cp .env.example .env
```
*Note: If you do not provide an `ANTHROPIC_API_KEY`, the app will seamlessly drop into Mock Mode so you can still run it end-to-end.*

### 3. Run the Engine
```bash
pnpm run dev
```
The platform will be live at `http://localhost:3000`. 

Drop in a GitHub PR URL and watch the magic happen.

---

<div align="center">
  <b>Stop building quietly. Start compounding loudly.</b>
</div>
