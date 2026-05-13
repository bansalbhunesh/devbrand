import { and, desc, eq, gte, lte } from "drizzle-orm";
import { db } from "./db.server";
import { digests, outputs, userEvents } from "./schema.server";
import { loadSessionUser } from "./auth.server";
import {
  completeText,
  normalizeLlmJsonText,
  type TokenUsage,
} from "./llm/client";
import { enforceTokenBudget, recordTokenUsage } from "./limits.server";

export type DigestKind = "weekly" | "release_notes";

export type GenerateDigestArgs = {
  since: Date;
  until: Date;
  kind: DigestKind;
};

export type GeneratedDigest = {
  id: string;
  kind: DigestKind;
  periodStart: Date;
  periodEnd: Date;
  linkedinPost: string;
  twitterThread: string[];
  releaseNotes: string;
  includedOutputIds: string[];
  usage: TokenUsage;
  createdAt: Date;
};

/**
 * Hard cap on PRs included in a single digest. Each output's metadata can be
 * a few KB; 40 rows keeps the prompt under ~80k tokens worst-case so we don't
 * blow through the per-call max_tokens budget. Older outputs get truncated
 * silently — that's fine for "weekly" cadence and we surface the count in UI.
 */
const MAX_OUTPUTS_PER_DIGEST = 40;

/**
 * Tiny per-PR slice that's enough for the LLM to weave a narrative without
 * dragging in 50-page JSON metadata blobs. Keep this tight — every char
 * inflates input tokens.
 */
function summarizeOutputForPrompt(o: {
  id: string;
  prTitle: string;
  prUrl: string | null;
  resumeBullet: string;
  category: string | null;
  impactScore: number;
  createdAt: Date;
}): string {
  const date = new Date(o.createdAt).toISOString().slice(0, 10);
  return [
    `### ${o.prTitle}`,
    `- id: ${o.id}`,
    `- url: ${o.prUrl ?? "n/a"}`,
    `- merged: ${date}`,
    `- category: ${o.category ?? "uncategorized"}`,
    `- impactScore: ${o.impactScore}`,
    `- bullet: ${o.resumeBullet}`,
  ].join("\n");
}

function buildSystemPrompt(kind: DigestKind, count: number): string {
  const persona =
    kind === "weekly"
      ? "You are a weekly engineering newsletter writer. Your job is to weave a batch of merged PRs into ONE cohesive retrospective post that shows the through-line of the work."
      : "You are a release-notes writer. Your job is to turn a batch of merged PRs into polished release notes plus shareable social copy.";

  return `${persona}

You will receive ${count} merged PRs. Synthesize across them — find themes, group related work, surface the headline win. Do NOT just list the PRs.

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
}

function buildUserMessage(
  rows: Array<Parameters<typeof summarizeOutputForPrompt>[0]>,
): string {
  return rows.map(summarizeOutputForPrompt).join("\n\n");
}

type LlmDigestPayload = {
  linkedinPost?: unknown;
  twitterThread?: unknown;
  releaseNotes?: unknown;
};

function coerceStringArray(value: unknown): string[] {
  if (!Array.isArray(value)) return [];
  return value
    .map((v) => (typeof v === "string" ? v.trim() : ""))
    .filter((v) => v.length > 0);
}

export async function generateDigestFn(
  args: GenerateDigestArgs,
): Promise<GeneratedDigest> {
  const user = await loadSessionUser();
  if (!user) throw new Error("UNAUTHORIZED");
  const userId = user.id;

  const since = args.since instanceof Date ? args.since : new Date(args.since);
  const until = args.until instanceof Date ? args.until : new Date(args.until);
  if (Number.isNaN(since.getTime()) || Number.isNaN(until.getTime())) {
    throw new Error("INVALID_RANGE");
  }
  if (since.getTime() >= until.getTime()) {
    throw new Error("INVALID_RANGE");
  }

  await enforceTokenBudget(userId);

  const rows = await db
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
        eq(outputs.userId, userId),
        gte(outputs.createdAt, since),
        lte(outputs.createdAt, until),
      ),
    )
    .orderBy(desc(outputs.createdAt))
    .limit(MAX_OUTPUTS_PER_DIGEST);

  if (rows.length === 0) throw new Error("NO_OUTPUTS_IN_RANGE");

  const systemPrompt = buildSystemPrompt(args.kind, rows.length);
  const userMessage = buildUserMessage(rows);

  const result = await completeText({
    system: systemPrompt,
    user: userMessage,
    maxTokens: 3000,
    temperature: 0.6,
  });

  let parsed: LlmDigestPayload;
  try {
    parsed = JSON.parse(normalizeLlmJsonText(result.text));
  } catch {
    throw new Error("AI_PARSE_ERROR");
  }

  const linkedinPost =
    typeof parsed.linkedinPost === "string" ? parsed.linkedinPost.trim() : "";
  const twitterThread = coerceStringArray(parsed.twitterThread);
  const releaseNotes =
    typeof parsed.releaseNotes === "string" ? parsed.releaseNotes.trim() : "";

  if (!linkedinPost || twitterThread.length === 0 || !releaseNotes) {
    throw new Error("AI_PARSE_ERROR");
  }

  const includedOutputIds = rows.map((r: any) => r.id);

  const [inserted] = await db
    .insert(digests)
    .values({
      userId,
      kind: args.kind,
      periodStart: since,
      periodEnd: until,
      linkedinPost,
      twitterThread,
      releaseNotes,
      includedOutputIds,
    })
    .returning();

  await Promise.all([
    recordTokenUsage(userId, result.usage),
    db.insert(userEvents).values({
      userId,
      eventType: "digest_generate",
      payload: {
        digestId: inserted.id,
        kind: args.kind,
        outputCount: rows.length,
        usage: result.usage,
      } as any,
    }),
  ]);

  return {
    id: inserted.id,
    kind: args.kind,
    periodStart: since,
    periodEnd: until,
    linkedinPost,
    twitterThread,
    releaseNotes,
    includedOutputIds,
    usage: result.usage,
    createdAt: inserted.createdAt,
  };
}

export async function listDigestsFn() {
  const user = await loadSessionUser();
  if (!user) throw new Error("UNAUTHORIZED");

  const rows = await db
    .select({
      id: digests.id,
      kind: digests.kind,
      periodStart: digests.periodStart,
      periodEnd: digests.periodEnd,
      includedOutputIds: digests.includedOutputIds,
      createdAt: digests.createdAt,
    })
    .from(digests)
    .where(eq(digests.userId, user.id))
    .orderBy(desc(digests.createdAt))
    .limit(50);

  return rows.map((r: any) => ({
    ...r,
    outputCount: r.includedOutputIds?.length ?? 0,
  }));
}

export async function getDigestFn(id: string) {
  const user = await loadSessionUser();
  if (!user) throw new Error("UNAUTHORIZED");

  const row = await db.query.digests.findFirst({
    where: and(eq(digests.id, id), eq(digests.userId, user.id)),
  });
  if (!row) throw new Error("NOT_FOUND");

  // Drizzle types `array().notNull()` as `unknown[]` here — narrow back so
  // clients get a clean string[] without each having to re-cast.
  return {
    ...row,
    twitterThread: (row.twitterThread ?? []) as string[],
    includedOutputIds: (row.includedOutputIds ?? []) as string[],
  };
}

// Exported so the RPC bridge can reuse the type when wiring `generateDigest`.
export type ListedDigest = Awaited<ReturnType<typeof listDigestsFn>>[number];
