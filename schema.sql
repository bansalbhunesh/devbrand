-- Users table
CREATE TABLE IF NOT EXISTS users (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  github_id TEXT UNIQUE NOT NULL,
  github_login TEXT NOT NULL,
  name TEXT,
  avatar_url TEXT,
  email TEXT,
  seniority TEXT NOT NULL DEFAULT 'mid',
  tone TEXT NOT NULL DEFAULT 'direct',
  target_audience TEXT NOT NULL DEFAULT 'recruiter',
  stripe_customer_id TEXT,
  plan TEXT NOT NULL DEFAULT 'free',
  plan_expires_at TIMESTAMPTZ,
  generations_this_month INTEGER NOT NULL DEFAULT 0,
  roast_count_this_month INTEGER NOT NULL DEFAULT 0,
  month_reset_at TIMESTAMPTZ NOT NULL DEFAULT (date_trunc('month', now()) + interval '1 month'),
  created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT now()
);

-- Profiles table
CREATE TABLE IF NOT EXISTS profiles (
  user_id UUID PRIMARY KEY REFERENCES users(id) ON DELETE CASCADE,
  bio TEXT,
  custom_domain TEXT UNIQUE,
  is_public BOOLEAN NOT NULL DEFAULT true,
  theme TEXT NOT NULL DEFAULT 'dark',
  collab_stats JSONB,
  contribution_rhythm JSONB,
  updated_at TIMESTAMPTZ NOT NULL DEFAULT now()
);

-- Outputs table
CREATE TABLE IF NOT EXISTS outputs (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  slug TEXT NOT NULL UNIQUE,
  user_id UUID NOT NULL REFERENCES users(id) ON DELETE CASCADE,
  pr_title TEXT NOT NULL,
  pr_url TEXT,
  pr_commit_message TEXT,
  pr_signals TEXT[],
  stack TEXT[],
  linkedin_post_1 TEXT NOT NULL,
  linkedin_post_2 TEXT NOT NULL,
  linkedin_post_3 TEXT NOT NULL,
  resume_bullet TEXT NOT NULL,
  interview_hook TEXT NOT NULL,
  citations JSONB,
  is_public BOOLEAN NOT NULL DEFAULT false,
  impact_score INTEGER NOT NULL DEFAULT 0,
  category TEXT,
  complexity_level TEXT,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now()
);

CREATE INDEX IF NOT EXISTS outputs_user_id_idx ON outputs(user_id);
CREATE INDEX IF NOT EXISTS outputs_created_at_idx ON outputs(created_at);
CREATE INDEX IF NOT EXISTS outputs_public_score_idx ON outputs(is_public, impact_score);
CREATE UNIQUE INDEX IF NOT EXISTS outputs_slug_idx ON outputs(slug);

-- Repo Graphs table
CREATE TABLE IF NOT EXISTS repo_graphs (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  owner TEXT NOT NULL,
  repo TEXT NOT NULL,
  graph_data JSONB NOT NULL,
  computed_at TIMESTAMPTZ NOT NULL DEFAULT now()
);
CREATE UNIQUE INDEX IF NOT EXISTS repo_graphs_owner_repo_idx ON repo_graphs(owner, repo);

-- User Events table
CREATE TABLE IF NOT EXISTS user_events (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id UUID REFERENCES users(id) ON DELETE CASCADE,
  event_type TEXT NOT NULL,
  payload JSONB,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now()
);

CREATE INDEX IF NOT EXISTS user_events_user_id_idx ON user_events(user_id);
CREATE INDEX IF NOT EXISTS user_events_type_idx ON user_events(event_type);

-- Subscriptions table
CREATE TABLE IF NOT EXISTS subscriptions (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id UUID NOT NULL REFERENCES users(id) ON DELETE CASCADE,
  stripe_subscription_id TEXT UNIQUE NOT NULL,
  stripe_customer_id TEXT NOT NULL,
  status TEXT NOT NULL,
  price_id TEXT NOT NULL,
  current_period_end TIMESTAMPTZ NOT NULL,
  cancel_at_period_end BOOLEAN NOT NULL DEFAULT false,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT now()
);
