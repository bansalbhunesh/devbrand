import { createServerFn } from "@tanstack/react-start";
import { z } from "zod";
import { Octokit } from "octokit";

export interface ParsedDiff {
  prTitle: string;
  repoName: string;
  owner: string;
  prNumber: number;
  totalAdditions: number;
  totalDeletions: number;
  files: DiffFile[];
  sha: string;
}

export interface DiffFile {
  filename: string;
  additions: number;
  deletions: number;
  patch: string;
  status: string;
}

const octokit = new Octokit({
  auth: process.env.GITHUB_TOKEN,
});

export const fetchPRDiff = createServerFn({ method: "POST" })
  .validator(z.object({ prUrl: z.string().url() }))
  .handler(async ({ data: { prUrl } }): Promise<ParsedDiff> => {
    const match = prUrl.match(/github\.com\/([^/]+)\/([^/]+)\/pull\/(\d+)/);
    if (!match) throw new Error("Invalid GitHub PR URL");
    const [, owner, repo, prNumberStr] = match;
    const prNumber = parseInt(prNumberStr);

    try {
      const [prResponse, filesResponse] = await Promise.all([
        octokit.rest.pulls.get({
          owner,
          repo,
          pull_number: prNumber,
        }),
        octokit.rest.pulls.listFiles({
          owner,
          repo,
          pull_number: prNumber,
          per_page: 100,
        }),
      ]);

      const pr = prResponse.data;
      const files = filesResponse.data;

      return {
        prTitle: pr.title,
        repoName: repo,
        owner,
        prNumber,
        totalAdditions: pr.additions,
        totalDeletions: pr.deletions,
        sha: pr.merge_commit_sha?.slice(0, 7) ?? pr.head.sha.slice(0, 7),
        files: files.map((f) => ({
          filename: f.filename,
          additions: f.additions,
          deletions: f.deletions,
          patch: f.patch ?? "",
          status: f.status,
        })),
      };
    } catch (error) {
      console.error("Error fetching PR diff:", error);
      throw new Error("Failed to fetch PR from GitHub");
    }
  });
