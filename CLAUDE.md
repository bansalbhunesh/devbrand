# CLAUDE.md — DevBrand Platform Engineering

## System Architecture
DevBrand is a distributed engineering intelligence engine built as a TypeScript monorepo. It leverages an event-driven architecture to compute "The Verdict" on repository health and engineering reputation.

## Build & Development
- **Package Manager**: `npm`
- **Monorepo Tooling**: NPM Workspaces
- **Primary Run**: `npm run dev` (Full stack)
- **Engine Seed**: `npx tsx scripts/seed-system.ts`
- **Type Check**: `npx tsc -p tsconfig.base.json --noEmit`

## Engineering Standards
- **Strict Typing**: No `any` unless absolutely unavoidable for dynamic proxying.
- **Domain Driven**: Logic belongs in `modules/`, generic logic in `packages/`.
- **Event Driven**: Use the `EventBus` (`mesh.ts`) for cross-domain orchestration.
- **Resiliency**: All external calls (GitHub, LLMs) must use the retry semantics in `mesh.ts` or `llm.gateway`.
- **Observability**: Use `@devbrand/telemetry` for all logging and tracing.

## Project Structure
- `apps/web`: Remix-based dashboard and landing page.
- `packages/repo-intelligence`: Core multi-layer analysis engine.
- `packages/ai-sdk`: LLM orchestration and token budgeting.
- `packages/telemetry`: Centralized logging and tracing.
- `modules/core`: Workflow engine and event mesh.
- `infrastructure/database`: Drizzle ORM and Neon/Postgres schema.

## Key Workflows
- `REPO_INGESTION_REQUESTED` -> `RepoIngestListener` -> `Layer 0`
- `workflow.bulk_ingest` -> Fans out repo ingestion tasks.
