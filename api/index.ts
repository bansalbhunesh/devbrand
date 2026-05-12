/**
 * Vercel serverless entrypoint that wraps the TanStack Start server bundle.
 *
 * Why this exists:
 * - `@tanstack/react-start` 1.167 doesn't ship a Vercel adapter — the
 *   `preset: "vercel"` field in vite.config.ts is silently ignored, so the
 *   plain `dist/server/server.js` bundle never gets wired into Vercel's
 *   request pipeline.
 * - Without a function on Vercel, every non-static path 404s with the
 *   platform error page.
 *
 * This file is the bridge: Vercel auto-discovers anything in `api/` as a
 * Node serverless function. We import the prebuilt server's default fetch
 * handler and adapt it to Vercel's (req, res) Node-style signature.
 *
 * `vercel.json` includes a catch-all rewrite so every unmatched path (i.e.
 * anything not already in `dist/client/`) hits this function.
 */
import type { IncomingMessage, ServerResponse } from "node:http";

// Lazy-resolved on first request to keep cold-start cheap and avoid
// top-level await semantics in the Vercel Node runtime. Cached across
// invocations within the same lambda instance.
type FetchHandler = (
  request: Request,
  ctx?: unknown,
) => Promise<Response> | Response;
let cachedHandler: FetchHandler | null = null;
async function resolveHandler(): Promise<FetchHandler> {
  if (cachedHandler) return cachedHandler;
  // The compiled server entry lives in dist/server/ after `vite build`.
  // Vercel includes it in the function bundle via `includeFiles` in vercel.json.
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  const server: any = await import("../dist/server/server.js" as string);
  const fn: FetchHandler | undefined =
    server.default?.fetch ?? server.default ?? server.fetch;
  if (typeof fn !== "function") {
    throw new Error(
      "dist/server/server.js did not export a fetch handler — build artifact is malformed.",
    );
  }
  cachedHandler = fn;
  return fn;
}

function buildRequestUrl(req: IncomingMessage): string {
  const host =
    req.headers["x-forwarded-host"] ?? req.headers.host ?? "localhost";
  const proto = (req.headers["x-forwarded-proto"] as string) ?? "https";
  return `${proto}://${host}${req.url ?? "/"}`;
}

async function readBody(req: IncomingMessage): Promise<Buffer | undefined> {
  if (req.method === "GET" || req.method === "HEAD") return undefined;
  return new Promise((resolve, reject) => {
    const chunks: Buffer[] = [];
    req.on("data", (chunk) => chunks.push(Buffer.from(chunk)));
    req.on("end", () => resolve(Buffer.concat(chunks)));
    req.on("error", reject);
  });
}

export default async function handler(
  req: IncomingMessage,
  res: ServerResponse,
) {
  try {
    const body = await readBody(req);

    // Promote the Node IncomingMessage to a WHATWG Request the SSR handler
    // expects. Headers are filtered to remove `host`/`connection` etc. that
    // would cause the fetch handler to misinterpret routing.
    const headers = new Headers();
    for (const [key, value] of Object.entries(req.headers)) {
      if (value === undefined) continue;
      if (Array.isArray(value)) {
        for (const v of value) headers.append(key, v);
      } else {
        headers.set(key, value);
      }
    }

    const request = new Request(buildRequestUrl(req), {
      method: req.method,
      headers,
      body: body && body.length > 0 ? body : undefined,
      // duplex required for body streaming under Node fetch
      ...(body && body.length > 0 ? { duplex: "half" } : {}),
    } as RequestInit);

    const handler = await resolveHandler();
    const response = await handler(request);

    res.statusCode = response.status;
    // Debug header so we can see what URL the SSR handler actually got.
    // Remove once the redirect bug is diagnosed.
    res.setHeader("x-debug-incoming-url", req.url ?? "(none)");
    res.setHeader("x-debug-request-url", request.url);
    response.headers.forEach((value, key) => {
      // `set-cookie` may appear multiple times; Headers.forEach gives a
      // comma-joined string in some runtimes. Split it back out so each
      // cookie ends up as its own Set-Cookie header on the response.
      if (key.toLowerCase() === "set-cookie") {
        const split = value.split(/,(?=[^,;]+?=)/g).map((s) => s.trim());
        res.setHeader("set-cookie", split.length > 1 ? split : value);
      } else {
        res.setHeader(key, value);
      }
    });

    if (!response.body) {
      res.end();
      return;
    }

    // Stream the response body to the Node response.
    const reader = response.body.getReader();
    while (true) {
      const { done, value } = await reader.read();
      if (done) break;
      res.write(value);
    }
    res.end();
  } catch (err) {
    console.error("[vercel-handler] request failed:", err);
    if (!res.headersSent) {
      res.statusCode = 500;
      res.setHeader("content-type", "text/plain; charset=utf-8");
    }
    res.end("Internal Server Error");
  }
}
