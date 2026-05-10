import {
  pgTable,
  uuid,
  text,
  integer,
  timestamp,
  boolean,
  index,
  uniqueIndex,
} from "drizzle-orm/pg-core";
import { sql, relations } from "drizzle-orm";

export const users = pgTable("users", {
  id: uuid("id").primaryKey().default(sql`gen_random_uuid()`),
  githubId: text("github_id").unique().notNull(),
  githubLogin: text("github_login").notNull(),
  name: text("name"),
  avatarUrl: text("avatar_url"),
  email: text("email"),
  seniority: text("seniority").notNull().default("mid"), // junior | mid | senior | staff
  tone: text("tone").notNull().default("direct"),         // direct | storytelling | technical
  stripeCustomerId: text("stripe_customer_id"),
  plan: text("plan").notNull().default("free"),            // free | pro
  planExpiresAt: timestamp("plan_expires_at", { withTimezone: true }),
  generationsThisMonth: integer("generations_this_month").notNull().default(0),
  roastCountThisMonth: integer("roast_count_this_month").notNull().default(0), // separate from generations
  monthResetAt: timestamp("month_reset_at", { withTimezone: true })
    .notNull()
    .default(sql`date_trunc('month', now()) + interval '1 month'`),
  createdAt: timestamp("created_at", { withTimezone: true }).notNull().defaultNow(),
  updatedAt: timestamp("updated_at", { withTimezone: true }).notNull().defaultNow(),
});

export const usersRelations = relations(users, ({ one, many }) => ({
  profile: one(profiles, { fields: [users.id], references: [profiles.userId] }),
  outputs: many(outputs),
  events: many(userEvents),
}));

export const profiles = pgTable("profiles", {
  userId: uuid("user_id")
    .primaryKey()
    .references(() => users.id, { onDelete: "cascade" }),
  bio: text("bio"),
  customDomain: text("custom_domain").unique(),
  isPublic: boolean("is_public").notNull().default(true),
  theme: text("theme").notNull().default("dark"),
  collabStats: text("collab_stats", { mode: "json" }).$type<{
    reviewsGiven: number;
    reviewsReceived: number;
    forceMultiplierScore: number;
    topCollaborators: string[];
    lastComputedAt: string;
  }>(),
  contributionRhythm: text("contribution_rhythm", { mode: "json" }).$type<{
    mostActiveDay: string;
    streakDays: number;
    avgPRsPerMonth: number;
    label: string; // "Consistent", "Burst", "Infrequent"
    lastComputedAt: string;
  }>(),
  updatedAt: timestamp("updated_at", { withTimezone: true }).notNull().defaultNow(),
});

export const profilesRelations = relations(profiles, ({ one }) => ({
  user: one(users, { fields: [profiles.userId], references: [users.id] }),
}));

export const outputs = pgTable(
  "outputs",
  {
    id: uuid("id").primaryKey().default(sql`gen_random_uuid()`),
    slug: text("slug").notNull().unique(),
    userId: uuid("user_id")
      .notNull()
      .references(() => users.id, { onDelete: "cascade" }),
    prTitle: text("pr_title").notNull(),
    prUrl: text("pr_url"),
    prCommitMessage: text("pr_commit_message"),
    prSignals: text("pr_signals").array(),
    stack: text("stack").array(),
    linkedinPost1: text("linkedin_post_1").notNull(),
    linkedinPost2: text("linkedin_post_2").notNull(),
    linkedinPost3: text("linkedin_post_3").notNull(),
    resumeBullet: text("resume_bullet").notNull(),
    interviewHook: text("interview_hook").notNull(),
    citations: text("citations", { mode: "json" }).$type<
      Array<{ claim: string; ref: string; sha: string; evidenceType: string }>
    >(),
    isPublic: boolean("is_public").notNull().default(false),
    impactScore: integer("impact_score").notNull().default(0),
    category: text("category"),
    complexityLevel: text("complexity_level"),
    createdAt: timestamp("created_at", { withTimezone: true }).notNull().defaultNow(),
  },
  (t) => [
    index("outputs_user_id_idx").on(t.userId),
    index("outputs_created_at_idx").on(t.createdAt),
    index("outputs_public_score_idx").on(t.isPublic, t.impactScore),
    uniqueIndex("outputs_slug_idx").on(t.slug),
  ]
);

