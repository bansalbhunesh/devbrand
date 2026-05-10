import { pgTable, uuid, text, integer, timestamp, boolean } from "drizzle-orm/pg-core";
import { sql, relations } from "drizzle-orm";

export const users = pgTable("users", {
  id: uuid("id").primaryKey().default(sql`gen_random_uuid()`),
  githubId: text("github_id").unique().notNull(),
  githubLogin: text("github_login").notNull(),
  name: text("name"),
  avatarUrl: text("avatar_url"),
  email: text("email"),
  seniority: text("seniority").notNull().default("mid"), // junior | mid | senior
  tone: text("tone").notNull().default("direct"), // direct | storytelling | technical
  stripeCustomerId: text("stripe_customer_id"),
  plan: text("plan").notNull().default("free"), // free | pro
  planExpiresAt: timestamp("plan_expires_at", { withTimezone: true }),
  generationsThisMonth: integer("generations_this_month").notNull().default(0),
  monthResetAt: timestamp("month_reset_at", { withTimezone: true }).notNull().default(sql`date_trunc('month', now()) + interval '1 month'`),
  createdAt: timestamp("created_at", { withTimezone: true }).notNull().defaultNow(),
  updatedAt: timestamp("updated_at", { withTimezone: true }).notNull().defaultNow(),
});

export const usersRelations = relations(users, ({ one, many }) => ({
  profile: one(profiles, {
    fields: [users.id],
    references: [profiles.userId],
  }),
  outputs: many(outputs),
}));

export const profiles = pgTable("profiles", {
  userId: uuid("user_id").primaryKey().references(() => users.id, { onDelete: "cascade" }),
  bio: text("bio"),
  customDomain: text("custom_domain").unique(),
  isPublic: boolean("is_public").notNull().default(true),
  theme: text("theme").notNull().default("dark"),
  updatedAt: timestamp("updated_at", { withTimezone: true }).notNull().defaultNow(),
});

export const profilesRelations = relations(profiles, ({ one }) => ({
  user: one(users, {
    fields: [profiles.userId],
    references: [users.id],
  }),
}));

export const outputs = pgTable("outputs", {
  id: uuid("id").primaryKey().default(sql`gen_random_uuid()`),
  userId: uuid("user_id").notNull().references(() => users.id, { onDelete: "cascade" }),
  prTitle: text("pr_title").notNull(),
  prUrl: text("pr_url"),
  prSignals: text("pr_signals").array(),
  stack: text("stack").array(),
  linkedinPost1: text("linkedin_post_1").notNull(),
  linkedinPost2: text("linkedin_post_2").notNull(),
  linkedinPost3: text("linkedin_post_3").notNull(),
  resumeBullet: text("resume_bullet").notNull(),
  interviewHook: text("interview_hook").notNull(),
  isPublic: boolean("is_public").notNull().default(false),
  impactScore: integer("impact_score").notNull().default(0),
  category: text("category"),
  complexityLevel: text("complexity_level"),
  createdAt: timestamp("created_at", { withTimezone: true }).notNull().defaultNow(),
});

export const outputsRelations = relations(outputs, ({ one }) => ({
  user: one(users, {
    fields: [outputs.userId],
    references: [users.id],
  }),
}));

export const repoGraphs = pgTable("repo_graphs", {
  id: uuid("id").primaryKey().default(sql`gen_random_uuid()`),
  owner: text("owner").notNull(),
  repo: text("repo").notNull(),
  graphData: text("graph_data", { mode: "json" }).notNull(),
  computedAt: timestamp("computed_at", { withTimezone: true }).notNull().defaultNow(),
});

export const userEvents = pgTable("user_events", {
  id: uuid("id").primaryKey().default(sql`gen_random_uuid()`),
  userId: uuid("user_id").references(() => users.id, { onDelete: "cascade" }),
  eventType: text("event_type").notNull(),
  payload: text("payload", { mode: "json" }),
  createdAt: timestamp("created_at", { withTimezone: true }).notNull().defaultNow(),
});
