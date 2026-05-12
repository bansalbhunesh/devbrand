/**
 * Additive migration for the weekly-digest feature. Idempotent — safe to rerun.
 *
 * Creates:
 *   digests — per-user multi-PR rollup posts (linkedin + twitter thread + release notes)
 *
 * Run:  npx tsx scratch/migrate-digests.ts
 */
import { Pool } from "@neondatabase/serverless";
import { readFileSync, existsSync } from "fs";
import { join } from "path";

// Read DATABASE_URL from process.env first, falling back to a local .env file.
// Mirrors the loader pattern used by the dev server so the script works when
// run via `npx tsx scratch/migrate-digests.ts` without a shell wrapper.
function loadDatabaseUrl(): string | undefined {
  if (process.env.DATABASE_URL) return process.env.DATABASE_URL;
  const envPath = existsSync(join(process.cwd(), ".env"))
    ? join(process.cwd(), ".env")
    : join(process.cwd(), "..", ".env");
  if (!existsSync(envPath)) return undefined;
  for (const line of readFileSync(envPath, "utf-8").split(/\r?\n/)) {
    const m = line.match(/^DATABASE_URL\s*=\s*(.+)$/);
    if (m) return m[1].trim().replace(/^['"]|['"]$/g, "");
  }
  return undefined;
}

const url = loadDatabaseUrl();
if (!url) {
  console.error("DATABASE_URL is not set");
  process.exit(2);
}

const SQL = `
  CREATE TABLE IF NOT EXISTS "digests" (
    "id" uuid PRIMARY KEY DEFAULT gen_random_uuid(),
    "user_id" uuid NOT NULL REFERENCES "users"("id") ON DELETE CASCADE,
    "kind" text NOT NULL,
    "period_start" timestamptz NOT NULL,
    "period_end" timestamptz NOT NULL,
    "linkedin_post" text NOT NULL,
    "twitter_thread" jsonb NOT NULL,
    "release_notes" text NOT NULL,
    "included_output_ids" uuid[] NOT NULL,
    "created_at" timestamptz NOT NULL DEFAULT now()
  );
  CREATE INDEX IF NOT EXISTS "digests_user_id_idx" ON "digests" ("user_id");
  CREATE INDEX IF NOT EXISTS "digests_created_at_idx" ON "digests" ("created_at");
`;

async function main() {
  const pool = new Pool({ connectionString: url });
  try {
    console.log("Applying digests migration...");
    await pool.query(SQL);
    console.log("Migration applied");

    const check = await pool.query<{ table_name: string }>(
      `SELECT table_name FROM information_schema.tables
        WHERE table_schema = 'public' AND table_name = 'digests';`,
    );
    if (check.rows.length !== 1) {
      console.error(`Expected 1 table, found ${check.rows.length}`);
      process.exit(1);
    }

    const cols = await pool.query<{ column_name: string; data_type: string }>(
      `SELECT column_name, data_type FROM information_schema.columns
        WHERE table_schema = 'public' AND table_name = 'digests'
        ORDER BY ordinal_position;`,
    );
    console.log("digests columns:");
    for (const row of cols.rows) {
      console.log(`  ${row.column_name} (${row.data_type})`);
    }
  } finally {
    await pool.end();
  }
}

main().catch((e) => {
  console.error("Migration failed:", e);
  process.exit(1);
});
