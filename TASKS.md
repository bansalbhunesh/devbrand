# TASKS.md — Engineering Backlog (Refined)

## 0. Self-Optimization Loop (CRITICAL)
- [x] Research Antigravity best practices and agentic loops.
- [ ] **TODO**: Implement `REFLEXION.md` to track and avoid repetitive architectural errors.
- [ ] **TODO**: Create a "Task Validator" script that runs after each major feature to verify type safety and cross-workspace integrity.

## 1. Core Engine Hardening (Judgment Layer)
- [ ] **TODO**: Refactor `VerdictEngine` to support "Persona Inference" (e.g., detecting FAANG-style vs. Startup-style code).
- [x] Unify `EventBus` and export as a singleton `mesh`.
- [x] Fix cross-workspace leaks in `packages/repo-intelligence`.
- [x] Initiate first 68 repos "System Awareness" ingestion.
- [x] Upgrade `llm.gateway.ts` to real Anthropic provider.
- [ ] **TODO**: Implement `Layer 8: Architectural Drift` detection in `packages/repo-intelligence`.
- [ ] **TODO**: Port `voice-memory.server.ts` logic from `apps/web` to a standalone package `@devbrand/intelligence-store`.

## 2. Distributed Resilience
- [ ] **TODO**: Implement a Persistent Event Log in Postgres to allow resuming workflows after crashes.
- [ ] **TODO**: Add "Dead Letter Queue" (DLQ) processing logic to automatically retry or alert on ingestion failures.
- [ ] **TODO**: Implement a `HealthCheckWorkflow` to verify all domain listeners are online.

## 3. Product Excellence (YC Level)
- [ ] **TODO**: Connect the `Roast.tsx` UI component to a real API endpoint in the Remix app.
- [ ] **TODO**: Implement the "Ego Score" algorithm using AST density and commit frequency.
- [ ] **TODO**: Generate a sample "Reputation Artifact" (PDF/Image) that users can share on social media.

## 4. Documentation & Clarity
- [x] Create `CLAUDE.md` (Standards).
- [x] Create `GOAL.md` (Strategy).
- [x] Refine `TASKS.md` (Execution).
