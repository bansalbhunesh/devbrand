# Tasks - Operations Excellence

## Phase 1: Persistence & Roles [P]
- [ ] **Task 1: Expand Schema**
  - Path: `src/server/schema.server.ts`
  - Action: Add `role` to `users` and define the `backgroundJobs` table.
  - Verification: Ensure relations are correctly defined.

- [ ] **Task 2: Implement Admin Guard**
  - Path: `src/server/auth.server.ts`
  - Action: Add `ensureAdmin` helper and update `loadSessionUser` types.
  - Verification: Manually verify a non-admin user is blocked by the guard.

## Phase 2: Resiliency Engine [P]
- [ ] **Task 3: Job Tracking Engine**
  - Path: `src/server/jobs.server.ts` (New File)
  - Action: Implement job creation, status updates, and retrieval.
  - Verification: Successful creation of a test job in DB.

- [ ] **Task 4: Refactor Transform Engine**
  - Path: `src/server/transform.server.ts`
  - Action: Update `transformPRFn` to create a job and return immediately.
  - Verification: RPC returns `jobId` instead of the full result.

## Phase 3: Monitoring UI [P]
- [ ] **Task 5: Admin Dashboard UI**
  - Path: `src/routes/admin.tsx` (New File)
  - Action: Build the dashboard with security events and job monitoring.
  - Verification: View dashboard at `/admin` (with admin user).

- [ ] **Task 6: Job Polling RPC**
  - Path: `src/rpc.ts`
  - Action: Add `getJobStatus` RPC for client polling.
  - Verification: Polling works correctly in UI.
