# Tasks - Advanced Operations & AI Resiliency

## Phase 1: Security & Resiliency Foundation [P]
- [ ] **Task 1: Update Job Schema**
  - Path: `src/server/schema.server.ts`
  - Action: Add `retry_count` and `max_retries` columns to `background_jobs`.
  - Verification: Manual SQL check.

- [ ] **Task 2: Implement Anomaly Detection**
  - Path: `src/server/security.server.ts` (New File)
  - Action: Implement `checkAnomaly` logic and integrate with Redis logs.
  - Verification: Manual test with simulated burst.

## Phase 2: AI Guard & Refactoring [P]
- [ ] **Task 3: AI Citation Validator**
  - Path: `src/server/validation.server.ts` (New File)
  - Action: Implement `validateAIOutput` function to check citations.
  - Verification: Unit test with mock PR payload.

- [ ] **Task 4: Implement Job Retries**
  - Path: `src/server/jobs.server.ts`
  - Action: Add retry logic with exponential backoff to `updateJobStatusFn`.
  - Verification: Verify a failed job increments `retry_count`.

## Phase 3: Advanced Visualization [P]
- [ ] **Task 5: Install Analytics Packages**
  - Action: Install `recharts`.
  - Verification: Check `package.json`.

- [ ] **Task 6: Upgrade Admin Dashboard**
  - Path: `src/routes/admin.tsx`
  - Action: Add charts for security events and job volume.
  - Verification: Dashboard renders charts correctly.
