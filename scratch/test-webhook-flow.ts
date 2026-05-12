/**
 * Self-test: signs a synthetic pull_request.closed payload and POSTs it to
 * the running dev server at /webhooks/github. Verifies:
 *   - 202 enqueued response
 *   - webhook_deliveries row inserted with status=enqueued
 *   - background_jobs row created with status=PENDING and correct payload
 *
 * Then cleans up so the next cron tick won't pick up the test job and burn
 * LLM tokens against a non-existent PR.
 *
 * Run:  npx tsx scratch/test-webhook-flow.ts
 */
import crypto from "crypto";
import { Pool } from "@neondatabase/serverless";

const DB_URL = process.env.DATABASE_URL;
const BASE = process.env.BASE_URL ?? "http://localhost:3000";
if (!DB_URL) {
  console.error("DATABASE_URL is not set");
  process.exit(2);
}

async function main() {
  const pool = new Pool({ connectionString: DB_URL });
  const testSecret = crypto.randomBytes(16).toString("hex");
  const testOwner = `wh-test-${Date.now()}`;
  const testRepo = `synthetic-repo`;
  const deliveryId = crypto.randomUUID();

  // Pick any real user — webhook handler needs a valid user_id FK.
  const userRow = await pool.query<{ id: string }>(
    `SELECT id FROM users LIMIT 1;`,
  );
  if (userRow.rows.length === 0) {
    console.error("✗ No users in DB — can't run webhook self-test");
    await pool.end();
    process.exit(1);
  }
  const userId = userRow.rows[0].id;

  console.log(`→ Inserting test tracked_repo (owner=${testOwner})`);
  const tr = await pool.query<{ id: string }>(
    `INSERT INTO tracked_repos (user_id, owner, repo, webhook_secret)
       VALUES ($1, $2, $3, $4)
       RETURNING id`,
    [userId, testOwner, testRepo, testSecret],
  );
  const trackedRepoId = tr.rows[0].id;

  const payload = {
    action: "closed",
    number: 42,
    pull_request: {
      number: 42,
      merged: true,
      user: { login: "octocat", type: "User" },
    },
    repository: { full_name: `${testOwner}/${testRepo}` },
  };
  const rawBody = JSON.stringify(payload);
  const signature =
    "sha256=" +
    crypto.createHmac("sha256", testSecret).update(rawBody).digest("hex");

  console.log(`→ POST ${BASE}/webhooks/github (delivery=${deliveryId})`);
  const res = await fetch(`${BASE}/webhooks/github`, {
    method: "POST",
    headers: {
      "Content-Type": "application/json",
      "X-Hub-Signature-256": signature,
      "X-GitHub-Delivery": deliveryId,
      "X-GitHub-Event": "pull_request",
    },
    body: rawBody,
  });
  const body = await res.text();
  console.log(`  status=${res.status} body=${body}`);

  let exitCode = 0;
  if (res.status !== 202) {
    console.error("✗ Expected 202 Accepted");
    exitCode = 1;
  }

  // Verify webhook_deliveries row landed
  const wd = await pool.query<{ status: string }>(
    `SELECT status FROM webhook_deliveries WHERE id = $1`,
    [deliveryId],
  );
  if (wd.rows.length !== 1 || wd.rows[0].status !== "enqueued") {
    console.error(
      `✗ webhook_deliveries row wrong: ${JSON.stringify(wd.rows)}`,
    );
    exitCode = 1;
  } else {
    console.log(`  ✓ webhook_deliveries.status = enqueued`);
  }

  // Verify a PENDING background_jobs row exists for this user + payload
  const bj = await pool.query<{
    id: string;
    status: string;
    payload: any;
  }>(
    `SELECT id, status, payload FROM background_jobs
      WHERE user_id = $1 AND type = 'transform_pr_webhook'
        AND status = 'PENDING'
        AND payload->>'owner' = $2`,
    [userId, testOwner],
  );
  if (bj.rows.length !== 1) {
    console.error(`✗ Expected 1 PENDING job, found ${bj.rows.length}`);
    exitCode = 1;
  } else {
    console.log(
      `  ✓ background_jobs.id=${bj.rows[0].id} status=PENDING owner=${bj.rows[0].payload?.owner}`,
    );
  }

  // Idempotency: replay should return 200 + duplicate.
  console.log(`→ Replay (idempotency check)`);
  const replay = await fetch(`${BASE}/webhooks/github`, {
    method: "POST",
    headers: {
      "Content-Type": "application/json",
      "X-Hub-Signature-256": signature,
      "X-GitHub-Delivery": deliveryId,
      "X-GitHub-Event": "pull_request",
    },
    body: rawBody,
  });
  const replayBody = await replay.text();
  console.log(`  status=${replay.status} body=${replayBody}`);
  if (replay.status !== 200 || !replayBody.includes("duplicate")) {
    console.error("✗ Replay should be 200 duplicate");
    exitCode = 1;
  } else {
    console.log(`  ✓ duplicate path triggered`);
  }

  // Invalid signature on a fresh delivery id → 401.
  console.log(`→ Bad signature check`);
  const bad = await fetch(`${BASE}/webhooks/github`, {
    method: "POST",
    headers: {
      "Content-Type": "application/json",
      "X-Hub-Signature-256":
        "sha256=" + "0".repeat(64),
      "X-GitHub-Delivery": crypto.randomUUID(),
      "X-GitHub-Event": "pull_request",
    },
    body: rawBody,
  });
  const badBody = await bad.text();
  console.log(`  status=${bad.status} body=${badBody}`);
  if (bad.status !== 401) {
    console.error("✗ Bad signature should be 401");
    exitCode = 1;
  } else {
    console.log(`  ✓ invalid_sig path triggered`);
  }

  // Clean up so the cron doesn't burn tokens against a synthetic PR.
  console.log(`→ Cleanup`);
  await pool.query(`DELETE FROM background_jobs WHERE user_id = $1
                     AND payload->>'owner' = $2`, [userId, testOwner]);
  await pool.query(`DELETE FROM webhook_deliveries WHERE id IN (
                     SELECT id FROM webhook_deliveries
                      WHERE status IN ('enqueued','invalid_sig')
                      ORDER BY received_at DESC LIMIT 3)`);
  await pool.query(`DELETE FROM tracked_repos WHERE id = $1`, [
    trackedRepoId,
  ]);
  console.log(`  ✓ test rows removed`);

  await pool.end();
  if (exitCode === 0) {
    console.log("\n✓ Webhook flow self-test passed");
  } else {
    console.error("\n✗ Webhook flow self-test FAILED");
  }
  process.exit(exitCode);
}

main().catch((e) => {
  console.error("Self-test failed:", e);
  process.exit(1);
});
