# Tasks - Deep Backend Hardening

## Phase 1: Infrastructure Stabilization [P]
- [ ] **Task 1: Harden DB Connection Singleton**
  - Path: `src/server/db.server.ts`
  - Action: Add connection timeouts and retry logic to the Neon pool.
  - Verification: Verify proxy still initializes correctly on first access.

- [ ] **Task 2: Standardize Redis Fail-Open**
  - Path: `src/server/redis.ts`
  - Action: Ensure all Redis calls (log, read, rateLimit) use the standardized `getRedis()` pattern with proper error boundaries.
  - Verification: Manual check of error catching in all exported functions.

- [ ] **Task 3: Universal RPC Rate Limiting**
  - Path: `src/rpc.ts`
  - Action: Wrap all `createServerFn` handlers with IP-based rate limiting.
  - Verification: Verify `rateLimit` is called in each handler.

## Phase 2: Auth Deep-Dive [P]
- [ ] **Task 4: Cryptographic OAuth State**
  - Path: `src/server/auth.server.ts`
  - Action: Implement HMAC signing for the OAuth state cookie to prevent tampering.
  - Verification: Verify state validation fails if the signature is missing or invalid.

- [ ] **Task 5: Session Rotation & Nonce Hardening**
  - Path: `src/server/auth.server.ts`
  - Action: Audit and harden the session signing and rotation logic.
  - Verification: Verify that session nonces are high-entropy (crypto.randomUUID).
