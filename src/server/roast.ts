import { createServerFn } from "@tanstack/react-start";
import { z } from "zod";
import Anthropic from "@anthropic-ai/sdk";
import { Octokit } from "octokit";
import { db } from "./db";
import { users } from "./schema";
import { eq, sql } from "drizzle-orm";

const anthropic = new Anthropic({
  apiKey: process.env.ANTHROPIC_API_KEY,
});

const octokit = new Octokit({
  auth: process.env.GITHUB_TOKEN,
});

const RoastOutputSchema = z.object({
  roast: z.string().max(1000),
  criticality: z.enum(['LOW', 'MEDIUM', 'HIGH', 'NUCLEAR']),
  improvements: z.array(z.string()).length(3),
});

const ROAST_PROMPT = `
You are a brutally honest senior engineer doing a code review of someone's ENTIRE GitHub profile.

YOUR TASK: Write a roast that is:
1. FUNNY — not just mean. The humor comes from precision, not cruelty.
2. TECHNICALLY ACCURATE.
3. BACKHANDED.
4. SHORT — under 200 words.

Return ONLY valid JSON matching the schema.
`;

export const generateRoast = createServerFn({ method: "POST" })
  .validator(z.object({ username: z.string(), userId: z.string().uuid().optional() }))
  .handler(async ({ data: { username, userId } }) => {
    try {
      if (userId) {
        const user = await db.query.users.findFirst({
          where: eq(users.id, userId),
        });
        if (user && user.plan === "free" && user.generationsThisMonth >= 3) {
          throw new Error("LIMIT_REACHED");
        }
      }

      // 1. Fetch GitHub Profile Info
      const [userResponse, eventsResponse, reposResponse] = await Promise.all([
        octokit.rest.users.getByUsername({ username }),
        octokit.rest.activity.listPublicEventsForUser({ username, per_page: 50 }),
        octokit.rest.repos.listForUser({ username, sort: 'updated', per_page: 10 }),
      ]);

      const ghUser = userResponse.data;
      const events = eventsResponse.data;
      const repos = reposResponse.data;

      // 2. Aggregate Data for Prompt
      const commitMessages = events
        .filter(e => e.type === 'PushEvent')
        .flatMap(e => (e.payload as any).commits?.map((c: any) => c.message))
        .filter(Boolean)
        .slice(0, 20);

      const profileSummary = {
        login: ghUser.login,
        bio: ghUser.bio,
        public_repos: ghUser.public_repos,
        followers: ghUser.followers,
        top_repos: repos.map(r => ({ name: r.name, lang: r.language, stars: r.stargazers_count })),
        recent_commits: commitMessages,
      };

      // 3. Call Claude
      const response = await anthropic.messages.create({
        model: "claude-3-5-sonnet-20240620",
        max_tokens: 1000,
        system: ROAST_PROMPT,
        messages: [{ role: "user", content: JSON.stringify(profileSummary) }],
      });

      const rawContent = response.content[0].type === 'text' ? response.content[0].text : '';
      const output = RoastOutputSchema.parse(JSON.parse(rawContent));

      if (userId) {
        await db.update(users)
          .set({ generationsThisMonth: sql`${users.generationsThisMonth} + 1` })
          .where(eq(users.id, userId));
      }

      return output;
    } catch (error) {
      console.error("Error generating roast:", error);
      throw new Error("Failed to judge your profile");
    }
  });
