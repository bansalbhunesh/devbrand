# DevBrand Constitution

## Core Principles

### I. Elite Tier Decoupling
The architecture MUST strictly separate the **RPC Bridge** from the **Implementation Engine**. The RPC file (`src/rpc.ts`) must remain a "Zero-Import" zone for server-only libraries. All heavy logic must reside in the Implementation Engine.

### II. Strict Server Isolation
All modules containing database logic, AI processing, or sensitive API keys MUST use the **`.server.ts`** suffix. This physical isolation ensures the TanStack compiler blocks these files from ever entering the client bundle, preventing security leaks and build failures.

### III. Aesthetic Excellence (NON-NEGOTIABLE)
UI is our product. Every component must feel premium. We use:
- **Modern Typography**: Inter and JetBrains Mono for a professional, technical feel.
- **Dynamic Depth**: Glassmorphism, subtle gradients, and reactive hover states.
- **Micro-Animations**: Smooth transitions for every interaction. If it's static, it's failing.

### IV. Evidence-Backed Reputation
Every feature we build must serve the core mission: making "invisible" engineering work visible. We prioritize PR analysis, impact scoring, and verifiable evidence over "vibe-based" metrics.

### V. Defensive Infrastructure
We build for reliability. This includes:
- **Zero-Leak Imports**: No top-level Node.js or database imports in shared files.
- **Concurrent Processing**: Replacing synchronous waterfalls with atomic, parallel operations.
- **Atomic Rate Limiting**: Protecting every public entry point with Upstash Redis.

## Performance & Security

### Performance Standards
- **SSR Efficiency**: Minimize hydration costs by keeping the bridge clean.
- **Latency Optimization**: Use concurrent fetching for all metadata analysis.
- **Asset Weight**: Optimize all generated images and media for instant loads.

### Security Requirements
- **Runtime Isolation**: Use dynamic `await import()` for all sensitive server calls.
- **Input Validation**: Strict Zod schemas for every RPC input and output.
- **Audit Trails**: Log every critical security event to Redis for real-time monitoring.

## Development Workflow

### Quality Gates
1. **Spec Alignment**: Every implementation must trace back to a `/speckit.specify` artifact.
2. **Implementation Audit**: Post-implementation reviews must verify compliance with the "Elite Tier Decoupling" pattern.
3. **Design Review**: Every UI change must pass the "Premium Feel" test.

## Governance
This Constitution supersedes all individual developer preferences. Amendments require a documented architectural rationale and a full migration plan if they affect the core decoupling pattern.

**Version**: 1.0.0 | **Ratified**: 2026-05-12 | **Last Amended**: 2026-05-12
