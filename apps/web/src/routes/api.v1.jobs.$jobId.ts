import { createFileRoute } from "@tanstack/react-router";
import { db } from "@infrastructure/database/db.server";
import { backgroundJobs } from "@infrastructure/database/schema.server";
import { eq } from "drizzle-orm";

export const Route = createFileRoute("/api/v1/jobs/$jobId")({
  server: {
    handlers: {
      GET: async ({ request, params }) => {
        try {
          const { jobId } = params;

          const job = await db.query.backgroundJobs.findFirst({
            where: eq(backgroundJobs.id, jobId)
          });

          if (!job) {
            return new Response(JSON.stringify({ error: "Job not found" }), { status: 404 });
          }

          return new Response(JSON.stringify({
            id: job.id,
            status: job.status,
            result: job.result,
            error: job.error
          }), {
            status: 200,
            headers: { "Content-Type": "application/json" }
          });
        } catch (error) {
          console.error("GET Job Error:", error);
          return new Response(JSON.stringify({ error: "Internal Server Error" }), { status: 500 });
        }
      }
    }
  }
});
