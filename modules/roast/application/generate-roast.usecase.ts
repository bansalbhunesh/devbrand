import {
  RoastTone,
  PERSONA_MAP,
  RoastOutputSchema,
} from "../domain/roast.types";
import { IRoastRepository } from "../contracts/roast.repository";
import { RoastGithubService } from "../infrastructure/github.service";
import {
  completeText,
  normalizeLlmJsonText,
} from "@/modules/ai/infrastructure/llm.gateway";
import { db } from "@infrastructure/database/db.server";
import { users, userEvents } from "@infrastructure/database/schema.server";
import { eq, sql } from "drizzle-orm";
import { getRequest } from "@tanstack/react-start/server";
import { rateLimit } from "@infrastructure/cache/redis.server";

const FREE_ROAST_LIMIT = 10;
const PUBLIC_ANON_LIMIT = 3;

export class GenerateRoastUseCase {
  constructor(
    private roastRepo: IRoastRepository,
    private githubService: RoastGithubService,
  ) {}

  async execute(data: { username: string; userId?: string; tone: RoastTone }) {
    const { username, userId, tone } = data;

    // 1. Rate limiting & Limit Reset
    if (userId) {
      const { checkAndResetLimits, enforceTokenBudget } =
        await import("@/server/limits.server");
      const user = await checkAndResetLimits(userId);
      if (
        user &&
        user.plan === "free" &&
        (user.roastCountThisMonth ?? 0) >= FREE_ROAST_LIMIT
      ) {
        throw new Error("ROAST_LIMIT_REACHED");
      }
      await enforceTokenBudget(userId);
    } else {
      const request = getRequest();
      const ip =
        request?.headers.get("x-forwarded-for")?.split(",")[0] || "127.0.0.1";
      const { success } = await rateLimit(
        `roast:anon:${ip}`,
        PUBLIC_ANON_LIMIT,
        3600,
      );
      if (!success) throw new Error("PUBLIC_RATE_LIMIT_REACHED");
    }

    // 2. Fetch Data
    const {
      user: ghUser,
      events,
      repos,
    } = await this.githubService.fetchUserProfile(username);

    // 3. Process Data (Domain logic)
    const pushEvents = events.filter((e: any) => e.type === "PushEvent");
    const commitMessages = pushEvents
      .flatMap(
        (e: any) =>
          ((e.payload as any).commits as any[])?.map((c: any) => c.message) ??
          [],
      )
      .filter(Boolean)
      .slice(0, 20);

    const languages = repos
      .map((r: any) => r.language)
      .filter(Boolean)
      .reduce<Record<string, number>>((acc, lang) => {
        if (lang) acc[lang] = (acc[lang] ?? 0) + 1;
        return acc;
      }, {});

    const lowEffortCommits = commitMessages.filter(
      (m) =>
        /^(fix|update|test|chore|merge|tmp|save|.)(\s|$|:)/i.test(m) ||
        m.length < 5,
    ).length;

    const profileSummary = {
      login: ghUser.login,
      bio: ghUser.bio ?? "No bio",
      public_repos: ghUser.public_repos,
      followers: ghUser.followers,
      following: ghUser.following,
      account_age_years: Math.floor(
        (Date.now() - new Date(ghUser.created_at).getTime()) /
          (365 * 24 * 60 * 60 * 1000),
      ),
      top_repos: repos.map((r: any) => ({
        name: r.name,
        lang: r.language,
        stars: r.stargazers_count,
        forks: r.forks_count,
        description: r.description?.slice(0, 60),
      })),
      language_breakdown: languages,
      recent_commits: commitMessages,
      low_effort_commit_count: lowEffortCommits,
      commit_frequency_per_week: Math.round(pushEvents.length / 4),
    };

    // 4. Prompt Assembly
    const systemPrompt = `${PERSONA_MAP[tone]}

You are rendering a VERDICT on a developer's GitHub activity. The Verdict
is DevBrand's signature artifact — recruiters, peers, and the developer
themselves will read this. The structure is the same regardless of tone;
only the closing LINE varies in voice.

WRITE THE \`roast\` FIELD AS FOUR LABELED SECTIONS, in this exact order:

PATTERNS:
2-3 concrete engineering strengths you actually observe in the data
(specific repos, language preferences, commit cadence, refactor signals).
Be specific. Cite repo names and language patterns where useful.

TRADEOFFS:
2-3 honest observations about tendencies that cut both ways — over-
engineering, narrow stack diet, abandoned projects, low-information
commit messages, whatever the data actually shows. Not insults; observed
patterns with consequence.

GAP:
One growth direction. Concrete. Reads like advice from a mentor who has
actually read the repos.

THE LINE:
ONE sentence that crystallizes the read. This is what gets screenshotted.
Make it specific, memorable, and grounded in the actual data — never
generic. The voice of this line matches your persona above.

ALSO EMIT (still as JSON fields):
- card_title: A 3-5 word title for the Verdict. Should sound like a
  thesis statement, not a roast. Examples: "The Refactor Specialist",
  "The Stack Hopper", "The Patient Builder".
- criticality: One of LOW / MEDIUM / HIGH / NUCLEAR. Internal severity
  flag — corresponds to FAINT / STEADY / STRONG / ELITE in the UI. Use
  the SIGNAL strength of the developer, not the harshness of the verdict.
- roast_score: 0-100. Overall signal strength — how much engineering
  intent is visible in this profile. 100 = elite signal, 30 = sparse.
- technician_score: 0-100. Independent estimate of underlying skill.
- improvements: 3-5 concrete next steps.
- redeeming_quality: One specific thing this developer is genuinely good
  at — even Chaos mode names this honestly.
- share_summary: A 280-char summary suitable for tweet/share. Tone-
  matched. Should make a viewer want to click through to the full Verdict.

HARD RULES:
- No slurs, no body/identity attacks, no demographic commentary.
- Every claim must be grounded in the GitHub data provided. No invented
  facts. If the data is thin, say so honestly.
- Markdown-style section headers (PATTERNS, TRADEOFFS, GAP, THE LINE)
  stay literal in the \`roast\` field so the UI can parse them later.

Return ONLY valid JSON. No preamble.`;

    // 5. LLM Call
    const llmResult = await completeText({
      system: systemPrompt,
      user: JSON.stringify(profileSummary, null, 2),
      maxTokens: 1000,
      temperature: 0.8,
      cacheSystem: true,
    });

    const cleaned = normalizeLlmJsonText(llmResult.text);
    const output = RoastOutputSchema.parse(JSON.parse(cleaned));

    // 6. Persistence
    const { id } = await this.roastRepo.save({
      userId: userId || null,
      githubUsername: username,
      roastData: output,
    });

    // 7. Post-processing (Events/Limits)
    if (userId) {
      const { recordTokenUsage } = await import("@/server/limits.server");
      await Promise.all([
        db
          .update(users)
          .set({ roastCountThisMonth: sql`${users.roastCountThisMonth} + 1` })
          .where(eq(users.id, userId)),
        recordTokenUsage(userId, llmResult.usage),
        db.insert(userEvents).values({
          userId,
          eventType: "roast",
          payload: {
            username,
            criticality: output.criticality,
            roastId: id,
            usage: llmResult.usage,
          },
        }),
      ]);
    }

    return { ...output, id, githubUsername: username };
  }
}
