import { createFileRoute } from "@tanstack/react-router";
import { db } from "@infrastructure/database/db.server";
import { outputs, digests } from "@infrastructure/database/schema.server";
import { gte, eq, and } from "drizzle-orm";
import { DrizzleDigestRepository } from "@modules/digests/infrastructure/drizzle-digest.repository";
import { GenerateDigestUseCase } from "@modules/digests/application/generate-digest.usecase";

/**
 * Weekly Cron for Auto-Branding Engine.
 * Triggers the generation of the Weekly Digest (LinkedIn Post & Twitter Thread)
 * for all users who have merged PRs in the last 7 days but haven't had a digest
 * generated yet.
 */
export const Route = createFileRoute("/internal/cron/weekly")({
  server: {
    handlers: {
      GET: async ({ request }) => {
        const auth = request.headers.get("authorization") ?? "";
        const cronSecret = process.env.CRON_SECRET;
        const ua = request.headers.get("user-agent") ?? "";
        const isVercelCron = ua.startsWith("vercel-cron");
        const isAuthorized =
          isVercelCron || (cronSecret && auth === `Bearer ${cronSecret}`);
          
        if (!isAuthorized) {
          return new Response("Unauthorized", { status: 401 });
        }

        const now = new Date();
        const oneWeekAgo = new Date(now.getTime() - 7 * 24 * 60 * 60 * 1000);

        try {
          // 1. Find all users who had PRs processed in the last 7 days
          const recentOutputs = await db.query.outputs.findMany({
            where: gte(outputs.createdAt, oneWeekAgo),
            columns: { userId: true },
          });
          const userIds = [...new Set(recentOutputs.map((o: any) => o.userId))];

          const repo = new DrizzleDigestRepository();
          const useCase = new GenerateDigestUseCase(repo);

          const results = [];

          // 2. Generate a digest for each eligible user
          for (const userId of userIds) {
            // Skip if they already had a weekly digest generated in the last 7 days
            const existing = await db.query.digests.findFirst({
              where: and(
                eq(digests.userId, userId),
                eq(digests.kind, "weekly"),
                gte(digests.createdAt, oneWeekAgo)
              ),
            });

            if (existing) {
              results.push({ userId, status: "skipped_already_exists" });
              continue;
            }

            try {
              const digest = await useCase.execute(userId, {
                since: oneWeekAgo,
                until: now,
                kind: "weekly",
              });
              results.push({ userId, digestId: digest.id, status: "generated" });
              
              // Here we would enqueue an email/slack notification:
              // "Here's a thoughtful summary of what you built this week."
            } catch (err: any) {
              results.push({ userId, error: err.message, status: "error" });
            }
          }

          return new Response(
            JSON.stringify({
              message: "Weekly Brand Engine complete",
              stats: {
                totalEligibleUsers: userIds.length,
                generated: results.filter((r) => r.status === "generated").length,
                errors: results.filter((r) => r.status === "error").length,
              },
              results,
            }),
            {
              status: 200,
              headers: { "Content-Type": "application/json" },
            }
          );
        } catch (error: any) {
          console.error("weekly_cron_failure", error);
          return new Response(JSON.stringify({ error: "WEEKLY_CRON_FAILED" }), {
            status: 500,
            headers: { "Content-Type": "application/json" },
          });
        }
      },
    },
  },
});
