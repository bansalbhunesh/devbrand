
import { z } from "zod";
import Razorpay from "razorpay";
import crypto from "crypto";
import { db } from "./db.server";
import { users, userEvents } from "./schema.server";
import { and, eq, sql } from "drizzle-orm";
import { loadSessionUser } from "./auth.server";
import { getRequest } from "@tanstack/react-start/server";
import { env } from "../lib/env";

const verifyPaymentSchema = z.object({
  razorpay_order_id: z.string(),
  razorpay_payment_id: z.string(),
  razorpay_signature: z.string(),
});

let razorpay: Razorpay | null = null;

function getRazorpay(): Razorpay {
  if (razorpay) return razorpay;
  const keyId = env.RAZORPAY_KEY_ID;
  const keySecret = env.RAZORPAY_KEY_SECRET;

  razorpay = new Razorpay({ key_id: keyId, key_secret: keySecret });
  return razorpay;
}

const PRO_PLAN_AMOUNT_PAISE = 99900;

// ── Plain Functions (Server-Only) ─────────────────────────────────────────────

export async function createCheckoutSessionFn() {
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
}

export async function verifyPaymentFn(
  data: z.infer<typeof verifyPaymentSchema>,
) {
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
    const { logSecurityEvent } = await import("./redis.server");
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
}

export async function createBillingPortalFn() {
  const sessionUser = await loadSessionUser();
  if (!sessionUser) throw new Error("UNAUTHORIZED");

  // Razorpay handles billing differently, so we just return a success signal
  // or redirect to a local billing management page if we had one.
  return { url: "/dashboard" };
}
