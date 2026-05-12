import { createRouter as createTanStackRouter } from "@tanstack/react-router";

import { routeTree } from "./routeTree.gen";

/**
 * IMPORTANT: this MUST return a fresh router instance on every call.
 *
 * TanStack Start's server-side handler calls `getRouter()` once per
 * incoming request. The router holds per-request state (history,
 * matches, state.redirect, etc.) that absolutely must not be shared
 * across requests — leaking it causes catastrophic bugs like a
 * `state.redirect` from one user's auth check being returned as the
 * response for the next user's request, producing a permanent
 * site-wide 307 loop.
 *
 * The previous shape of this file cached `router` at module scope and
 * returned the same instance on subsequent calls. That worked in dev
 * (where module state resets often) but broke under serverless cold
 * starts plus warm reuse — exactly the scenario on Vercel.
 *
 * On the client, `<StartClient />` manages router lifecycle internally
 * and never calls into this module, so no singleton is needed there.
 */
export function createRouter() {
  return createTanStackRouter({
    routeTree,
    defaultPreload: "intent",
  });
}

export function getRouter() {
  return createRouter();
}

declare module "@tanstack/react-router" {
  interface Register {
    router: ReturnType<typeof createRouter>;
  }
}
