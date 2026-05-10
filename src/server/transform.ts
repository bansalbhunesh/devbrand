import { createServerFn } from "@tanstack/react-start";
import { z } from "zod";
import Anthropic from "@anthropic-ai/sdk";
import { fetchPRDiff } from "./github";
import { buildImportGraph, computeArchScores } from "./arch-graph";
import { db } from "./db";
import { outputs, users, userEvents } from "./schema";
import { eq, sql } from "drizzle-orm";

const anthropic = new Anthropic({
  apiKey: process.env.ANTHROPIC_API_KEY,
});

const CLAUDE_MODEL = process.env.CLAUDE_MODEL ?? "claude-3-5-sonnet-20241022";

const TransformOutputSchema = z.object({
  linkedin_post_1: z.string().max(1300),
  linkedin_post_2: z.string().max(1300),
  linkedin_post_3: z.string().max(1300),
  resume_bullet: z.string().max(220),
  interview_hook: z.string().max(320),
  commit_message_summary: z.string().max(120),
  citations: z.array(
    z.object({
      claim: z.string(),
      ref: z.string(),
      sha: z.string(),
      evidence_type: z.enum(["metric", "structural", "behavioral"]),
    })
  ),
  category: z.enum(["Performance", "Architecture", "Reliability", "Security", "Feature", "Refactor"]),
  impact_score: z.number().int().min(1).max(100),
  complexity_level: z.enum(["Junior", "Mid", "Senior", "Staff"]),
});

const SYSTEM_PROMPT = `You are an engineering impact analyst for DevBrand — a Developer Reputation Layer.

You receive a GitHub PR diff enriched with architectural scoring metadata. Each file has an archScore (0–100).
Higher scores = more load-bearing infrastructure.

CALIBRATION:
- archScore 70+: Core infrastructure. Use strategic, systems-thinking language.
- archScore 40–69: Shared utility. Balance tactical and strategic.
- archScore 10–39: Feature layer. Focus on product impact and user value.
- archScore 0–9: Leaf component. Tactical, concrete, direct.

OUTPUT RULES:
1. Every factual claim MUST be grounded in a citation (filename:line + SHA).
2. Lead with the PROBLEM SOLVED, not the implementation.
3. commit_message_summary: Write a one-line commit message that captures what the PR did neutrally.
4. No emoji. No hype. No "excited to share". Precision over enthusiasm.
5. Return ONLY valid JSON matching the schema. No markdown, no preamble.`;

function generateSlug(prUrl: string, userId: string): string {
  const ts = Date.now().toString(36);
  const hash = userId.replace(/-/g, "").slice(0, 4);
  const prPart = prUrl.split("/pull/")[1]?.slice(0, 4) ?? "0000";
  return `${prPart}-${hash}-${ts}`;
}

