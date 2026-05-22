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

// The Verdict — tone gradient. Default `peer` is what public shares
// render at. `chaos` is opt-in only and gated by a confirmation in the
// UI; it's the closest analogue to the old `nuclear` mode.
//   mentor: encouraging, observation-only. Self-roast for juniors.
//   peer:   balanced peer-review tone. Public-share default.
//   staff:  rigorous technical critique. For serious analysis.
//   edge:   sharp, opinionated, takes positions. Authed-only.
//   chaos:  irreverent, meme-adjacent. The old salty/nuclear energy
//           but better-written. Requires explicit opt-in.
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
  tone: z.enum(["mentor", "peer", "staff", "edge", "chaos"]).default("peer"),
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

export const rewritePostSchema = z.object({
  text: z.string(),
  instruction: z.enum(["shorter", "technical"]),
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

export const repoRoastSchema = z.object({
  owner: z.string().min(1).max(100),
  repo: z.string().min(1).max(100),
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

export const schedulePostSchema = z.object({
  outputId: z.string().uuid(),
  channel: z.enum(["linkedin", "twitter"]),
  postKind: z.enum([
    "linkedinPost1",
    "linkedinPost2",
    "linkedinPost3",
    "twitterThread",
  ]),
  scheduledFor: z
    .string()
    .datetime({ offset: true })
    .refine(
      (s) => !Number.isNaN(new Date(s).getTime()),
      "Must be a parseable ISO datetime",
    ),
});

export const scheduledPostIdSchema = z.object({
  id: z.string().uuid(),
});

// ── Auth ─────────────────────────────────────────────────────────────────────

export const getSession = createServerFn({ method: "GET" }).handler(
  async () => {
    const { SessionService } =
      await import("@modules/auth/infrastructure/session.service");
    const { LoadSessionUserUseCase } =
      await import("@modules/auth/application/load-session-user.usecase");

    const sessionService = new SessionService();
    const useCase = new LoadSessionUserUseCase(sessionService);
    return useCase.execute();
  },
);

export const logout = createServerFn({ method: "POST" }).handler(async () => {
  const { SessionService } =
    await import("@modules/auth/infrastructure/session.service");
  const sessionService = new SessionService();
  sessionService.deleteSessionCookie();
  return { success: true };
});

export const logoutAllDevices = createServerFn({ method: "POST" }).handler(
  async () => {
    const { logoutAllDevicesFn } =
      await import("@infrastructure/auth/auth.server");
    return logoutAllDevicesFn();
  },
);

export const signInWithGithub = createServerFn({ method: "POST" }).handler(
  async () => {
    const { StateService } =
      await import("@modules/auth/infrastructure/state.service");
    const { SignInWithGithubUseCase } =
      await import("@modules/auth/application/sign-in-with-github.usecase");

    const stateService = new StateService();
    const useCase = new SignInWithGithubUseCase(stateService);
    return useCase.execute();
  },
);

export const handleGithubCallback = createServerFn({ method: "POST" })
  .inputValidator((data: unknown) =>
    z.object({ code: z.string(), state: z.string().optional() }).parse(data),
  )
  .handler(async ({ data }) => {
    const { StateService } =
      await import("@modules/auth/infrastructure/state.service");
    const { SessionService } =
      await import("@modules/auth/infrastructure/session.service");
    const { CompleteGithubOAuthUseCase } =
      await import("@modules/auth/application/complete-github-oauth.usecase");

    const stateService = new StateService();
    const sessionService = new SessionService();
    const useCase = new CompleteGithubOAuthUseCase(
      stateService,
      sessionService,
    );

    return useCase.execute(data);
  });

export const updateUserSettings = createServerFn({ method: "POST" })
  .inputValidator((data: unknown) => userSettingsSchema.parse(data))
  .handler(async ({ data }) => {
    await checkRateLimit("user_settings", 20, 60);
    const { updateUserSettingsFn } =
      await import("@infrastructure/auth/auth.server");
    return updateUserSettingsFn(data);
  });

// ── Engine ───────────────────────────────────────────────────────────────────

export const getBadgeData = createServerFn({ method: "GET" })
  .inputValidator((login: string) => z.string().parse(login))
  .handler(async ({ data: login }) => {
    const { db } = await import("@infrastructure/database/db.server");
    const { users, outputs } =
      await import("@infrastructure/database/schema.server");
    const { eq, avg } = await import("drizzle-orm");

    const user = await db.query.users.findFirst({
      where: eq(users.githubLogin, login),
    });
    if (!user) return null;
    const result = await db
      .select({ avgScore: avg(outputs.impactScore) })
      .from(outputs)
      .where(eq(outputs.userId, user.id));
    const score = Math.round(Number(result[0]?.avgScore || 0));
    return { score, login: user.githubLogin };
  });

export const getProfileData = createServerFn({ method: "GET" })
  .inputValidator((login: string) => z.string().parse(login))
  .handler(async ({ data: login }) => {
    const { db } = await import("@infrastructure/database/db.server");
    const { users, outputs } =
      await import("@infrastructure/database/schema.server");
    const { eq, and, desc } = await import("drizzle-orm");

    const user = await db.query.users.findFirst({
      where: eq(users.githubLogin, login),
      with: { profile: true },
    });
    if (!user) return null;
    const publicOutputs = await db.query.outputs.findMany({
      where: and(eq(outputs.userId, user.id), eq(outputs.isPublic, true)),
      orderBy: [desc(outputs.createdAt)],
      limit: 10,
    });
    return { user, publicOutputs };
  });

export const getTeamImpact = createServerFn({ method: "GET" })
  .inputValidator((teamId: string) => z.string().parse(teamId))
  .handler(async ({ data: teamId }) => {
    const { GetTeamImpactUseCase } =
      await import("@modules/teams/application/get-team-impact.usecase");
    return new GetTeamImpactUseCase().execute(teamId);
  });

export const getPublicFeed = createServerFn({ method: "GET" }).handler(
  async () => {
    const { GetPublicFeedUseCase } =
      await import("@modules/feeds/application/get-public-feed.usecase");
    return new GetPublicFeedUseCase().execute();
  },
);

export const getRoast = createServerFn({ method: "GET" })
  .inputValidator((id: string) => id)
  .handler(async ({ data: id }) => {
    const { db } = await import("@infrastructure/database/db.server");
    const { roasts } = await import("@infrastructure/database/schema.server");
    const { eq } = await import("drizzle-orm");
    const roast = await db.query.roasts.findFirst({ where: eq(roasts.id, id) });
    if (!roast) throw new Error("ROAST_NOT_FOUND");
    return roast;
  });

export const getOutputBySlug = createServerFn({ method: "GET" })
  .inputValidator((slug: string) => slug)
  .handler(async ({ data: slug }) => {
    const { db } = await import("@infrastructure/database/db.server");
    const { outputs } = await import("@infrastructure/database/schema.server");
    const { eq } = await import("drizzle-orm");
    return db.query.outputs.findFirst({
      where: eq(outputs.slug, slug),
      with: { user: true },
    });
  });

export const transformPR = createServerFn({ method: "POST" })
  .inputValidator((data: unknown) => transformPRSchema.parse(data))
  .handler(async ({ data }) => {
    await checkRateLimit("transform_pr", 5, 3600);
    const { loadSessionUser } =
      await import("@infrastructure/auth/auth.server");
    const user = await loadSessionUser();
    if (!user) throw new Error("UNAUTHORIZED");

    const { createJobFn } = await import("@infrastructure/queues/jobs.server");
    const job = await createJobFn({
      type: "transform_pr",
      payload: { prUrl: data.prUrl },
    });

    // The BackgroundWorker (initialized at app startup) will pick this up.
    // In a serverless env, we also "poke" the worker endpoint.
    (async () => {
      try {
        const { getRequest } = await import("@tanstack/react-start/server");
        const request = getRequest();
        const baseUrl = new URL(request.url).origin;

        // Asynchronous fire-and-forget poke
        fetch(`${baseUrl}/api/worker`, { method: "GET" }).catch(() => {});
      } catch (err) {
        // Fallback or ignore if not in a request context
      }
    })();

    return { jobId: job.id };
  });

export const getUserOutputs = createServerFn({ method: "GET" }).handler(
  async () => {
    const { loadSessionUser } =
      await import("@infrastructure/auth/auth.server");
    const user = await loadSessionUser();
    if (!user) throw new Error("UNAUTHORIZED");

    const { db } = await import("@infrastructure/database/db.server");
    const { outputs } = await import("@infrastructure/database/schema.server");
    const { eq, desc } = await import("drizzle-orm");

    return db.query.outputs.findMany({
      where: eq(outputs.userId, user.id),
      orderBy: [desc(outputs.createdAt)],
      limit: 50,
    });
  },
);

export const toggleOutputVisibility = createServerFn({ method: "POST" })
  .inputValidator((data: unknown) => toggleVisibilitySchema.parse(data))
  .handler(async ({ data }) => {
    const { loadSessionUser } =
      await import("@infrastructure/auth/auth.server");
    const user = await loadSessionUser();
    if (!user) throw new Error("UNAUTHORIZED");

    const { db } = await import("@infrastructure/database/db.server");
    const { outputs } = await import("@infrastructure/database/schema.server");
    const { and, eq } = await import("drizzle-orm");

    await db
      .update(outputs)
      .set({ isPublic: data.isPublic })
      .where(and(eq(outputs.id, data.outputId), eq(outputs.userId, user.id)));
    return { success: true };
  });

export const saveEditedPost = createServerFn({ method: "POST" })
  .inputValidator((data: unknown) => saveEditedPostSchema.parse(data))
  .handler(async ({ data }) => {
    await checkRateLimit("save_edit", 30, 60);
    const { loadSessionUser } =
      await import("@infrastructure/auth/auth.server");
    const user = await loadSessionUser();
    if (!user) throw new Error("UNAUTHORIZED");

    const { db } = await import("@infrastructure/database/db.server");
    const { userEvents } =
      await import("@infrastructure/database/schema.server");

    await db.insert(userEvents).values({
      userId: user.id,
      eventType: "voice_edit",
      payload: data as any,
    });
    return { success: true };
  });

export const generateRoast = createServerFn({ method: "POST" })
  .inputValidator((data: unknown) => roastSchema.parse(data))
  .handler(async ({ data }) => {
    await checkRateLimit("generate_roast", 10, 3600);
    const { DrizzleRoastRepository } =
      await import("@modules/roast/infrastructure/drizzle-roast.repository");
    const { RoastGithubService } =
      await import("@modules/roast/infrastructure/github.service");
    const { GenerateRoastUseCase } =
      await import("@modules/roast/application/generate-roast.usecase");

    const repo = new DrizzleRoastRepository();
    const github = new RoastGithubService();
    const useCase = new GenerateRoastUseCase(repo, github);

    return useCase.execute(data);
  });

// ── Repo Roasts ────────────────────────────────────────────────────────────

export const getRepoRoast = createServerFn({ method: "GET" })
  .inputValidator((id: string) => id)
  .handler(async ({ data: id }) => {
    const { db } = await import("@infrastructure/database/db.server");
    const { repoRoasts } = await import("@infrastructure/database/schema.server");
    const { eq } = await import("drizzle-orm");
    const roast = await db.query.repoRoasts.findFirst({ where: eq(repoRoasts.id, id) });
    if (!roast) throw new Error("ROAST_NOT_FOUND");
    return roast;
  });

export const generateRepoRoast = createServerFn({ method: "POST" })
  .inputValidator((data: unknown) => repoRoastSchema.parse(data))
  .handler(async ({ data }) => {
    await checkRateLimit("generate_repo_roast", 10, 3600);
    const { DrizzleRoastRepository } =
      await import("@modules/roast/infrastructure/drizzle-roast.repository");
    const { RoastGithubService } =
      await import("@modules/roast/infrastructure/github.service");
    const { GenerateRepoRoastUseCase } =
      await import("@modules/roast/application/generate-repo-roast.usecase");

    const repo = new DrizzleRoastRepository();
    const github = new RoastGithubService();
    const useCase = new GenerateRepoRoastUseCase(repo, github);

    return useCase.execute(data);
  });

// ── Billing ──────────────────────────────────────────────────────────────────

export const createCheckoutSession = createServerFn({ method: "POST" }).handler(
  async () => {
    await checkRateLimit("checkout", 5, 3600);
    const { loadSessionUser } =
      await import("@infrastructure/auth/auth.server");
    const user = await loadSessionUser();
    if (!user) throw new Error("UNAUTHORIZED");

    const { RazorpayService } =
      await import("@modules/billing/infrastructure/razorpay.service");
    const { CreateCheckoutUseCase } =
      await import("@modules/billing/application/create-checkout.usecase");

    const service = new RazorpayService();
    const useCase = new CreateCheckoutUseCase(service);
    return useCase.execute(user.id);
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
    const { loadSessionUser } =
      await import("@infrastructure/auth/auth.server");
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
    const { getJobStatusFn } =
      await import("@infrastructure/queues/jobs.server");
    return getJobStatusFn(jobId);
  });

export const getAdminStats = createServerFn({ method: "GET" }).handler(
  async () => {
    const { ensureAdmin } = await import("@infrastructure/auth/auth.server");
    await ensureAdmin();

    const { listAllJobsFn } =
      await import("@infrastructure/queues/jobs.server");
    const { readSecurityEvents } =
      await import("@infrastructure/cache/redis.server");
    const { analyzeIPBehavior } = await import("@/server/security.server");
    const { db } = await import("@infrastructure/database/db.server");
    const { users } = await import("@infrastructure/database/schema.server");
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
        activeJobs: jobs.filter((j: any) => j.status === "PROCESSING").length,
        failedJobs: jobs.filter((j: any) => j.status === "FAILED").length,
      },
    };
  },
);

export const getSecurityEvents = createServerFn({ method: "GET" }).handler(
  async () => {
    const { ensureAdmin } = await import("@infrastructure/auth/auth.server");
    await ensureAdmin();
    const { readSecurityEvents } =
      await import("@infrastructure/cache/redis.server");
    return readSecurityEvents(50);
  },
);

export const getDemoOutputs = createServerFn({ method: "GET" }).handler(
  async () => {
    const { db } = await import("@infrastructure/database/db.server");
    const { outputs } = await import("@infrastructure/database/schema.server");
    const { eq, desc } = await import("drizzle-orm");

    return db.query.outputs.findMany({
      where: eq(outputs.isPublic, true),
      orderBy: [desc(outputs.impactScore)],
      limit: 3,
      with: { user: true },
    });
  },
);

export const createBillingPortal = createServerFn({ method: "POST" }).handler(
  async () => {
    const { loadSessionUser } =
      await import("@infrastructure/auth/auth.server");
    const user = await loadSessionUser();
    if (!user) throw new Error("UNAUTHORIZED");
    return { url: "/dashboard" };
  },
);

export const postToX = createServerFn({ method: "POST" })
  .inputValidator((data: unknown) => postToXSchema.parse(data))
  .handler(async ({ data }) => {
    const { loadSessionUser } =
      await import("@infrastructure/auth/auth.server");
    const user = await loadSessionUser();
    if (!user) throw new Error("UNAUTHORIZED");

    const { DrizzleRoastRepository } =
      await import("@modules/roast/infrastructure/drizzle-roast.repository");
    const { PostToXUseCase } =
      await import("@modules/roast/application/post-to-x.usecase");

    const repo = new DrizzleRoastRepository();
    const useCase = new PostToXUseCase(repo);

    return useCase.execute({
      ...data,
      userId: user.id,
      githubLogin: user.githubLogin,
    });
  });

// ── Tracked Repos ────────────────────────────────────────────────────────────

export const listTrackedRepos = createServerFn({ method: "GET" }).handler(
  async () => {
    const { SessionService } =
      await import("@modules/auth/infrastructure/session.service");
    const { LoadSessionUserUseCase } =
      await import("@modules/auth/application/load-session-user.usecase");
    const sessionUser = await new LoadSessionUserUseCase(
      new SessionService(),
    ).execute();
    if (!sessionUser) throw new Error("UNAUTHORIZED");

    const { DrizzleTrackedRepoRepository } =
      await import("@modules/repos/infrastructure/drizzle-repo.repository");
    const { ListTrackedReposUseCase } =
      await import("@modules/repos/application/list-tracked-repos.usecase");

    const repo = new DrizzleTrackedRepoRepository();
    const useCase = new ListTrackedReposUseCase(repo);
    return useCase.execute(sessionUser.id);
  },
);

export const registerTrackedRepo = createServerFn({ method: "POST" })
  .inputValidator((data: unknown) => trackedRepoInputSchema.parse(data))
  .handler(async ({ data }) => {
    await checkRateLimit("register_repo", 20, 3600);
    const { loadSessionUser } =
      await import("@infrastructure/auth/auth.server");
    const user = await loadSessionUser();
    if (!user) throw new Error("UNAUTHORIZED");

    const { DrizzleTrackedRepoRepository } =
      await import("@modules/repos/infrastructure/drizzle-repo.repository");
    const { RegisterTrackedRepoUseCase } =
      await import("@modules/repos/application/register-tracked-repo.usecase");

    const repo = new DrizzleTrackedRepoRepository();
    const useCase = new RegisterTrackedRepoUseCase(repo);
    return useCase.execute({ ...data, userId: user.id });
  });

export const rotateWebhookSecret = createServerFn({ method: "POST" })
  .inputValidator((data: unknown) => trackedRepoIdSchema.parse(data))
  .handler(async ({ data }) => {
    await checkRateLimit("rotate_webhook_secret", 10, 3600);
    const { loadSessionUser } =
      await import("@infrastructure/auth/auth.server");
    const user = await loadSessionUser();
    if (!user) throw new Error("UNAUTHORIZED");

    const { DrizzleTrackedRepoRepository } =
      await import("@modules/repos/infrastructure/drizzle-repo.repository");
    const repo = new DrizzleTrackedRepoRepository();

    const existing = await repo.findByIdAndUserId(data.id, user.id);
    if (!existing) throw new Error("NOT_FOUND");

    const crypto = await import("crypto");
    const secret = crypto.randomBytes(32).toString("hex");
    await repo.updateSecret(data.id, secret);

    return { id: data.id, webhookSecret: secret };
  });

export const deleteTrackedRepo = createServerFn({ method: "POST" })
  .inputValidator((data: unknown) => trackedRepoIdSchema.parse(data))
  .handler(async ({ data }) => {
    const { loadSessionUser } =
      await import("@infrastructure/auth/auth.server");
    const user = await loadSessionUser();
    if (!user) throw new Error("UNAUTHORIZED");

    const { DrizzleTrackedRepoRepository } =
      await import("@modules/repos/infrastructure/drizzle-repo.repository");
    const repo = new DrizzleTrackedRepoRepository();
    const deleted = await repo.delete(data.id, user.id);

    if (!deleted) throw new Error("NOT_FOUND");
    return { deleted: true };
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
    const { loadSessionUser } =
      await import("@infrastructure/auth/auth.server");
    const user = await loadSessionUser();
    if (!user) throw new Error("UNAUTHORIZED");

    const { DrizzleDigestRepository } =
      await import("@modules/digests/infrastructure/drizzle-digest.repository");
    const { GenerateDigestUseCase } =
      await import("@modules/digests/application/generate-digest.usecase");

    const repo = new DrizzleDigestRepository();
    const useCase = new GenerateDigestUseCase(repo);
    return useCase.execute(user.id, data);
  });

export const listDigests = createServerFn({ method: "GET" }).handler(
  async () => {
    const { loadSessionUser } =
      await import("@infrastructure/auth/auth.server");
    const user = await loadSessionUser();
    if (!user) throw new Error("UNAUTHORIZED");

    const { DrizzleDigestRepository } =
      await import("@modules/digests/infrastructure/drizzle-digest.repository");
    const repo = new DrizzleDigestRepository();
    const rows = await repo.listByUserId(user.id, 50);

    return rows.map((r: any) => ({
      ...r,
      outputCount: r.includedOutputIds?.length ?? 0,
    }));
  },
);

export const getDigest = createServerFn({ method: "GET" })
  .inputValidator((id: string) => digestIdSchema.parse({ id }).id)
  .handler(async ({ data: id }) => {
    const { loadSessionUser } =
      await import("@infrastructure/auth/auth.server");
    const user = await loadSessionUser();
    if (!user) throw new Error("UNAUTHORIZED");

    const { DrizzleDigestRepository } =
      await import("@modules/digests/infrastructure/drizzle-digest.repository");
    const repo = new DrizzleDigestRepository();
    const row = await repo.findByIdAndUserId(id, user.id);
    if (!row) throw new Error("NOT_FOUND");

    return {
      ...row,
      postOptions: (row.postOptions ?? []) as string[],
      twitterThread: (row.twitterThread ?? []) as string[],
      includedOutputIds: (row.includedOutputIds ?? []) as string[],
    };
  });

export const rewritePost = createServerFn({ method: "POST" })
  .inputValidator((data: unknown) => rewritePostSchema.parse(data))
  .handler(async ({ data }) => {
    const { loadSessionUser } = await import("@infrastructure/auth/auth.server");
    const user = await loadSessionUser();
    if (!user) throw new Error("UNAUTHORIZED");

    const { completeText } = await import("@modules/ai/infrastructure/llm.gateway");
    
    let instructionPrompt = "";
    if (data.instruction === "shorter") {
      instructionPrompt = "Rewrite this engineering post to be significantly shorter and punchier. Keep the same tone. No cringe, no hype.";
    } else if (data.instruction === "technical") {
      instructionPrompt = "Rewrite this engineering post to focus more heavily on the architectural decisions and technical complexity. Keep the same tone. No cringe, no hype.";
    }

    const result = await completeText({
      system: "You are a thoughtful engineer rewriting your own work log. Return ONLY the raw rewritten text, no commentary.",
      user: `${instructionPrompt}\n\nORIGINAL POST:\n${data.text}`,
      maxTokens: 1000,
      temperature: 0.5,
    });

    return { text: result.text.trim() };
  });

// ── Scheduled Posts ──────────────────────────────────────────────────────────

export const schedulePost = createServerFn({ method: "POST" })
  .inputValidator((data: unknown) => schedulePostSchema.parse(data))
  .handler(async ({ data }) => {
    await checkRateLimit("schedule_post", 30, 3600);
    const { loadSessionUser } =
      await import("@infrastructure/auth/auth.server");
    const user = await loadSessionUser();
    if (!user) throw new Error("UNAUTHORIZED");

    const { SchedulePostUseCase } =
      await import("@modules/scheduling/application/schedule-post.usecase");
    return new SchedulePostUseCase().execute(user.id, data);
  });

export const listScheduledPosts = createServerFn({ method: "GET" }).handler(
  async () => {
    const { loadSessionUser } =
      await import("@infrastructure/auth/auth.server");
    const user = await loadSessionUser();
    if (!user) throw new Error("UNAUTHORIZED");

    const { db } = await import("@infrastructure/database/db.server");
    const { scheduledPosts, outputs } =
      await import("@infrastructure/database/schema.server");
    const { eq, desc } = await import("drizzle-orm");

    const rows = await db
      .select({
        id: scheduledPosts.id,
        outputId: scheduledPosts.outputId,
        channel: scheduledPosts.channel,
        postKind: scheduledPosts.postKind,
        scheduledFor: scheduledPosts.scheduledFor,
        status: scheduledPosts.status,
        readyAt: scheduledPosts.readyAt,
        shareUrl: scheduledPosts.shareUrl,
        createdAt: scheduledPosts.createdAt,
        outputSlug: outputs.slug,
        outputTitle: outputs.prTitle,
      })
      .from(scheduledPosts)
      .leftJoin(outputs, eq(scheduledPosts.outputId, outputs.id))
      .where(eq(scheduledPosts.userId, user.id))
      .orderBy(desc(scheduledPosts.scheduledFor));

    return { posts: rows };
  },
);

export const cancelScheduledPost = createServerFn({ method: "POST" })
  .inputValidator((data: unknown) => scheduledPostIdSchema.parse(data))
  .handler(async ({ data }) => {
    const { loadSessionUser } =
      await import("@infrastructure/auth/auth.server");
    const user = await loadSessionUser();
    if (!user) throw new Error("UNAUTHORIZED");

    const { db } = await import("@infrastructure/database/db.server");
    const { scheduledPosts, backgroundJobs } =
      await import("@infrastructure/database/schema.server");
    const { and, eq } = await import("drizzle-orm");

    const existing = await db.query.scheduledPosts.findFirst({
      where: and(
        eq(scheduledPosts.id, data.id),
        eq(scheduledPosts.userId, user.id),
      ),
    });
    if (!existing) throw new Error("NOT_FOUND");
    if (existing.status !== "SCHEDULED") throw new Error("NOT_CANCELLABLE");

    await db
      .update(scheduledPosts)
      .set({ status: "CANCELLED" })
      .where(eq(scheduledPosts.id, data.id));

    if (existing.jobId) {
      await db
        .update(backgroundJobs)
        .set({ status: "CANCELLED", updatedAt: new Date() })
        .where(
          and(
            eq(backgroundJobs.id, existing.jobId),
            eq(backgroundJobs.status, "PENDING"),
          ),
        );
    }

    return { cancelled: true };
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

  const { rateLimit } = await import("@infrastructure/cache/redis.server");
  const { success } = await rateLimit(`rpc:${key}:${ip}`, limit, window);

  if (!success) {
    throw new Error("RATE_LIMIT_REACHED");
  }
}
