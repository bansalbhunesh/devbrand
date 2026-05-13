import { z } from "zod";

export const UserRoleSchema = z.enum(["user", "admin"]);
export type UserRole = z.infer<typeof UserRoleSchema>;

export const UserPlanSchema = z.enum(["free", "pro"]);
export type UserPlan = z.infer<typeof UserPlanSchema>;

export interface User {
  id: string;
  githubId: string;
  githubLogin: string;
  name: string | null;
  avatarUrl: string | null;
  email: string | null;
  role: UserRole;
  plan: UserPlan;
  sessionNonce: string;
  createdAt: Date;
  updatedAt: Date;
}
