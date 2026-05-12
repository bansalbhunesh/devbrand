# Implementation Plan - Architectural Health & Optimization

## Technical Context
The project has successfully migrated to the **Elite Tier Decoupling** pattern. However, the manual audit discovered that some settings logic was lost or incomplete during the transition. The core issue is a missing Zod schema for user settings and incomplete field coverage in the auth engine.

### System Audit Results
- **Bridge Integrity**: `src/rpc.ts` is clean. 100% compliant.
- **Engine Isolation**: All logic is in `.server.ts`. 100% compliant.
- **Logic Bugs**: Found 3 issues (1 Critical, 1 High, 1 Medium).
- **Aesthetics**: `src/styles.css` is premium. 100% compliant.

## Proposed Changes

### 1. Restore & Expand Settings Schema
Define `settingsSchema` in `src/server/auth.server.ts` to include:
- `seniority`: enum ('junior', 'mid', 'senior', 'staff')
- `tone`: enum ('direct', 'storytelling', 'technical')
- `targetAudience`: enum ('recruiter', 'manager', 'peer', 'founder')

### 2. Update Settings Logic
Update `updateUserSettingsFn` in `src/server/auth.server.ts` to correctly persist all three fields to the database.

### 3. Clean up Transformation Engine
Remove the `(user as any)` cast in `src/server/transform.server.ts` as the field now exists in the type-safe schema.

## Constitution Check
- **Elite Tier Decoupling**: Verified.
- **Strict Server Isolation**: Verified.
- **Aesthetic Excellence**: Verified.

## PHASES

### Phase 1: Engine Stabilization
- Define the Zod schema in `auth.server.ts`.
- Update the DB persistence logic.
- Verify schema alignment with `schema.server.ts`.

### Phase 2: Refactoring & Cleanup
- Fix the type casting in `transform.server.ts`.
- Run a final build check to ensure no regressions in TanStack Start "Import Protection".
