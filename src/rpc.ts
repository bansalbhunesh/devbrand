import { createServerFn } from "@tanstack/react-start";
import { z } from "zod";

/**
 * ELITE ARCHITECTURE: The RPC Bridge.
 * This file is now the ONLY place in the project where createServerFn is defined.
 * IT MUST NOT HAVE ANY TOP-LEVEL SERVER IMPORTS.
 */

// ── Auth ─────────────────────────────────────────────────────────────────────

export const getSession = createServerFn({ method: "GET" }).handler(async () => {
  const { getSessionFn } = await import("@/server/auth.server");
  return getSessionFn();
});

export const logout = createServerFn({ method: "POST" }).handler(async () => {
  const { logoutFn } = await import("@/server/auth.server");
  return logoutFn();
});

export const signInWithGithub = createServerFn({ method: "GET" }).handler(async () => {
  const { signInWithGithubFn } = await import("@/server/auth.server");
  return signInWithGithubFn();
});

export const handleGithubCallback = createServerFn({ method: "POST" })
  .inputValidator((data: any) => data)
  .handler(async ({ data }) => {
    await checkRateLimit("auth_callback", 10, 60);
    const { handleGithubCallbackFn } = await import("@/server/auth.server");
    return handleGithubCallbackFn(data);
  });

export const updateUserSettings = createServerFn({ method: "POST" })
  .inputValidator((data: any) => data)
  .handler(async ({ data }) => {
    await checkRateLimit("user_settings", 20, 60);
    const { updateUserSettingsFn } = await import("@/server/auth.server");
    return updateUserSettingsFn(data);
  });

// ── Engine ───────────────────────────────────────────────────────────────────

export const getBadgeData = createServerFn({ method: "GET" })
  .inputValidator((login: string) => login)
  .handler(async ({ data: login }) => {
    const { getBadgeDataImpl } = await import("@/server/rpc-implementation.server");
    return getBadgeDataImpl(login);
  });

export const getProfileData = createServerFn({ method: "GET" })
  .inputValidator((login: string) => login)
  .handler(async ({ data: login }) => {
    const { getProfileDataImpl } = await import("@/server/rpc-implementation.server");
    return getProfileDataImpl(login);
  });

export const getTeamImpact = createServerFn({ method: "GET" })
  .inputValidator((teamId: string) => teamId)
  .handler(async ({ data: teamId }) => {
    const { getTeamImpactImpl } = await import("@/server/rpc-implementation.server");
    return getTeamImpactImpl(teamId);
  });

export const getPublicFeed = createServerFn({ method: "GET" }).handler(async () => {
  const { getPublicFeedImpl } = await import("@/server/rpc-implementation.server");
  return getPublicFeedImpl();
});

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
    return db.query.outputs.findFirst({ where: eq(outputs.slug, slug), with: { user: true } });
  });

export const transformPR = createServerFn({ method: "POST" })
  .inputValidator((data: any) => data)
  .handler(async ({ data }) => {
    await checkRateLimit("transform_pr", 5, 3600); // Strict limit for heavy AI ops
    const { transformPRFn } = await import("@/server/transform.server");
    return transformPRFn(data);
  });

export const getUserOutputs = createServerFn({ method: "GET" }).handler(async () => {
  const { getUserOutputsFn } = await import("@/server/transform.server");
  return getUserOutputsFn();
});

export const toggleOutputVisibility = createServerFn({ method: "POST" })
  .inputValidator((data: any) => data)
  .handler(async ({ data }) => {
    const { toggleOutputVisibilityFn } = await import("@/server/transform.server");
    return toggleOutputVisibilityFn(data);
  });

export const generateRoast = createServerFn({ method: "POST" })
  .inputValidator((data: any) => data)
  .handler(async ({ data }) => {
    await checkRateLimit("generate_roast", 10, 3600); // Heavy AI ops
    const { generateRoastFn } = await import("@/server/roast.server");
    return generateRoastFn(data);
  });

// ── Billing ──────────────────────────────────────────────────────────────────

export const createCheckoutSession = createServerFn({ method: "POST" }).handler(async () => {
  await checkRateLimit("checkout", 5, 3600);
  const { createCheckoutSessionFn } = await import("@/server/billing.server");
  return createCheckoutSessionFn();
});

export const verifyPayment = createServerFn({ method: "POST" })
  .inputValidator((data: any) => data)
  .handler(async ({ data }) => {
    const { verifyPaymentFn } = await import("@/server/billing.server");
    return verifyPaymentFn(data);
  });

export const getReferralData = createServerFn({ method: "GET" }).handler(async () => {
  const { loadSessionUser } = await import("@/server/auth.server");
  const session = await loadSessionUser();
  if (!session) throw new Error("Unauthorized");
  const { getReferralDataImpl } = await import("@/server/rpc-implementation.server");
  return getReferralDataImpl(session.id);
});

export const getJobStatus = createServerFn({ method: "GET" })
  .inputValidator((jobId: string) => jobId)
  .handler(async ({ data: jobId }) => {
    const { getJobStatusFn } = await import("@/server/jobs.server");
    return getJobStatusFn(jobId);
  });

export const getAdminStats = createServerFn({ method: "GET" }).handler(async () => {
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
      activeJobs: jobs.filter(j => j.status === 'PROCESSING').length,
      failedJobs: jobs.filter(j => j.status === 'FAILED').length,
    },
  };
});

export const getSecurityEvents = createServerFn({ method: "GET" }).handler(async () => {
  const { ensureAdmin } = await import("@/server/auth.server");
  await ensureAdmin();
  const { getSecurityEventsImpl } = await import("@/server/rpc-implementation.server");
  return getSecurityEventsImpl();
});

export const getDemoOutputs = createServerFn({ method: "GET" }).handler(async () => {
  const { getDemoOutputsImpl } = await import("@/server/rpc-implementation.server");
  return getDemoOutputsImpl();
});

export const createBillingPortal = createServerFn({ method: "POST" }).handler(async () => {
  const { createBillingPortalFn } = await import("@/server/billing.server");
  return createBillingPortalFn();
});

export const postToX = createServerFn({ method: "POST" })
  .inputValidator((data: any) => data)
  .handler(async ({ data }) => {
    const { postToXFn } = await import("@/server/roast.server");
    return postToXFn(data);
  });

export const getWrappedStats = createServerFn({ method: "GET" }).handler(async () => {
  const { getWrappedStatsImpl } = await import("@/server/rpc-implementation.server");
  return getWrappedStatsImpl();
});
// ── Helpers ──────────────────────────────────────────────────────────────────

async function checkRateLimit(key: string, limit: number = 60, window: number = 60) {
  const { getRequest } = await import("@tanstack/react-start/server");
  const request = getRequest();
  const ip = request?.headers.get("x-forwarded-for")?.split(",")[0] || "127.0.0.1";
  
  const { rateLimit } = await import("@/server/redis");
  const { success } = await rateLimit(`rpc:${key}:${ip}`, limit, window);
  
  if (!success) {
    throw new Error("RATE_LIMIT_REACHED");
  }
}
