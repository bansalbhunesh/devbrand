import crypto from "crypto";
import { ITrackedRepoRepository } from "../contracts/repo.repository";
import { env } from "@devbrand/config";

export class RegisterTrackedRepoUseCase {
  constructor(private repoRepository: ITrackedRepoRepository) {}

  private generateWebhookSecret(): string {
    return crypto.randomBytes(32).toString("hex");
  }

  private webhookUrl(): string {
    const base = (env.APP_URL ?? "").replace(/\/+$/, "");
    return `${base}/webhooks/github`;
  }

  async execute(data: { userId: string; owner: string; repo: string }) {
    const { userId, owner, repo } = data;

    const existing = await this.repoRepository.findByOwnerRepoAndUserId(owner, repo, userId);
    if (existing) throw new Error("ALREADY_TRACKED");

    const secret = this.generateWebhookSecret();
    const row = await this.repoRepository.save({
      userId,
      owner,
      repo,
      webhookSecret: secret,
      autoPublish: false,
    });

    return {
      ...row,
      webhookUrl: this.webhookUrl(),
      webhookSecret: secret,
    };
  }
}
