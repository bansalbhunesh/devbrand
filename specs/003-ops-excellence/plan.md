# Implementation Plan - Operations Excellence

## Technical Context
Transitioning heavy operations to a "Job" pattern prevents request timeouts in serverless environments. Combined with an Admin Dashboard, this ensures the system is observable and manageable.

## Proposed Changes

### 1. Schema Expansion (`src/server/schema.server.ts`)
- Add `role` column to `users` table (default: 'user').
- Create `background_jobs` table:
  - `id`: UUID (PK)
  - `userId`: UUID (FK)
  - `type`: text (e.g., 'transform_pr')
  - `status`: text (PENDING | PROCESSING | COMPLETED | FAILED)
  - `payload`: JSONB (input data)
  - `result`: JSONB (output data)
  - `error`: text (optional)
  - `createdAt`, `updatedAt`

### 2. Job Engine implementation (`src/server/jobs.server.ts`)
- Implement `createJobFn` and `updateJobStatusFn`.
- Refactor `transformPRFn` to create a job and return the ID immediately.
- *Note*: In a real serverless env, this would trigger an async function (e.g., Vercel Background Function or QStash). For this session, we will implement the tracking and polling logic.

### 3. Admin Dashboard (`src/routes/admin.tsx`)
- Implement a secure `/admin` route.
- Add components for:
  - **Security Overview**: List recent Redis-based security events.
  - **Job Monitor**: View all background jobs and their status.
  - **User Audit**: Simple list of users and their plans.

### 4. Auth Integration (`src/server/auth.server.ts`)
- Ensure `loadSessionUser` returns the `role`.
- Add a server-side check `ensureAdmin` to be used in admin RPCs.

## Constitution Check
- **Elite Tier Decoupling**: RPCs will bridge to the new Job/Admin engines.
- **Aesthetic Excellence**: Admin dashboard will use premium Glassmorphism.

## PHASES

### Phase 1: Persistence & Roles
- Database migration (adding `role` and `background_jobs`).
- Updating `auth.server.ts` for role-based security.

### Phase 2: Resiliency Engine
- Implementing the Job Tracking engine.
- Refactoring `transformPR` to use jobs.

### Phase 3: Monitoring UI
- Implementing the `/admin` dashboard.
