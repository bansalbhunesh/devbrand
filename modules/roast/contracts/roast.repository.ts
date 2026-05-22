import { RoastOutput } from "../domain/roast.types";

export interface IRoastRepository {
  /**
   * Save a newly generated roast to the database.
   */
  save(data: {
    userId: string | null;
    githubUsername: string;
    roastData: RoastOutput;
  }): Promise<{ id: string }>;

  /**
   * Fetch a roast by its UUID.
   */
  getById(id: string): Promise<any | null>;

  /**
   * Fetch a list of public roasts for the feed.
   */
  listPublic(limit: number): Promise<any[]>;

  saveRepoRoast(data: {
    owner: string;
    repo: string;
    roastData: import("../domain/roast.types").RepoRoastOutput;
    rawPayloadHash: string;
  }): Promise<{ id: string }>;

  getRepoRoastByHash(hash: string): Promise<any | null>;
}
