# Spec: Advanced Operations, Security Intelligence & AI Resiliency

## Context
The system is operationally stable but needs "Enterprise-Grade" intelligence. We need to move from passive logging to active anomaly detection and from simple job tracking to resilient, self-healing workers.

## Objectives
1. **Security Intelligence**: Implement an anomaly detection engine to flag suspicious IP behavior (e.g., rapid bursts across multiple RPCs).
2. **Industrial Job Resiliency**: Implement exponential backoff retries and concurrency control for background jobs.
3. **AI Quality Guard**: Implement a post-processing layer to validate AI citations against the original PR payload.
4. **Ops Analytics**: Upgrade the Admin Dashboard with Recharts to visualize security trends and job throughput.

## Acceptance Criteria
1. **Anomaly Detection**: Flag IPs with >50 RPC calls in 5 minutes as "SUSPICIOUS" in the admin feed.
2. **Self-Healing Jobs**: Jobs that fail due to transient errors (e.g., AI timeout) must retry up to 3 times with increasing delays.
3. **Citation Validation**: AI-generated citations must contain valid file paths or SHAs found in the input PR payload.
4. **Visual Analytics**: `/admin` must show a 24h trend chart of security events and job volume.

## Technical Constraints
- Must adhere to DevBrand Constitution v1.0.0.
- Use `Recharts` for visualization.
- Maintain TanStack Start / Vercel compatibility.
