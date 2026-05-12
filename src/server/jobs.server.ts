import { db } from "./db.server";
import { backgroundJobs } from "./schema.server";
import { eq } from "drizzle-orm";
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
