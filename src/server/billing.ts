import { createServerFn } from "@tanstack/react-start";
import { z } from "zod";
import Stripe from "stripe";
import { db } from "./db";
import { users, subscriptions, userEvents } from "./schema";
import { eq, sql } from "drizzle-orm";


let stripe: Stripe | null = null;

function getStripe(): Stripe {
  if (stripe) return stripe;
  const key = process.env.STRIPE_SECRET_KEY;
  if (!key) throw new Error("STRIPE_SECRET_KEY not set");
  stripe = new Stripe(key, { apiVersion: "2024-12-18.acacia" });
  return stripe;
}

export const createCheckoutSession = createServerFn({ method: "POST" })
  .validator(z.object({ userId: z.string().uuid() }))
  .handler(async ({ data: { userId } }) => {
    const stripe = getStripe();
    const user = await db.query.users.findFirst({ where: eq(users.id, userId) });
    if (!user) throw new Error("USER_NOT_FOUND");

    let customerId = user.stripeCustomerId;
    if (!customerId) {
      const customer = await stripe.customers.create({
        email: user.email ?? undefined,
        name: user.name ?? user.githubLogin,
        metadata: { devbrand_user_id: userId, github_login: user.githubLogin },
      });
      customerId = customer.id;
      await db.update(users).set({ stripeCustomerId: customerId }).where(eq(users.id, userId));
    }

    const session = await stripe.checkout.sessions.create({
      customer: customerId,
      mode: "subscription",
      payment_method_types: ["card"],
      line_items: [{ price: process.env.STRIPE_PRO_PRICE_ID!, quantity: 1 }],
      success_url: `${process.env.APP_URL}/dashboard?upgraded=true`,
      cancel_url: `${process.env.APP_URL}/dashboard`,
      subscription_data: {
        metadata: { devbrand_user_id: userId },
        trial_period_days: 7,
      },
      allow_promotion_codes: true,
    });

    await db.insert(userEvents).values({
      userId,
      eventType: "checkout_started",
      payload: { sessionId: session.id },
    });

    return { url: session.url! };
  });

export const createBillingPortal = createServerFn({ method: "POST" })
  .validator(z.object({ userId: z.string().uuid() }))
  .handler(async ({ data: { userId } }) => {
    const stripe = getStripe();
    const user = await db.query.users.findFirst({ where: eq(users.id, userId) });
    if (!user?.stripeCustomerId) throw new Error("No Stripe customer found");

    const session = await stripe.billingPortal.sessions.create({
      customer: user.stripeCustomerId,
      return_url: `${process.env.APP_URL}/dashboard`,
    });

    return { url: session.url };
  });

export const handleStripeWebhook = createServerFn({ method: "POST" })
  .validator(z.object({ body: z.string(), signature: z.string() }))
  .handler(async ({ data: { body, signature } }) => {
    const stripe = getStripe();
    const webhookSecret = process.env.STRIPE_WEBHOOK_SECRET;
    if (!webhookSecret) throw new Error("STRIPE_WEBHOOK_SECRET not set");

    let event: Stripe.Event;
    try {
      event = stripe.webhooks.constructEvent(body, signature, webhookSecret);
    } catch (err) {
      throw new Error(`Webhook signature verification failed: ${err}`);
    }

    // Idempotency check: check if we already processed this event
    const existing = await db.query.userEvents.findFirst({
      where: sql`COALESCE(${userEvents.payload}->>'stripeEventId', '') = ${event.id}`
    });
    if (existing) {
      console.log(`[Stripe Webhook] Duplicate event ignored: ${event.id}`);
      return { received: true, duplicate: true };
    }


    switch (event.type) {
      case "checkout.session.completed": {
        const session = event.data.object as Stripe.Checkout.Session;
        const userId = session.metadata?.devbrand_user_id;
        if (!userId || !session.subscription) break;

        const sub = await stripe.subscriptions.retrieve(session.subscription as string);
        await Promise.all([
          db.update(users).set({ plan: "pro", updatedAt: new Date() }).where(eq(users.id, userId)),
          db.insert(subscriptions).values({
            userId,
            stripeSubscriptionId: sub.id,
            stripeCustomerId: sub.customer as string,
            status: sub.status,
            priceId: sub.items.data[0].price.id,
            currentPeriodEnd: new Date(sub.current_period_end * 1000),
            cancelAtPeriodEnd: sub.cancel_at_period_end,
          }).onConflictDoUpdate({
            target: subscriptions.stripeSubscriptionId,
            set: { status: sub.status, currentPeriodEnd: new Date(sub.current_period_end * 1000) },
          }),
          db.insert(userEvents).values({ 
            userId, 
            eventType: "upgraded_to_pro", 
            payload: { subId: sub.id, stripeEventId: event.id } 
          }),
        ]);
        break;
      }

      case "customer.subscription.updated": {
        const sub = event.data.object as Stripe.Subscription;
        const userId = sub.metadata?.devbrand_user_id;
        const newPlan = (sub.status === "active" || sub.status === "trialing") ? "pro" : "free";
        if (userId) {
          await Promise.all([
            db.update(users).set({ plan: newPlan, updatedAt: new Date() }).where(eq(users.id, userId)),
            db.update(subscriptions).set({
              status: sub.status,
              currentPeriodEnd: new Date(sub.current_period_end * 1000),
              cancelAtPeriodEnd: sub.cancel_at_period_end,
              updatedAt: new Date(),
            }).where(eq(subscriptions.stripeSubscriptionId, sub.id)),
            db.insert(userEvents).values({
              userId,
              eventType: "subscription_updated",
              payload: { subId: sub.id, status: sub.status, stripeEventId: event.id }
            })
          ]);
        }
        break;
      }

      case "customer.subscription.deleted": {
        const sub = event.data.object as Stripe.Subscription;
        const userId = sub.metadata?.devbrand_user_id;
        if (userId) {
          await Promise.all([
            db.update(users).set({ plan: "free", updatedAt: new Date() }).where(eq(users.id, userId)),
            db.update(subscriptions).set({ status: "canceled", updatedAt: new Date() })
              .where(eq(subscriptions.stripeSubscriptionId, sub.id)),
            db.insert(userEvents).values({ 
              userId, 
              eventType: "subscription_canceled", 
              payload: { stripeEventId: event.id } 
            }),
          ]);
        }
        break;
      }

      default:
        break;
    }

    return { received: true };
  });

export const getSubscriptionStatus = createServerFn({ method: "GET" })
  .validator(z.string().uuid())
  .handler(async ({ data: userId }) => {
    const sub = await db.query.subscriptions.findFirst({
      where: eq(subscriptions.userId, userId),
      orderBy: (s, { desc }) => [desc(s.createdAt)],
    });
    return sub ?? null;
  });
