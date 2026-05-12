# Implementation Plan - Advanced Ops & AI Resiliency

## Technical Context
We are upgrading the operational core to support enterprise-level intelligence and resiliency. This includes active threat detection, self-healing background processes, and AI output verification.

## Proposed Changes

### 1. Security Intelligence Engine (`src/server/security.server.ts`)
- Implement `analyzeIPBehavior` to detect bursts.
- Integrate with `logSecurityEvent` to automatically flag suspicious activities.

### 2. Resilient Worker Orchestrator (`src/server/jobs.server.ts`)
- Add `retryCount` and `maxRetries` to `background_jobs` schema.
- Implement exponential backoff logic for job retries.
- Add concurrency control using Redis locks or simple counters.

### 3. AI Quality Guard (`src/server/validation.server.ts`)
- Implement `verifyCitationsFn` to check AI output against PR payload.
- Integrate validation into the `transformPR` job flow.

### 4. Ops Analytics (`src/routes/admin.tsx`)
- Install `recharts`.
- Add "Security Pulse" trend chart.
- Add "Job Velocity" chart.

## PHASES

### Phase 1: Security & Resiliency Foundation
- Update schema for retries.
- Implement security intelligence logic.

### Phase 2: AI Guard & Refactoring
- Implement citation validation.
- Refactor jobs engine for retries.

### Phase 3: Advanced Visualization
- Upgrade Admin Dashboard with Recharts.
