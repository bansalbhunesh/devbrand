import { Pool } from 'pg'

const pool = new Pool({ connectionString: process.env.DATABASE_URL, ssl: { rejectUnauthorized: false } })

export interface User {
  id: string
  github_id: string
  github_login: string
  name: string | null
  avatar_url: string | null
  seniority: 'junior' | 'mid' | 'senior'
  tone: 'direct' | 'storytelling' | 'technical'
  plan: 'free' | 'pro'
  generations_this_month: number
}

export async function upsertUser(profile: {
  github_id: string
  github_login: string
  name?: string
  avatar_url?: string
  email?: string
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
  return rows[0]
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

export async function canGenerate(githubId: string): Promise<{ allowed: boolean; reason?: string }> {
  const user = await getUser(githubId)
  if (!user) return { allowed: false, reason: 'User not found' }
  if (user.plan === 'pro') return { allowed: true }
  if (user.generations_this_month >= 3) return { allowed: false, reason: 'Free plan limit reached (3/month). Upgrade to Pro.' }
  return { allowed: true }
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
}[]) {
  for (const o of outputs) {
    await pool.query(`
      INSERT INTO outputs (
        user_id, pr_title, pr_url, pr_signals, repo_name, stack,
        linkedin_post_1, linkedin_post_2, linkedin_post_3,
        resume_bullet, interview_hook
      ) VALUES ($1,$2,$3,$4,$5,$6,$7,$8,$9,$10,$11)
    `, [
      userId, o.pr_title, o.pr_url, o.pr_signals, o.repo_name, o.stack,
      o.linkedin_post_1, o.linkedin_post_2, o.linkedin_post_3,
      o.resume_bullet, o.interview_hook
    ])
  }
}

export async function getOutputHistory(userId: string, limit = 20) {
  const { rows } = await pool.query(`
    SELECT * FROM outputs WHERE user_id = $1 ORDER BY created_at DESC LIMIT $2
  `, [userId, limit])
  return rows
}
