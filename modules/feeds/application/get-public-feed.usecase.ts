import { db } from "@infrastructure/database/db.server";
import { outputs, roasts, users } from "@infrastructure/database/schema.server";
import { eq, desc } from "drizzle-orm";

export class GetPublicFeedUseCase {
  async execute() {
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
      db.query.users.findMany({ limit: 5, with: { outputs: true } }),
    ]);

    const rankedEngineers = topEngineers
      .map((u: any) => ({
        ...u,
        totalImpact: u.outputs.reduce(
          (s: number, o: any) => s + (o.impactScore || 0),
          0,
        ),
        avgImpact: Math.round(
          u.outputs.reduce((s: number, o: any) => s + (o.impactScore || 0), 0) /
            (u.outputs.length || 1),
        ),
      }))
      .sort((a: any, b: any) => b.totalImpact - a.totalImpact);

    return { feed, topRoasts, topEngineers: rankedEngineers };
  }
}
