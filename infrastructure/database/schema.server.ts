import {
  pgTable,
  uuid,
  text,
  integer,
  timestamp,
  boolean,
  index,
  uniqueIndex,
  jsonb,
} from "drizzle-orm/pg-core";
import { sql, relations } from "drizzle-orm";

export const users = pgTable("users", {
  id: uuid("id")
    .primaryKey()
    .default(sql`gen_random_uuid()`),
  githubId: text("github_id").unique().notNull(),
  githubLogin: text("github_login").notNull(),
  name: text("name"),
  avatarUrl: text("avatar_url"),
  email: text("email"),
  seniority: text("seniority").notNull().default("mid"), // junior | mid | senior | staff
  tone: text("tone").notNull().default("direct"), // direct | storytelling | technical
  targetAudience: text("target_audience").notNull().default("recruiter"), // recruiter | manager | peer | founder

  externalCustomerId: text("external_customer_id"),
  plan: text("plan").notNull().default("free"), // free | pro
  planExpiresAt: timestamp("plan_expires_at", { withTimezone: true }),
  generationsThisMonth: integer("generations_this_month").notNull().default(0),
  roastCountThisMonth: integer("roast_count_this_month").notNull().default(0), // separate from generations
  // Token budget counters — reset on the same monthly cadence as
  // generationsThisMonth via checkAndResetLimits. Counted as Anthropic
  // billable input + output. Cache reads excluded from the cap since
  // they're priced at ~10% of fresh input.
  tokensInputThisMonth: integer("tokens_input_this_month").notNull().default(0),
  tokensOutputThisMonth: integer("tokens_output_this_month")
    .notNull()
    .default(0),
  monthResetAt: timestamp("month_reset_at", { withTimezone: true })
    .notNull()
    .default(sql`date_trunc('month', now()) + interval '1 month'`),

  referralCode: text("referral_code").unique(),
  referredBy: uuid("referred_by").references((): any => users.id),

  role: text("role").notNull().default("user"), // user | admin

  voiceLearningEnabled: boolean("voice_learning_enabled")
    .notNull()
    .default(true),

  sessionNonce: text("session_nonce")
    .notNull()
    .default(sql`gen_random_uuid()`),

  createdAt: timestamp("created_at", { withTimezone: true })
    .notNull()
    .defaultNow(),
  updatedAt: timestamp("updated_at", { withTimezone: true })
    .notNull()
    .defaultNow(),
});

export const backgroundJobs = pgTable(
  "background_jobs",
  {
    id: uuid("id")
      .primaryKey()
      .default(sql`gen_random_uuid()`),
    userId: uuid("user_id")
      .notNull()
      .references(() => users.id, { onDelete: "cascade" }),
    type: text("type").notNull(),
    status: text("status").notNull().default("PENDING"), // PENDING | PROCESSING | COMPLETED | FAILED | CANCELLED
    payload: jsonb("payload").$type<any>(),
    result: jsonb("result").$type<any>(),
    error: text("error"),
    retryCount: integer("retry_count").default(0),
    maxRetries: integer("max_retries").default(3),
    scheduledFor: timestamp("scheduled_for", { withTimezone: true }),
    createdAt: timestamp("created_at", { withTimezone: true })
      .notNull()
      .defaultNow(),
    updatedAt: timestamp("updated_at", { withTimezone: true })
      .notNull()
      .defaultNow(),
  },
  (t) => [
    index("jobs_user_idx").on(t.userId),
    index("jobs_status_idx").on(t.status),
  ],
);

export const backgroundJobsRelations = relations(backgroundJobs, ({ one }) => ({
  user: one(users, { fields: [backgroundJobs.userId], references: [users.id] }),
}));

export const usersRelations = relations(users, ({ one, many }) => ({
  profile: one(profiles, { fields: [users.id], references: [profiles.userId] }),
  outputs: many(outputs),
  events: many(userEvents),
  postEdits: many(userPostEdits),
}));

export const profiles = pgTable("profiles", {
  userId: uuid("user_id")
    .primaryKey()
    .references(() => users.id, { onDelete: "cascade" }),
  bio: text("bio"),
  customDomain: text("custom_domain").unique(),
  isPublic: boolean("is_public").notNull().default(true),
  theme: text("theme").notNull().default("dark"),
  collabStats: jsonb("collab_stats").$type<{
    reviewsGiven: number;
    reviewsReceived: number;
    forceMultiplierScore: number;
    topCollaborators: string[];
    lastComputedAt: string;
  }>(),
  contributionRhythm: jsonb("contribution_rhythm").$type<{
    mostActiveDay: string;
    streakDays: number;
    avgPRsPerMonth: number;
    label: string; // "Consistent", "Burst", "Infrequent"
    lastComputedAt: string;
  }>(),
  updatedAt: timestamp("updated_at", { withTimezone: true })
    .notNull()
    .defaultNow(),
});

