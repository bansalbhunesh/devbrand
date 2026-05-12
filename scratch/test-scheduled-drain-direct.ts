/**
 * Direct (no HTTP) end-to-end test for the publish_scheduled_post job
 * dispatch. Mirrors what the /internal/cron/drain route would do.
 *
 * Run:  npm run test:scheduled-drain-direct
 */
import { Pool } from "@neondatabase/serverless";
import { readFileSync, existsSync } from "node:fs";
import { resolve } from "node:path";

function envFromDotEnv(): Record<string, string> {
  const candidates = [
    resolve(process.cwd(), ".env"),
    "D:/Downloads/files/.env",
  ];
  const path = candidates.find((p) => existsSync(p));
  if (!path) return {};
  const out: Record<string, string> = {};
  for (const line of readFileSync(path, "utf8").split(/\r?\n/)) {
    if (!line || line.trimStart().startsWith("#")) continue;
    const eq = line.indexOf("=");
    if (eq < 0) continue;
    out[line.slice(0, eq).trim()] = line.slice(eq + 1).trim();
  }
  return out;
}

const ENV = envFromDotEnv();
// Hoist any .env values into process.env so transitively-imported modules
// (db.server, env.ts, etc.) see them at module-evaluation time.
for (const [k, v] of Object.entries(ENV)) {
  if (process.env[k] == null) process.env[k] = v;
}
const url = process.env.DATABASE_URL;
if (!url) {
  console.error("DATABASE_URL is not set");
  process.exit(2);
}

async function main() {
  const pool = new Pool({ connectionString: url });
  let scheduledPostId: string | undefined;
  let jobId: string | undefined;
  try {
    const userQ = await pool.query<{ id: string }>(
      `SELECT id FROM users ORDER BY created_at DESC LIMIT 1;`,
    );
    if (userQ.rows.length === 0) throw new Error("No users in DB.");
    const userId = userQ.rows[0].id;

    const outputQ = await pool.query<{ id: string; slug: string }>(
      `SELECT id, slug FROM outputs WHERE user_id = $1
         ORDER BY created_at DESC LIMIT 1;`,
      [userId],
    );
    if (outputQ.rows.length === 0) {
      throw new Error(`User ${userId} has no outputs.`);
    }
    const output = outputQ.rows[0];
    console.log(`Using user=${userId} output=${output.id} slug=${output.slug}`);

    const past = new Date(Date.now() - 30_000);
    const spInsert = await pool.query<{ id: string }>(
      `INSERT INTO scheduled_posts (user_id, output_id, channel, post_kind, scheduled_for, status)
       VALUES ($1, $2, 'linkedin', 'linkedinPost1', $3, 'SCHEDULED') RETURNING id;`,
      [userId, output.id, past.toISOString()],
    );
    scheduledPostId = spInsert.rows[0].id;

    const jobInsert = await pool.query<{ id: string }>(
      `INSERT INTO background_jobs (user_id, type, status, payload, scheduled_for)
       VALUES ($1, 'publish_scheduled_post', 'PENDING', $2::jsonb, $3) RETURNING id;`,
      [userId, JSON.stringify({ scheduledPostId }), past.toISOString()],
    );
    jobId = jobInsert.rows[0].id;
    await pool.query(`UPDATE scheduled_posts SET job_id = $1 WHERE id = $2;`, [
      jobId,
      scheduledPostId,
    ]);

    console.log(
      `Seeded scheduled_post=${scheduledPostId} job=${jobId} (30s in the past)`,
    );

    const { drainQueueTick } = await import("../src/server/jobs.server");
    const result = await drainQueueTick(5);
    console.log("drain result:", JSON.stringify(result, null, 2));

    const after = await pool.query<{
      status: string;
      ready_at: Date | null;
      share_url: string | null;
    }>(
      `SELECT status, ready_at, share_url FROM scheduled_posts WHERE id = $1;`,
      [scheduledPostId],
    );
    console.log("Post-drain scheduled_posts:", after.rows[0]);

    const jobAfter = await pool.query<{ status: string; error: string | null }>(
      `SELECT status, error FROM background_jobs WHERE id = $1;`,
      [jobId],
    );
    console.log("Post-drain background_jobs:", jobAfter.rows[0]);

    if (after.rows[0].status !== "READY") {
      console.error(`FAIL — expected READY, got ${after.rows[0].status}`);
      process.exit(1);
    }
    if (!after.rows[0].share_url) {
      console.error(`FAIL — share_url empty`);
      process.exit(1);
    }
    console.log("PASS — scheduled_posts.status=READY and share_url populated");
  } finally {
    if (scheduledPostId) {
      await pool.query(`DELETE FROM scheduled_posts WHERE id = $1;`, [
        scheduledPostId,
      ]);
    }
    if (jobId) {
      await pool.query(`DELETE FROM background_jobs WHERE id = $1;`, [jobId]);
    }
    await pool.end();
  }
}

main().catch((e) => {
  console.error("test failed:", e);
  process.exit(1);
});
