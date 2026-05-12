import { createServerFn } from "@tanstack/react-start";

/**
 * ELITE ARCHITECTURE: The RPC Bridge.
 * This file is imported by client components. 
 * IT MUST NOT HAVE ANY TOP-LEVEL SERVER IMPORTS (db, schema, drizzle, etc).
 * All server logic is dynamically imported inside the handlers.
 */

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

export const getSession = createServerFn({ method: "GET" }).handler(async () => {
  const { getSession: gs } = await import("@/server/auth.server");
  return gs();
});

export const logout = createServerFn({ method: "POST" }).handler(async () => {
  const { logout: l } = await import("@/server/auth.server");
  return l();
});

export const signInWithGithub = createServerFn({ method: "GET" }).handler(async () => {
  const { signInWithGithub: s } = await import("@/server/auth.server");
  return s();
});

export const handleGithubCallback = createServerFn({ method: "POST" })
  .inputValidator((data: any) => data)
  .handler(async ({ data }) => {
    const { handleGithubCallback: h } = await import("@/server/auth.server");
    return h({ data });
  });

export const transformPR = createServerFn({ method: "POST" })
  .inputValidator((data: any) => data)
  .handler(async ({ data }) => {
    const { transformPR: t } = await import("@/server/transform.server");
    return t({ data });
  });

export const generateRoast = createServerFn({ method: "POST" })
  .inputValidator((data: any) => data)
  .handler(async ({ data }) => {
    const { generateRoast: g } = await import("@/server/roast.server");
    return g({ data });
  });

export const createCheckoutSession = createServerFn({ method: "POST" }).handler(async () => {
  const { createCheckoutSession: c } = await import("@/server/billing.server");
  return c();
});

export const verifyPayment = createServerFn({ method: "POST" })
  .inputValidator((data: any) => data)
  .handler(async ({ data }) => {
    const { verifyPayment: v } = await import("@/server/billing.server");
    return v({ data });
  });

export const getReferralData = createServerFn({ method: "GET" }).handler(async () => {
  const { loadSessionUser } = await import("@/server/auth.server");
  const session = await loadSessionUser();
  if (!session) throw new Error("Unauthorized");
  const { getReferralDataImpl } = await import("@/server/rpc-implementation.server");
  return getReferralDataImpl(session.id);
});
