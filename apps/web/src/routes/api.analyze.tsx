import { createFileRoute } from "@tanstack/react-router";
import { db } from "@infrastructure/database/db.server";
import { apiKeys, backgroundJobs } from "@infrastructure/database/schema.server";
import { eq } from "drizzle-orm";
import crypto from "crypto";

export const Route = createFileRoute("/api/analyze")({
  server: {
    handlers: {
      POST: async ({ request }) => {
        try {
          const authHeader = request.headers.get("Authorization");
          if (!authHeader?.startsWith("Bearer ")) {
            return new Response(JSON.stringify({ error: "Missing or invalid Authorization header" }), { status: 401 });
          }

          const key = authHeader.split(" ")[1];
          const keyHash = crypto.createHash("sha256").update(key).digest("hex");

          const apiKey = await db.query.apiKeys.findFirst({
            where: eq(apiKeys.keyHash, keyHash),
            with: { user: true }
          });

          if (!apiKey) {
            return new Response(JSON.stringify({ error: "Invalid API Key" }), { status: 401 });
          }

          const body = await request.json();
          const { owner, repo, prNumber, headSha } = body;

          if (!owner || !repo || !prNumber) {
            return new Response(JSON.stringify({ error: "Missing required fields (owner, repo, prNumber)" }), { status: 400 });
          }

          const [job] = await db
            .insert(backgroundJobs)
            .values({
              userId: apiKey.userId,
              type: "transform_pr_webhook",
              status: "PENDING",
              payload: { owner, repo, prNumber, headSha }
            })
            .returning({ id: backgroundJobs.id });

          // Update last used
          await db.update(apiKeys)
            .set({ lastUsedAt: new Date() })
            .where(eq(apiKeys.id, apiKey.id));

          return new Response(JSON.stringify({ jobId: job.id, status: "enqueued" }), { status: 202 });
        } catch (error) {
          console.error("API Analyze Error:", error);
          return new Response(JSON.stringify({ error: "Internal Server Error" }), { status: 500 });
        }
      }
    }
  }
});
