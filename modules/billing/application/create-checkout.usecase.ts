import { db } from "@infrastructure/database/db.server";
import { users, userEvents } from "@infrastructure/database/schema.server";
import { eq } from "drizzle-orm";
import { env } from "@devbrand/config";
import { RazorpayService } from "../infrastructure/razorpay.service";

const PRO_PLAN_AMOUNT_PAISE = 99900;

export class CreateCheckoutUseCase {
  constructor(private razorpayService: RazorpayService) {}

  async execute(userId: string) {
    const instance = this.razorpayService.getInstance();
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
      key: env.RAZORPAY_KEY_ID,
      userName: user.name ?? user.githubLogin,
      userEmail: user.email,
    };
  }
}
