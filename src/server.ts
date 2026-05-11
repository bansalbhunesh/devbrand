import { getEnv, invalidateEnvCache } from "./lib/env";
import { processRazorpayWebhookRaw } from "./server/billing";

/**
 * Server entry: env merge, webhook handling, then TanStack Start.
 */

let _handler: unknown;
async function getHandler() {
  if (!_handler) {
    getEnv();

    const { createStartHandler, defaultStreamHandler } =
      await import("@tanstack/react-start/server");

    _handler = createStartHandler(defaultStreamHandler);
  }
  return _handler;
}

async function unifiedFetch(request: Request, env?: unknown, ctx?: unknown) {
  try {
    invalidateEnvCache();

    if (env && typeof env === "object") {
      Object.assign(process.env, env as object);
    }

    const validatedEnv = getEnv();

    let url: URL;
    try {
      url = new URL(request.url);
    } catch (e) {
      console.warn("BAD_REQUEST_URL:", request.url, e);
      return new Response("Bad Request", {
        status: 400,
        headers: { "Content-Type": "text/plain" },
      });
    }

    if (!process.env.APP_URL) {
      process.env.APP_URL = validatedEnv.APP_URL;
    }

    const { pathname } = url;

    if (pathname === "/api/webhook/razorpay" && request.method === "POST") {
      try {
        const signature =
          request.headers.get("x-razorpay-signature")?.trim() ?? "";
        const rawBody = await request.text();
        await processRazorpayWebhookRaw(rawBody, signature);
        return new Response(JSON.stringify({ received: true }), {
          status: 200,
          headers: { "Content-Type": "application/json" },
        });
      } catch (error: unknown) {
        const message = error instanceof Error ? error.message : String(error);
        console.error("Webhook failure:", message);
        return new Response(
          JSON.stringify({ error: "WEBHOOK_VERIFICATION_FAILED" }),
          {
            status: 400,
            headers: { "Content-Type": "application/json" },
          },
        );
      }
    }

    const handler = await getHandler();
    return await (
      handler as (r: Request, e: unknown, c: unknown) => Promise<Response>
    )(request, env, ctx);
  } catch (error: unknown) {
    const message = error instanceof Error ? error.message : String(error);
    console.error("CRITICAL_SSR_CRASH:", message, error);

    return new Response(
      process.env.NODE_ENV === "production"
        ? "Internal Server Error"
        : `SSR_UNSTABLE: ${message}`,
      {
        status: 500,
        headers: {
          "Content-Type": "text/plain",
          "X-Debug-Source": "unifiedFetch",
        },
      },
    );
  }
}

export default {
  async fetch(request: Request, env?: unknown, ctx?: unknown) {
    return unifiedFetch(request, env, ctx);
  },
};
export const fetch = unifiedFetch;
