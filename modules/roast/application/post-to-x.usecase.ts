import { IRoastRepository } from "../contracts/roast.repository";
import { db } from "@infrastructure/database/db.server";
import { userEvents } from "@infrastructure/database/schema.server";

export class PostToXUseCase {
  constructor(private roastRepo: IRoastRepository) {}

  async execute(data: {
    id: string;
    content: string;
    userId: string;
    githubLogin: string;
  }) {
    const { id, content, userId, githubLogin } = data;

    console.log(
      `[X_BROADCAST] User ${githubLogin} posted roast ${id}: ${content}`,
    );

    await db.insert(userEvents).values({
      userId,
      eventType: "social_share",
      payload: { platform: "x", roastId: id },
    });

    return { success: true };
  }
}
