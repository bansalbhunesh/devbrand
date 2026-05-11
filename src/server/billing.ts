import { createServerFn } from "@tanstack/react-start";
import { z } from "zod";
import Razorpay from "razorpay";
import crypto from "crypto";
import { db } from "./db";
import { users, userEvents } from "./schema";
import { and, eq, sql } from "drizzle-orm";
import { loadSessionUser } from "./auth";
import { getRequest } from "@tanstack/react-start/server";
import { env } from "../lib/env";

let razorpay: Razorpay | null = null;

function getRazorpay(): Razorpay {
  if (razorpay) return razorpay;
  const keyId = env.RAZORPAY_KEY_ID;
  const keySecret = env.RAZORPAY_KEY_SECRET;

  razorpay = new Razorpay({ key_id: keyId, key_secret: keySecret });
  return razorpay;
}

const PRO_PLAN_AMOUNT_PAISE = 99900;

/**
 * Razorpay signs the exact request body bytes — always verify using the raw string.
 */
export async function processRazorpayWebhookRaw(
  rawBody: string,
  signature: string,
): Promise<{ received: boolean; status?: string; error?: string }> {
  const secret = env.RAZORPAY_WEBHOOK_SECRET;

  const expectedSignature = crypto
    .createHmac("sha256", secret)
    .update(rawBody)
    .digest("hex");

  const sigBuffer = Buffer.from(signature);
  const expectedBuffer = Buffer.from(expectedSignature);
  if (
    sigBuffer.length !== expectedBuffer.length ||
    !crypto.timingSafeEqual(sigBuffer, expectedBuffer)
  ) {
    throw new Error("Webhook signature verification failed");
  }

  let body: { event?: string; payload?: { payment?: { entity?: Record<string, unknown> } } };
  try {
    body = JSON.parse(rawBody) as typeof body;
  } catch {
    throw new Error("Invalid webhook JSON");
  }

  const event = body.event;
  if (event === "payment.captured") {
    const entity = body.payload?.payment?.entity as
      | {
          id?: string;
          notes?: { userId?: string };
        }
      | undefined;
    const paymentId = entity?.id;
    const userId = entity?.notes?.userId;

    if (!paymentId) return { received: true, error: "no_payment_id" };
    if (!userId) return { received: true, error: "no_user_id" };

    const existing = await db.query.userEvents.findFirst({
      where: and(
        eq(userEvents.userId, userId),
        eq(userEvents.eventType, "upgraded_to_pro"),
        sql`${userEvents.payload}->>'paymentId' = ${paymentId}`,
      ),
    });

    if (existing) {
      return { received: true, status: "already_processed" };
    }

    await db.transaction(async (tx: typeof db) => {
      await tx
        .update(users)
        .set({ plan: "pro", updatedAt: new Date() })
        .where(eq(users.id, userId));
      await tx.insert(userEvents).values({
        userId,
        eventType: "upgraded_to_pro",
        payload: { paymentId, method: "webhook" },
      });
    });
  }

  return { received: true };
}

/**
 * Creates a Razorpay Order for the subscription.
 */
export const createCheckoutSession = createServerFn({ method: "POST" }).handler(
  async () => {
    const sessionUser = await loadSessionUser();
    if (!sessionUser) throw new Error("UNAUTHORIZED");

    const userId = sessionUser.id;
    const instance = getRazorpay();
    const user = await db.query.users.findFirst({
      where: eq(users.id, userId),
    });
    if (!user) throw new Error("USER_NOT_FOUND");

    const amount = PRO_PLAN_AMOUNT_PAISE;
    const options = {
      amount,
      currency: "INR",
      receipt: `receipt_${userId}_${Date.now()}`,
      notes: { userId, githubLogin: user.githubLogin },
    };

    const order = await instance.orders.create(options);

    await db.insert(userEvents).values({
      userId,
      eventType: "checkout_started",
      payload: { orderId: order.id, amount, currency: "INR" },
    });

    return {
      orderId: order.id,
      amount,
      currency: "INR",
      key: env.RAZORPAY_KEY_ID,
      userName: user.name ?? user.githubLogin,
      userEmail: user.email,
    };
  },
);

/**
 * Verifies the Razorpay payment signature.
 */
export const verifyPayment = createServerFn({ method: "POST" })
  .inputValidator(
    z.object({
      razorpay_order_id: z.string(),
      razorpay_payment_id: z.string(),
      razorpay_signature: z.string(),
    }),
  )
  .handler(async ({ data }) => {
    const sessionUser = await loadSessionUser();
    if (!sessionUser) throw new Error("UNAUTHORIZED");

    const secret = env.RAZORPAY_KEY_SECRET;
    const body = data.razorpay_order_id + "|" + data.razorpay_payment_id;
    const expectedSignature = crypto
      .createHmac("sha256", secret)
      .update(body.toString())
      .digest("hex");

    const sigBuffer = Buffer.from(data.razorpay_signature);
    const expectedBuffer = Buffer.from(expectedSignature);
    if (
      sigBuffer.length !== expectedBuffer.length ||
      !crypto.timingSafeEqual(sigBuffer, expectedBuffer)
    ) {
      const request = getRequest();
      const ip =
        request?.headers.get("x-forwarded-for")?.split(",")[0] || "127.0.0.1";
      const { logSecurityEvent } = await import("./redis");
      await logSecurityEvent("payment_failed", sessionUser.id, ip, {
        reason: "invalid_signature",
        orderId: data.razorpay_order_id,
      });
      throw new Error("INVALID_SIGNATURE");
    }

    const existing = await db.query.userEvents.findFirst({
      where: and(
        eq(userEvents.userId, sessionUser.id),
        eq(userEvents.eventType, "upgraded_to_pro"),
        sql`${userEvents.payload}->>'paymentId' = ${data.razorpay_payment_id}`,
      ),
    });

    if (existing) {
      return { success: true, alreadyProcessed: true };
    }

    await db.transaction(async (tx: typeof db) => {
      await tx
        .update(users)
        .set({ plan: "pro", updatedAt: new Date() })
        .where(eq(users.id, sessionUser.id));
      await tx.insert(userEvents).values({
        userId: sessionUser.id,
        eventType: "upgraded_to_pro",
        payload: {
          paymentId: data.razorpay_payment_id,
          orderId: data.razorpay_order_id,
        },
      });
    });

    return { success: true };
  });

/**
 * RPC entry for webhook replay / tooling. Prefer `processRazorpayWebhookRaw` from the edge worker.
 */
export const handleRazorpayWebhook = createServerFn({ method: "POST" })
  .inputValidator(z.object({ rawBody: z.string(), signature: z.string() }))
  .handler(async ({ data: { rawBody, signature } }) =>
    processRazorpayWebhookRaw(rawBody, signature),
  );
