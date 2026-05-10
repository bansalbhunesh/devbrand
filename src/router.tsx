import { createRouter as createTanStackRouter } from "@tanstack/react-router";

import { routeTree } from "./routeTree.gen";

let router: ReturnType<typeof createTanStackRouter> | undefined;

export function createRouter() {
  router = createTanStackRouter({
    routeTree,
    defaultPreload: "intent",
  });

  return router;
}

export function getRouter() {
  if (!router) return createRouter();
  return router;
}

declare module "@tanstack/react-router" {
  interface Register {
    router: ReturnType<typeof createRouter>;
  }
}
