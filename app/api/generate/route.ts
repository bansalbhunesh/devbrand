import { NextRequest, NextResponse } from 'next/server'
import { fetchUserPRs, detectStack } from '@/lib/github'
import { generateBatch, UserProfile } from '@/lib/claude'
import { getServerSession } from 'next-auth'
import { authOptions } from '@/lib/auth'
import { canGenerate, incrementGenerations, saveOutputs } from '@/lib/db'
import { rateLimit } from '@/lib/rate-limit'

export async function POST(req: NextRequest) {
  try {
    const session = await getServerSession(authOptions)
    if (!session?.accessToken || !session?.user?.githubId) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
    }

    const githubId = session.user.githubId

    // Rate limit: 5 requests per minute per user
    const rl = rateLimit(`generate:${githubId}`, { maxRequests: 5, windowMs: 60_000 })
    if (!rl.allowed) {
      return NextResponse.json(
        { error: 'Too many requests. Please wait a moment.' },
        { status: 429, headers: { 'Retry-After': String(Math.ceil((rl.resetAt - Date.now()) / 1000)) } }
      )
    }

    const { allowed, reason, user } = await canGenerate(githubId)
    if (!user) return NextResponse.json({ error: 'User not found' }, { status: 404 })
    if (!allowed) return NextResponse.json({ error: reason, upgrade: true }, { status: 402 })

    const body = await req.json()
    const profile: UserProfile = {
      seniority: body.seniority ?? user.seniority,
      tone: body.tone ?? user.tone,
      name: user.name ?? '',
    }

    const since = new Date()
    since.setDate(since.getDate() - (body.days ?? 30))

    const prs = await fetchUserPRs(session.accessToken, since)
    if (prs.length === 0) {
      return NextResponse.json({ results: [], message: 'No significant PRs found in the last 30 days.' })
    }

    const topPR = prs[0]
    const urlParts = topPR.html_url.replace('https://github.com/', '').split('/')
    const owner = urlParts[0]
    const repo = urlParts[1]
    const stack = await detectStack(session.accessToken, owner, repo)

    const results = await generateBatch(prs, stack, profile, 3)

    const toSave = results.filter(r => !r.error).map(r => ({
      pr_title: r.pr.title,
      pr_url: r.pr.html_url,
      pr_signals: r.pr.signals,
      repo_name: r.pr.head?.repo?.name ?? '',
      stack,
      linkedin_post_1: r.output.linkedin_posts[0],
      linkedin_post_2: r.output.linkedin_posts[1],
      linkedin_post_3: r.output.linkedin_posts[2],
      resume_bullet: r.output.resume_bullet,
      interview_hook: r.output.interview_hook,
    }))

    if (toSave.length > 0) {
      await saveOutputs(user.id, toSave)
      await incrementGenerations(githubId)
    }

    return NextResponse.json({
      results,
      prs_scanned: `${prs.length} PRs evaluated`,
      plan: user.plan,
      generations_used: user.generations_this_month + 1,
    })
  } catch (err) {
    console.error('[generate]', err)
    return NextResponse.json(
      { error: err instanceof Error ? err.message : 'Internal server error' },
      { status: 500 }
    )
  }
}
