/**
 * Additive migration for the GitHub merge-webhook feature. Idempotent —
 * safe to rerun.
 *
 * Creates:
 *   tracked_repos       — per-user repo registrations with HMAC secret
 *   webhook_deliveries  — dedup table keyed on X-GitHub-Delivery
 *
 * Run:  npx tsx scratch/migrate-tracked-repos.ts
 */
import { Pool } from "@neondatabase/serverless";

const url = process.env.DATABASE_URL;
if (!url) {
  console.error("DATABASE_URL is not set");
  process.exit(2);
}

const SQL = `
  CREATE TABLE IF NOT EXISTS "tracked_repos" (
    "id" uuid PRIMARY KEY DEFAULT gen_random_uuid(),
    "user_id" uuid NOT NULL REFERENCES "users"("id") ON DELETE CASCADE,
    "owner" text NOT NULL,
    "repo" text NOT NULL,
    "webhook_secret" text NOT NULL,
    "auto_publish" boolean NOT NULL DEFAULT false,
    "created_at" timestamptz NOT NULL DEFAULT now()
  );
  CREATE UNIQUE INDEX IF NOT EXISTS "tracked_repos_user_owner_repo_idx"
    ON "tracked_repos" ("user_id", "owner", "repo");
  CREATE INDEX IF NOT EXISTS "tracked_repos_owner_repo_idx"
    ON "tracked_repos" ("owner", "repo");

  CREATE TABLE IF NOT EXISTS "webhook_deliveries" (
    "id" text PRIMARY KEY,
    "received_at" timestamptz NOT NULL DEFAULT now(),
    "status" text NOT NULL
  );
`;

async function main() {
  const pool = new Pool({ connectionString: url });
  try {
    console.log("Applying tracked-repos migration...");
    await pool.query(SQL);
    console.log("✓ Migration applied");

    const check = await pool.query<{ table_name: string }>(
      `SELECT table_name FROM information_schema.tables
        WHERE table_schema = 'public'
          AND table_name IN ('tracked_repos','webhook_deliveries')
        ORDER BY table_name;`,
    );
    console.log("Verification — tables present:");
    for (const row of check.rows) console.log(`  ${row.table_name}`);
    if (check.rows.length !== 2) {
      console.error(`✗ Expected 2 tables, found ${check.rows.length}`);
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
