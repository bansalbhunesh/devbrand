import { db } from "@infrastructure/database/db.server";
import { outputs, users, userEvents } from "@infrastructure/database/schema.server";
import { eq, sql } from "drizzle-orm";
import { TransformRepository, SaveTransformResultInput } from "../contracts/transform.repository";
import { recordTokenUsage } from "@/server/limits.server";

export class DrizzleTransformRepository implements TransformRepository {
  async saveResult(input: SaveTransformResultInput): Promise<{ id: string; slug: string }> {
    const { userId, prUrl, output, usage, slug } = input;

    const [inserted] = await db
      .insert(outputs)
      .values({
        slug,
        userId,
        prTitle: output.commitMessageSummary,
        prUrl,
        prCommitMessage: output.commitMessageSummary,
        prSignals: output.citations.map((c: any) => c.evidenceType),
        stack: [],
        linkedinPost1: output.linkedinPost1,
        linkedinPost2: output.linkedinPost2,
        linkedinPost3: output.linkedinPost3,
        twitterThread: output.twitterThread ?? [],
        resumeBullet: output.resumeBullet,
        interviewHook: output.interviewHook,
        citations: output.citations.map((c: any) => ({
          claim: c.claim,
          ref: c.ref,
          sha: c.sha,
          evidenceType: c.evidenceType,
        })),
        impactScore: output.impactScore,
        category: output.category,
        complexityLevel: output.complexityLevel,
        metadata: output as any,
      })
      .returning();

    // Log user event
    await db.insert(userEvents).values({
      userId,
      eventType: "generate",
      payload: { outputId: inserted.id, slug, prUrl, impactScore: output.impactScore, category: output.category, usage } as any,
    });

    // Record token usage
    await recordTokenUsage(userId, usage);

    return { id: inserted.id, slug: inserted.slug };
  }

  async incrementGenerationCount(userId: string): Promise<void> {
    await db
      .update(users)
      .set({ generationsThisMonth: sql`${users.generationsThisMonth} + 1` })
      .where(eq(users.id, userId));
  }
}
