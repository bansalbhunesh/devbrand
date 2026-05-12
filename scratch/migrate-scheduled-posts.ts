/**
 * Additive migration for the scheduled-posts feature. Idempotent —
 * safe to rerun.
 *
 * Adds:
 *   background_jobs.scheduled_for (nullable)
 *   background_jobs_scheduled_for_idx (partial)
 *   scheduled_posts (table) + indexes
 *
 * Run:  npx tsx scratch/migrate-scheduled-posts.ts
 */
import { Pool } from "@neondatabase/serverless";
import { readFileSync, existsSync } from "node:fs";
import { resolve } from "node:path";

function envFromDotEnv(): Record<string, string> {
  const candidates = [
    resolve(process.cwd(), ".env"),
    resolve(process.cwd(), "../.env"),
    resolve(process.cwd(), "../../.env"),
    resolve(process.cwd(), "../../../.env"),
    resolve(process.cwd(), "../../../../.env"),
    "D:/Downloads/files/.env",
  ];
  const path = candidates.find((p) => existsSync(p));
  if (!path) {
    console.error(
      "No .env found in any candidate (cwd:",
      process.cwd(),
      ")",
    );
    return {};
  }
  console.log(`Loading env from ${path}`);
  const out: Record<string, string> = {};
  for (const line of readFileSync(path, "utf8").split(/\r?\n/)) {
    if (!line || line.trimStart().startsWith("#")) continue;
    const eq = line.indexOf("=");
    if (eq < 0) continue;
    out[line.slice(0, eq).trim()] = line.slice(eq + 1).trim();
  }
  return out;
}

const url =
  process.env.DATABASE_URL ?? envFromDotEnv().DATABASE_URL ?? undefined;
if (!url) {
  console.error("DATABASE_URL is not set");
  process.exit(2);
}

const SQL = `
  ALTER TABLE background_jobs
    ADD COLUMN IF NOT EXISTS scheduled_for timestamptz;

  CREATE INDEX IF NOT EXISTS background_jobs_scheduled_for_idx
    ON background_jobs (scheduled_for)
    WHERE status = 'PENDING' AND scheduled_for IS NOT NULL;

  CREATE TABLE IF NOT EXISTS scheduled_posts (
    id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
    user_id uuid NOT NULL REFERENCES users(id) ON DELETE CASCADE,
    output_id uuid NOT NULL REFERENCES outputs(id) ON DELETE CASCADE,
    channel text NOT NULL,
    post_kind text NOT NULL,
    scheduled_for timestamptz NOT NULL,
    status text NOT NULL DEFAULT 'SCHEDULED',
    job_id uuid REFERENCES background_jobs(id),
    ready_at timestamptz,
    share_url text,
    created_at timestamptz NOT NULL DEFAULT now()
  );

  CREATE INDEX IF NOT EXISTS scheduled_posts_user_idx
    ON scheduled_posts (user_id);
  CREATE INDEX IF NOT EXISTS scheduled_posts_status_idx
    ON scheduled_posts (status, scheduled_for);
`;

async function main() {
  const pool = new Pool({ connectionString: url });
  try {
    console.log("Applying scheduled-posts migration...");
    await pool.query(SQL);
    console.log("Migration applied");

    const colCheck = await pool.query<{ column_name: string }>(
      `SELECT column_name FROM information_schema.columns
        WHERE table_schema = 'public'
          AND table_name = 'background_jobs'
          AND column_name = 'scheduled_for';`,
    );
    if (colCheck.rows.length !== 1) {
      console.error("Expected background_jobs.scheduled_for column");
      process.exit(1);
    }
    console.log("background_jobs.scheduled_for present");

    const tblCheck = await pool.query<{ table_name: string }>(
      `SELECT table_name FROM information_schema.tables
        WHERE table_schema = 'public'
          AND table_name = 'scheduled_posts';`,
    );
    if (tblCheck.rows.length !== 1) {
      console.error("Expected scheduled_posts table");
      process.exit(1);
    }
    console.log("scheduled_posts table present");

    const idxCheck = await pool.query<{ indexname: string }>(
      `SELECT indexname FROM pg_indexes
        WHERE schemaname = 'public'
          AND indexname IN (
            'background_jobs_scheduled_for_idx',
            'scheduled_posts_user_idx',
            'scheduled_posts_status_idx'
          )
        ORDER BY indexname;`,
    );
    console.log("Indexes present:");
    for (const row of idxCheck.rows) console.log(`  ${row.indexname}`);
    if (idxCheck.rows.length !== 3) {
      console.error(`Expected 3 indexes, found ${idxCheck.rows.length}`);
      process.exit(1);
    }
  } finally {
    await pool.end();
  }
}

main().catch((e) => {
  console.error("Migration failed:", e);
  process.exit(1);
});
