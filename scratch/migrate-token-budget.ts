/**
 * One-off migration: adds tokens_input_this_month + tokens_output_this_month
 * to users. Idempotent (ADD COLUMN IF NOT EXISTS) — safe to rerun.
 *
 * Used in place of `drizzle-kit push` because push tried to interactively
 * resolve unrelated drift between the live schema and schema.server.ts;
 * this script is scoped to the exact additive change we need.
 *
 * Run:  npx tsx scratch/migrate-token-budget.ts
 */
import { Pool } from "@neondatabase/serverless";
import { config } from "node:process";

const url = process.env.DATABASE_URL;
if (!url) {
  console.error("DATABASE_URL is not set");
  process.exit(2);
}

const SQL = `
  ALTER TABLE "users"
  ADD COLUMN IF NOT EXISTS "tokens_input_this_month" INTEGER NOT NULL DEFAULT 0,
  ADD COLUMN IF NOT EXISTS "tokens_output_this_month" INTEGER NOT NULL DEFAULT 0;
`;

async function main() {
  const pool = new Pool({ connectionString: url });
  try {
    console.log("Applying token-budget migration...");
    const result = await pool.query(SQL);
    console.log("✓ Migration applied. Rows touched:", result.rowCount ?? "n/a");

    const check = await pool.query<{ column_name: string; data_type: string }>(
      `SELECT column_name, data_type
       FROM information_schema.columns
       WHERE table_name = 'users'
         AND column_name IN ('tokens_input_this_month', 'tokens_output_this_month')
       ORDER BY column_name;`,
    );
    console.log("Verification — columns present on users table:");
    for (const row of check.rows) {
      console.log(`  ${row.column_name} (${row.data_type})`);
    }
    if (check.rows.length < 2) {
      console.error("✗ Expected 2 columns but found", check.rows.length);
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

// Silence unused-import linter without changing behavior:
void config;