export const profilesRelations = relations(profiles, ({ one }) => ({
  user: one(users, { fields: [profiles.userId], references: [users.id] }),
}));

export const outputs = pgTable(
  "outputs",
  {
    id: uuid("id")
      .primaryKey()
      .default(sql`gen_random_uuid()`),
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
    twitterThread: jsonb("twitter_thread").$type<string[]>(),
    resumeBullet: text("resume_bullet").notNull(),
    interviewHook: text("interview_hook").notNull(),
    citations:
      jsonb("citations").$type<
        Array<{ claim: string; ref: string; sha: string; evidenceType: string }>
      >(),
    isPublic: boolean("is_public").notNull().default(false),
    impactScore: integer("impact_score").notNull().default(0),
    category: text("category"),
    complexityLevel: text("complexity_level"),
    metadata: jsonb("metadata").$type<any>(),
    createdAt: timestamp("created_at", { withTimezone: true })
      .notNull()
      .defaultNow(),
  },
  (t) => [
    index("outputs_user_id_idx").on(t.userId),
    index("outputs_created_at_idx").on(t.createdAt),
    index("outputs_public_score_idx").on(t.isPublic, t.impactScore),
    uniqueIndex("outputs_slug_idx").on(t.slug),
  ],
);

export const outputsRelations = relations(outputs, ({ one, many }) => ({
  user: one(users, { fields: [outputs.userId], references: [users.id] }),
  edits: many(userPostEdits),
}));

export const userPostEdits = pgTable(
  "user_post_edits",
  {
    id: uuid("id")
      .primaryKey()
      .default(sql`gen_random_uuid()`),
    userId: uuid("user_id")
      .notNull()
      .references(() => users.id, { onDelete: "cascade" }),
    outputId: uuid("output_id")
      .notNull()
      .references(() => outputs.id, { onDelete: "cascade" }),
    postKind: text("post_kind").notNull(),
    editedText: text("edited_text").notNull(),
    createdAt: timestamp("created_at", { withTimezone: true })
      .notNull()
      .defaultNow(),
  },
  (t) => [
    index("user_post_edits_user_idx").on(t.userId),
    index("user_post_edits_user_created_idx").on(t.userId, t.createdAt),
  ],
);

export const userPostEditsRelations = relations(userPostEdits, ({ one }) => ({
  user: one(users, { fields: [userPostEdits.userId], references: [users.id] }),
  output: one(outputs, {
    fields: [userPostEdits.outputId],
    references: [outputs.id],
  }),
}));

export const repoGraphs = pgTable(
  "repo_graphs",
  {
    id: uuid("id")
      .primaryKey()
      .default(sql`gen_random_uuid()`),
    owner: text("owner").notNull(),
    repo: text("repo").notNull(),
    graphData: jsonb("graph_data").notNull(),
    computedAt: timestamp("computed_at", { withTimezone: true })
      .notNull()
      .defaultNow(),
  },
  (t) => [
    uniqueIndex("repo_graphs_owner_repo_idx").on(t.owner, t.repo),
    index("repo_graphs_computed_at_idx").on(t.computedAt),
  ],
);

export const userEvents = pgTable(
  "user_events",
  {
    id: uuid("id")
      .primaryKey()
      .default(sql`gen_random_uuid()`),
    userId: uuid("user_id").references(() => users.id, { onDelete: "cascade" }),
    eventType: text("event_type").notNull(),
    payload: jsonb("payload"),
    createdAt: timestamp("created_at", { withTimezone: true })
      .notNull()
      .defaultNow(),
  },
  (t) => [
    index("user_events_user_id_idx").on(t.userId),
    index("user_events_type_idx").on(t.eventType),
  ],
);

export const userEventsRelations = relations(userEvents, ({ one }) => ({
  user: one(users, { fields: [userEvents.userId], references: [users.id] }),
}));

export const teams = pgTable("teams", {
  id: uuid("id")
    .primaryKey()
    .default(sql`gen_random_uuid()`),
  slug: text("slug").notNull().unique(),
  name: text("name").notNull(),
  logoUrl: text("logo_url"),
  adminId: uuid("admin_id").references(() => users.id),
  externalSubscriptionId: text("external_subscription_id"),
  plan: text("plan").notNull().default("team_free"), // team_free | team_pro
  createdAt: timestamp("created_at", { withTimezone: true })
    .notNull()
    .defaultNow(),
  updatedAt: timestamp("updated_at", { withTimezone: true })
    .notNull()
    .defaultNow(),
});

