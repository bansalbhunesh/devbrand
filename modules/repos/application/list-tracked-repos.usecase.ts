import { ITrackedRepoRepository } from "../contracts/repo.repository";
import { env } from "@devbrand/config";

export class ListTrackedReposUseCase {
  constructor(private repoRepository: ITrackedRepoRepository) {}

  private webhookUrl(): string {
    const base = (env.APP_URL ?? "").replace(/\/+$/, "");
    return `${base}/webhooks/github`;
  }

  async execute(userId: string) {
    const repos = await this.repoRepository.findByUserId(userId);
    return {
      repos: repos.map((r) => ({
        id: r.id,
        owner: r.owner,
        repo: r.repo,
        autoPublish: r.autoPublish,
        createdAt: r.createdAt,
      })),
      webhookUrl: this.webhookUrl(),
    };
  }
}
