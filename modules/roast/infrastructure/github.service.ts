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
}
