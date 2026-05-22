import { RepoRoastOutputSchema } from "../domain/roast.types";
import { IRoastRepository } from "../contracts/roast.repository";
import { RoastGithubService } from "../infrastructure/github.service";
import {
  completeText,
  normalizeLlmJsonText,
} from "@/modules/ai/infrastructure/llm.gateway";
import { getRequest } from "@tanstack/react-start/server";
import { rateLimit } from "@infrastructure/cache/redis.server";
import crypto from "crypto";

const PUBLIC_ANON_LIMIT = 5;

function computeAISlopScore(profile: any): number {
  const { commits, prs, meta, readme, languages } = profile;

  // Vague commit messages — the single strongest signal
  const VAGUE = /^(fix|update|wip|misc|changes|stuff|temp|test|asdf|lol)\b/i;
  const vagueRatio =
    commits.length > 0
      ? commits.filter((c: any) => VAGUE.test(c.commit.message)).length /
        commits.length
      : 0;

  // Empty PR descriptions — AI-generated PRs almost never have them
  const emptyPRRatio =
    prs.length > 0
      ? prs.filter((pr: any) => (pr.body?.length ?? 0) < 30).length / prs.length
      : 0;

  // README quality — proxy for whether a human cared
  const readmeScore = readme
    ? Math.min(readme.length / 2000, 1) // normalized, max at 2000 chars
    : 0;

  // Language diversity bonus — AI slop is usually single-language
  const langCount = Object.keys(languages).length;
  const langBonus = Math.min(langCount / 5, 1) * 15;

  const rawScore =
    vagueRatio * 40 + emptyPRRatio * 30 + (1 - readmeScore) * 15 - langBonus;
  return Math.round(Math.max(0, Math.min(100, rawScore)));
}

function computeDebtScore(profile: any): number {
  const { prs, contributors } = profile;

  // Stale PR ratio
  const thirtyDaysAgo = Date.now() - 30 * 24 * 60 * 60 * 1000;
  const stalePRs = prs.filter(
    (pr: any) => new Date(pr.updated_at).getTime() < thirtyDaysAgo,
  );
  const stalePRRatio =
    prs.length > 0 ? stalePRs.length / prs.length : 0;

  // Bus factor (how much the top contributor dominates)
  const topContributorCount = contributors?.[0]?.contributions || 0;
  const totalContributions = contributors?.reduce(
    (acc: number, c: any) => acc + c.contributions,
    0,
  ) || 1;
  const busFactorRatio = topContributorCount / totalContributions;

  const rawScore = stalePRRatio * 50 + busFactorRatio * 50;
  return Math.round(Math.max(0, Math.min(100, rawScore)));
}

export class GenerateRepoRoastUseCase {
  constructor(
    private roastRepo: IRoastRepository,
    private githubService: RoastGithubService,
  ) {}

  async execute(data: { owner: string; repo: string }) {
    const { owner, repo } = data;

    // Rate Limiting
    const request = getRequest();
    const ip =
      request?.headers.get("x-forwarded-for")?.split(",")[0] || "127.0.0.1";
    const { success } = await rateLimit(
      `repo_roast:anon:${ip}`,
      PUBLIC_ANON_LIMIT,
      3600,
    );
    if (!success) throw new Error("PUBLIC_RATE_LIMIT_REACHED");

    // Fetch Data
    const profile = await this.githubService.fetchRepoProfile(owner, repo);

    // Hash payload to check for existing cache/DB entry
    const hashPayload = JSON.stringify({
      owner,
      repo,
      commitsCount: profile.commits.length,
      prsCount: profile.prs.length,
      updatedAt: profile.meta.updated_at,
    });
    const rawPayloadHash = crypto
      .createHash("sha256")
      .update(hashPayload)
      .digest("hex");

    const existing = await this.roastRepo.getRepoRoastByHash(rawPayloadHash);
    if (existing) {
      return { ...existing.roastData, id: existing.id, owner, repo };
    }

    // Process deterministic scores
    const aiSlopScore = computeAISlopScore(profile);
    const debtScore = computeDebtScore(profile);

    const metrics = {
      aiSlopScore,
      debtScore,
      stars: profile.meta.stargazers_count,
      forks: profile.meta.forks_count,
      open_issues: profile.meta.open_issues_count,
      top_contributors: profile.contributors.map((c: any) => c.login),
      recent_commits: profile.commits
        .slice(0, 10)
        .map((c: any) => c.commit.message),
      language_breakdown: profile.languages,
    };

    // System A (stable): cynical staff engineer, peer audience, no marketing
    // System B (firewall): banned words, declarative style
    const systemPrompt = `You are a cynical, highly-experienced Staff Engineer rendering a "Repo Roast" verdict on the github repository ${owner}/${repo}.
You have no patience for marketing fluff, generic AI buzzwords, or emojis. You are brutal but technically accurate.

You must evaluate the repository based on the provided JSON metrics.

Write your output in valid JSON matching this schema:
{
  "verdict": "string (Max 25 words. THE LINE. The single, shareable judgment. It must be brutally honest and punchy. Make it sting but be fair.)",
  "narrative": "string (120-300 words. Architecture & trade-off analysis. What does the repo structure say about the team?)",
  "executionLog": "string (60-150 words. Metric-dense observation on their velocity, bus factor, or stale PRs.)",
  "minimalist": "string (Exactly 1 or 2 sentences containing at least 1 concrete metric.)",
  "signalsUsed": ["string (e.g. 'high vague commit ratio', 'abandoned PRs')"]
}

BANNED WORDS: "innovative", "synergy", "disrupt", "game-changer", "cringe", "delve", "tapestry".
DO NOT include any emojis. Do not include markdown blocks around the JSON.
Just raw JSON.`;

    // LLM Call
    const llmResult = await completeText({
      system: systemPrompt,
      user: JSON.stringify(metrics, null, 2),
      maxTokens: 1500,
      temperature: 0.7,
      cacheSystem: true,
    });

    const cleaned = normalizeLlmJsonText(llmResult.text);
    const rawOutput = JSON.parse(cleaned);
    
    // Hard trim the verdict to 25 words max (Gate 3 in the spec)
    let verdictStr = rawOutput.verdict || "";
    const words = verdictStr.split(/\s+/);
    if (words.length > 25) {
      verdictStr = words.slice(0, 25).join(" ") + "...";
    }

    const output = RepoRoastOutputSchema.parse({
      ...rawOutput,
      verdict: verdictStr,
      aiSlopScore,
      debtScore,
    });

    // Persistence
    const { id } = await this.roastRepo.saveRepoRoast({
      owner,
      repo,
      roastData: output,
      rawPayloadHash,
    });

    return { ...output, id, owner, repo };
  }
}
