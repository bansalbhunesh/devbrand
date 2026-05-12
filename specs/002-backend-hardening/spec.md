# Spec: Deep Backend Hardening & Infra Resiliency

## Context
Our current backend is functional but needs "Hardened Production" capabilities. We need to move from a basic RPC bridge to a resilient, secure, and observable backend infrastructure.

## Objectives
1. **Cryptographic Auth Hardening**: Implement mandatory session rotation, state-signing for OAuth, and PKCE enforcement.
2. **Infrastructure Resiliency**: Optimize Drizzle connection pooling and implement graceful degradation for Redis.
3. **Universal Rate Limiting**: Protect EVERY RPC endpoint with distributed rate limiting.
4. **Observable Error Handling**: Implement structured logging and centralized error boundaries for the engine.

## Acceptance Criteria
1. **Session Security**: Sessions must rotate every 7 days; mismatched nonces must trigger a security audit log.
2. **OAuth Integrity**: GitHub OAuth must use PKCE verifiers and signed state tokens.
3. **DB Resiliency**: Drizzle must use a singleton connection pool with appropriate timeout and retry logic.
4. **Universal Rate Limiting**: All `createServerFn` handlers in `rpc.ts` must call the `rateLimit` helper.
5. **Redis Fallback**: If Redis is down, the system should degrade gracefully (e.g., skip rate limit but log warning) rather than crashing.

## Technical Constraints
- Must adhere to DevBrand Constitution v1.0.0.
- Use `Upstash Redis` for distributed state.
- Use `Drizzle ORM` for Postgres.
- Maintain TanStack Start / Vercel compatibility.
