export type DigestKind = "weekly" | "release_notes";

export interface Digest {
  id: string;
  userId: string;
  kind: DigestKind;
  periodStart: Date;
  periodEnd: Date;
  linkedinPost: string;
  twitterThread: string[];
  releaseNotes: string;
  includedOutputIds: string[];
  createdAt: Date;
}
