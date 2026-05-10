import { createServerFn } from "@tanstack/react-start";
import { z } from "zod";
import { db } from "./db";
import { outputs, users } from "./schema";
import { eq, and, gte, lte, sql } from "drizzle-orm";

export const getWrappedStats = createServerFn({ method: "GET" })
  .validator(z.string().uuid())
  .handler(async ({ data: userId }) => {
    const year = new Date().getFullYear() - 1;
    const startOfYear = new Date(`${year}-01-01T00:00:00Z`);
    const endOfYear = new Date(`${year}-12-31T23:59:59Z`);

    const yearOutputs = await db.query.outputs.findMany({
      where: and(
        eq(outputs.userId, userId),
        gte(outputs.createdAt, startOfYear),
        lte(outputs.createdAt, endOfYear)
      ),
    });

    if (yearOutputs.length === 0) {
      return null;
    }

    const user = await db.query.users.findFirst({ where: eq(users.id, userId) });

    const totalImpact = yearOutputs.reduce((acc, o) => acc + (o.impactScore ?? 0), 0);
    const avgImpact = Math.round(totalImpact / yearOutputs.length);

    const categoryMap = yearOutputs.reduce<Record<string, number>>((acc, o) => {
      const cat = o.category ?? "Other";
      acc[cat] = (acc[cat] ?? 0) + 1;
      return acc;
    }, {});
    const sortedCategories = Object.entries(categoryMap).sort(([, a], [, b]) => b - a);
    const topCategory = sortedCategories[0]?.[0] ?? "Feature";

    const complexityMap = yearOutputs.reduce<Record<string, number>>((acc, o) => {
      const c = o.complexityLevel ?? "Mid";
      acc[c] = (acc[c] ?? 0) + 1;
      return acc;
    }, {});
    const topComplexity = Object.entries(complexityMap).sort(([, a], [, b]) => b - a)[0]?.[0] ?? "Mid";

    const invisibleWork = yearOutputs.filter(
      (o) => o.prSignals?.some((s) => ["structural", "behavioral"].includes(s))
    ).length;
    const invisiblePct = Math.round((invisibleWork / yearOutputs.length) * 100);

    const topOutput = [...yearOutputs].sort((a, b) => (b.impactScore ?? 0) - (a.impactScore ?? 0))[0];

    const monthMap: number[] = new Array(12).fill(0);
    for (const o of yearOutputs) {
      monthMap[new Date(o.createdAt).getMonth()]++;
    }

    const stackMap = yearOutputs
      .flatMap((o) => o.stack ?? [])
      .reduce<Record<string, number>>((acc, s) => {
        acc[s] = (acc[s] ?? 0) + 1;
        return acc;
      }, {});
    const topStack = Object.entries(stackMap).sort(([, a], [, b]) => b - a).slice(0, 5).map(([k]) => k);

    return {
      year,
      userName: user?.name ?? user?.githubLogin ?? "Engineer",
      totalPRs: yearOutputs.length,
      totalImpactScore: totalImpact,
      avgImpactScore: avgImpact,
      topCategory,
      categoryBreakdown: sortedCategories,
      topComplexity,
      invisibleWorkCount: invisibleWork,
      invisibleWorkPct: invisiblePct,
      topStack,
      topOutput: topOutput
        ? { prTitle: topOutput.prTitle, impactScore: topOutput.impactScore, category: topOutput.category, slug: topOutput.slug }
        : null,
      monthDistribution: monthMap,
    };
  });
