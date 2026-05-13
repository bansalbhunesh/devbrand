import { EventBus } from "@/modules/core/events/event-bus";
import { db } from "@infrastructure/database/db.server";
import { users } from "@infrastructure/database/schema.server";
import { eq } from "drizzle-orm";

export class NotificationListener {
  constructor(private eventBus: EventBus) {}

  init() {
    // 1. Listen for successful transformations
    this.eventBus.on("TRANSFORM_COMPLETED", async (event) => {
      const { userId, slug } = event.payload;
      const user = await db.query.users.findFirst({
        where: eq(users.id, userId),
      });

      if (user) {
        console.log(
          `[Notification] Sending 'Transformation Success' to ${user.githubLogin}: Your PR is ready at /t/${slug}`,
        );
        // Here you would call Resend/SendGrid/etc.
      }
    });

    // 2. Listen for failures
    this.eventBus.on("TRANSFORM_FAILED", async (event) => {
      const { userId, error } = event.payload;
      const user = await db.query.users.findFirst({
        where: eq(users.id, userId),
      });

      if (user) {
        console.log(
          `[Notification] Sending 'Transformation Failed' to ${user.githubLogin}: Error: ${error}`,
        );
      }
    });

    // 3. Listen for scheduled posts
    this.eventBus.on("POST_SCHEDULED", async (event) => {
      const { userId, channel } = event.payload;
      const user = await db.query.users.findFirst({
        where: eq(users.id, userId),
      });

      if (user) {
        console.log(
          `[Notification] Confirmation sent to ${user.githubLogin}: Post scheduled for ${channel}.`,
        );
      }
    });
  }
}
