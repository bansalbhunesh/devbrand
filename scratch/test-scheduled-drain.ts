/**
 * End-to-end manual test for the scheduled-post drain path.
 *
 * 1. Picks any existing user + their most recent output (or fails fast).
 * 2. Inserts a scheduled_posts row with scheduled_for = now - 30s.
 * 3. Inserts the matching background_jobs row (type=publish_scheduled_post,
 *    scheduled_for = now - 30s, status=PENDING).
 * 4. Wires scheduled_posts.job_id back.
 * 5. Calls the cron drain HTTP endpoint with the vercel-cron user-agent.
 * 6. Reads the scheduled_posts row back and prints the final state.
 *
 * Run:  npm run test:scheduled-drain -- [target=http://localhost:3000]
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
const url = process.env.DATABASE_URL ?? ENV.DATABASE_URL;
if (!url) {
  console.error("DATABASE_URL is not set");
  process.exit(2);
}

const target =
  process.argv.find((a) => a.startsWith("http://") || a.startsWith("https://")) ??
  "http://localhost:3000";

async function main() {
  const pool = new Pool({ connectionString: url });
  try {
    const userQ = await pool.query<{ id: string }>(
      `SELECT id FROM users ORDER BY created_at DESC LIMIT 1;`,
    );
    if (userQ.rows.length === 0) {
      throw new Error("No users in DB — seed one first.");
    }
    const userId = userQ.rows[0].id;
    console.log(`Using user_id=${userId}`);

    const outputQ = await pool.query<{ id: string; slug: string }>(
      `SELECT id, slug FROM outputs WHERE user_id = $1
         ORDER BY created_at DESC LIMIT 1;`,
      [userId],
    );
    if (outputQ.rows.length === 0) {
      throw new Error(
        `User ${userId} has no outputs — generate one before testing.`,
      );
    }
    const output = outputQ.rows[0];
    console.log(`Using output_id=${output.id} slug=${output.slug}`);

    const past = new Date(Date.now() - 30_000); // 30s ago

    const spInsert = await pool.query<{ id: string }>(
      `INSERT INTO scheduled_posts (user_id, output_id, channel, post_kind, scheduled_for, status)
       VALUES ($1, $2, 'linkedin', 'linkedinPost1', $3, 'SCHEDULED') RETURNING id;`,
      [userId, output.id, past.toISOString()],
    );
    const scheduledPostId = spInsert.rows[0].id;
    console.log(`Inserted scheduled_posts id=${scheduledPostId}`);

    const jobInsert = await pool.query<{ id: string }>(
      `INSERT INTO background_jobs (user_id, type, status, payload, scheduled_for)
       VALUES ($1, 'publish_scheduled_post', 'PENDING', $2::jsonb, $3) RETURNING id;`,
      [userId, JSON.stringify({ scheduledPostId }), past.toISOString()],
    );
    const jobId = jobInsert.rows[0].id;
    console.log(`Inserted background_jobs id=${jobId}`);

    await pool.query(
      `UPDATE scheduled_posts SET job_id = $1 WHERE id = $2;`,
      [jobId, scheduledPostId],
    );

    const drainUrl = `${target.replace(/\/+$/, "")}/internal/cron/drain`;
    console.log(`POST/GET ${drainUrl} with user-agent: vercel-cron/1.0`);
    const res = await fetch(drainUrl, {
      method: "GET",
      headers: { "user-agent": "vercel-cron/1.0" },
    });
    const bodyText = await res.text();
    console.log(`drain status=${res.status} body=${bodyText}`);

    const after = await pool.query<{
      status: string;
      ready_at: Date | null;
      share_url: string | null;
    }>(
      `SELECT status, ready_at, share_url FROM scheduled_posts WHERE id = $1;`,
      [scheduledPostId],
    );
    const row = after.rows[0];
    console.log("Post-drain row:", row);

    const jobAfter = await pool.query<{ status: string; error: string | null }>(
      `SELECT status, error FROM background_jobs WHERE id = $1;`,
      [jobId],
    );
    console.log("Post-drain job:", jobAfter.rows[0]);

    if (row.status !== "READY") {
      console.error(`Expected READY, got ${row.status}`);
      process.exit(1);
    }
    console.log("PASS — scheduled_posts.status flipped to READY");
  } finally {
    await pool.end();
  }
}

main().catch((e) => {
  console.error("test failed:", e);
  process.exit(1);
});
