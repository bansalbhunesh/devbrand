import { createServerFn } from "@tanstack/react-start";
import { z } from "zod";
import Razorpay from "razorpay";
import crypto from "crypto";
import { db } from "./db";
import { users, userEvents } from "./schema";
import { eq } from "drizzle-orm";
import { getSession } from "./auth";

let razorpay: Razorpay | null = null;

function getRazorpay(): Razorpay {
  if (razorpay) return razorpay;
  const keyId = process.env.RAZORPAY_KEY_ID;
  const keySecret = process.env.RAZORPAY_KEY_SECRET;
  if (!keyId || !keySecret) throw new Error("RAZORPAY_KEY_ID or RAZORPAY_KEY_SECRET not set");
  razorpay = new Razorpay({ key_id: keyId, key_secret: keySecret });
  return razorpay;
}

/**
 * Creates a Razorpay Order for the subscription.
 * In a real-world scenario, you might use Razorpay Subscriptions (Plan-based),
 * but for simplicity, we'll use an Order for a one-time "Lifetime" or "Monthly" payment.
 */
export const createCheckoutSession = createServerFn({ method: "POST" })
  .handler(async () => {
    const sessionUser = await getSession();
    if (!sessionUser) throw new Error("UNAUTHORIZED");

    const userId = sessionUser.id;
    const instance = getRazorpay();
    const user = await db.query.users.findFirst({ where: eq(users.id, userId) });
    if (!user) throw new Error("USER_NOT_FOUND");

const PRO_PLAN_AMOUNT_PAISE = 99900; 

/**
 * Creates a Razorpay Order for the subscription.
 */
export const createCheckoutSession = createServerFn({ method: "POST" })
  .handler(async () => {
    const sessionUser = await getSession();
    if (!sessionUser) throw new Error("UNAUTHORIZED");

    const userId = sessionUser.id;
    const instance = getRazorpay();
    const user = await db.query.users.findFirst({ where: eq(users.id, userId) });
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
      key: process.env.RAZORPAY_KEY_ID,
      userName: user.name ?? user.githubLogin,
      userEmail: user.email,
    };
  });

/**
 * Verifies the Razorpay payment signature.
 */
export const verifyPayment = createServerFn({ method: "POST" })
  .inputValidator(z.object({
    razorpay_order_id: z.string(),
    razorpay_payment_id: z.string(),
    razorpay_signature: z.string(),
  }))
  .handler(async ({ data }) => {
    const sessionUser = await getSession();
    if (!sessionUser) throw new Error("UNAUTHORIZED");

    const secret = process.env.RAZORPAY_KEY_SECRET!;
    const body = data.razorpay_order_id + "|" + data.razorpay_payment_id;
    const expectedSignature = crypto
      .createHmac("sha256", secret)
      .update(body.toString())
      .digest("hex");

    // Timing-safe comparison
    const sigBuffer = Buffer.from(data.razorpay_signature);
    const expectedBuffer = Buffer.from(expectedSignature);
    if (sigBuffer.length !== expectedBuffer.length || !crypto.timingSafeEqual(sigBuffer, expectedBuffer)) {
      const request = getRequest();
      const ip = request?.headers.get("x-forwarded-for")?.split(",")[0] || "127.0.0.1";
      const { logSecurityEvent } = await import("./redis");
      await logSecurityEvent("payment_failed", sessionUser.id, ip, { reason: "invalid_signature", orderId: data.razorpay_order_id });
      throw new Error("INVALID_SIGNATURE");
    }

    // Idempotency: Check if already upgraded for this payment
    const existing = await db.query.userEvents.findFirst({
      where: (fields, operators) => operators.and(
        operators.eq(fields.userId, sessionUser.id),
        operators.eq(fields.eventType, "upgraded_to_pro")
      ),
    });
    
    // Check if this specific payment ID was already processed
    if (existing && (existing.payload as any)?.paymentId === data.razorpay_payment_id) {
      return { success: true, alreadyProcessed: true };
    }

    // Update user to Pro in a transaction
    await db.transaction(async (tx) => {
      await tx.update(users).set({ plan: "pro", updatedAt: new Date() }).where(eq(users.id, sessionUser.id));
      await tx.insert(userEvents).values({
        userId: sessionUser.id,
        eventType: "upgraded_to_pro",
        payload: { paymentId: data.razorpay_payment_id, orderId: data.razorpay_order_id },
      });
    });

    return { success: true };
  });

/**
 * Razorpay Webhook Handler (Backend-to-Backend confirmation)
 */
export const handleRazorpayWebhook = createServerFn({ method: "POST" })
  .inputValidator(z.object({ body: z.any(), signature: z.string() }))
  .handler(async ({ data: { body, signature } }) => {
    const secret = process.env.RAZORPAY_WEBHOOK_SECRET;
    if (!secret) throw new Error("RAZORPAY_WEBHOOK_SECRET not set");

    const expectedSignature = crypto
      .createHmac("sha256", secret)
      .update(JSON.stringify(body))
      .digest("hex");

    // Timing-safe comparison
    const sigBuffer = Buffer.from(signature);
    const expectedBuffer = Buffer.from(expectedSignature);
    if (sigBuffer.length !== expectedBuffer.length || !crypto.timingSafeEqual(sigBuffer, expectedBuffer)) {
      throw new Error("Webhook signature verification failed");
    }

    const event = body.event;
    if (event === "payment.captured") {
      const payload = body.payload.payment.entity;
      const paymentId = payload.id;
      const amount = payload.amount;
      const userId = payload.notes?.userId;

      if (!userId) return { received: true, error: "no_user_id" };

      // Verify amount matches server constant
      if (amount !== PRO_PLAN_AMOUNT_PAISE) {
        const { logSecurityEvent } = await import("./redis");
        await logSecurityEvent("payment_failed", userId, "0.0.0.0", { reason: "amount_mismatch", paymentId });
        return { received: true, error: "amount_mismatch" };
      }

      // Idempotency: Check if this payment ID was already processed
      const existing = await db.query.userEvents.findFirst({
        where: (fields, operators) => operators.and(
          operators.eq(fields.userId, userId),
          operators.eq(fields.eventType, "upgraded_to_pro")
        ),
      });

      if (existing && (existing.payload as any)?.paymentId === paymentId) {
        return { received: true, status: "already_processed" };
      }

      await db.transaction(async (tx) => {
        await tx.update(users).set({ plan: "pro", updatedAt: new Date() }).where(eq(users.id, userId));
        await tx.insert(userEvents).values({
          userId,
          eventType: "upgraded_to_pro",
          payload: { paymentId, method: "webhook" },
        });
      });
    }

    return { received: true };
  });

export const getSubscriptionStatus = createServerFn({ method: "GET" })
  .handler(async () => {
    const sessionUser = await getSession();
    if (!sessionUser) return null;

    const userId = sessionUser.id;
    const user = await db.query.users.findFirst({ where: eq(users.id, userId) });
    return user?.plan === "pro" ? { status: "active" } : null;
  });
