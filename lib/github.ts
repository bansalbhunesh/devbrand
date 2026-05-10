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

// Fetch a single PR with concurrency control
async function fetchSinglePR(url: string, headers: Record<string, string>): Promise<ScoredPR | null> {
  try {
    const res = await fetch(url, { headers })
    if (!res.ok) return null
    const pr: PR = await res.json()
    const scored = scorePR(pr)
    return scored.score > 0 ? scored : null
  } catch {
    return null
  }
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

  const prUrls: string[] = []
  for (const item of items.slice(0, 15)) {
    if (item.pull_request?.url) prUrls.push(item.pull_request.url)
  }

  // Fetch PRs in parallel (batches of 5 to respect rate limits)
  const results: ScoredPR[] = []
  const batchSize = 5
  for (let i = 0; i < prUrls.length; i += batchSize) {
    const batch = prUrls.slice(i, i + batchSize)
    const settled = await Promise.allSettled(
      batch.map(url => fetchSinglePR(url, headers))
    )
    for (const result of settled) {
      if (result.status === 'fulfilled' && result.value) {
        results.push(result.value)
      }
    }
  }

  return results.sort((a, b) => b.score - a.score)
}

export async function detectStack(accessToken: string, owner: string, repo: string): Promise<string[]> {
  const headers = { Authorization: `Bearer ${accessToken}`, Accept: 'application/vnd.github+json' }
  const stack: string[] = []

  const files = ['go.mod', 'package.json', 'requirements.txt', 'Cargo.toml', 'pom.xml', 'build.gradle', 'Dockerfile']
  for (const file of files) {
    try {
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
        } catch { /* malformed package.json */ }
      }
      if (file === 'requirements.txt') {
        const deps = decoded.split('\n').map((l: string) => l.split('==')[0].trim()).filter(Boolean).slice(0, 6)
        stack.push('Python', ...deps)
      }
      if (file === 'Cargo.toml') stack.push('Rust')
      if (file === 'pom.xml') stack.push('Java')
      if (file === 'build.gradle') stack.push('Java', 'Gradle')
      if (file === 'Dockerfile') stack.push('Docker')
      // No break — continue checking all files for complete stack detection
    } catch { /* skip on error */ }
  }

  return [...new Set(stack)].filter(s => s.length > 1)
}
