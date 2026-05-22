import { IDigestRepository } from "../contracts/digest.repository";
import { DigestKind } from "../domain/digest.entities";
import { db } from "@infrastructure/database/db.server";
import { outputs, userEvents } from "@infrastructure/database/schema.server";
import { and, eq, desc, gte, lte } from "drizzle-orm";
import {
  completeText,
  normalizeLlmJsonText,
} from "@/modules/ai/infrastructure/llm.gateway";
import { execSync } from "child_process";
// NEVER changes. Injected first, always.
const ROLE_CORE = `
You are a cynical, highly-competent Staff Engineer writing for technical peers.
You do not do marketing. You do not do hype. You report reality.
`;

// NEVER changes. Injected second, always, regardless of persona.
const CONSTRAINT_FIREWALL = `
ABSOLUTE CONSTRAINTS — these override every other instruction:
Banned words/phrases: emoji of any kind, "thrilled", "excited to", "game-changer", "delve", "journey", "crushing it", "leverage" (as verb), "synergy", "impactful".
Required style: short declarative sentences. Trade-off framing. No engagement bait.
If you catch yourself writing a sentence that sounds like a LinkedIn post, delete it.
`;

// Changes per request. Injected third.
const PERSONA_DIRECTIVE = (payload: string, memoryBlock: string) => `
Given this structured engineering payload:
${payload}

${memoryBlock}

Generate all three output options. Return ONLY valid JSON matching this schema, no other keys:
{
  "narrativeTradeoffs": "Option 1: architecture & trade-offs, 120–300 words",
  "executionLog": "Option 2: velocity-forward, 60–150 words, metric-dense",
  "minimalist": "Option 3: ≤ 2 sentences, must contain one concrete result",
  "invisibleWorkUsed": ["array of DEBT/TODO items that surfaced in the narrative"],
  "twitterThread": ["tweet1", "tweet2", "tweet3"],
  "releaseNotes": "markdown-formatted release notes with H2 section headers"
}

No preamble, no markdown fences.
`;

export type DebtItem = {
  file: string;
  tag: string;
  note: string;
};

