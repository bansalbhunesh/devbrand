
import { db } from "./db.server";
import { outputs, users, userEvents } from "./schema.server";
import { eq, sql, and, desc } from "drizzle-orm";
import { runEngine } from "./engine/index.server";
import type { UserContext } from "./engine/types";
import { loadSessionUser } from "./auth.server";

function generateSlug(prUrl: string, userId: string): string {
  const ts = Date.now().toString(36);
  const hash = userId.replace(/-/g, "").slice(0, 4);
  const prPart = prUrl.split("/pull/")[1]?.slice(0, 4) ?? "0000";
  return `${prPart}-${hash}-${ts}`;
}

/**
 * Session-free transform. Runs the full engine pipeline + inserts the output
 * + updates user counters. Used both by the interactive `transformPRFn`
 * (wrapping it inside a background-job IIFE) and by the cron-driven job
 * processor (synchronous await, no session context). Throws on any failure
 * so the caller can decide retry/fail semantics.
 *
 * Returns the created output id + slug. Does NOT create/manage a
 * background_jobs row — that is the caller's responsibility.
 */
export async function runTransformForUser(args: {
  userId: string;
  prUrl: string;
}): Promise<{ outputId: string; slug: string }> {
  const { userId, prUrl } = args;

  const dbUser = await db.query.users.findFirst({
    where: eq(users.id, userId),
  });
  if (!dbUser) throw new Error("USER_NOT_FOUND");

  const { checkAndResetLimits, enforceTokenBudget, recordTokenUsage } =
    await import("./limits.server");
  const freshUser = await checkAndResetLimits(userId);

  const isFreeLimitReached =
    freshUser?.plan === "free" && (freshUser?.generationsThisMonth ?? 0) >= 3;
  if (isFreeLimitReached) throw new Error("LIMIT_REACHED");

  await enforceTokenBudget(userId);

  const engineTimeoutMs = (() => {
    const raw = process.env.ENGINE_TIMEOUT_MS;
    const parsed = raw ? parseInt(raw, 10) : NaN;
    return Number.isFinite(parsed) && parsed > 0 ? parsed : 300_000;
  })();

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

  const slug = generateSlug(prUrl, userId);
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
    db
      .update(users)
      .set({ generationsThisMonth: sql`${users.generationsThisMonth} + 1` })
      .where(eq(users.id, userId)),
    recordTokenUsage(userId, usage),
    db.insert(userEvents).values({
      userId,
      eventType: "generate",
      payload: {
        outputId: inserted.id,
        slug,
        prUrl,
        impactScore: output.impactScore,
        category: output.category,
        usage,
      } as any,
    }),
  ]);

  return { outputId: inserted.id, slug };
}

// ── Plain Functions (Server-Only) ─────────────────────────────────────────────

export async function transformPRFn(data: { prUrl: string; userId?: string }) {
  const { prUrl } = data;
  const user = await loadSessionUser();
  if (!user) throw new Error("UNAUTHORIZED");
  const userId = user.id;

  const { createJobFn, updateJobStatusFn } = await import("./jobs.server");

  // Create the job immediately
  const job = await createJobFn({
    type: "transform_pr",
    payload: { prUrl },
  });

  // Simulation of Async processing
  // In a real env, we'd trigger an edge function or queue here.
  const engineTimeoutMs = (() => {
    const raw = process.env.ENGINE_TIMEOUT_MS;
    const parsed = raw ? parseInt(raw, 10) : NaN;
    return Number.isFinite(parsed) && parsed > 0 ? parsed : 300_000; // 5 min
  })();

  (async () => {
    try {
      await updateJobStatusFn(job.id, { status: "PROCESSING" });

      const { checkAndResetLimits, enforceTokenBudget, recordTokenUsage } =
        await import("./limits.server");
      const freshUser = await checkAndResetLimits(userId);

      const isFreeLimitReached =
        freshUser?.plan === "free" &&
        (freshUser?.generationsThisMonth ?? 0) >= 3;
      if (isFreeLimitReached) {
        throw new Error("LIMIT_REACHED");
      }

      // Hard token cap. Throws TokenBudgetExceededError if the user is
      // already over their per-plan monthly cap (free: 30k in / 5k out,
      // pro: 500k / 80k). Lets the catch block below mark the job FAILED.
      await enforceTokenBudget(userId);

      const context: UserContext = {
        seniority: user.seniority as any,
        tone: user.tone as any,
        targetAudience: user.targetAudience as any,
      };

      const { narrative: output, usage } = await Promise.race([
        runEngine(prUrl, userId, context),
        new Promise<never>((_, reject) =>
          setTimeout(
            () => reject(new Error("ENGINE_TIMEOUT")),
            engineTimeoutMs,
          ),
        ),
      ]);

      const slug = generateSlug(prUrl, userId);
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
        db
          .update(users)
          .set({ generationsThisMonth: sql`${users.generationsThisMonth} + 1` })
          .where(eq(users.id, userId)),
        recordTokenUsage(userId, usage),
        db.insert(userEvents).values({
          userId,
          eventType: "generate",
          payload: {
            outputId: inserted.id,
            slug,
            prUrl,
            impactScore: output.impactScore,
            category: output.category,
            usage,
          } as any,
        }),
        updateJobStatusFn(job.id, {
          status: "COMPLETED",
          result: { slug, outputId: inserted.id },
        }),
      ]);
    } catch (err: any) {
      console.error("Job Failed:", err);
      await updateJobStatusFn(job.id, {
        status: "FAILED",
        error: err.message || "Unknown Error",
      });
    }
  })().catch((err) => {
    // Last-resort guard: if the catch handler above itself throws (e.g.
    // updateJobStatusFn fails on a Neon outage), surface it rather than
    // letting it become an unhandled rejection.
    console.error("Unhandled job error:", err);
  });

  return { jobId: job.id };
}

export async function getUserOutputsFn() {
  const user = await loadSessionUser();
  if (!user) throw new Error("UNAUTHORIZED");
  const userId = user.id;

  return db.query.outputs.findMany({
    where: eq(outputs.userId, userId),
    orderBy: [desc(outputs.createdAt)],
    limit: 50,
  });
}

export async function toggleOutputVisibilityFn(data: {
  outputId: string;
  isPublic: boolean;
}) {
  const { outputId, isPublic } = data;
  const user = await loadSessionUser();
  if (!user) throw new Error("UNAUTHORIZED");
  const userId = user.id;

  await db
    .update(outputs)
    .set({ isPublic })
    .where(and(eq(outputs.id, outputId), eq(outputs.userId, userId)));
  return { success: true };
}
