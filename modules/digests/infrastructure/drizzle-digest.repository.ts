import { db } from "@infrastructure/database/db.server";
import { digests } from "@infrastructure/database/schema.server";
import { and, eq, desc } from "drizzle-orm";
import { IDigestRepository } from "../contracts/digest.repository";
import { Digest } from "../domain/digest.entities";

export class DrizzleDigestRepository implements IDigestRepository {
  async save(data: any): Promise<Digest> {
    const [row] = await db.insert(digests).values(data).returning();
    return row as unknown as Digest;
  }

  async findByIdAndUserId(id: string, userId: string): Promise<Digest | null> {
    const row = await db.query.digests.findFirst({
      where: and(eq(digests.id, id), eq(digests.userId, userId)),
    });
    return row as unknown as Digest | null;
  }

  async listByUserId(userId: string, limit: number): Promise<Digest[]> {
    return db.query.digests.findMany({
      where: eq(digests.userId, userId),
      orderBy: [desc(digests.createdAt)],
      limit,
    }) as unknown as Digest[];
  }
}
