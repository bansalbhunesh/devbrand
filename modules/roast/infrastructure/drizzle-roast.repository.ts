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

  async saveRepoRoast(data: {
    owner: string;
    repo: string;
    roastData: import("../domain/roast.types").RepoRoastOutput;
    rawPayloadHash: string;
  }) {
    const { repoRoasts } = await import("@infrastructure/database/schema.server");
    const [inserted] = await db
      .insert(repoRoasts)
      .values({
        owner: data.owner,
        repo: data.repo,
        roastData: data.roastData,
        rawPayloadHash: data.rawPayloadHash,
      })
      .returning();
    return { id: inserted.id };
  }

  async getRepoRoastByHash(hash: string) {
    const { repoRoasts } = await import("@infrastructure/database/schema.server");
    return db.query.repoRoasts.findFirst({
      where: eq(repoRoasts.rawPayloadHash, hash),
    });
  }
}
