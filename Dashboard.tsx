'use client'

import { useState } from 'react'
import { useSession, signIn, signOut } from 'next-auth/react'

type Seniority = 'junior' | 'mid' | 'senior'
type Tone = 'direct' | 'storytelling' | 'technical'

interface Output {
  linkedin_posts: [string, string, string]
  resume_bullet: string
  interview_hook: string
}

interface Result {
  pr: { title: string; html_url: string; additions: number; signals: string[] }
  output: Output
  error?: string
}

export default function Dashboard() {
  const { data: session, status } = useSession()
  const [seniority, setSeniority] = useState<Seniority>('mid')
  const [tone, setTone] = useState<Tone>('direct')
  const [loading, setLoading] = useState(false)
  const [results, setResults] = useState<Result[]>([])
  const [activePost, setActivePost] = useState<Record<number, number>>({})
  const [copied, setCopied] = useState<string | null>(null)
  const [error, setError] = useState<string | null>(null)

  async function generate() {
    setLoading(true)
    setError(null)
    setResults([])
    try {
      const res = await fetch('/api/generate', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ seniority, tone, days: 30 }),
      })
      const data = await res.json()
      if (!res.ok) throw new Error(data.error ?? 'Failed')
      setResults(data.results ?? [])
    } catch (e) {
      setError(e instanceof Error ? e.message : 'Something went wrong')
    } finally {
      setLoading(false)
    }
  }

  function copy(text: string, key: string) {
    navigator.clipboard.writeText(text)
    setCopied(key)
    setTimeout(() => setCopied(null), 2000)
  }

  if (status === 'loading') return <div style={{ padding: '2rem', color: '#888' }}>Loading…</div>

  if (!session) {
    return (
      <div style={{ minHeight: '100vh', display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
        <button onClick={() => signIn('github')} style={{ padding: '12px 28px', fontSize: '15px', cursor: 'pointer' }}>
          Sign in with GitHub
        </button>
      </div>
    )
  }

  return (
    <div style={{ maxWidth: '780px', margin: '0 auto', padding: '2rem 1rem' }}>
      <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '2rem' }}>
        <div>
          <h1 style={{ margin: 0, fontSize: '20px', fontWeight: 500 }}>DevBrand</h1>
          <p style={{ margin: '4px 0 0', fontSize: '13px', color: '#888' }}>
            GitHub → LinkedIn posts + resume bullets
          </p>
        </div>
        <div style={{ display: 'flex', alignItems: 'center', gap: '12px' }}>
          <img src={session.user?.image ?? ''} alt="" style={{ width: 32, height: 32, borderRadius: '50%' }} />
          <button onClick={() => signOut()} style={{ fontSize: '13px', color: '#888', background: 'none', border: 'none', cursor: 'pointer' }}>
            Sign out
          </button>
        </div>
      </div>

      <div style={{ border: '0.5px solid #e0e0e0', borderRadius: '12px', padding: '20px', marginBottom: '20px', display: 'flex', gap: '20px', flexWrap: 'wrap', alignItems: 'flex-end' }}>
        <div>
          <label style={{ fontSize: '12px', color: '#888', display: 'block', marginBottom: '6px' }}>Seniority</label>
          <div style={{ display: 'flex', gap: '6px' }}>
            {(['junior', 'mid', 'senior'] as Seniority[]).map(s => (
              <button key={s} onClick={() => setSeniority(s)}
                style={{ padding: '6px 14px', fontSize: '13px', borderRadius: '6px', cursor: 'pointer',
                  background: seniority === s ? '#111' : 'transparent',
                  color: seniority === s ? '#fff' : '#555',
                  border: seniority === s ? '1px solid #111' : '1px solid #ddd' }}>
                {s}
              </button>
            ))}
          </div>
        </div>
        <div>
          <label style={{ fontSize: '12px', color: '#888', display: 'block', marginBottom: '6px' }}>Voice</label>
          <div style={{ display: 'flex', gap: '6px' }}>
            {(['direct', 'storytelling', 'technical'] as Tone[]).map(t => (
              <button key={t} onClick={() => setTone(t)}
                style={{ padding: '6px 14px', fontSize: '13px', borderRadius: '6px', cursor: 'pointer',
                  background: tone === t ? '#111' : 'transparent',
                  color: tone === t ? '#fff' : '#555',
                  border: tone === t ? '1px solid #111' : '1px solid #ddd' }}>
                {t}
              </button>
            ))}
          </div>
        </div>
        <button onClick={generate} disabled={loading}
          style={{ padding: '8px 24px', fontSize: '14px', fontWeight: 500, borderRadius: '8px',
            background: loading ? '#ccc' : '#111', color: '#fff', border: 'none', cursor: loading ? 'default' : 'pointer' }}>
          {loading ? 'Scanning GitHub…' : 'Generate'}
        </button>
      </div>

      {error && (
        <div style={{ padding: '12px', background: '#fff0f0', border: '0.5px solid #fcc', borderRadius: '8px', fontSize: '13px', color: '#c00', marginBottom: '16px' }}>
          {error}
        </div>
      )}

      {results.map((result, i) => (
        <div key={i} style={{ border: '0.5px solid #e0e0e0', borderRadius: '12px', padding: '20px', marginBottom: '16px' }}>
          <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start', marginBottom: '16px' }}>
            <div>
              <p style={{ margin: 0, fontSize: '14px', fontWeight: 500 }}>{result.pr.title}</p>
              <p style={{ margin: '4px 0 0', fontSize: '12px', color: '#888' }}>
                {result.pr.signals?.join(' · ')}
              </p>
            </div>
            <a href={result.pr.html_url} target="_blank" rel="noopener" style={{ fontSize: '12px', color: '#555' }}>
              View PR →
            </a>
          </div>

          {result.error ? (
            <p style={{ fontSize: '13px', color: '#c00' }}>Error: {result.error}</p>
          ) : (
            <>
              <div style={{ marginBottom: '16px' }}>
                <div style={{ display: 'flex', gap: '6px', marginBottom: '10px' }}>
                  {['Problem', 'Tradeoff', 'Learnings'].map((label, pi) => (
                    <button key={pi} onClick={() => setActivePost(p => ({ ...p, [i]: pi }))}
                      style={{ padding: '4px 12px', fontSize: '12px', borderRadius: '6px', cursor: 'pointer',
                        background: (activePost[i] ?? 0) === pi ? '#111' : 'transparent',
                        color: (activePost[i] ?? 0) === pi ? '#fff' : '#555',
                        border: (activePost[i] ?? 0) === pi ? '1px solid #111' : '1px solid #ddd' }}>
                      {label}
                    </button>
                  ))}
                </div>
                <div style={{ background: '#fafafa', border: '0.5px solid #eee', borderRadius: '8px', padding: '14px', position: 'relative' }}>
                  <p style={{ margin: 0, fontSize: '13px', lineHeight: 1.7, whiteSpace: 'pre-wrap' }}>
                    {result.output.linkedin_posts[activePost[i] ?? 0]}
                  </p>
                  <button onClick={() => copy(result.output.linkedin_posts[activePost[i] ?? 0], `post-${i}`)}
                    style={{ position: 'absolute', top: '10px', right: '10px', fontSize: '12px', padding: '4px 10px',
                      borderRadius: '6px', border: '0.5px solid #ddd', background: '#fff', cursor: 'pointer', color: '#555' }}>
                    {copied === `post-${i}` ? 'Copied!' : 'Copy'}
                  </button>
                </div>
              </div>

              <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '10px' }}>
                <div style={{ background: '#fafafa', border: '0.5px solid #eee', borderRadius: '8px', padding: '12px' }}>
                  <p style={{ margin: '0 0 6px', fontSize: '11px', color: '#888', textTransform: 'uppercase', letterSpacing: '0.5px' }}>Resume bullet</p>
                  <p style={{ margin: 0, fontSize: '13px', lineHeight: 1.6 }}>{result.output.resume_bullet}</p>
                  <button onClick={() => copy(result.output.resume_bullet, `resume-${i}`)}
                    style={{ marginTop: '8px', fontSize: '12px', padding: '3px 8px', borderRadius: '5px',
                      border: '0.5px solid #ddd', background: '#fff', cursor: 'pointer', color: '#555' }}>
                    {copied === `resume-${i}` ? 'Copied!' : 'Copy'}
                  </button>
                </div>
                <div style={{ background: '#fafafa', border: '0.5px solid #eee', borderRadius: '8px', padding: '12px' }}>
                  <p style={{ margin: '0 0 6px', fontSize: '11px', color: '#888', textTransform: 'uppercase', letterSpacing: '0.5px' }}>Interview hook</p>
                  <p style={{ margin: 0, fontSize: '13px', lineHeight: 1.6 }}>{result.output.interview_hook}</p>
                  <button onClick={() => copy(result.output.interview_hook, `hook-${i}`)}
                    style={{ marginTop: '8px', fontSize: '12px', padding: '3px 8px', borderRadius: '5px',
                      border: '0.5px solid #ddd', background: '#fff', cursor: 'pointer', color: '#555' }}>
                    {copied === `hook-${i}` ? 'Copied!' : 'Copy'}
                  </button>
                </div>
              </div>
            </>
          )}
        </div>
      ))}
    </div>
  )
}
