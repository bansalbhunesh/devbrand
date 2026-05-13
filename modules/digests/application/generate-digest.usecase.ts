import { IDigestRepository } from "../contracts/digest.repository";
import { DigestKind } from "../domain/digest.entities";
import { db } from "@infrastructure/database/db.server";
import { outputs, userEvents } from "@infrastructure/database/schema.server";
import { and, eq, desc, gte, lte } from "drizzle-orm";
import {
  completeText,
  normalizeLlmJsonText,
} from "@/modules/ai/infrastructure/llm.gateway";

const MAX_OUTPUTS_PER_DIGEST = 40;

export class GenerateDigestUseCase {
  constructor(private digestRepo: IDigestRepository) {}

  async execute(
    userId: string,
    args: { since: Date; until: Date; kind: DigestKind },
  ) {
    const since = new Date(args.since);
    const until = new Date(args.until);

    // 1. Fetch relevant outputs
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

    // 2. Prompt Assembly (Logic moved from helpers)
    const systemPrompt = this.buildSystemPrompt(args.kind, rows.length);
    const userMessage = rows
      .map(
        (r) =>
          `### ${r.prTitle}\n- id: ${r.id}\n- category: ${r.category}\n- impact: ${r.impactScore}\n- bullet: ${r.resumeBullet}`,
      )
      .join("\n\n");

    // 3. LLM Call
    const result = await completeText({
      system: systemPrompt,
      user: userMessage,
      maxTokens: 3000,
      temperature: 0.6,
    });

    // 4. Parse & Normalize
    const parsed = JSON.parse(normalizeLlmJsonText(result.text));

    // 5. Persist
    const inserted = await this.digestRepo.save({
      userId,
      kind: args.kind,
      periodStart: since,
      periodEnd: until,
      linkedinPost: parsed.linkedinPost,
      twitterThread: parsed.twitterThread,
      releaseNotes: parsed.releaseNotes,
      includedOutputIds: rows.map((r) => r.id),
    });

    // 6. Token Usage & Events
    const { recordTokenUsage } = await import("@/server/limits.server");
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

    return { ...inserted, usage: result.usage };
  }

  private buildSystemPrompt(kind: DigestKind, count: number): string {
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
}
