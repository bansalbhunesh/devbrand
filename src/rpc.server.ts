import { db } from "@/server/db";
import { users, outputs, teams, teamMembers, roasts } from "@/server/schema";
import { eq, avg, and, desc, inArray, count } from "drizzle-orm";
import { createServerFn } from "@tanstack/react-start";

export const getBadgeData = createServerFn({ method: "GET" })
  .inputValidator((login: string) => login)
  .handler(async ({ data: login }) => {
    const user = await db.query.users.findFirst({
      where: eq(users.githubLogin, login),
    });

    if (!user) return null;

    const result = await db
      .select({
        avgScore: avg(outputs.impactScore),
      })
      .from(outputs)
      .where(eq(outputs.userId, user.id));

    const score = Math.round(Number(result[0]?.avgScore || 0));
    return { score, login: user.githubLogin };
  });

export const getProfileData = createServerFn({ method: "GET" })
  .inputValidator((login: string) => login)
  .handler(async ({ data: login }) => {
    const user = await db.query.users.findFirst({
      where: eq(users.githubLogin, login),
      with: {
        profile: true,
      },
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
  .inputValidator((teamId: string) => teamId)
  .handler(async ({ data: teamId }) => {
    const team = await db.query.teams.findFirst({
      where: eq(teams.id, teamId),
    });

    if (!team) throw new Error("TEAM_NOT_FOUND");

    const members = await db.query.teamMembers.findMany({
      where: eq(teamMembers.teamId, teamId),
      with: { user: true },
    });

    const memberIds = members.map((m) => m.userId);

    const recentImpacts =
      memberIds.length > 0
        ? await db.query.outputs.findMany({
            where: inArray(outputs.userId, memberIds),
            orderBy: [desc(outputs.createdAt)],
            limit: 30,
          })
        : [];

    const avgImpact =
      recentImpacts.length > 0
        ? recentImpacts.reduce((sum, o) => sum + o.impactScore, 0) /
          recentImpacts.length
        : 0;

    const coreInfraCount = recentImpacts.filter(
      (o) => o.category === "Architecture" || o.impactScore > 80,
    ).length;
    const invisibleWorkCount = recentImpacts.filter(
      (o) => o.metadata?.invisibleWorkReport?.isSignificant,
    ).length;
    const invisibleWorkPercent =
      recentImpacts.length > 0
        ? Math.round((invisibleWorkCount / recentImpacts.length) * 100)
        : 0;

    const membersWithStats = members.map((m) => {
      const userImpacts = recentImpacts.filter((o) => o.userId === m.userId);
      const memberAvgImpact =
        userImpacts.length > 0
          ? Math.round(
              userImpacts.reduce((sum, o) => sum + o.impactScore, 0) /
                userImpacts.length,
            )
          : 0;

      return {
        ...((m.user as any) || {}),
        id: m.userId,
        avgImpact: memberAvgImpact,
        prCount: userImpacts.length,
      };
    });

    return {
      team,
      members: membersWithStats,
      recentImpacts,
      metrics: {
        avgImpact: Math.round(avgImpact),
        coreInfraCount,
        invisibleWorkPercent,
      },
    };
  });

export const getPublicFeed = createServerFn({ method: "GET" }).handler(
  async () => {
    const [feed, topRoasts, topEngineers] = await Promise.all([
      db.query.outputs.findMany({
        where: eq(outputs.isPublic, true),
        orderBy: [desc(outputs.createdAt)],
        limit: 30,
        with: { user: true },
      }),
      db.query.roasts.findMany({
        where: eq(roasts.isPublic, true),
        orderBy: [desc(roasts.createdAt)],
        limit: 30,
      }),
      db.query.users.findMany({
        limit: 5,
        with: { outputs: true },
      }),
    ]);

    const rankedEngineers = topEngineers
      .map((u) => ({
        ...u,
        totalImpact: u.outputs.reduce((s, o) => s + o.impactScore, 0),
        avgImpact: Math.round(
          u.outputs.reduce((s, o) => s + o.impactScore, 0) /
            (u.outputs.length || 1),
        ),
      }))
      .sort((a, b) => b.totalImpact - a.totalImpact);

    return { feed, topRoasts, topEngineers: rankedEngineers };
  },
);

export const getRoast = createServerFn({ method: "GET" })
  .inputValidator((id: string) => id)
  .handler(async ({ data: id }) => {
    const roast = await db.query.roasts.findFirst({
      where: eq(roasts.id, id),
    });
    if (!roast) throw new Error("ROAST_NOT_FOUND");
    return roast;
  });

export const postToX = createServerFn({ method: "POST" })
  .inputValidator((data: { id: string; content: string }) => data)
  .handler(async ({ data }) => {
    await new Promise((resolve) => setTimeout(resolve, 1500));
    return {
      success: true,
      url: `https://x.com/DevBrand/status/mock-${data.id}`,
    };
  });

export const getOgRoastData = createServerFn({ method: "GET" })
  .inputValidator((id: string) => id)
  .handler(async ({ data: id }) => {
    const roast = await db.query.roasts.findFirst({
      where: eq(roasts.id, id),
    });
    return roast;
  });

export const getDemoOutputs = createServerFn({ method: "GET" }).handler(
  async () => {
    return db.query.outputs.findMany({
      limit: 3,
      orderBy: [desc(outputs.createdAt)],
      where: eq(outputs.isPublic, true),
    });
  },
);

export const getOutputBySlug = createServerFn({ method: "GET" })
  .inputValidator((slug: string) => slug)
  .handler(async ({ data: slug }) => {
    return db.query.outputs.findFirst({
      where: eq(outputs.slug, slug),
      with: { user: true },
    });
  });

export const getReferralData = createServerFn({ method: "GET" }).handler(
  async () => {
    const { getSession } = await import("@/server/auth");
    const session = await getSession();
    if (!session) throw new Error("Unauthorized");

    const [user] = await db.query.users.findMany({
      where: eq(users.id, session.id),
    });

    if (!user) throw new Error("User not found");

    const [referredCountRes] = await db
      .select({ count: count() })
      .from(users)
      .where(eq(users.referredBy, session.id));

    return {
      referralCode: user.referralCode,
      referredCount: referredCountRes.count,
      generationsBonus: referredCountRes.count * 5,
    };
  },
);

// ── Auth Consolidation ────────────────────────────────────────────────────────
export const getSession = createServerFn({ method: "GET" }).handler(
  async () => {
    const { getSession: getS } = await import("@/server/auth");
    return getS();
  },
);

export const logout = createServerFn({ method: "POST" }).handler(async () => {
  const { logout: l } = await import("@/server/auth");
  return l();
});

export const signInWithGithub = createServerFn({ method: "GET" }).handler(
  async () => {
    const { signInWithGithub: s } = await import("@/server/auth");
    return s();
  },
);

export const logoutAllDevices = createServerFn({ method: "POST" }).handler(
  async () => {
    const { logoutAllDevices: l } = await import("@/server/auth");
    return l();
  },
);

export const getSecurityEvents = createServerFn({ method: "GET" }).handler(
  async () => {
    const { getSecurityEvents: g } = await import("@/server/auth");
    return g();
  },
);

export const updateUserSettings = createServerFn({ method: "POST" })
  .inputValidator((data: any) => data)
  .handler(async ({ data }) => {
    const { updateUserSettings: u } = await import("@/server/auth");
    return u({ data });
  });

// ── Transform Consolidation ─────────────────────────────────────────────────────
export const transformPR = createServerFn({ method: "POST" })
  .inputValidator((data: any) => data)
  .handler(async ({ data }) => {
    const { transformPR: t } = await import("@/server/transform");
    return t({ data });
  });

export const getUserOutputs = createServerFn({ method: "GET" }).handler(
  async () => {
    const { getUserOutputs: g } = await import("@/server/transform");
    return g();
  },
);

export const toggleOutputVisibility = createServerFn({ method: "POST" })
  .inputValidator((data: any) => data)
  .handler(async ({ data }) => {
    const { toggleOutputVisibility: t } = await import("@/server/transform");
    return t({ data });
  });

// ── Billing Consolidation ──────────────────────────────────────────────────────
export const createCheckoutSession = createServerFn({ method: "POST" })
  .inputValidator((data: any) => data)
  .handler(async ({ data }) => {
    const { createCheckoutSession: c } = await import("@/server/billing");
    return c({ data });
  });

export const createBillingPortal = createServerFn({ method: "POST" })
  .inputValidator((data: any) => data)
  .handler(async () => {
    return {
      success: false,
      message:
        "Razorpay does not support customer billing portals. Manage subscriptions via your dashboard.",
    };
  });

export const verifyPayment = createServerFn({ method: "POST" })
  .inputValidator((data: any) => data)
  .handler(async ({ data }) => {
    const { verifyPayment: v } = await import("@/server/billing");
    return v({ data });
  });

export const getWrappedStats = createServerFn({ method: "GET" }).handler(
  async () => {
    const { getSession } = await import("./server/auth");
    const user = await getSession();
    if (!user) throw new Error("UNAUTHORIZED");
    const { getWrappedStats: g } = await import("./server/wrapped");
    return g({ data: user.id });
  },
);

export const generateRoast = createServerFn({ method: "POST" })
  .inputValidator((data: any) => data)
  .handler(async ({ data }) => {
    const { generateRoast: g } = await import("@/server/roast");
    return g({ data });
  });
