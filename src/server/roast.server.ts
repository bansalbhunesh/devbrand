import { createServerFn } from "@tanstack/react-start";
import { getRequest } from "@tanstack/react-start/server";
import { z } from "zod";
import { Octokit } from "octokit";
import { completeText, normalizeLlmJsonText } from "./llm/client";
import { db } from "./db.server";
import { users, userEvents, roasts } from "./schema.server";
import { eq, sql } from "drizzle-orm";
import { rateLimit } from "./redis";
import { env } from "../lib/env";

let octokit: Octokit | null = null;

function getOctokit() {
  if (!octokit)
    octokit = new Octokit({
      auth: env.GITHUB_TOKEN || env.GITHUB_CLIENT_SECRET,
    });
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

// The Verdict — tone gradient.
//   The structure of the output is the same across all five tones
//   (patterns / tradeoffs / gap / line). Only THE LINE — the
//   memorable closing sentence — shifts in voice. Everything else
//   stays measured, citation-aware, and recruiter-safe.
const PERSONA_MAP = {
  mentor:
    "You are a kind, patient staff engineer reviewing a junior's work. Your job is to identify real strengths first, then offer one growth direction. Encouraging, never sarcastic. The closing line should feel like advice from someone who believes in the developer.",
  peer: "You are a respected peer engineer giving an honest read on this developer's GitHub activity. Balanced — name the strengths, name the tradeoffs, and end with one observation that crystallizes the read. No insults, no flattery. The closing line is sharp but never mean.",
  staff:
    "You are a principal/staff engineer doing a rigorous, technical review of this developer's body of work. You care about architecture, scalability, idiomatic patterns, and engineering judgment under constraints. The closing line lands a precise technical insight.",
  edge: "You are an opinionated senior engineer who isn't afraid to take a position. You name real tradeoffs others tiptoe around. Confident, witty, takes a side — but every claim is grounded in the actual data. The closing line is the kind of sentence other engineers screenshot and quote.",
  chaos:
    "You are the Verdict, off the record. The user explicitly opted into chaos mode — they want a memorable, irreverent, share-on-Twitter closing line. Keep PATTERNS, TRADEOFFS, GAP measured and substantive (this still has to be useful). But THE LINE is the punchline: vivid, specific, funny, and grounded in real engineering observation. No slurs, no body shaming, no personal attacks on identity — engineering judgment only.",
};

// ── Plain Function (Server-Only) ─────────────────────────────────────────────

export async function generateRoastFn(data: {
  username: string;
  userId?: string;
  tone: "mentor" | "peer" | "staff" | "edge" | "chaos";
}) {
  const { username, userId, tone } = data;
  // 1. Rate limiting & Limit Reset
  if (userId) {
    const { checkAndResetLimits, enforceTokenBudget } =
      await import("./limits.server");
    const user = await checkAndResetLimits(userId);
    if (
      user &&
      user.plan === "free" &&
      (user.roastCountThisMonth ?? 0) >= FREE_ROAST_LIMIT
    ) {
      throw new Error("ROAST_LIMIT_REACHED");
    }
    // Hard token cap — surfaces as ROAST_BUDGET_REACHED on the client.
    await enforceTokenBudget(userId);
  } else {
    // IP-based rate limit for anonymous users
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

  const octokitInstance = getOctokit();

  const [userRes, eventsRes, reposRes] = await Promise.all([
    octokitInstance.rest.users.getByUsername({ username }),
    octokitInstance.rest.activity.listPublicEventsForUser({
      username,
      per_page: 50,
    }),
    octokitInstance.rest.repos.listForUser({
      username,
      sort: "updated",
      per_page: 10,
    }),
  ]);

  const ghUser = userRes.data;
  const events = eventsRes.data;
  const repos = reposRes.data;

  const pushEvents = events.filter((e) => e.type === "PushEvent");
  const commitMessages = pushEvents
    .flatMap(
      (e) =>
        ((e.payload as any).commits as any[])?.map((c: any) => c.message) ?? [],
    )
    .filter(Boolean)
    .slice(0, 20);

  const languages = repos
    .map((r) => r.language)
    .filter(Boolean)
    .reduce<Record<string, number>>((acc, lang) => {
      acc[lang!] = (acc[lang!] ?? 0) + 1;
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

  const llmResult = await completeText({
    system: systemPrompt,
    user: JSON.stringify(profileSummary, null, 2),
    maxTokens: 1000,
    temperature: 0.8,
    cacheSystem: true,
  });
  const cleaned = normalizeLlmJsonText(llmResult.text);
  const output = RoastOutputSchema.parse(JSON.parse(cleaned));

  const [inserted] = await db
    .insert(roasts)
    .values({
      userId: userId || null,
      githubUsername: username,
      roastData: output,
    })
    .returning();

  if (userId) {
    const { recordTokenUsage } = await import("./limits.server");
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
          roastId: inserted.id,
          usage: llmResult.usage,
        },
      }),
    ]);
  }

  return { ...output, id: inserted.id, githubUsername: username };
}

export async function postToXFn(data: { id: string; content: string }) {
  const { loadSessionUser } = await import("./auth.server");
  const user = await loadSessionUser();
  if (!user) throw new Error("UNAUTHORIZED");

  console.log(
    `[X_BROADCAST] User ${user.githubLogin} posted roast ${data.id}: ${data.content}`,
  );

  await db.insert(userEvents).values({
    userId: user.id,
    eventType: "social_share",
    payload: { platform: "x", roastId: data.id },
  });

  return { success: true };
}
