import { createServerFn } from "@tanstack/react-start";
import { z } from "zod";
import Anthropic from "@anthropic-ai/sdk";
import { fetchPRDiff } from "./github";
import { buildImportGraph, computeArchScores } from "./arch-graph";
import { db } from "./db";
import { outputs, users } from "./schema";
import { eq, sql } from "drizzle-orm";

const anthropic = new Anthropic({
  apiKey: process.env.ANTHROPIC_API_KEY,
});

const TransformOutputSchema = z.object({
  linkedin_post_1: z.string().max(1300),
  linkedin_post_2: z.string().max(1300),
  linkedin_post_3: z.string().max(1300),
  resume_bullet: z.string().max(200),
  interview_hook: z.string().max(300),
  citations: z.array(z.object({
    claim: z.string(),
    ref: z.string(),
    sha: z.string(),
    evidence_type: z.enum(['metric', 'structural', 'behavioral']),
  })),
  category: z.enum(['Performance', 'Architecture', 'Reliability', 'Security', 'Feature', 'Refactor']),
  impact_score: z.number().int().min(1).max(100),
  complexity_level: z.enum(['Junior', 'Mid', 'Senior', 'Staff']),
});

const SYSTEM_PROMPT = `
You are an engineering impact analyst for DevBrand — a Developer Reputation Layer.

You receive a GitHub PR diff enriched with architectural scoring metadata. Each file has an archScore (0-100).
Higher scores = more load-bearing infrastructure.

CALIBRATION:
- archScore 70+: Core infrastructure.
- archScore 40-69: Shared utility.
- archScore 10-39: Feature layer.
- archScore 0-9: Leaf component.

CRITICAL RULES:
1. Every factual claim MUST have a citation (filename:line + SHA).
2. Lead with the problem solved, not the implementation.
3. Calibrate tone to archScore: high score = strategic, low score = tactical.
4. Return ONLY valid JSON matching the schema. No markdown, no preamble.
`;

export const transformPR = createServerFn({ method: "POST" })
  .validator(z.object({ prUrl: z.string().url(), userId: z.string().uuid() }))
  .handler(async ({ data: { prUrl, userId } }) => {
    // 1. Check generation limit
    const user = await db.query.users.findFirst({
      where: eq(users.id, userId),
    });

    if (!user) throw new Error("User not found");
    if (user.plan === "free" && user.generationsThisMonth >= 3) {
      throw new Error("LIMIT_REACHED");
    }

    // 2. Fetch Diff & Graph
    const diff = await fetchPRDiff({ data: { prUrl } });
    const graph = await buildImportGraph(diff.owner, diff.repoName);
    const scoredFiles = computeArchScores(diff.files.map(f => f.filename), graph);

    // 3. Build Claude Payload
    const stackKeywords = ['react', 'next', 'tailwind', 'drizzle', 'neon', 'postgresql', 'typescript', 'vite', 'shadcn', 'lucide'];
    const detectedStack = stackKeywords.filter(k => 
      diff.files.some(f => f.patch.toLowerCase().includes(k)) || 
      diff.prTitle.toLowerCase().includes(k)
    );

    const diffSummary = diff.files.map(f => {
      const score = scoredFiles.find(s => s.filename === f.filename);
      return `File: ${f.filename} (+${f.additions}, -${f.deletions}) [archScore: ${score?.archScore}, label: ${score?.label}]\nPatch:\n${f.patch}`;
    }).join('\n\n');
    
    const response = await anthropic.messages.create({
      model: "claude-3-5-sonnet-20240620",
      max_tokens: 2000,
      system: SYSTEM_PROMPT,
      messages: [{ role: "user", content: `PR Title: ${diff.prTitle}\nDetected Stack Context: ${detectedStack.join(', ')}\n\n${diffSummary}` }],
    });

    // 4. Parse & Validate
    const rawContent = response.content[0].type === 'text' ? response.content[0].text : '';
    const output = TransformOutputSchema.parse(JSON.parse(rawContent));

    // 5. Persist to DB
    const [inserted] = await db.insert(outputs).values({
      userId,
      prTitle: diff.prTitle,
      prUrl,
      prSignals: output.citations.map(c => c.evidence_type),
      stack: detectedStack,
      linkedinPost1: output.linkedin_post_1,
      linkedinPost2: output.linkedin_post_2,
      linkedinPost3: output.linkedin_post_3,
      resumeBullet: output.resume_bullet,
      interviewHook: output.interview_hook,
      impactScore: output.impact_score,
      category: output.category,
      complexityLevel: output.complexity_level,
    }).returning();

    // 6. Increment generations count
    await db.update(users)
      .set({ generationsThisMonth: sql`${users.generationsThisMonth} + 1` })
      .where(eq(users.id, userId));

    return inserted;
  });