export const outputsRelations = relations(outputs, ({ one }) => ({
  user: one(users, { fields: [outputs.userId], references: [users.id] }),
}));

export const repoGraphs = pgTable("repo_graphs", {
  id: uuid("id").primaryKey().default(sql`gen_random_uuid()`),
  owner: text("owner").notNull(),
  repo: text("repo").notNull(),
  graphData: text("graph_data", { mode: "json" }).notNull(),
  computedAt: timestamp("computed_at", { withTimezone: true }).notNull().defaultNow(),
});

export const userEvents = pgTable(
  "user_events",
  {
    id: uuid("id").primaryKey().default(sql`gen_random_uuid()`),
    userId: uuid("user_id").references(() => users.id, { onDelete: "cascade" }),
    eventType: text("event_type").notNull(),
    payload: text("payload", { mode: "json" }),
    createdAt: timestamp("created_at", { withTimezone: true }).notNull().defaultNow(),
  },
  (t) => [
    index("user_events_user_id_idx").on(t.userId),
    index("user_events_type_idx").on(t.eventType),
  ]
);

export const userEventsRelations = relations(userEvents, ({ one }) => ({
  user: one(users, { fields: [userEvents.userId], references: [users.id] }),
}));

export const teams = pgTable("teams", {
  id: uuid("id").primaryKey().default(sql`gen_random_uuid()`),
  slug: text("slug").notNull().unique(),
  name: text("name").notNull(),
  logoUrl: text("logo_url"),
  adminId: uuid("admin_id").references(() => users.id),
  stripeSubscriptionId: text("stripe_subscription_id"),
  plan: text("plan").notNull().default("team_free"), // team_free | team_pro
  createdAt: timestamp("created_at", { withTimezone: true }).notNull().defaultNow(),
  updatedAt: timestamp("updated_at", { withTimezone: true }).notNull().defaultNow(),
});

export const teamMembers = pgTable("team_members", {
  teamId: uuid("team_id")
    .notNull()
    .references(() => teams.id, { onDelete: "cascade" }),
  userId: uuid("user_id")
    .notNull()
    .references(() => users.id, { onDelete: "cascade" }),
  role: text("role").notNull().default("member"), // admin | member
  joinedAt: timestamp("joined_at", { withTimezone: true }).notNull().defaultNow(),
}, (t) => [
  uniqueIndex("team_user_idx").on(t.teamId, t.userId),
]);

export const reputationHistory = pgTable("reputation_history", {
  id: uuid("id").primaryKey().default(sql`gen_random_uuid()`),
  userId: uuid("user_id")
    .notNull()
    .references(() => users.id, { onDelete: "cascade" }),
  velocityScore: integer("velocity_score").notNull(),
  impactScore: integer("impact_score").notNull(),
  trustScore: integer("trust_score").notNull(),
  weekStarting: timestamp("week_starting", { withTimezone: true }).notNull(),
  createdAt: timestamp("created_at", { withTimezone: true }).notNull().defaultNow(),
}, (t) => [
  index("reputation_user_week_idx").on(t.userId, t.weekStarting),
]);

export const subscriptions = pgTable("subscriptions", {
  id: uuid("id").primaryKey().default(sql`gen_random_uuid()`),
  userId: uuid("user_id")
    .references(() => users.id, { onDelete: "cascade" }),
  teamId: uuid("team_id")
    .references(() => teams.id, { onDelete: "cascade" }),
  stripeSubscriptionId: text("stripe_subscription_id").unique().notNull(),
  stripeCustomerId: text("stripe_customer_id").notNull(),
  status: text("status").notNull(), // active | canceled | past_due | trialing
  priceId: text("price_id").notNull(),
  currentPeriodEnd: timestamp("current_period_end", { withTimezone: true }).notNull(),
  cancelAtPeriodEnd: boolean("cancel_at_period_end").notNull().default(false),
  createdAt: timestamp("created_at", { withTimezone: true }).notNull().defaultNow(),
  updatedAt: timestamp("updated_at", { withTimezone: true }).notNull().defaultNow(),
});

