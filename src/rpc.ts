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
    const { handleGithubCallbackFn } = await import("@/server/auth.server");
    return handleGithubCallbackFn(data);
  });

export const updateUserSettings = createServerFn({ method: "POST" })
  .inputValidator((data: any) => data)
  .handler(async ({ data }) => {
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
    const { generateRoastFn } = await import("@/server/roast.server");
    return generateRoastFn(data);
  });

// ── Billing ──────────────────────────────────────────────────────────────────

export const createCheckoutSession = createServerFn({ method: "POST" }).handler(async () => {
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
