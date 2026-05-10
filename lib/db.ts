import { Pool } from 'pg'

export const pool = new Pool({
  connectionString: process.env.DATABASE_URL,
  ssl: { rejectUnauthorized: false },
  max: 5,
})

export interface User {
  id: string
  github_id: string
  github_login: string
  name: string | null
  avatar_url: string | null
  seniority: 'junior' | 'mid' | 'senior'
  tone: 'direct' | 'storytelling' | 'technical'
  plan: 'free' | 'pro'
  plan_expires_at: string | null
  generations_this_month: number
  month_reset_at: string
  stripe_customer_id: string | null
}

export async function upsertUser(profile: {
  github_id: string
  github_login: string
  name?: string | null
  avatar_url?: string | null
  email?: string | null
}): Promise<User> {
  const { rows } = await pool.query<User>(`
    INSERT INTO users (github_id, github_login, name, avatar_url, email)
    VALUES ($1, $2, $3, $4, $5)
    ON CONFLICT (github_id) DO UPDATE SET
      github_login = EXCLUDED.github_login,
      name = COALESCE(EXCLUDED.name, users.name),
      avatar_url = COALESCE(EXCLUDED.avatar_url, users.avatar_url),
      updated_at = now()
    RETURNING *
  `, [profile.github_id, profile.github_login, profile.name, profile.avatar_url, profile.email])
  
  const user = rows[0]
  
  // Ensure profile exists
  if (user) {
    await pool.query(`
      INSERT INTO profiles (user_id) VALUES ($1) ON CONFLICT DO NOTHING
    `, [user.id])
  }
  
  return user
}

export async function getUser(githubId: string): Promise<User | null> {
  const { rows } = await pool.query<User>('SELECT * FROM users WHERE github_id = $1', [githubId])
  return rows[0] ?? null
}

export async function updateUserPrefs(githubId: string, prefs: { seniority?: string; tone?: string }) {
  await pool.query(`
    UPDATE users SET
      seniority = COALESCE($2, seniority),
      tone = COALESCE($3, tone),
      updated_at = now()
    WHERE github_id = $1
  `, [githubId, prefs.seniority, prefs.tone])
}

export async function canGenerate(githubId: string): Promise<{ allowed: boolean; reason?: string; user?: User }> {
  const user = await getUser(githubId)
  if (!user) return { allowed: false, reason: 'User not found' }

  // Check if plan has expired
  if (user.plan === 'pro' && user.plan_expires_at) {
    const expires = new Date(user.plan_expires_at)
    if (expires <= new Date()) {
      // Plan expired — downgrade to free
      await pool.query(`
        UPDATE users SET plan = 'free', plan_expires_at = null, updated_at = now()
        WHERE github_id = $1
      `, [githubId])
      user.plan = 'free'
    }
  }

  if (user.plan === 'pro') return { allowed: true, user }

  // Auto-reset monthly counter if month has rolled over
  const resetAt = new Date(user.month_reset_at)
  if (resetAt <= new Date()) {
    await pool.query(`
      UPDATE users SET
        generations_this_month = 0,
        month_reset_at = date_trunc('month', now()) + interval '1 month',
        updated_at = now()
      WHERE github_id = $1
    `, [githubId])
    user.generations_this_month = 0
  }

  if (user.generations_this_month >= 3) {
    return { allowed: false, reason: 'Free plan limit reached (3/month). Upgrade to Pro for unlimited.', user }
  }

  return { allowed: true, user }
}

export async function incrementGenerations(githubId: string) {
  await pool.query(`
    UPDATE users SET
      generations_this_month = generations_this_month + 1,
      updated_at = now()
    WHERE github_id = $1
  `, [githubId])
}

export async function saveOutputs(userId: string, outputs: {
  pr_title: string; pr_url: string; pr_signals: string[]; repo_name: string; stack: string[]
  linkedin_post_1: string; linkedin_post_2: string; linkedin_post_3: string
  resume_bullet: string; interview_hook: string
  impact_score?: number; category?: string; complexity_level?: string
}[]) {
  for (const o of outputs) {
    await pool.query(`
      INSERT INTO outputs (
        user_id, pr_title, pr_url, pr_signals, repo_name, stack,
        linkedin_post_1, linkedin_post_2, linkedin_post_3,
        resume_bullet, interview_hook,
        impact_score, category, complexity_level
      ) VALUES ($1,$2,$3,$4,$5,$6,$7,$8,$9,$10,$11,$12,$13,$14)
    `, [
      userId, o.pr_title, o.pr_url, o.pr_signals, o.repo_name, o.stack,
      o.linkedin_post_1, o.linkedin_post_2, o.linkedin_post_3,
      o.resume_bullet, o.interview_hook,
      o.impact_score ?? 0, o.category ?? null, o.complexity_level ?? null
    ])
  }
}

export async function getOutputHistory(userId: string, limit = 20) {
  const { rows } = await pool.query(`
    SELECT * FROM outputs WHERE user_id = $1 ORDER BY created_at DESC LIMIT $2
  `, [userId, limit])
  return rows
}

export async function resetAllMonthlyGenerations() {
  await pool.query(`
    UPDATE users SET
      generations_this_month = 0,
      month_reset_at = date_trunc('month', now()) + interval '1 month',
      updated_at = now()
    WHERE month_reset_at <= now()
  `)
}

export async function getPublicProfile(githubLogin: string) {
  const { rows } = await pool.query(`
    SELECT
      u.id as user_id, u.name, u.github_login, u.avatar_url, u.seniority,
      p.bio, p.theme,
      (
        SELECT json_agg(row_to_json(o))
        FROM (
          SELECT * FROM outputs
          WHERE user_id = u.id AND is_public = true
          ORDER BY impact_score DESC, created_at DESC
        ) o
      ) as public_outputs,
      (
        SELECT COALESCE(SUM(impact_score), 0) FROM outputs WHERE user_id = u.id AND is_public = true
      ) as total_impact_score
    FROM users u
    JOIN profiles p ON u.id = p.user_id
    WHERE u.github_login = $1 AND p.is_public = true
  `, [githubLogin])
  return rows[0] ?? null
}

export async function toggleOutputVisibility(outputId: string, userId: string, isPublic: boolean) {
  await pool.query(`
    UPDATE outputs SET is_public = $3 WHERE id = $1 AND user_id = $2
  `, [outputId, userId, isPublic])
}
