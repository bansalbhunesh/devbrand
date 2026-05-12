import { createServerFn } from "@tanstack/react-start";
import { z } from "zod";

/**
 * ELITE ARCHITECTURE: The RPC Bridge.
 * This file is now the ONLY place in the project where createServerFn is defined.
 * IT MUST NOT HAVE ANY TOP-LEVEL SERVER IMPORTS.
 *
 * Every mutating endpoint MUST validate input with a Zod schema. Pass-through
 * validators (`(data: any) => data`) accept arbitrary JSON and break the
 * type contract for downstream `.server.ts` handlers.
 */

// ── Input Schemas ────────────────────────────────────────────────────────────
// Exported so tests can target them directly without spinning up TanStack Start.

export const githubCallbackSchema = z.object({
  code: z.string().min(1).max(1024),
  state: z.string().min(1).max(1024).optional(),
});

export const userSettingsSchema = z.object({
  seniority: z.enum(["junior", "mid", "senior", "staff"]),
  tone: z.enum(["direct", "storytelling", "technical"]),
  targetAudience: z.enum(["recruiter", "manager", "peer", "founder"]),
});

export const transformPRSchema = z.object({
  prUrl: z
    .string()
    .url()
    .regex(
      /^https:\/\/github\.com\/[^/]+\/[^/]+\/pull\/\d+/,
      "Must be a GitHub PR URL",
    ),
  userId: z.string().uuid().optional(),
});

export const toggleVisibilitySchema = z.object({
  outputId: z.string().uuid(),
  isPublic: z.boolean(),
});

export const roastSchema = z.object({
  username: z
    .string()
    .min(1)
    .max(39)
    .regex(
      /^[a-zA-Z0-9](?:[a-zA-Z0-9-]*[a-zA-Z0-9])?$/,
      "Invalid GitHub login",
    ),
  userId: z.string().uuid().optional(),
  tone: z.enum(["salty", "helpful", "nuclear", "technical"]),
});

export const verifyPaymentSchema = z.object({
  razorpay_order_id: z.string().min(1).max(128),
  razorpay_payment_id: z.string().min(1).max(128),
  razorpay_signature: z.string().min(1).max(256),
});

export const postToXSchema = z.object({
  id: z.string().uuid(),
  content: z.string().min(1).max(4000),
});

export const saveEditedPostSchema = z.object({
  outputId: z.string().uuid(),
  postKind: z.enum([
    "linkedinPost1",
    "linkedinPost2",
    "linkedinPost3",
    "twitterThread",
    "resumeBullet",
    "interviewHook",
  ]),
  editedText: z.string().min(1).max(10_000),
});

// GitHub login/repo character set per GitHub's own rules: login allows
// alphanumerics + hyphens (no leading/trailing hyphen); repo allows dots,
// underscores, hyphens, alphanumerics. Same regexes used in roastSchema.
export const trackedRepoInputSchema = z.object({
  owner: z
    .string()
    .min(1)
    .max(39)
    .regex(/^[a-zA-Z0-9](?:[a-zA-Z0-9-]*[a-zA-Z0-9])?$/),
  repo: z
    .string()
    .min(1)
    .max(100)
    .regex(/^[a-zA-Z0-9._-]+$/),
});

export const trackedRepoIdSchema = z.object({
  id: z.string().uuid(),
});

// Coerce because the client typically sends ISO date strings, but we accept
// real Date objects too if a server-side caller passes them through.
const dateLike = z.preprocess(
  (v) => (v instanceof Date ? v : typeof v === "string" ? new Date(v) : v),
  z.date(),
);

export const generateDigestSchema = z
  .object({
    kind: z.enum(["weekly", "release_notes"]),
    since: dateLike,
    until: dateLike,
  })
  .refine((v) => v.since.getTime() < v.until.getTime(), {
    message: "since must be before until",
    path: ["since"],
  });

