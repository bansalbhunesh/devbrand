/**
 * One-off harness to exercise generateDigestFn against real user data without
 * the auth-session middleware. Picks the most recent user with >= 2 outputs
 * and generates a "weekly" digest spanning their last 30 days of work.
 *
 * Run:  npm run db:test-digest
 */
import { readFileSync, existsSync } from "fs";
import { join } from "path";

function loadEnv() {
  const envPath = existsSync(join(process.cwd(), ".env"))
    ? join(process.cwd(), ".env")
    : join(process.cwd(), "..", ".env");
  if (!existsSync(envPath)) return;
  for (const line of readFileSync(envPath, "utf-8").split(/\r?\n/)) {
    const m = line.match(/^([A-Z_][A-Z0-9_]*)\s*=\s*(.+)$/);
    if (m && !process.env[m[1]]) {
      process.env[m[1]] = m[2].trim().replace(/^['"]|['"]$/g, "");
    }
  }
}
loadEnv();

async function main() {
  const { Pool } = await import("@neondatabase/serverless");
  const pool = new Pool({ connectionString: process.env.DATABASE_URL });
  const { rows } = await pool.query<{
    user_id: string;
    github_login: string;
    output_count: number;
    min_date: string;
    max_date: string;
  }>(
    `SELECT u.id AS user_id, u.github_login,
            COUNT(o.id) AS output_count,
            MIN(o.created_at) AS min_date,
            MAX(o.created_at) AS max_date
       FROM users u
       JOIN outputs o ON o.user_id = u.id
      GROUP BY u.id, u.github_login
      HAVING COUNT(o.id) >= 2
      ORDER BY MAX(o.created_at) DESC
      LIMIT 5;`,
  );
  await pool.end();

  if (rows.length === 0) {
    console.log("No users with >= 2 outputs found");
    return;
  }
  const target = rows[0];
  console.log(
    `Target user: ${target.github_login} (${target.output_count} outputs)`,
  );
  console.log(`Range: ${target.min_date} → ${target.max_date}`);

  // Bypass the session check by calling the underlying logic directly. We
  // import after env is loaded so .server.ts modules read DATABASE_URL.
  const { db } = await import("../src/server/db.server");
  const { outputs, digests, userEvents } = await import(
    "../src/server/schema.server"
  );
  const { and, eq, gte, lte, desc } = await import("drizzle-orm");
  const { completeText, normalizeLlmJsonText } = await import(
    "../src/server/llm/client"
  );

  const since = new Date(target.min_date);
  const until = new Date(target.max_date);
  until.setSeconds(until.getSeconds() + 1);

  const rowsForDigest = await db
    .select({
      id: outputs.id,
      prTitle: outputs.prTitle,
      prUrl: outputs.prUrl,
      resumeBullet: outputs.resumeBullet,
      category: outputs.category,
      impactScore: outputs.impactScore,
      createdAt: outputs.createdAt,
    })
    .from(outputs)
    .where(
      and(
        eq(outputs.userId, target.user_id),
        gte(outputs.createdAt, since),
        lte(outputs.createdAt, until),
      ),
    )
    .orderBy(desc(outputs.createdAt))
    .limit(40);

  console.log(`Pulled ${rowsForDigest.length} outputs`);

  const userMessage = rowsForDigest
    .map((o) =>
      [
        `### ${o.prTitle}`,
        `- id: ${o.id}`,
        `- url: ${o.prUrl ?? "n/a"}`,
        `- merged: ${new Date(o.createdAt).toISOString().slice(0, 10)}`,
        `- category: ${o.category ?? "uncategorized"}`,
        `- impactScore: ${o.impactScore}`,
        `- bullet: ${o.resumeBullet}`,
      ].join("\n"),
    )
    .join("\n\n");

  const systemPrompt = `You are a weekly engineering newsletter writer. Your job is to weave a batch of merged PRs into ONE cohesive retrospective post that shows the through-line of the work.

You will receive ${rowsForDigest.length} merged PRs. Synthesize across them — find themes, group related work, surface the headline win. Do NOT just list the PRs.

Return STRICT JSON matching this schema (no markdown, no commentary):
{
  "linkedinPost": "single LinkedIn post, 180-280 words, first person, professional but warm. Lead with the most impressive theme. Use 1-2 short paragraphs.",
  "twitterThread": ["tweet1", "tweet2", ...],
  "releaseNotes": "markdown-formatted release notes with H2 section headers (## Features / ## Fixes / ## Improvements as appropriate), bulleted items grouped by theme."
}

twitterThread rules:
- 3 to 7 tweets total
- Each tweet <= 270 characters (leave room for thread metadata)
- First tweet hooks; last tweet has a soft CTA
- No tweet numbering — the array order IS the order

Tone: confident, evidence-backed, never breathless. Reference concrete categories/impact when natural. Do not invent metrics that weren't in the source data.`;

  console.log("Calling LLM...");
  const result = await completeText({
    system: systemPrompt,
    user: userMessage,
    maxTokens: 3000,
    temperature: 0.6,
  });

  const parsed = JSON.parse(normalizeLlmJsonText(result.text));
  console.log("\n=== LinkedIn Post ===\n" + parsed.linkedinPost);
  console.log("\n=== Twitter Thread ===");
  for (const [i, t] of (parsed.twitterThread as string[]).entries()) {
    console.log(`(${i + 1}) ${t}`);
  }
  console.log("\n=== Release Notes ===\n" + parsed.releaseNotes);
  console.log(
    `\nTokens used: in=${result.usage.inputTokens} out=${result.usage.outputTokens}`,
  );

  // Persist so we can verify list/get work
  const [inserted] = await db
    .insert(digests)
    .values({
      userId: target.user_id,
      kind: "weekly",
      periodStart: since,
      periodEnd: until,
      linkedinPost: parsed.linkedinPost,
      twitterThread: parsed.twitterThread,
      releaseNotes: parsed.releaseNotes,
      includedOutputIds: rowsForDigest.map((r) => r.id),
    })
    .returning();
  await db.insert(userEvents).values({
    userId: target.user_id,
    eventType: "digest_generate",
    payload: {
      digestId: inserted.id,
      kind: "weekly",
      outputCount: rowsForDigest.length,
      usage: result.usage,
    } as any,
  });
  console.log(`\nPersisted digest id: ${inserted.id}`);
}

main().catch((e) => {
  console.error("test-digest failed:", e);
  process.exit(1);
});
