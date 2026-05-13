import { db } from "@infrastructure/database/db.server";
import { trackedRepos } from "@infrastructure/database/schema.server";
import { and, eq, desc } from "drizzle-orm";
import { ITrackedRepoRepository } from "../contracts/repo.repository";
import { TrackedRepo } from "../domain/repo.entities";

export class DrizzleTrackedRepoRepository implements ITrackedRepoRepository {
  async findByUserId(userId: string): Promise<TrackedRepo[]> {
    return db.query.trackedRepos.findMany({
      where: eq(trackedRepos.userId, userId),
      orderBy: [desc(trackedRepos.createdAt)],
    }) as unknown as TrackedRepo[];
  }

  async findByIdAndUserId(id: string, userId: string): Promise<TrackedRepo | null> {
    const row = await db.query.trackedRepos.findFirst({
      where: and(eq(trackedRepos.id, id), eq(trackedRepos.userId, userId)),
    });
    return row as unknown as TrackedRepo | null;
  }

  async findByOwnerRepoAndUserId(owner: string, repo: string, userId: string): Promise<TrackedRepo | null> {
    const row = await db.query.trackedRepos.findFirst({
      where: and(
        eq(trackedRepos.userId, userId),
        eq(trackedRepos.owner, owner),
        eq(trackedRepos.repo, repo),
      ),
    });
    return row as unknown as TrackedRepo | null;
  }

  async save(data: any): Promise<TrackedRepo> {
    const [row] = await db.insert(trackedRepos).values(data).returning();
    return row as unknown as TrackedRepo;
  }

  async updateSecret(id: string, secret: string): Promise<void> {
    await db.update(trackedRepos).set({ webhookSecret: secret }).where(eq(trackedRepos.id, id));
  }

  async delete(id: string, userId: string): Promise<boolean> {
    const res = await db.delete(trackedRepos).where(and(eq(trackedRepos.id, id), eq(trackedRepos.userId, userId))).returning();
    return res.length > 0;
  }
}
