CREATE TABLE "leaderboard_entries" (
  "id" uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  "user_id" uuid NOT NULL REFERENCES "users"("id") ON DELETE CASCADE,
  "ego_score" integer NOT NULL DEFAULT 0,
  "rank" integer,
  "category" text,
  "badges" text[],
  "computed_at" timestamp with time zone NOT NULL DEFAULT now()
);

CREATE INDEX "leaderboard_ego_score_idx" ON "leaderboard_entries"("ego_score");

CREATE TABLE "badges" (
  "id" uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  "user_id" uuid NOT NULL REFERENCES "users"("id") ON DELETE CASCADE,
  "badge_type" text NOT NULL,
  "earned_at" timestamp with time zone NOT NULL DEFAULT now()
);
