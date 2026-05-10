import { createServerFn } from "@tanstack/react-start";
import { z } from "zod";
import Anthropic from "@anthropic-ai/sdk";
import { Octokit } from "octokit";
import { db } from "./db";
import { users, userEvents } from "./schema";
import { eq, sql } from "drizzle-orm";
import { rateLimit } from "./redis";

const anthropic = new Anthropic({ apiKey: process.env.ANTHROPIC_API_KEY });
const octokit = new Octokit({ auth: process.env.GITHUB_TOKEN });
const CLAUDE_MODEL = process.env.CLAUDE_MODEL ?? "claude-3-5-sonnet-20241022";

const FREE_ROAST_LIMIT = 10;
const PUBLIC_ANON_LIMIT = 3;

const RoastOutputSchema = z.object({
  roast: z.string().max(1000),
  criticality: z.enum(["LOW", "MEDIUM", "HIGH", "NUCLEAR"]),
  improvements: z.array(z.string()).length(3),
  redeeming_quality: z.string().max(200),
});

const ROAST_PROMPT = `You are a brutally honest senior engineer doing a 360 review of someone's entire GitHub profile.

YOUR TASK: Write a roast that is:
1. FUNNY — precision comedy, not cruelty.
2. TECHNICALLY ACCURATE — ground every observation in the data given.
3. BACKHANDED — compliment that is actually a criticism.
4. SHORT — under 200 words.
5. BALANCED — always include one genuine "redeeming_quality" you actually respect.

Return ONLY valid JSON matching the schema. No markdown, no preamble.`;

export const generateRoast = createServerFn({ method: "POST" })
  .validator(z.object({ username: z.string().min(1).max(39), userId: z.string().uuid().optional() }))
  .handler(async ({ data: { username, userId } }) => {
    // 1. Rate limiting
    if (userId) {
      const user = await db.query.users.findFirst({ where: eq(users.id, userId) });
      if (user && user.plan === "free" && (user.roastCountThisMonth ?? 0) >= FREE_ROAST_LIMIT) {
        throw new Error("ROAST_LIMIT_REACHED");
      }
    } else {
      // Global IP-based rate limit for anonymous users
      const { success } = await rateLimit(`roast:anon:${username}`, PUBLIC_ANON_LIMIT, 3600);
      if (!success) throw new Error("PUBLIC_RATE_LIMIT_REACHED");
    }

    const [userRes, eventsRes, reposRes] = await Promise.all([
      octokit.rest.users.getByUsername({ username }),
      octokit.rest.activity.listPublicEventsForUser({ username, per_page: 50 }),
      octokit.rest.repos.listForUser({ username, sort: "updated", per_page: 10 }),
    ]);

    const ghUser = userRes.data;
    const events = eventsRes.data;
    const repos = reposRes.data;

    const pushEvents = events.filter((e) => e.type === "PushEvent");
    const commitMessages = pushEvents
      .flatMap((e) => (e.payload as any).commits?.map((c: any) => c.message) ?? [])
      .filter(Boolean)
      .slice(0, 20);

    const languages = repos
      .map((r) => r.language)
      .filter(Boolean)
      .reduce<Record<string, number>>((acc, lang) => {
        acc[lang!] = (acc[lang!] ?? 0) + 1;
        return acc;
      }, {});

    const profileSummary = {
      login: ghUser.login,
      bio: ghUser.bio ?? "No bio",
      public_repos: ghUser.public_repos,
      followers: ghUser.followers,
      following: ghUser.following,
      account_age_years: Math.floor(
        (Date.now() - new Date(ghUser.created_at).getTime()) / (365 * 24 * 60 * 60 * 1000)
      ),
      top_repos: repos.map((r) => ({
        name: r.name,
        lang: r.language,
        stars: r.stargazers_count,
        forks: r.forks_count,
        description: r.description?.slice(0, 60),
      })),
      language_breakdown: languages,
      recent_commits: commitMessages,
      commit_frequency_per_week: Math.round(pushEvents.length / 4),
    };

    const response = await anthropic.messages.create({
      model: CLAUDE_MODEL,
      max_tokens: 1000,
      system: ROAST_PROMPT,
      messages: [{ role: "user", content: JSON.stringify(profileSummary, null, 2) }],
    });

    const rawContent = response.content[0].type === "text" ? response.content[0].text.trim() : "";
    const cleaned = rawContent.replace(/^```json\n?/, "").replace(/\n?```$/, "");
    const output = RoastOutputSchema.parse(JSON.parse(cleaned));

    if (userId) {
      await Promise.all([
        db
          .update(users)
          .set({ roastCountThisMonth: sql`${users.roastCountThisMonth} + 1` })
          .where(eq(users.id, userId)),
        db.insert(userEvents).values({
          userId,
          eventType: "roast",
          payload: { username, criticality: output.criticality },
        }),
      ]);
    }

    return output;
  });
