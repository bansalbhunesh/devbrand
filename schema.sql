-- Run on Neon / Supabase / any Postgres

CREATE TABLE users (
  id            UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  github_id     TEXT UNIQUE NOT NULL,
  github_login  TEXT NOT NULL,
  name          TEXT,
  avatar_url    TEXT,
  email         TEXT,
  seniority     TEXT NOT NULL DEFAULT 'mid',   -- junior | mid | senior
  tone          TEXT NOT NULL DEFAULT 'direct', -- direct | storytelling | technical
  stripe_customer_id TEXT,
  plan          TEXT NOT NULL DEFAULT 'free',   -- free | pro
  plan_expires_at TIMESTAMPTZ,
  generations_this_month INT NOT NULL DEFAULT 0,
  month_reset_at TIMESTAMPTZ NOT NULL DEFAULT date_trunc('month', now()) + interval '1 month',
  created_at    TIMESTAMPTZ NOT NULL DEFAULT now(),
  updated_at    TIMESTAMPTZ NOT NULL DEFAULT now()
);

CREATE TABLE outputs (
  id              UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id         UUID NOT NULL REFERENCES users(id) ON DELETE CASCADE,
  pr_title        TEXT NOT NULL,
  pr_url          TEXT,
  pr_signals      TEXT[],                  -- e.g. ["large change", "has description"]
  repo_name       TEXT,
  stack           TEXT[],                  -- e.g. ["Go", "Kafka", "Docker"]
  linkedin_post_1 TEXT NOT NULL,
  linkedin_post_2 TEXT NOT NULL,
  linkedin_post_3 TEXT NOT NULL,
  resume_bullet   TEXT NOT NULL,
  interview_hook  TEXT NOT NULL,
  created_at      TIMESTAMPTZ NOT NULL DEFAULT now()
);

CREATE INDEX outputs_user_id_idx ON outputs(user_id);
CREATE INDEX outputs_created_at_idx ON outputs(created_at DESC);

-- Reset monthly generation count — run via cron or Postgres pg_cron
-- UPDATE users SET generations_this_month = 0, month_reset_at = date_trunc('month', now()) + interval '1 month'
-- WHERE month_reset_at <= now();

-- Generation limits
-- free: 3 per month
-- pro:  unlimited
