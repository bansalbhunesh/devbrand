import { createServerFn } from "@tanstack/react-start";
import { getCookie, setCookie, deleteCookie, getRequest } from "@tanstack/react-start/server";
import { z } from "zod";
import { Octokit } from "octokit";
import { completeText, normalizeLlmJsonText } from "./llm/client";
import { db } from "./db";
import { users, userEvents, roasts } from "./schema";

import { eq, sql } from "drizzle-orm";
import { rateLimit } from "./redis";

let octokit: Octokit | null = null;

function getOctokit() {
  if (!octokit) octokit = new Octokit({ auth: process.env.GITHUB_TOKEN });
  return octokit;
}

const FREE_ROAST_LIMIT = 10;
const PUBLIC_ANON_LIMIT = 3;

const RoastOutputSchema = z.object({
  roast: z.string().max(1000),
  criticality: z.enum(["LOW", "MEDIUM", "HIGH", "NUCLEAR"]),
  improvements: z.array(z.string()).min(1).max(5),
  redeeming_quality: z.string().max(200),
  card_title: z.string().max(100),
  roast_score: z.number().min(0).max(100),
  technician_score: z.number().min(0).max(100),
  share_summary: z.string().max(280),
});


const ROAST_PROMPT = `You are a Salty Senior Staff Engineer who has been on call for 48 hours straight. You are doing a code-level audit of a GitHub profile. 

YOUR PERSONA:
- You hate over-engineering.
- You hate "fix" or "update" commit message spam.
- You judge people who have 500 followers but zero meaningful contributions.
- You are unimpressed by boilerplate and "Todo list" apps.

YOUR TASK:
- Write a roast that is technically deep and hilarious.
- Mention specific repo names, languages, or commit patterns from the data.
- Use "The [Something] Architect" or similar titles for the card_title.
- Be brutal but stay within community guidelines (no hate speech, just engineering judgment).

OUTPUT JSON SCHEMA:
- roast: The main roast text (max 1000 chars).
- criticality: LOW, MEDIUM, HIGH, or NUCLEAR.
- improvements: 3-5 technical "repentance" steps.
- redeeming_quality: One thing you actually respect (e.g., "At least your commit frequency is consistent").
- card_title: A punchy 3-5 word summary.
- roast_score: 0-100 (severity of the burn).
- technician_score: 0-100 (actual skill estimate).
- share_summary: A 280-char summary for social media.

Return ONLY valid JSON. No preamble.`;


export const generateRoast = createServerFn({ method: "POST" })
  .inputValidator(z.object({ username: z.string().min(1).max(39), userId: z.string().uuid().optional() }))
  .handler(async ({ data: { username, userId } }) => {
    // 1. Rate limiting
    if (userId) {
      const user = await db.query.users.findFirst({ where: eq(users.id, userId) });
      if (user && user.plan === "free" && (user.roastCountThisMonth ?? 0) >= FREE_ROAST_LIMIT) {
        throw new Error("ROAST_LIMIT_REACHED");
      }
    } else {
      // IP-based rate limit for anonymous users
      const request = getRequest();
      const ip = request?.headers.get("x-forwarded-for")?.split(",")[0] || "127.0.0.1";
      const { success } = await rateLimit(`roast:anon:${ip}`, PUBLIC_ANON_LIMIT, 3600);
      if (!success) throw new Error("PUBLIC_RATE_LIMIT_REACHED");
    }

    const octokit = getOctokit();

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

    const lowEffortCommits = commitMessages.filter(m => 
      /^(fix|update|test|chore|merge|tmp|save|.)(\s|$|:)/i.test(m) || m.length < 5
    ).length;

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
      low_effort_commit_count: lowEffortCommits,
      commit_frequency_per_week: Math.round(pushEvents.length / 4),
    };

    const rawContent = await completeText({
      system: ROAST_PROMPT,
      user: JSON.stringify(profileSummary, null, 2),
      maxTokens: 1000,
      temperature: 0.7,
    });
    const cleaned = normalizeLlmJsonText(rawContent);
    const output = RoastOutputSchema.parse(JSON.parse(cleaned));

    const [inserted] = await db.insert(roasts).values({
      userId: userId || null,
      githubUsername: username,
      roastData: output,
    }).returning();

    if (userId) {
      await Promise.all([
        db
          .update(users)
          .set({ roastCountThisMonth: sql`${users.roastCountThisMonth} + 1` })
          .where(eq(users.id, userId)),
        db.insert(userEvents).values({
          userId,
          eventType: "roast",
          payload: { username, criticality: output.criticality, roastId: inserted.id },
        }),
      ]);
    }

    return { ...output, id: inserted.id };
  });

