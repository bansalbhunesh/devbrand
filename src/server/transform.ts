import { createServerFn } from "@tanstack/react-start";
import { z } from "zod";
import { db } from "./db";
import { outputs, users, userEvents } from "./schema";
import { eq, sql, and } from "drizzle-orm";
import { runEngine } from "./engine";
import type { UserContext } from "./engine/types";

function generateSlug(prUrl: string, userId: string): string {
  const ts = Date.now().toString(36);
  const hash = userId.replace(/-/g, "").slice(0, 4);
  const prPart = prUrl.split("/pull/")[1]?.slice(0, 4) ?? "0000";
  return `${prPart}-${hash}-${ts}`;
}

export const transformPR = createServerFn({ method: "POST" })
  .validator(z.object({ prUrl: z.string().url(), userId: z.string().uuid() }))
  .handler(async ({ data: { prUrl, userId } }) => {
    const user = await db.query.users.findFirst({ where: eq(users.id, userId) });
    if (!user) throw new Error("USER_NOT_FOUND");

    const isFreeLimitReached = user.plan === "free" && user.generationsThisMonth >= 3;
    if (isFreeLimitReached) throw new Error("LIMIT_REACHED");

    // Run the 7-Layer Core Engine
    const context: UserContext = {
      seniority: user.seniority as any,
      tone: user.tone as any,
      targetAudience: "recruiter", // Default
    };

    const output = await runEngine(prUrl, userId, context);

    const slug = generateSlug(prUrl, userId);
    const [inserted] = await db
      .insert(outputs)
      .values({
        slug,
        userId,
        prTitle: output.commitMessageSummary, // Using summary as title for output record
        prUrl,
        prCommitMessage: output.commitMessageSummary,
        prSignals: output.citations.map((c) => c.evidenceType),
        stack: [], // Stack detection now part of engine if needed
        linkedinPost1: output.linkedinPost1,
        linkedinPost2: output.linkedinPost2,
        linkedinPost3: output.linkedinPost3,
        resumeBullet: output.resumeBullet,
        interviewHook: output.interviewHook,
        citations: output.citations.map(c => ({
          claim: c.claim,
          ref: c.ref,
          sha: c.sha,
          evidenceType: c.evidenceType
        })),
        impactScore: output.impactScore,
        category: output.category,
        complexityLevel: output.complexityLevel,
      })
      .returning();

    await Promise.all([
      db
        .update(users)
        .set({ generationsThisMonth: sql`${users.generationsThisMonth} + 1` })
        .where(eq(users.id, userId)),
      db.insert(userEvents).values({
        userId,
        eventType: "generate",
        payload: {
          outputId: inserted.id,
          slug,
          prUrl,
          impactScore: output.impactScore,
          category: output.category,
        },
      }),
    ]);

    return inserted;
  });


export const getUserOutputs = createServerFn({ method: "GET" })
  .validator(z.string().uuid())
  .handler(async ({ data: userId }) => {
    return db.query.outputs.findMany({
      where: eq(outputs.userId, userId),
      orderBy: (o, { desc }) => [desc(o.createdAt)],
      limit: 50,
    });
  });

export const toggleOutputVisibility = createServerFn({ method: "POST" })
  .validator(z.object({ outputId: z.string().uuid(), userId: z.string().uuid(), isPublic: z.boolean() }))
  .handler(async ({ data: { outputId, userId, isPublic } }) => {
    await db
      .update(outputs)
      .set({ isPublic })
      .where(and(eq(outputs.id, outputId), eq(outputs.userId, userId)));
    return { success: true };
});
