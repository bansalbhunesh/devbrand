import { db } from "./db.server";
import { backgroundJobs } from "./schema.server";
import { eq, sql, inArray } from "drizzle-orm";
import { loadSessionUser } from "./auth.server";

export async function createJobFn(data: { type: string; payload: any }) {
  const user = await loadSessionUser();
  if (!user) throw new Error("UNAUTHORIZED");

  const [job] = await db
    .insert(backgroundJobs)
    .values({
      userId: user.id,
      type: data.type,
      payload: data.payload,
      status: "PENDING",
    })
    .returning();

  return job;
}

export async function getJobStatusFn(jobId: string) {
  const user = await loadSessionUser();
  if (!user) throw new Error("UNAUTHORIZED");

  const job = await db.query.backgroundJobs.findFirst({
    where: eq(backgroundJobs.id, jobId),
  });

  if (!job) throw new Error("JOB_NOT_FOUND");
  if (job.userId !== user.id && user.role !== "admin") {
    throw new Error("UNAUTHORIZED");
  }

  return job;
}

export async function updateJobStatusFn(
  jobId: string,
  data: { status: string; result?: any; error?: string },
) {
  const job = await db.query.backgroundJobs.findFirst({
    where: eq(backgroundJobs.id, jobId),
  });

  if (!job) return;

  let nextStatus = data.status;
  let nextRetryCount = job.retryCount ?? 0;

  if (data.status === "FAILED" && nextRetryCount < (job.maxRetries ?? 3)) {
    nextStatus = "PENDING"; // Self-heal: put back in queue
    nextRetryCount += 1;
    console.log(
      `Job ${jobId} failed. Retrying (${nextRetryCount}/${job.maxRetries})`,
    );
  }

  await db
    .update(backgroundJobs)
    .set({
      status: nextStatus,
      result: data.result,
      error: data.error,
      retryCount: nextRetryCount,
      updatedAt: new Date(),
    })
    .where(eq(backgroundJobs.id, jobId));
}

export async function listAllJobsFn() {
  const user = await loadSessionUser();
  if (!user || user.role !== "admin") throw new Error("ADMIN_REQUIRED");

  return db.query.backgroundJobs.findMany({
    orderBy: (jobs, { desc }) => [desc(jobs.createdAt)],
    limit: 100,
    with: {
      user: true,
    },
  });
}

/**
 * Atomically claim up to `limit` PENDING jobs of the given types. Uses
 * Postgres FOR UPDATE SKIP LOCKED so multiple workers (e.g. overlapping
 * cron invocations on Vercel) never grab the same row. Each claimed row is
 * flipped to PROCESSING in the same statement.
 *
 * Returns the claimed rows so callers can dispatch on payload + type.
 */
export async function claimPendingJobs(
  types: string[],
  limit = 3,
): Promise<
  Array<{
    id: string;
    userId: string;
    type: string;
    payload: any;
    retryCount: number | null;
    maxRetries: number | null;
  }>
> {
  if (types.length === 0) return [];
  // Neon's serverless driver doesn't bind JS arrays to `ANY($1)::text[]`
  // cleanly (it flattens arrays of length 1 to scalars). Expanding the
  // type list into discrete bound params via sql.join is the portable
  // workaround and keeps prepared-statement caching intact.
  const typeFilter =
    types.length === 1
      ? sql`type = ${types[0]}`
      : sql`type IN (${sql.join(
          types.map((t) => sql`${t}`),
          sql`, `,
        )})`;

  const result: any = await db.execute(sql`
    UPDATE background_jobs
       SET status = 'PROCESSING', updated_at = now()
     WHERE id IN (
       SELECT id FROM background_jobs
        WHERE status = 'PENDING'
          AND ${typeFilter}
        ORDER BY created_at ASC
        FOR UPDATE SKIP LOCKED
        LIMIT ${limit}
     )
     RETURNING id, user_id, type, payload, retry_count, max_retries;
  `);
  const rows = (result as any).rows ?? (result as any);
  return (Array.isArray(rows) ? rows : []).map((r: any) => ({
    id: r.id,
    userId: r.user_id,
    type: r.type,
    payload: r.payload,
    retryCount: r.retry_count,
    maxRetries: r.max_retries,
  }));
}

/**
 * Drain a tick of the queue: claim N jobs, dispatch each by type, mark
 * each row COMPLETED / FAILED / re-PENDING-for-retry. Returns per-job
 * outcomes so the cron route can surface them for observability.
 *
 * Currently dispatches:
 *   - "transform_pr_webhook" → runTransformForUser({ userId, prUrl })
 *
 * Add more `case`s here as we wire up new background work — release-notes
 * rollups, scheduled posts, voice-learning batches.
 */
export async function drainQueueTick(limit = 3): Promise<{
  claimed: number;
  outcomes: Array<{
    jobId: string;
    status: "completed" | "failed" | "retry";
    error?: string;
  }>;
}> {
  const claimed = await claimPendingJobs(["transform_pr_webhook"], limit);
  const outcomes: Array<{
    jobId: string;
    status: "completed" | "failed" | "retry";
    error?: string;
  }> = [];

  for (const job of claimed) {
    try {
      if (job.type === "transform_pr_webhook") {
        const { owner, repo, prNumber } = job.payload ?? {};
        if (!owner || !repo || typeof prNumber !== "number") {
          throw new Error("BAD_PAYLOAD");
        }
        const prUrl = `https://github.com/${owner}/${repo}/pull/${prNumber}`;
        const { runTransformForUser } = await import("./transform.server");
        const result = await runTransformForUser({
          userId: job.userId,
          prUrl,
        });
        await db
          .update(backgroundJobs)
          .set({
            status: "COMPLETED",
            result: result as any,
            updatedAt: new Date(),
          })
          .where(eq(backgroundJobs.id, job.id));
        outcomes.push({ jobId: job.id, status: "completed" });
      } else {
        throw new Error(`UNKNOWN_JOB_TYPE: ${job.type}`);
      }
    } catch (err: any) {
      const msg = err?.message || "unknown_error";
      const retryCount = (job.retryCount ?? 0) + 1;
      const maxRetries = job.maxRetries ?? 3;

      // Non-retryable terminal errors — no point burning the token budget
      // on something we know will fail again identically.
      const terminal =
        msg === "LIMIT_REACHED" ||
        msg === "USER_NOT_FOUND" ||
        msg === "BAD_PAYLOAD" ||
        msg.startsWith("UNKNOWN_JOB_TYPE") ||
        msg.startsWith("TokenBudgetExceeded");

      if (terminal || retryCount > maxRetries) {
        await db
          .update(backgroundJobs)
          .set({
            status: "FAILED",
            error: msg,
            retryCount,
            updatedAt: new Date(),
          })
          .where(eq(backgroundJobs.id, job.id));
        outcomes.push({ jobId: job.id, status: "failed", error: msg });
      } else {
        await db
          .update(backgroundJobs)
          .set({
            status: "PENDING",
            error: msg,
            retryCount,
            updatedAt: new Date(),
          })
          .where(eq(backgroundJobs.id, job.id));
        outcomes.push({ jobId: job.id, status: "retry", error: msg });
      }
    }
  }

  return { claimed: claimed.length, outcomes };
}

// Suppress unused-import lint for `inArray` which is here for future use
// (when drainQueueTick gains multi-type dispatch with array filters).
void inArray;
