export interface PR {
  id: number
  title: string
  body: string | null
  merged_at: string | null
  additions: number
  deletions: number
  changed_files: number
  html_url: string
  head: { repo: { name: string; description: string | null; language: string | null; stargazers_count: number; private: boolean } }
}

export interface ScoredPR extends PR {
  score: number
  signals: string[]
}

const SKIP_PATTERNS = [
  /^fix\s?typo/i, /^update readme/i, /^bump version/i,
  /^merge (branch|pull)/i, /^wip/i, /^chore/i,
]

const SKIP_FILE_ONLY = [
  'package-lock.json', 'yarn.lock', 'pnpm-lock.yaml',
  '.gitignore', 'CHANGELOG.md',
]

export function scorePR(pr: PR): ScoredPR {
  const signals: string[] = []
  let score = 0

  const title = pr.title.toLowerCase()
  if (SKIP_PATTERNS.some(p => p.test(title))) return { ...pr, score: -1, signals: ['skipped: noise commit'] }
  if (!pr.merged_at) return { ...pr, score: -1, signals: ['skipped: not merged'] }
  if (pr.head?.repo?.private && !pr.body) return { ...pr, score: -1, signals: ['skipped: private + no description'] }

  if (pr.additions > 500) { score += 3; signals.push('large change (500+ lines)') }
  else if (pr.additions > 100) { score += 2; signals.push('substantial change (100+ lines)') }
  else if (pr.additions > 30) { score += 1; signals.push('moderate change') }
  else return { ...pr, score: -1, signals: ['skipped: too small'] }

  if (pr.body && pr.body.trim().length > 50) { score += 2; signals.push('has PR description') }
  if (pr.changed_files > 5) { score += 1; signals.push(`touches ${pr.changed_files} files`) }
  if (pr.head?.repo?.stargazers_count > 10) { score += 1; signals.push('repo has stars') }

  return { ...pr, score, signals }
}

export async function fetchUserPRs(accessToken: string, since: Date): Promise<ScoredPR[]> {
  const headers = {
    Authorization: `Bearer ${accessToken}`,
    Accept: 'application/vnd.github+json',
    'X-GitHub-Api-Version': '2022-11-28',
  }

  const sinceISO = since.toISOString()
  const searchUrl = `https://api.github.com/search/issues?q=type:pr+author:@me+merged:>${sinceISO}&per_page=30&sort=updated`

  const searchRes = await fetch(searchUrl, { headers })
  if (!searchRes.ok) throw new Error(`GitHub search failed: ${searchRes.status}`)
  const { items } = await searchRes.json()

  const detailed: ScoredPR[] = []
  for (const item of items.slice(0, 15)) {
    const prUrlMatch = item.pull_request?.url
    if (!prUrlMatch) continue
    const prRes = await fetch(prUrlMatch, { headers })
    if (!prRes.ok) continue
    const pr: PR = await prRes.json()
    const scored = scorePR(pr)
    if (scored.score > 0) detailed.push(scored)
  }

  return detailed.sort((a, b) => b.score - a.score)
}

export async function detectStack(accessToken: string, owner: string, repo: string): Promise<string[]> {
  const headers = { Authorization: `Bearer ${accessToken}`, Accept: 'application/vnd.github+json' }
  const stack: string[] = []

  const files = ['go.mod', 'package.json', 'requirements.txt', 'Cargo.toml', 'pom.xml', 'build.gradle']
  for (const file of files) {
    const res = await fetch(`https://api.github.com/repos/${owner}/${repo}/contents/${file}`, { headers })
    if (!res.ok) continue
    const { content } = await res.json()
    const decoded = atob(content.replace(/\n/g, ''))

    if (file === 'go.mod') {
      const deps = decoded.match(/^\s+([a-z][^\s]+)/gm)?.map(d => d.trim().split('/').pop()?.split(' ')[0]) ?? []
      stack.push('Go', ...deps.slice(0, 5).filter(Boolean) as string[])
    }
    if (file === 'package.json') {
      try {
        const pkg = JSON.parse(decoded)
        const deps = Object.keys({ ...pkg.dependencies, ...pkg.devDependencies }).slice(0, 8)
        stack.push('Node.js', ...deps)
      } catch {}
    }
    if (file === 'requirements.txt') {
      const deps = decoded.split('\n').map((l: string) => l.split('==')[0].trim()).filter(Boolean).slice(0, 6)
      stack.push('Python', ...deps)
    }
    break
  }

  return [...new Set(stack)].filter(s => s.length > 1)
}
