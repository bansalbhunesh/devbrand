import { db } from "@infrastructure/database/db.server";
import { roasts } from "@infrastructure/database/schema.server";
import { eq, desc } from "drizzle-orm";
import { IRoastRepository } from "../contracts/roast.repository";
import { RoastOutput } from "../domain/roast.types";

export class DrizzleRoastRepository implements IRoastRepository {
  async save(data: {
    userId: string | null;
    githubUsername: string;
    roastData: RoastOutput;
  }) {
    const [inserted] = await db
      .insert(roasts)
      .values({
        userId: data.userId,
        githubUsername: data.githubUsername,
        roastData: data.roastData,
        isPublic: true,
      })
      .returning();
    return { id: inserted.id };
  }

  async getById(id: string) {
    return db.query.roasts.findFirst({
      where: eq(roasts.id, id),
    });
  }

  async listPublic(limit: number = 30) {
    return db.query.roasts.findMany({
      where: eq(roasts.isPublic, true),
      orderBy: [desc(roasts.createdAt)],
      limit,
    });
  }
}