export async function resolvedDebtsThisWeek(repoPath: string, since: Date): Promise<DebtItem[]> {
  try {
    const sinceStr = since.toISOString().split("T")[0];
    const log = execSync(`git log --since="${sinceStr}" --diff-filter=M -p -- '*.ts' '*.tsx'`, { encoding: "utf8", stdio: "pipe" });
    const debts: DebtItem[] = [];
    let currentFile = "";
    for (const line of log.split("\n")) {
      if (line.startsWith("diff --git")) {
        const match = line.match(/a\/(.*) b\//);
        if (match) currentFile = match[1];
      }
      if (line.startsWith("-") && !line.startsWith("---")) {
        const match = line.match(/\/\/\s*(TODO|DEBT|FIXME|HACK):\s*(.*)/i);
        if (match) {
          debts.push({ file: currentFile, tag: match[1].toUpperCase(), note: match[2].trim() });
        }
      }
    }
    return debts;
  } catch (e) {
    return [];
  }
}

function enforceMinimalist(text: string): string {
  // Split on sentence boundaries (. ! ?) accounting for abbreviations
  const sentences = text.match(/[^.!?]+[.!?]+/g) ?? [text];
  if (sentences.length <= 2) return text;
  // Take the two highest-signal sentences: first (setup) + the one containing a metric
  const withMetric = sentences.find(s => /\\d+%|\\d+ms|\\d+x/.test(s));
  const result = [sentences[0], withMetric ?? sentences[1]].join(" ").trim();
  return result;
}

function styleDriftScore(current: string, pastDigests: string[]): number {
  if (pastDigests.length === 0) return 0;
  const avgSentenceLength = (text: string) => {
    const sentences = text.match(/[^.!?]+[.!?]+/g) ?? [];
    return sentences.reduce((s, x) => s + x.split(" ").length, 0) / (sentences.length || 1);
  };
  const pastAvg = pastDigests.reduce((s, d) => s + avgSentenceLength(d), 0) / pastDigests.length;
  const currentAvg = avgSentenceLength(current);
  return Math.abs(currentAvg - pastAvg); // words per sentence delta
}

const CATEGORY_BOOST: Record<string, number> = {
  architecture: 35,
  feature: 15,
  performance: 10,
  infra: 10,
  chore: -15,
  docs: -20,
};

const BUCKET_MAP: Record<string, string | null> = {
  architecture: "Core Architecture",
  refactor: "Core Architecture",
  database: "Reliability & Infra",
  infra: "Reliability & Infra",
  monitoring: "Reliability & Infra",
  feature: "Product Features",
  api: "Product Features",
  ui: "Product Features",
  performance: "Tech Debt & Polish",
  test: "Tech Debt & Polish",
  config: "Tech Debt & Polish",
  docs: null,
  chore: null,
};

function computeImpactScore(pr: any): number {
  const baseScore = pr.impactScore || 30; // fallback if missing
  const catBoost = CATEGORY_BOOST[pr.category] ?? 0;
  return Math.round(baseScore + catBoost);
}

const BAN_WORDS = /excited to|thrilled|game.?changer|journey|crushing it|🎉|🚀/i;
const WORD_COUNT = (s: string) => s.split(/\s+/).length;

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

    // --- STEP 1b: Deduplication ---
    // Fetch previous digests to avoid cross-sprint dups
    const pastDigests = await db.query.digests.findMany({
      where: and(eq(digests.userId, userId), eq(digests.kind, args.kind)),
      orderBy: [desc(digests.createdAt)],
      limit: 3,
    });

    // In a real app we'd fetch all includedOutputIds from pastDigests and filter them out.
    // Since we don't have a specific hash store, we'll exclude outputs already in a digest.
    const seenOutputIds = new Set(
      pastDigests.flatMap((d) => d.includedOutputIds ?? []),
    );
    
    let deduped = rows.filter((r) => !seenOutputIds.has(r.id));
    if (deduped.length === 0) throw new Error("NO_NEW_OUTPUTS_IN_RANGE");

    // --- STEP 2 & 3: Semantic Bucket Mapping & Importance Scoring ---
    const buckets = new Map<
      string,
      Array<{ title: string; score: number; author: string; id: string }>
    >();

    for (const pr of deduped) {
      const bucketName = BUCKET_MAP[pr.category] ?? null;
      if (!bucketName) continue; // Drop docs, chores, and unmapped

      const finalScore = computeImpactScore(pr);
      
      // Drop low-impact config/tech-debt unless it's the only thing they did
      if (bucketName === "Tech Debt & Polish" && finalScore < 40 && deduped.length > 2) {
        continue;
      }

      if (!buckets.has(bucketName)) buckets.set(bucketName, []);
      buckets.get(bucketName)!.push({
        id: pr.id,
        title: pr.prTitle,
        score: finalScore,
        author: "user", // Usually we'd extract GitHub login
      });
    }

    // Rank buckets by total score, and cap PRs per bucket
    const rankedBuckets = Array.from(buckets.entries())
      .map(([name, prs]) => {
        prs.sort((a, b) => b.score - a.score);
        const totalScore = prs.reduce((sum, p) => sum + p.score, 0);
        return { name, totalScore, prs };
      })
      .sort((a, b) => b.totalScore - a.totalScore);

    if (rankedBuckets.length === 0) throw new Error("NO_MEANINGFUL_OUTPUTS_IN_RANGE");

    // --- The second-brain bridge ---
    const invisibleWork = await resolvedDebtsThisWeek(process.cwd(), since);

    const payload = {
      week: `${since.toISOString().split("T")[0]} to ${until.toISOString().split("T")[0]}`,
      buckets: rankedBuckets.map((b) => ({
        name: b.name,
        totalScore: b.totalScore,
        prs: b.prs.slice(0, 3).map((pr) => ({ title: pr.title, score: pr.score })),
      })),
      alsoShipped: rankedBuckets.flatMap((b) => b.prs.slice(3).map((p) => p.title)),
      invisibleWork: invisibleWork.map(d => ({
        tag: d.tag,
        note: d.note,
        file: d.file,
      })),
    };

    // --- STEP 4: Engineering Interpretation & Memory Injection ---
    const memoryBlock =
      pastDigests.length >= 2
        ? `Analyze the sentence length, vocabulary, and cadence of these past posts and match exactly:\n${pastDigests
            .map((d) => d.postOptions[0])
            .join("\n---\n")}`
        : `No style history yet. Write in a measured, understated engineering voice. Short sentences. No superlatives.`;

    const systemPrompt = `${ROLE_CORE}\n\n${CONSTRAINT_FIREWALL}\n\n${PERSONA_DIRECTIVE(JSON.stringify(payload, null, 2), memoryBlock)}`;

    // --- STEP 5: LLM Generation & Output Validation ---
    let result;
    let parsed;
    let totalUsage = { promptTokens: 0, completionTokens: 0, totalTokens: 0 };
    
    // Quality Gate: 1 retry if output fails validation
    for (let attempt = 1; attempt <= 2; attempt++) {
      result = await completeText({
        system: systemPrompt,
        user: "Generate the weekly digest matching the exact JSON schema provided.",
        maxTokens: 3000,
        temperature: 0.7,
      });

      totalUsage.promptTokens += result.usage.promptTokens;
      totalUsage.completionTokens += result.usage.completionTokens;
      totalUsage.totalTokens += result.usage.totalTokens;

      parsed = JSON.parse(normalizeLlmJsonText(result.text));
      const testPost = parsed.narrativeTradeoffs || "";

      if (BAN_WORDS.test(testPost) || WORD_COUNT(testPost) < 40 || WORD_COUNT(testPost) > 320) {
        if (attempt === 1) {
          console.warn("Digest failed quality gate, retrying once", { testPost });
          continue; // Retry
        }
      }
      break; // Passed or out of retries
    }

    // Enforce Minimalist on Option 3
    if (parsed.minimalist) {
      parsed.minimalist = enforceMinimalist(parsed.minimalist);
    }

    // Style Drift Gate
    if (pastDigests.length >= 2) {
      const pastOptions = pastDigests.map(d => d.postOptions[0]);
      const drift = styleDriftScore(parsed.narrativeTradeoffs, pastOptions);
      if (drift > 4) {
         console.warn(`Style drift detected! Delta words per sentence: ${drift.toFixed(2)}`);
      }
    }

    // Adapt the new structured schema back to the old postOptions array for the DB/UI
    const postOptionsArray = [
      parsed.narrativeTradeoffs || "",
      parsed.executionLog || "",
      parsed.minimalist || ""
    ];

    // --- Persist ---
    const inserted = await this.digestRepo.save({
      userId,
      kind: args.kind,
      periodStart: since,
      periodEnd: until,
      postOptions: postOptionsArray,
      memoryContext: JSON.stringify(payload),
      invisibleWorkUsed: parsed.invisibleWorkUsed || [],
      twitterThread: parsed.twitterThread,
      releaseNotes: parsed.releaseNotes,
      includedOutputIds: rankedBuckets.flatMap((b) => b.prs.map((p) => p.id)),
    });

    const { recordTokenUsage } = await import("@/server/limits.server");
    await Promise.all([
      recordTokenUsage(userId, totalUsage),
      db.insert(userEvents).values({
        userId,
        eventType: "digest_generate",
        payload: {
          digestId: inserted.id,
          kind: args.kind,
          outputCount: deduped.length,
          usage: totalUsage,
        } as any,
      }),
    ]);

    return { ...inserted, usage: totalUsage };
  }

}
