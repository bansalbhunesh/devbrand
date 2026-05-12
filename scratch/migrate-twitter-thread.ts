/**
 * Adds outputs.twitter_thread JSONB column. Idempotent.
 * Run:  npx tsx scratch/migrate-twitter-thread.ts
 */
import { Pool } from "@neondatabase/serverless";

const url = process.env.DATABASE_URL;
if (!url) {
  console.error("DATABASE_URL is not set");
  process.exit(2);
}

const SQL = `
  ALTER TABLE "outputs"
  ADD COLUMN IF NOT EXISTS "twitter_thread" JSONB;
`;

async function main() {
  const pool = new Pool({ connectionString: url });
  try {
    console.log("→ outputs.twitter_thread — ADD COLUMN");
    await pool.query(SQL);
    console.log("  ✓ done");

    const verify = await pool.query<{ column_name: string; data_type: string }>(
      `SELECT column_name, data_type
         FROM information_schema.columns
        WHERE table_schema='public' AND table_name='outputs'
          AND column_name='twitter_thread';`,
    );
    for (const row of verify.rows) {
      console.log(`  outputs.${row.column_name} (${row.data_type})`);
    }
  } finally {
    await pool.end();
  }
}

main().catch((e) => {
  console.error("Migration failed:", e);
  process.exit(1);
});
