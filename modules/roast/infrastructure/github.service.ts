import { Octokit } from "octokit";
import { env } from "@devbrand/config";

export class RoastGithubService {
  private octokit: Octokit;

  constructor() {
    this.octokit = new Octokit({
      auth: env.GITHUB_TOKEN || env.GITHUB_CLIENT_SECRET,
    });
  }

  async fetchUserProfile(username: string) {
    const [userRes, eventsRes, reposRes] = await Promise.all([
      this.octokit.rest.users.getByUsername({ username }),
      this.octokit.rest.activity.listPublicEventsForUser({
        username,
        per_page: 50,
      }),
      this.octokit.rest.repos.listForUser({
        username,
        sort: "updated",
        per_page: 10,
      }),
    ]);

    return {
      user: userRes.data,
      events: eventsRes.data,
      repos: reposRes.data,
    };
  }

  async fetchRepoProfile(owner: string, repo: string) {
    // Single REST call — metadata is cheap
    const { data: meta } = await this.octokit.rest.repos.get({ owner, repo });

    // Paginated but capped — never unbounded
    const commits = await this.octokit.paginate(
      this.octokit.rest.repos.listCommits,
      { owner, repo, per_page: 50 },
      (response, done) => {
        done();
        return response.data;
      },
    );

    // Top 5 contributors only
    const { data: contributors } = await this.octokit.rest.repos.listContributors({
      owner,
      repo,
      per_page: 5,
    });

    // Open PRs only, capped at 30
    const { data: prs } = await this.octokit.rest.pulls.list({
      owner,
      repo,
      state: "open",
      per_page: 30,
      sort: "updated",
      direction: "desc",
    });

    // Languages map — single call, cheap
    const { data: languages } = await this.octokit.rest.repos.listLanguages({
      owner,
      repo,
    });

    // Attempt to fetch README to compute readme quality
    let readme = null;
    try {
      const { data: readmeData } = await this.octokit.rest.repos.getReadme({
        owner,
        repo,
      });
      // GitHub returns base64 encoded content
      if (readmeData.content && readmeData.encoding === "base64") {
        readme = Buffer.from(readmeData.content, "base64").toString("utf-8");
      }
    } catch (e) {
      // Ignore 404s if README doesn't exist
    }

    return { meta, commits, contributors, prs, languages, readme };
  }
}
