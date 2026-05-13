# REFLEXION.md — Agentic Self-Correction & Lessons

## Issue: Cross-Workspace Resolution Failure
- **Symptom**: `ERR_MODULE_NOT_FOUND` on `apps/web/src/lib/env` when running scripts.
- **Cause**: Packages (`repo-intelligence`) and Modules were importing directly from `apps/web` due to a global `@/*` alias in `tsconfig.base.json`.
- **Lesson**: **NEVER** import from `apps/` in `packages/` or `modules/`. If a utility is needed in both, move it to a shared package.
- **Action**: Relocated logger to `@devbrand/telemetry` and stubbed voice-memory for future relocation.

## Issue: Event Bus Listener "Silent Failure"
- **Symptom**: Seeding script enqueued 68 repos but no ingestion occurred.
- **Cause**: The `RepoIngestListener` was not registered in the `initWorkflows` call within the script process.
- **Lesson**: The `EventBus` is in-memory by default. Listeners must be initialized in the SAME PROCESS as the emitter unless using a persistent broker like Redis.
- **Action**: Added `initWorkflows()` call to `seed-system.ts`.

## Issue: Workflow Method Inconsistency
- **Symptom**: `bus.publish is not a function`.
- **Cause**: Inconsistency between `mesh.ts` (using `emit`) and `bulk-ingest.ts` (using `publish`).
- **Lesson**: Standardize API names across the core mesh before implementing domain logic.
- **Action**: Renamed all calls to `emit`.

## Future Heuristics
- [ ] Before running any `scripts/*.ts`, verify it calls `initWorkflows()`.
- [ ] Before adding a new import, verify it doesn't cross the `apps/` -> `packages/` boundary.
- [ ] Before implementing a new event, add it to the Zod `EventSchema` in `mesh.ts`.
