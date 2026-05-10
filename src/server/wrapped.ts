import { createServerFn } from "@tanstack/react-start";
import { db } from "./db";
import { users, outputs } from "./schema";
import { eq, and, gte, lte } from "drizzle-orm";

export const getWrappedStats = createServerFn({ method: "GET" })
  .validator((userId: string) => userId)
  .handler(async ({ data: userId }) => {
    const startOfYear = new Date("2025-01-01T00:00:00Z");
    const endOfYear = new Date("2025-12-31T23:59:59Z");

    const yearOutputs = await db.query.outputs.findMany({
      where: and(
        eq(outputs.userId, userId),
        gte(outputs.createdAt, startOfYear),
        lte(outputs.createdAt, endOfYear)
      ),
    });

    const totalImpact = yearOutputs.reduce((acc, o) => acc + (o.impactScore ?? 0), 0);
    const topCategory = yearOutputs.reduce((acc: any, o) => {
      acc[o.category ?? 'Other'] = (acc[o.category ?? 'Other'] || 0) + 1;
      return acc;
    }, {});

    return {
      totalPRs: yearOutputs.length,
      totalImpactScore: totalImpact,
      topCategory: Object.entries(topCategory).sort((a: any, b: any) => b[1] - a[1])[0]?.[0] ?? "N/A",
      invisibleWorkCount: yearOutputs.filter(o => o.prSignals?.includes('structural')).length,
    };
  });