export const digestIdSchema = z.object({
  id: z.string().uuid(),
});

// ── Auth ─────────────────────────────────────────────────────────────────────

export const getSession = createServerFn({ method: "GET" }).handler(
  async () => {
    const { getSessionFn } = await import("@/server/auth.server");
    return getSessionFn();
  },
);

export const logout = createServerFn({ method: "POST" }).handler(async () => {
  const { logoutFn } = await import("@/server/auth.server");
  return logoutFn();
});

export const logoutAllDevices = createServerFn({ method: "POST" }).handler(
  async () => {
    const { logoutAllDevicesFn } = await import("@/server/auth.server");
    return logoutAllDevicesFn();
  },
);

export const signInWithGithub = createServerFn({ method: "GET" }).handler(
  async () => {
    const { signInWithGithubFn } = await import("@/server/auth.server");
    return signInWithGithubFn();
  },
);

export const handleGithubCallback = createServerFn({ method: "POST" })
  .inputValidator((data: unknown) => githubCallbackSchema.parse(data))
  .handler(async ({ data }) => {
    await checkRateLimit("auth_callback", 10, 60);
    const { handleGithubCallbackFn } = await import("@/server/auth.server");
    return handleGithubCallbackFn(data);
  });

export const updateUserSettings = createServerFn({ method: "POST" })
  .inputValidator((data: unknown) => userSettingsSchema.parse(data))
  .handler(async ({ data }) => {
    await checkRateLimit("user_settings", 20, 60);
    const { updateUserSettingsFn } = await import("@/server/auth.server");
    return updateUserSettingsFn(data);
  });

// ── Engine ───────────────────────────────────────────────────────────────────

export const getBadgeData = createServerFn({ method: "GET" })
  .inputValidator((login: string) => login)
  .handler(async ({ data: login }) => {
    const { getBadgeDataImpl } =
      await import("@/server/rpc-implementation.server");
    return getBadgeDataImpl(login);
  });

export const getProfileData = createServerFn({ method: "GET" })
  .inputValidator((login: string) => login)
  .handler(async ({ data: login }) => {
    const { getProfileDataImpl } =
      await import("@/server/rpc-implementation.server");
    return getProfileDataImpl(login);
  });

export const getTeamImpact = createServerFn({ method: "GET" })
  .inputValidator((teamId: string) => teamId)
  .handler(async ({ data: teamId }) => {
    const { getTeamImpactImpl } =
      await import("@/server/rpc-implementation.server");
    return getTeamImpactImpl(teamId);
  });

export const getPublicFeed = createServerFn({ method: "GET" }).handler(
  async () => {
    const { getPublicFeedImpl } =
      await import("@/server/rpc-implementation.server");
    return getPublicFeedImpl();
  },
);

export const getRoast = createServerFn({ method: "GET" })
  .inputValidator((id: string) => id)
  .handler(async ({ data: id }) => {
    const { db } = await import("@/server/db.server");
    const { roasts } = await import("@/server/schema.server");
    const { eq } = await import("drizzle-orm");
    const roast = await db.query.roasts.findFirst({ where: eq(roasts.id, id) });
    if (!roast) throw new Error("ROAST_NOT_FOUND");
    return roast;
  });

export const getOutputBySlug = createServerFn({ method: "GET" })
  .inputValidator((slug: string) => slug)
  .handler(async ({ data: slug }) => {
    const { db } = await import("@/server/db.server");
    const { outputs } = await import("@/server/schema.server");
    const { eq } = await import("drizzle-orm");
    return db.query.outputs.findFirst({
      where: eq(outputs.slug, slug),
      with: { user: true },
    });
  });

export const transformPR = createServerFn({ method: "POST" })
  .inputValidator((data: unknown) => transformPRSchema.parse(data))
  .handler(async ({ data }) => {
    await checkRateLimit("transform_pr", 5, 3600); // Strict limit for heavy AI ops
    const { transformPRFn } = await import("@/server/transform.server");
    return transformPRFn(data);
  });

