# Tasks - Architectural Health & Optimization

## Phase 1: Engine Stabilization [P]
- [ ] **Task 1: Define Settings Schema**
  - Path: `src/server/auth.server.ts`
  - Action: Define `settingsSchema` using Zod with `seniority`, `tone`, and `targetAudience` enums.
  - Verification: Ensure enums match `schema.server.ts` exactly.

- [ ] **Task 2: Update Persistence Logic**
  - Path: `src/server/auth.server.ts`
  - Action: Update `updateUserSettingsFn` to use the new schema and update the `targetAudience` field in the DB.
  - Verification: Manual check of the SQL update statement.

## Phase 2: Refactoring & Cleanup [P]
- [ ] **Task 3: Refactor Transformation Context**
  - Path: `src/server/transform.server.ts`
  - Action: Remove `(user as any)` cast and use property directly.
  - Verification: TypeScript compiler check (no errors).

- [ ] **Task 4: Final Production Validation**
  - Action: Run `npm run build` to ensure TanStack Start "Import Protection" is not violated.
  - Verification: Successful build.
