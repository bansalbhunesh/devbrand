CREATE TABLE "slack_workspaces" (
  "id" uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  "user_id" uuid NOT NULL REFERENCES "users"("id") ON DELETE CASCADE,
  "team_id" text NOT NULL,
  "bot_token" text NOT NULL,
  "webhook_url" text,
  "connected_at" timestamp with time zone NOT NULL DEFAULT now()
);

CREATE INDEX "slack_workspaces_user_idx" ON "slack_workspaces"("user_id");
