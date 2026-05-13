import { Digest } from "../domain/digest.entities";

export interface IDigestRepository {
  save(digest: Omit<Digest, "id" | "createdAt">): Promise<Digest>;
  findByIdAndUserId(id: string, userId: string): Promise<Digest | null>;
  listByUserId(userId: string, limit: number): Promise<Digest[]>;
}
