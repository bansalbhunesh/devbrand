import { TrackedRepo } from "../domain/repo.entities";

export interface ITrackedRepoRepository {
  findByUserId(userId: string): Promise<TrackedRepo[]>;
  findByIdAndUserId(id: string, userId: string): Promise<TrackedRepo | null>;
  findByOwnerRepoAndUserId(owner: string, repo: string, userId: string): Promise<TrackedRepo | null>;
  save(data: Omit<TrackedRepo, "id" | "createdAt" | "updatedAt">): Promise<TrackedRepo>;
  updateSecret(id: string, secret: string): Promise<void>;
  delete(id: string, userId: string): Promise<boolean>;
}
