export interface TrackedRepo {
  id: string;
  userId: string;
  owner: string;
  repo: string;
  webhookSecret: string;
  autoPublish: boolean;
  createdAt: Date;
  updatedAt: Date;
}
