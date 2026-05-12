# Implementation Plan - Deep Backend Hardening

## Technical Context
The goal is to move the backend from "Functional" to "Hardened". This involves securing the Auth flow against replay/interception attacks, ensuring DB/Redis resiliency, and protecting the API from resource exhaustion.

## Proposed Changes

### 1. DB Infrastructure Hardening (`src/server/db.server.ts`)
- Wrap the Pool initialization with connection timeout (10s).
- Add a retry mechanism for transient connection failures.
- Ensure the proxy correctly handles initialization errors.

### 2. Redis & Rate Limiting (`src/server/redis.ts`, `src/rpc.ts`)
- Standardize the "Fail-Open" pattern in `redis.ts`.
- Wrap every RPC handler in `src/rpc.ts` with a global rate limit (e.g., 60 requests per minute per IP).
- Implement specialized rate limits for heavy operations (`transformPR`, `generateRoast`).

### 3. Auth & Session Hardening (`src/server/auth.server.ts`)
- **State Signing**: Sign the OAuth state with HMAC to prevent tampering.
- **PKCE Enforcement**: Ensure the PKCE verifier is cryptographically random and verified during the token exchange.
- **Nonce Rotation**: Ensure session nonces are high-entropy and rotated correctly on every critical change.

## Constitution Check
- **Elite Tier Decoupling**: Verified.
- **Strict Server Isolation**: Verified.
- **Defensive Infrastructure**: This plan explicitly addresses Principle V.

## PHASES

### Phase 1: Infrastructure Stabilization
- Hardening `db.server.ts` and `redis.ts`.
- Implementing the global rate limiting middleware pattern in `rpc.ts`.

### Phase 2: Auth Deep-Dive
- Implementing HMAC state signing in `auth.server.ts`.
- Hardening PKCE and session rotation logic.
