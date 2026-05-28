import {
  createStartHandler,
  defaultStreamHandler,
} from "@tanstack/react-start/server";

const handler = createStartHandler(defaultStreamHandler);

// All non-render endpoints are file routes via TanStack Start's
// `createFileRoute({ server: { handlers: { ... } } })` API. They fire
// identically in vite dev and Vercel prod. The previous default-export
// wrapper pattern only ran in prod and was a footgun:
//   src/routes/webhooks.github.tsx       POST /webhooks/github
//   src/routes/internal.cron.drain.tsx   GET  /internal/cron/drain

export default async (request: Request) => handler(request);
