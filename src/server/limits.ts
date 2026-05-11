import { db } from "./db";
import { users } from "./schema";
import { eq } from "drizzle-orm";

export async function checkAndResetLimits(userId: string) {
  const user = await db.query.users.findFirst({
    where: eq(users.id, userId),
  });

  if (!user) return null;

  const now = new Date();
  const resetAt = user.monthResetAt ? new Date(user.monthResetAt) : null;

  // If never reset or reset date is in the past month
  if (!resetAt || now.getTime() > resetAt.getTime()) {
    const nextReset = new Date();
    nextReset.setMonth(nextReset.getMonth() + 1, 1); // Set to 1st of next month
    nextReset.setHours(0, 0, 0, 0); // At midnight

    await db
      .update(users)
      .set({
        generationsThisMonth: 0,
        roastCountThisMonth: 0,
        monthResetAt: nextReset,
      })
      .where(eq(users.id, userId));

    return {
      ...user,
      generationsThisMonth: 0,
      roastCountThisMonth: 0,
      monthResetAt: nextReset,
    };
  }

  return user;
}
