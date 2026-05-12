import crypto from "crypto";
import { db } from "./db.server";
import { users, userEvents } from "./schema.server";
import { and, eq, sql } from "drizzle-orm";
import { env } from "../lib/env";

/**
 * Razorpay signs the exact request body bytes — always verify using the raw string.
 * This is a server-only module to satisfy TanStack Start's import protection.
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

  let body: any;
  try {
    body = JSON.parse(rawBody);
  } catch {
    throw new Error("Invalid webhook JSON");
  }

  const event = body.event;
  if (event === "payment.captured") {
    const entity = body.payload?.payment?.entity;
    const paymentId = entity?.id;
    const userId = entity?.notes?.userId;

    if (!paymentId || !userId) return { received: true, error: "missing_ids" };

    const existing = await db.query.userEvents.findFirst({
      where: and(
        eq(userEvents.userId, userId),
        eq(userEvents.eventType, "upgraded_to_pro"),
        sql`${userEvents.payload}->>'paymentId' = ${paymentId}`,
      ),
    });

    if (existing) return { received: true, status: "already_processed" };

    await db.transaction(async (tx: any) => {
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
