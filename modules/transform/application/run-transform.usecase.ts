import { db } from "@infrastructure/database/db.server";
import { outputs, users, userEvents } from "@infrastructure/database/schema.server";
import { eq, sql } from "drizzle-orm";
import { runEngine } from "@/server/engine/index.server";
import type { UserContext } from "@/server/engine/types";

export class RunTransformUseCase {
  private generateSlug(prUrl: string, userId: string): string {
    const ts = Date.now().toString(36);
    const hash = userId.replace(/-/g, "").slice(0, 4);
    const prPart = prUrl.split("/pull/")[1]?.slice(0, 4) ?? "0000";
    return `${prPart}-${hash}-${ts}`;
  }

  async execute(args: { userId: string; prUrl: string }) {
    const { userId, prUrl } = args;

    const dbUser = await db.query.users.findFirst({ where: eq(users.id, userId) });
    if (!dbUser) throw new Error("USER_NOT_FOUND");

    const { checkAndResetLimits, enforceTokenBudget, recordTokenUsage } = await import("@/server/limits.server");
    const freshUser = await checkAndResetLimits(userId);

    const isFreeLimitReached = freshUser?.plan === "free" && (freshUser?.generationsThisMonth ?? 0) >= 3;
    if (isFreeLimitReached) throw new Error("LIMIT_REACHED");

    await enforceTokenBudget(userId);

    const engineTimeoutMs = parseInt(process.env.ENGINE_TIMEOUT_MS || "300000", 10);

    const context: UserContext = {
      seniority: dbUser.seniority as any,
      tone: dbUser.tone as any,
      targetAudience: dbUser.targetAudience as any,
    };

    const { narrative: output, usage } = await Promise.race([
      runEngine(prUrl, userId, context),
      new Promise<never>((_, reject) =>
        setTimeout(() => reject(new Error("ENGINE_TIMEOUT")), engineTimeoutMs),
      ),
    ]);

    const slug = this.generateSlug(prUrl, userId);
    const [inserted] = await db
      .insert(outputs)
      .values({
        slug,
        userId,
        prTitle: output.commitMessageSummary,
        prUrl,
        prCommitMessage: output.commitMessageSummary,
        prSignals: output.citations.map((c) => c.evidenceType),
        stack: [],
        linkedinPost1: output.linkedinPost1,
        linkedinPost2: output.linkedinPost2,
        linkedinPost3: output.linkedinPost3,
        twitterThread: output.twitterThread ?? [],
        resumeBullet: output.resumeBullet,
        interviewHook: output.interviewHook,
        citations: output.citations.map((c) => ({
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

    await Promise.all([
      db.update(users).set({ generationsThisMonth: sql`${users.generationsThisMonth} + 1` }).where(eq(users.id, userId)),
      recordTokenUsage(userId, usage),
      db.insert(userEvents).values({
        userId,
        eventType: "generate",
        payload: { outputId: inserted.id, slug, prUrl, impactScore: output.impactScore, category: output.category, usage } as any,
      }),
    ]);

    return { outputId: inserted.id, slug };
  }
}