export const getUserOutputs = createServerFn({ method: "GET" }).handler(
  async () => {
    const { getUserOutputsFn } = await import("@/server/transform.server");
    return getUserOutputsFn();
  },
);

export const toggleOutputVisibility = createServerFn({ method: "POST" })
  .inputValidator((data: unknown) => toggleVisibilitySchema.parse(data))
  .handler(async ({ data }) => {
    const { toggleOutputVisibilityFn } =
      await import("@/server/transform.server");
    return toggleOutputVisibilityFn(data);
  });

export const saveEditedPost = createServerFn({ method: "POST" })
  .inputValidator((data: unknown) => saveEditedPostSchema.parse(data))
  .handler(async ({ data }) => {
    await checkRateLimit("save_edit", 30, 60);
    const { saveEditedPostFn } = await import("@/server/voice-memory.server");
    return saveEditedPostFn(data);
  });

export const generateRoast = createServerFn({ method: "POST" })
  .inputValidator((data: unknown) => roastSchema.parse(data))
  .handler(async ({ data }) => {
    await checkRateLimit("generate_roast", 10, 3600); // Heavy AI ops
    const { generateRoastFn } = await import("@/server/roast.server");
    return generateRoastFn(data);
  });

// ── Billing ──────────────────────────────────────────────────────────────────

export const createCheckoutSession = createServerFn({ method: "POST" }).handler(
  async () => {
    await checkRateLimit("checkout", 5, 3600);
    const { createCheckoutSessionFn } = await import("@/server/billing.server");
    return createCheckoutSessionFn();
  },
);

export const verifyPayment = createServerFn({ method: "POST" })
  .inputValidator((data: unknown) => verifyPaymentSchema.parse(data))
  .handler(async ({ data }) => {
    const { verifyPaymentFn } = await import("@/server/billing.server");
    return verifyPaymentFn(data);
  });

export const getReferralData = createServerFn({ method: "GET" }).handler(
  async () => {
    const { loadSessionUser } = await import("@/server/auth.server");
    const session = await loadSessionUser();
    if (!session) throw new Error("Unauthorized");
    const { getReferralDataImpl } =
      await import("@/server/rpc-implementation.server");
    return getReferralDataImpl(session.id);
  },
);

export const getJobStatus = createServerFn({ method: "GET" })
  .inputValidator((jobId: string) => jobId)
  .handler(async ({ data: jobId }) => {
    const { getJobStatusFn } = await import("@/server/jobs.server");
    return getJobStatusFn(jobId);
  });

export const getAdminStats = createServerFn({ method: "GET" }).handler(
  async () => {
    const { ensureAdmin } = await import("@/server/auth.server");
    await ensureAdmin();

    const { listAllJobsFn } = await import("@/server/jobs.server");
    const { readSecurityEvents } = await import("@/server/redis");
    const { analyzeIPBehavior } = await import("@/server/security.server");
    const { db } = await import("@/server/db.server");
    const { users } = await import("@/server/schema.server");
    const { count } = await import("drizzle-orm");

    const [jobs, securityEvents, userCount, anomalyReport] = await Promise.all([
      listAllJobsFn(),
      readSecurityEvents(100),
      db.select({ count: count() }).from(users),
      analyzeIPBehavior(),
    ]);

    return {
      jobs,
      securityEvents,
      anomalyReport,
      stats: {
        totalUsers: userCount[0].count,
        activeJobs: jobs.filter((j) => j.status === "PROCESSING").length,
        failedJobs: jobs.filter((j) => j.status === "FAILED").length,
      },
    };
  },
);

export const getSecurityEvents = createServerFn({ method: "GET" }).handler(
  async () => {
    const { ensureAdmin } = await import("@/server/auth.server");
    await ensureAdmin();
    const { getSecurityEventsImpl } =
      await import("@/server/rpc-implementation.server");
    return getSecurityEventsImpl();
  },
);

