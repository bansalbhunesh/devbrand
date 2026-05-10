import { ScoredPR } from './github'

export interface UserProfile {
  seniority: 'junior' | 'mid' | 'senior'
  tone: 'direct' | 'storytelling' | 'technical'
  name: string
}

export interface GeneratedOutput {
  linkedin_posts: [string, string, string]
  resume_bullet: string
  interview_hook: string
}

export interface GenerateResult {
  pr: ScoredPR
  output: GeneratedOutput
  error?: string
}

const SYSTEM_PROMPT = `You are a writing assistant for software engineers.
Your job is to help developers communicate their work clearly and honestly — not to hype it.

VOICE RULES (non-negotiable):
- Write like a developer explaining work to another developer over coffee. Conversational, direct, real.
- No "excited to share", "thrilled to announce", "incredible journey", or any LinkedIn bro phrases.
- No emoji anywhere.
- No motivational language. No "hustle", "grind", "passion", "dream".
- Quantify impact where the data supports it. Don't invent metrics.
- If impact is unknown, describe the problem solved instead.
- Developer seniority affects tone:
    junior → focus on what you learned
    mid    → focus on problem + solution
    senior → focus on tradeoffs + decisions made

OUTPUT FORMAT:
Return valid JSON only. No markdown. No preamble. No trailing text.
{
  "linkedin_posts": [string, string, string],
  "resume_bullet": string,
  "interview_hook": string
}

linkedin_posts rules:
  - Post 1: the problem you solved (140-160 words)
  - Post 2: the technical decision or tradeoff made (130-150 words)
  - Post 3: what you'd do differently or learned (120-140 words)
  Each post must end naturally, not with a question or CTA.

resume_bullet: STAR format, strong action verb first, quantify where data exists. Max 2 lines.
interview_hook: One sentence that opens a story. E.g. "Tell me about a time you improved system reliability."`.trim()

function buildUserMessage(pr: ScoredPR, stack: string[], profile: UserProfile): string {
  const repoName = pr.head?.repo?.name ?? 'unknown repo'
  const repoDesc = pr.head?.repo?.description ?? ''
  const language = pr.head?.repo?.language ?? ''
  const isPersonal = !pr.head?.repo?.private
  const stackStr = [...new Set([language, ...stack])].filter(Boolean).join(', ')

  return `Here is the work to write about:

PR title: "${pr.title}"
PR description: "${pr.body?.slice(0, 600) ?? 'No description provided'}"
Repo: ${repoName}${repoDesc ? ` — ${repoDesc}` : ''}
Stack: ${stackStr || 'unknown'}
Scale: ${pr.additions} lines added, ${pr.deletions} removed, ${pr.changed_files} files changed
Seniority: ${profile.seniority}
Tone preference: ${profile.tone}
Work type: ${isPersonal ? 'personal/open-source project' : 'professional project'}

Generate the JSON output now.`
}

export async function generateForPR(
  pr: ScoredPR,
  stack: string[],
  profile: UserProfile
): Promise<GenerateResult> {
  try {
    const response = await fetch('https://api.anthropic.com/v1/messages', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        model: 'claude-sonnet-4-20250514',
        max_tokens: 1500,
        system: SYSTEM_PROMPT,
        messages: [{ role: 'user', content: buildUserMessage(pr, stack, profile) }],
      }),
    })

    if (!response.ok) {
      const err = await response.text()
      throw new Error(`Claude API error ${response.status}: ${err}`)
    }

    const data = await response.json()
    const rawText = data.content?.find((b: { type: string }) => b.type === 'text')?.text ?? ''

    const cleaned = rawText.replace(/```json|```/g, '').trim()
    const parsed: GeneratedOutput = JSON.parse(cleaned)

    if (!Array.isArray(parsed.linkedin_posts) || parsed.linkedin_posts.length !== 3) {
      throw new Error('Malformed output: linkedin_posts must be array of 3')
    }

    return { pr, output: parsed }
  } catch (err) {
    return {
      pr,
      output: { linkedin_posts: ['', '', ''], resume_bullet: '', interview_hook: '' },
      error: err instanceof Error ? err.message : 'Unknown error',
    }
  }
}

export async function generateBatch(
  prs: ScoredPR[],
  stack: string[],
  profile: UserProfile,
  limit = 3
): Promise<GenerateResult[]> {
  const top = prs.slice(0, limit)
  return Promise.all(top.map(pr => generateForPR(pr, stack, profile)))
}