export const teamMembers = pgTable(
  "team_members",
  {
    teamId: uuid("team_id")
      .notNull()
      .references(() => teams.id, { onDelete: "cascade" }),
    userId: uuid("user_id")
      .notNull()
      .references(() => users.id, { onDelete: "cascade" }),
    role: text("role").notNull().default("member"), // admin | member
    joinedAt: timestamp("joined_at", { withTimezone: true })
      .notNull()
      .defaultNow(),
  },
  (t) => [uniqueIndex("team_user_idx").on(t.teamId, t.userId)],
);

export const reputationHistory = pgTable(
  "reputation_history",
  {
    id: uuid("id")
      .primaryKey()
      .default(sql`gen_random_uuid()`),
    userId: uuid("user_id")
      .notNull()
      .references(() => users.id, { onDelete: "cascade" }),
    velocityScore: integer("velocity_score").notNull(),
    impactScore: integer("impact_score").notNull(),
    trustScore: integer("trust_score").notNull(),
    weekStarting: timestamp("week_starting", { withTimezone: true }).notNull(),
    createdAt: timestamp("created_at", { withTimezone: true })
      .notNull()
      .defaultNow(),
  },
  (t) => [index("reputation_user_week_idx").on(t.userId, t.weekStarting)],
);

export const subscriptions = pgTable("subscriptions", {
  id: uuid("id")
    .primaryKey()
    .default(sql`gen_random_uuid()`),
  userId: uuid("user_id").references(() => users.id, { onDelete: "cascade" }),
  teamId: uuid("team_id").references(() => teams.id, { onDelete: "cascade" }),
  externalSubscriptionId: text("external_subscription_id").unique().notNull(),
  externalCustomerId: text("external_customer_id").notNull(),
  status: text("status").notNull(), // active | canceled | past_due | trialing
  priceId: text("price_id").notNull(),
  currentPeriodEnd: timestamp("current_period_end", {
    withTimezone: true,
  }).notNull(),
  cancelAtPeriodEnd: boolean("cancel_at_period_end").notNull().default(false),
  createdAt: timestamp("created_at", { withTimezone: true })
    .notNull()
    .defaultNow(),
  updatedAt: timestamp("updated_at", { withTimezone: true })
    .notNull()
    .defaultNow(),
});

export const roasts = pgTable(
  "roasts",
  {
    id: uuid("id")
      .primaryKey()
      .default(sql`gen_random_uuid()`),
    userId: uuid("user_id").references(() => users.id),
    githubUsername: text("github_username").notNull(),
    roastData: jsonb("roast_data")
      .$type<{
        roast: string;
        criticality: "LOW" | "MEDIUM" | "HIGH" | "NUCLEAR";
        card_title: string;
        roast_score: number;
        technician_score: number;
        share_summary: string;
      }>()
      .notNull(),
    isPublic: boolean("is_public").notNull().default(true),
    createdAt: timestamp("created_at", { withTimezone: true })
      .notNull()
      .defaultNow(),
  },
  (t) => [
    index("roasts_username_idx").on(t.githubUsername),
    index("roasts_public_idx").on(t.isPublic),
  ],
);

export const trackedRepos = pgTable(
  "tracked_repos",
  {
    id: uuid("id")
      .primaryKey()
      .default(sql`gen_random_uuid()`),
    userId: uuid("user_id")
      .notNull()
      .references(() => users.id, { onDelete: "cascade" }),
    owner: text("owner").notNull(),
    repo: text("repo").notNull(),
    webhookSecret: text("webhook_secret").notNull(),
    autoPublish: boolean("auto_publish").notNull().default(false),
    createdAt: timestamp("created_at", { withTimezone: true })
      .notNull()
      .defaultNow(),
  },
  (t) => [
    uniqueIndex("tracked_repos_user_owner_repo_idx").on(
      t.userId,
      t.owner,
      t.repo,
    ),
    index("tracked_repos_owner_repo_idx").on(t.owner, t.repo),
  ],
);

export const trackedReposRelations = relations(trackedRepos, ({ one }) => ({
  user: one(users, { fields: [trackedRepos.userId], references: [users.id] }),
}));

export const webhookDeliveries = pgTable("webhook_deliveries", {
  // X-GitHub-Delivery UUID — used as idempotency key against retries.
  id: text("id").primaryKey(),
  receivedAt: timestamp("received_at", { withTimezone: true })
    .notNull()
    .defaultNow(),
  status: text("status").notNull(), // accepted | duplicate | invalid_sig | filtered | enqueued
});

