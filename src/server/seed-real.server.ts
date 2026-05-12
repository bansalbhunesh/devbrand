import { runEngine } from "./engine";
import { db } from "./db.server";
import { users, outputs } from "./schema.server";
import { eq } from "drizzle-orm";
import { logger } from "@/lib/logger";

const REAL_PRS = [
  "https://github.com/bansalbhunesh/Datastory/pull/1",
  "https://github.com/bansalbhunesh/tendersense-ai/pull/4",
  "https://github.com/bansalbhunesh/tendersense-ai/pull/3",
  "https://github.com/bansalbhunesh/tendersense-ai/pull/2",
  "https://github.com/bansalbhunesh/tendersense-ai/pull/1",
  "https://github.com/bansalbhunesh/claude-code-handoff/pull/11",
  "https://github.com/bansalbhunesh/claude-code-handoff/pull/10",
  "https://github.com/bansalbhunesh/claude-code-handoff/pull/9",
  "https://github.com/bansalbhunesh/claude-code-handoff/pull/8",
  "https://github.com/bansalbhunesh/claude-code-handoff/pull/7",
  "https://github.com/bansalbhunesh/claude-code-handoff/pull/6",
  "https://github.com/bansalbhunesh/claude-code-handoff/pull/5",
  "https://github.com/bansalbhunesh/claude-code-handoff/pull/4",
  "https://github.com/bansalbhunesh/claude-code-handoff/pull/3",
  "https://github.com/bansalbhunesh/claude-code-handoff/pull/2",
  "https://github.com/bansalbhunesh/claude-code-handoff/pull/1",
  "https://github.com/bansalbhunesh/digital-shagun-app/pull/10",
  "https://github.com/bansalbhunesh/digital-shagun-app/pull/9",
  "https://github.com/bansalbhunesh/digital-shagun-app/pull/8",
  "https://github.com/bansalbhunesh/digital-shagun-app/pull/7",
  "https://github.com/bansalbhunesh/digital-shagun-app/pull/6",
  "https://github.com/bansalbhunesh/digital-shagun-app/pull/5",
  "https://github.com/bansalbhunesh/digital-shagun-app/pull/4",
  "https://github.com/bansalbhunesh/digital-shagun-app/pull/3",
  "https://github.com/bansalbhunesh/digital-shagun-app/pull/2",
  "https://github.com/bansalbhunesh/digital-shagun-app/pull/1",
  "https://github.com/webfuse-com/awesome-claude/pull/214",
];

async function seedRealData() {
  logger.info("Starting Real Data Seeding...");

  // 1. Get or Create the Real User
  let [user] = await db
    .select()
    .from(users)
    .where(eq(users.githubLogin, "bansalbhunesh"));

  if (!user) {
    [user] = await db
      .insert(users)
      .values({
        githubId: "123456", // Mock ID if not known
        githubLogin: "bansalbhunesh",
        name: "Bhunesh Bansal",
        seniority: "staff",
        tone: "technical",
      })
      .returning();
  }

  const userId = user.id;

  // 2. Run Engine for each PR
  for (const prUrl of REAL_PRS) {
    try {
      logger.info(`Processing real PR: ${prUrl}`);
      const draft = await runEngine(prUrl, userId, {
        seniority: user.seniority as any,
        tone: user.tone as any,
        targetAudience: user.targetAudience as any,
      });

      // 3. Save to Outputs
      const slug = prUrl.split("/").slice(-3).join("-"); // e.g. repo-name-pull-11

      await db
        .insert(outputs)
        .values({
          userId,
          slug,
          prTitle:
            draft.commitMessageSummary.split("\n")[0] ||
            "Real Engineering Work",
          prUrl,
          linkedinPost1: draft.linkedinPost1,
          linkedinPost2: draft.linkedinPost2,
          linkedinPost3: draft.linkedinPost3,
          resumeBullet: draft.resumeBullet,
          interviewHook: draft.interviewHook,
          citations: draft.citations,
          impactScore: Math.round(Number(draft.impactScore) || 0),
          category: draft.category,
          complexityLevel: draft.complexityLevel,
          isPublic: true,
        })
        .onConflictDoNothing();

      logger.info(`Successfully ingested: ${slug}`);
    } catch (err) {
      logger.error(err as Error, { prUrl });
    }
  }

  logger.info("Real Data Seeding Complete.");
}

seedRealData().catch((err) => {
  console.error("Fatal Seeding Error:", err);
  process.exit(1);
});