export const getDemoOutputs = createServerFn({ method: "GET" }).handler(
  async () => {
    const { getDemoOutputsImpl } =
      await import("@/server/rpc-implementation.server");
    return getDemoOutputsImpl();
  },
);

export const createBillingPortal = createServerFn({ method: "POST" }).handler(
  async () => {
    const { createBillingPortalFn } = await import("@/server/billing.server");
    return createBillingPortalFn();
  },
);

export const postToX = createServerFn({ method: "POST" })
  .inputValidator((data: unknown) => postToXSchema.parse(data))
  .handler(async ({ data }) => {
    const { postToXFn } = await import("@/server/roast.server");
    return postToXFn(data);
  });

// ── Tracked Repos ────────────────────────────────────────────────────────────

export const listTrackedRepos = createServerFn({ method: "GET" }).handler(
  async () => {
    const { listTrackedReposFn } =
      await import("@/server/tracked-repos.server");
    return listTrackedReposFn();
  },
);

export const registerTrackedRepo = createServerFn({ method: "POST" })
  .inputValidator((data: unknown) => trackedRepoInputSchema.parse(data))
  .handler(async ({ data }) => {
    await checkRateLimit("register_repo", 20, 3600);
    const { registerTrackedRepoFn } =
      await import("@/server/tracked-repos.server");
    return registerTrackedRepoFn(data);
  });

export const rotateWebhookSecret = createServerFn({ method: "POST" })
  .inputValidator((data: unknown) => trackedRepoIdSchema.parse(data))
  .handler(async ({ data }) => {
    await checkRateLimit("rotate_webhook_secret", 10, 3600);
    const { rotateWebhookSecretFn } =
      await import("@/server/tracked-repos.server");
    return rotateWebhookSecretFn(data);
  });

export const deleteTrackedRepo = createServerFn({ method: "POST" })
  .inputValidator((data: unknown) => trackedRepoIdSchema.parse(data))
  .handler(async ({ data }) => {
    const { deleteTrackedRepoFn } =
      await import("@/server/tracked-repos.server");
    return deleteTrackedRepoFn(data);
  });

export const getWrappedStats = createServerFn({ method: "GET" }).handler(
  async () => {
    const { getWrappedStatsImpl } =
      await import("@/server/rpc-implementation.server");
    return getWrappedStatsImpl();
  },
);

// ── Digests ──────────────────────────────────────────────────────────────────

export const generateDigest = createServerFn({ method: "POST" })
  .inputValidator((data: unknown) => generateDigestSchema.parse(data))
  .handler(async ({ data }) => {
    await checkRateLimit("digest_generate", 5, 3600);
    const { generateDigestFn } = await import("@/server/digest.server");
    return generateDigestFn(data);
  });

export const listDigests = createServerFn({ method: "GET" }).handler(
  async () => {
    const { listDigestsFn } = await import("@/server/digest.server");
    return listDigestsFn();
  },
);

export const getDigest = createServerFn({ method: "GET" })
  .inputValidator((id: string) => digestIdSchema.parse({ id }).id)
  .handler(async ({ data: id }) => {
    const { getDigestFn } = await import("@/server/digest.server");
    return getDigestFn(id);
  });

// ── Helpers ──────────────────────────────────────────────────────────────────

async function checkRateLimit(
  key: string,
  limit: number = 60,
  window: number = 60,
) {
  const { getRequest } = await import("@tanstack/react-start/server");
  const request = getRequest();
  const ip =
    request?.headers.get("x-forwarded-for")?.split(",")[0] || "127.0.0.1";

  const { rateLimit } = await import("@/server/redis");
  const { success } = await rateLimit(`rpc:${key}:${ip}`, limit, window);

  if (!success) {
    throw new Error("RATE_LIMIT_REACHED");
  }
}