export const transformPR = createServerFn({ method: "POST" })
  .validator(z.object({ prUrl: z.string().url(), userId: z.string().uuid() }))
  .handler(async ({ data: { prUrl, userId } }) => {
    const user = await db.query.users.findFirst({ where: eq(users.id, userId) });
    if (!user) throw new Error("USER_NOT_FOUND");

    const isFreeLimitReached = user.plan === "free" && user.generationsThisMonth >= 3;
    if (isFreeLimitReached) throw new Error("LIMIT_REACHED");

    const [diff, graph] = await Promise.all([
      fetchPRDiff({ data: { prUrl } }),
      buildImportGraph(
        prUrl.match(/github\.com\/([^/]+)\/([^/]+)\/pull\/\d+/)?.[1] ?? "",
        prUrl.match(/github\.com\/([^/]+)\/([^/]+)\/pull\/\d+/)?.[2] ?? ""
      ),
    ]);

    const scoredFiles = computeArchScores(
      diff.files.map((f) => f.filename),
      graph
    );

    const stackKeywords = [
      "react", "next", "vue", "svelte", "tailwind", "drizzle", "prisma",
      "postgres", "mysql", "redis", "kafka", "typescript", "go", "rust",
      "python", "docker", "kubernetes", "terraform", "graphql", "grpc",
    ];
    const detectedStack = stackKeywords.filter(
      (k) =>
        diff.files.some((f) => f.patch.toLowerCase().includes(k)) ||
        diff.prTitle.toLowerCase().includes(k)
    );

    const sortedFiles = [...diff.files].sort((a, b) => {
      const sa = scoredFiles.find((s) => s.filename === a.filename)?.archScore ?? 0;
      const sb = scoredFiles.find((s) => s.filename === b.filename)?.archScore ?? 0;
      return sb - sa;
    });

    const diffSummary = sortedFiles
      .slice(0, 20)
      .map((f) => {
        const score = scoredFiles.find((s) => s.filename === f.filename);
        return [
          `File: ${f.filename} (+${f.additions}, -${f.deletions})`,
          `  [archScore: ${score?.archScore ?? 0}, label: ${score?.label ?? "unknown"}]`,
          `  Patch:\n${f.patch.slice(0, 2000)}`,
        ].join("\n");
      })
      .join("\n\n");

    const response = await anthropic.messages.create({
      model: CLAUDE_MODEL,
      max_tokens: 2500,
      system: SYSTEM_PROMPT,
      messages: [
        {
          role: "user",
          content: [
            `PR Title: ${diff.prTitle}`,
            `PR URL: ${prUrl}`,
            `SHA: ${diff.sha}`,
            `Total: +${diff.totalAdditions} -${diff.totalDeletions} across ${diff.files.length} files`,
            `Detected Stack: ${detectedStack.join(", ") || "not detected"}`,
            `Seniority context: ${user.seniority}, Tone preference: ${user.tone}`,
            "",
            diffSummary,
          ].join("\n"),
        },
      ],
    });

    const rawContent =
      response.content[0].type === "text" ? response.content[0].text.trim() : "";

    let output: z.infer<typeof TransformOutputSchema>;
    try {
      const cleaned = rawContent.replace(/^```json\n?/, "").replace(/\n?```$/, "");
      output = TransformOutputSchema.parse(JSON.parse(cleaned));
    } catch (e) {
      console.error("Claude output parse error:", rawContent);
      throw new Error("AI_PARSE_ERROR");
    }

    const slug = generateSlug(prUrl, userId);
    const [inserted] = await db
      .insert(outputs)
      .values({
        slug,
        userId,
        prTitle: diff.prTitle,
        prUrl,
        prCommitMessage: output.commit_message_summary,
        prSignals: output.citations.map((c) => c.evidence_type),
        stack: detectedStack,
        linkedinPost1: output.linkedin_post_1,
        linkedinPost2: output.linkedin_post_2,
        linkedinPost3: output.linkedin_post_3,
        resumeBullet: output.resume_bullet,
        interviewHook: output.interview_hook,
        citations: output.citations.map(c => ({
          claim: c.claim,
          ref: c.ref,
          sha: c.sha,
          evidenceType: c.evidence_type
        })),
        impactScore: output.impact_score,
        category: output.category,
        complexityLevel: output.complexity_level,
      })
      .returning();

    await Promise.all([
      db
        .update(users)
        .set({ generationsThisMonth: sql`${users.generationsThisMonth} + 1` })
        .where(eq(users.id, userId)),
      db.insert(userEvents).values({
        userId,
        eventType: "generate",
        payload: {
          outputId: inserted.id,
          slug,
          prUrl,
          impactScore: output.impact_score,
          category: output.category,
        },
      }),
    ]);

    return inserted;
  });

export const getUserOutputs = createServerFn({ method: "GET" })
  .validator(z.string().uuid())
  .handler(async ({ data: userId }) => {
    return db.query.outputs.findMany({
      where: eq(outputs.userId, userId),
      orderBy: (o, { desc }) => [desc(o.createdAt)],
      limit: 50,
    });
  });

export const toggleOutputVisibility = createServerFn({ method: "POST" })
  .validator(z.object({ outputId: z.string().uuid(), userId: z.string().uuid(), isPublic: z.boolean() }))
  .handler(async ({ data: { outputId, userId, isPublic } }) => {
    await db
      .update(outputs)
      .set({ isPublic })
      .where(eq(outputs.id, outputId) && eq(outputs.userId, userId));
    return { success: true };
  });
