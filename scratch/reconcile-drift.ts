/**
 * One-off reconciliation migration. Brings the live Neon DB into sync with
 * src/server/schema.server.ts. Idempotent — safe to rerun.
 *
 * Changes:
 *   1. users:         ADD session_nonce (NOT NULL DEFAULT gen_random_uuid())
 *   2. users:         RENAME stripe_customer_id → external_customer_id
 *   3. teams:         RENAME stripe_subscription_id → external_subscription_id
 *   4. subscriptions: RENAME stripe_subscription_id → external_subscription_id
 *   5. subscriptions: RENAME stripe_customer_id → external_customer_id
 *   6. outputs:       ADD metadata JSONB (nullable)
 *
 * Pre-flight grep confirmed no application code reads the stripe_* names —
 * only the (refactored) schema.server.ts references the new external_* names.
 * The renames preserve existing data.
 *
 * Run:  npx tsx scratch/reconcile-drift.ts
 */
import { Pool } from "@neondatabase/serverless";

const url = process.env.DATABASE_URL;
if (!url) {
  console.error("DATABASE_URL is not set");
  process.exit(2);
}

const STATEMENTS: { label: string; sql: string }[] = [
  {
    label: "users.session_nonce — ADD COLUMN",
    sql: `ALTER TABLE "users"
            ADD COLUMN IF NOT EXISTS "session_nonce" TEXT NOT NULL DEFAULT gen_random_uuid()::text;`,
  },
  {
    label: "users.stripe_customer_id → external_customer_id — RENAME",
    sql: `DO $$
          BEGIN
            IF EXISTS (
              SELECT 1 FROM information_schema.columns
              WHERE table_schema='public' AND table_name='users'
                AND column_name='stripe_customer_id'
            ) AND NOT EXISTS (
              SELECT 1 FROM information_schema.columns
              WHERE table_schema='public' AND table_name='users'
                AND column_name='external_customer_id'
            ) THEN
              ALTER TABLE "users" RENAME COLUMN "stripe_customer_id" TO "external_customer_id";
            END IF;
          END $$;`,
  },
  {
    label: "teams.stripe_subscription_id → external_subscription_id — RENAME",
    sql: `DO $$
          BEGIN
            IF EXISTS (
              SELECT 1 FROM information_schema.columns
              WHERE table_schema='public' AND table_name='teams'
                AND column_name='stripe_subscription_id'
            ) AND NOT EXISTS (
              SELECT 1 FROM information_schema.columns
              WHERE table_schema='public' AND table_name='teams'
                AND column_name='external_subscription_id'
            ) THEN
              ALTER TABLE "teams" RENAME COLUMN "stripe_subscription_id" TO "external_subscription_id";
            END IF;
          END $$;`,
  },
  {
    label:
      "subscriptions.stripe_subscription_id → external_subscription_id — RENAME",
    sql: `DO $$
          BEGIN
            IF EXISTS (
              SELECT 1 FROM information_schema.columns
              WHERE table_schema='public' AND table_name='subscriptions'
                AND column_name='stripe_subscription_id'
            ) AND NOT EXISTS (
              SELECT 1 FROM information_schema.columns
              WHERE table_schema='public' AND table_name='subscriptions'
                AND column_name='external_subscription_id'
            ) THEN
              ALTER TABLE "subscriptions" RENAME COLUMN "stripe_subscription_id" TO "external_subscription_id";
            END IF;
          END $$;`,
  },
  {
    label: "subscriptions.stripe_customer_id → external_customer_id — RENAME",
    sql: `DO $$
          BEGIN
            IF EXISTS (
              SELECT 1 FROM information_schema.columns
              WHERE table_schema='public' AND table_name='subscriptions'
                AND column_name='stripe_customer_id'
            ) AND NOT EXISTS (
              SELECT 1 FROM information_schema.columns
              WHERE table_schema='public' AND table_name='subscriptions'
                AND column_name='external_customer_id'
            ) THEN
              ALTER TABLE "subscriptions" RENAME COLUMN "stripe_customer_id" TO "external_customer_id";
            END IF;
          END $$;`,
  },
  {
    label: "outputs.metadata — ADD COLUMN",
    sql: `ALTER TABLE "outputs"
            ADD COLUMN IF NOT EXISTS "metadata" JSONB;`,
  },
];

async function main() {
  const pool = new Pool({ connectionString: url });
  try {
    for (const stmt of STATEMENTS) {
      console.log(`→ ${stmt.label}`);
      await pool.query(stmt.sql);
      console.log(`  ✓ done`);
    }

    console.log("\n=== POST-MIGRATION VERIFICATION ===");
    const verify = await pool.query<{ table_name: string; column_name: string }>(
      `SELECT table_name, column_name
         FROM information_schema.columns
        WHERE table_schema = 'public'
          AND (
            (table_name = 'users' AND column_name IN ('session_nonce','external_customer_id','stripe_customer_id'))
            OR (table_name = 'teams' AND column_name IN ('external_subscription_id','stripe_subscription_id'))
            OR (table_name = 'subscriptions' AND column_name IN ('external_subscription_id','external_customer_id','stripe_subscription_id','stripe_customer_id'))
            OR (table_name = 'outputs' AND column_name = 'metadata')
          )
        ORDER BY table_name, column_name;`,
    );
    for (const row of verify.rows) {
      console.log(`  ${row.table_name}.${row.column_name}`);
    }
  } finally {
    await pool.end();
  }
}

main().catch((e) => {
  console.error("Reconciliation failed:", e);
  process.exit(1);
});