export const digests = pgTable(
  "digests",
  {
    id: uuid("id")
      .primaryKey()
      .default(sql`gen_random_uuid()`),
    userId: uuid("user_id")
      .notNull()
      .references(() => users.id, { onDelete: "cascade" }),
    kind: text("kind").notNull(), // weekly | release_notes
    periodStart: timestamp("period_start", { withTimezone: true }).notNull(),
    periodEnd: timestamp("period_end", { withTimezone: true }).notNull(),
    postOptions: jsonb("post_options").$type<string[]>().notNull(),
    memoryContext: text("memory_context"),
    invisibleWorkUsed: text("invisible_work_used").array(),
    twitterThread: jsonb("twitter_thread").$type<string[]>().notNull(),
    releaseNotes: text("release_notes").notNull(),
    // Postgres uuid[] — stored as a native array so we can join later without
    // an extra junction table for the small N (~dozens) per digest.
    includedOutputIds: uuid("included_output_ids").array().notNull(),
    createdAt: timestamp("created_at", { withTimezone: true })
      .notNull()
      .defaultNow(),
  },
  (t) => [
    index("digests_user_id_idx").on(t.userId),
    index("digests_created_at_idx").on(t.createdAt),
  ],
);

export const digestsRelations = relations(digests, ({ one }) => ({
  user: one(users, { fields: [digests.userId], references: [users.id] }),
}));

export const scheduledPosts = pgTable(
  "scheduled_posts",
  {
    id: uuid("id")
      .primaryKey()
      .default(sql`gen_random_uuid()`),
    userId: uuid("user_id")
      .notNull()
      .references(() => users.id, { onDelete: "cascade" }),
    outputId: uuid("output_id")
      .notNull()
      .references(() => outputs.id, { onDelete: "cascade" }),
    channel: text("channel").notNull(), // linkedin | twitter
    postKind: text("post_kind").notNull(), // linkedinPost1 | linkedinPost2 | linkedinPost3 | twitterThread
    scheduledFor: timestamp("scheduled_for", { withTimezone: true }).notNull(),
    status: text("status").notNull().default("SCHEDULED"), // SCHEDULED | READY | CANCELLED | FAILED
    jobId: uuid("job_id").references(() => backgroundJobs.id),
    readyAt: timestamp("ready_at", { withTimezone: true }),
    shareUrl: text("share_url"),
    createdAt: timestamp("created_at", { withTimezone: true })
      .notNull()
      .defaultNow(),
  },
  (t) => [
    index("scheduled_posts_user_idx").on(t.userId),
    index("scheduled_posts_status_idx").on(t.status, t.scheduledFor),
  ],
);

export const scheduledPostsRelations = relations(scheduledPosts, ({ one }) => ({
  user: one(users, { fields: [scheduledPosts.userId], references: [users.id] }),
  output: one(outputs, {
    fields: [scheduledPosts.outputId],
    references: [outputs.id],
  }),
  job: one(backgroundJobs, {
    fields: [scheduledPosts.jobId],
    references: [backgroundJobs.id],
  }),
}));

export const apiKeys = pgTable("api_keys", {
  id: uuid("id").primaryKey().default(sql`gen_random_uuid()`),
  userId: uuid("user_id").notNull().references(() => users.id, { onDelete: "cascade" }),
  keyHash: text("key_hash").notNull().unique(),
  name: text("name").notNull(),
  lastUsedAt: timestamp("last_used_at", { withTimezone: true }),
  createdAt: timestamp("created_at", { withTimezone: true }).notNull().defaultNow(),
});

export const apiKeysRelations = relations(apiKeys, ({ one }) => ({
  user: one(users, { fields: [apiKeys.userId], references: [users.id] }),
}));

export const slackWorkspaces = pgTable("slack_workspaces", {
  id: uuid("id").primaryKey().default(sql`gen_random_uuid()`),
  userId: uuid("user_id").notNull().references(() => users.id, { onDelete: "cascade" }),
  teamId: text("team_id").notNull(),
  botToken: text("bot_token").notNull(),
  webhookUrl: text("webhook_url"),
  connectedAt: timestamp("connected_at", { withTimezone: true }).notNull().defaultNow(),
});

export const slackWorkspacesRelations = relations(slackWorkspaces, ({ one }) => ({
  user: one(users, { fields: [slackWorkspaces.userId], references: [users.id] }),
}));

export const leaderboardEntries = pgTable("leaderboard_entries", {
  id: uuid("id").primaryKey().default(sql`gen_random_uuid()`),
  userId: uuid("user_id").notNull().references(() => users.id, { onDelete: "cascade" }),
  egoScore: integer("ego_score").notNull().default(0),
  rank: integer("rank"),
  category: text("category"),
  badges: text("badges").array(),
  computedAt: timestamp("computed_at", { withTimezone: true }).notNull().defaultNow(),
}, (t) => [
  index("leaderboard_ego_score_idx").on(t.egoScore)
]);

export const badges = pgTable("badges", {
  id: uuid("id").primaryKey().default(sql`gen_random_uuid()`),
  userId: uuid("user_id").notNull().references(() => users.id, { onDelete: "cascade" }),
  badgeType: text("badge_type").notNull(),
  earnedAt: timestamp("earned_at", { withTimezone: true }).notNull().defaultNow(),
});
