'use client'

import { useState, useEffect, useCallback } from 'react'
import { useSession, signOut } from 'next-auth/react'
import { useSearchParams } from 'next/navigation'

type Seniority = 'junior' | 'mid' | 'senior'
type Tone = 'direct' | 'storytelling' | 'technical'
type Tab = 'generate' | 'history'

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

interface HistoryItem {
  id: string
  pr_title: string
  pr_url: string
  repo_name: string
  linkedin_post_1: string
  linkedin_post_2: string
  linkedin_post_3: string
  resume_bullet: string
  interview_hook: string
  created_at: string
}

export default function Dashboard() {
  const { data: session, status } = useSession()
  const searchParams = useSearchParams()
  const [tab, setTab] = useState<Tab>('generate')
  const [seniority, setSeniority] = useState<Seniority>('mid')
  const [tone, setTone] = useState<Tone>('direct')
  const [loading, setLoading] = useState(false)
  const [loadingStep, setLoadingStep] = useState(0)
  const [results, setResults] = useState<Result[]>([])
  const [activePost, setActivePost] = useState<Record<number, number>>({})
  const [copied, setCopied] = useState<string | null>(null)
  const [error, setError] = useState<string | null>(null)
  const [showUpgrade, setShowUpgrade] = useState(false)
  const [history, setHistory] = useState<HistoryItem[]>([])
  const [historyLoading, setHistoryLoading] = useState(false)
  const [plan, setPlan] = useState<'free' | 'pro'>('free')
  const [generationsUsed, setGenerationsUsed] = useState(0)
  const [upgraded, setUpgraded] = useState(false)

  // Check for upgrade success
  useEffect(() => {
    if (searchParams.get('upgraded') === '1') {
      setUpgraded(true)
      setPlan('pro')
      setTimeout(() => setUpgraded(false), 5000)
    }
  }, [searchParams])

  const fetchHistory = useCallback(async () => {
    setHistoryLoading(true)
    try {
      const res = await fetch('/api/history')
      const data = await res.json()
      if (res.ok) {
        setHistory(data.history ?? [])
        setPlan(data.plan ?? 'free')
        setGenerationsUsed(data.generations_this_month ?? 0)
      }
    } catch { /* ignore */ } finally {
      setHistoryLoading(false)
    }
  }, [])

  useEffect(() => {
    if (status === 'authenticated') fetchHistory()
  }, [status, fetchHistory])

  async function generate() {
    setLoading(true)
    setError(null)
    setResults([])
    setShowUpgrade(false)
    setLoadingStep(0)

    const stepTimer1 = setTimeout(() => setLoadingStep(1), 2000)
    const stepTimer2 = setTimeout(() => setLoadingStep(2), 5000)

    try {
      const res = await fetch('/api/generate', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ seniority, tone, days: 30 }),
      })
      const data = await res.json()

      if (!res.ok) {
        if (data.upgrade) setShowUpgrade(true)
        throw new Error(data.error ?? 'Failed')
      }

      setResults(data.results ?? [])
      if (data.plan) setPlan(data.plan)
      if (data.generations_used) setGenerationsUsed(data.generations_used)
      fetchHistory()
    } catch (e) {
      setError(e instanceof Error ? e.message : 'Something went wrong')
    } finally {
      clearTimeout(stepTimer1)
      clearTimeout(stepTimer2)
      setLoading(false)
      setLoadingStep(0)
    }
  }

  function copy(text: string, key: string) {
    navigator.clipboard.writeText(text)
    setCopied(key)
    setTimeout(() => setCopied(null), 2000)
  }

  async function handleUpgrade() {
    try {
      const res = await fetch('/api/upgrade', { method: 'POST' })
      const data = await res.json()
      if (data.url) window.location.href = data.url
    } catch {
      setError('Failed to start upgrade. Please try again.')
    }
  }

  function formatDate(dateStr: string) {
    return new Date(dateStr).toLocaleDateString('en-US', {
      month: 'short', day: 'numeric', year: 'numeric',
    })
  }

  if (status === 'loading') {
    return (
      <div className="dashboard">
        <div style={{ padding: '4rem 0', textAlign: 'center', color: 'var(--text-muted)' }}>
          Loading...
        </div>
      </div>
    )
  }

  const maxFree = 3

  return (
    <div className="dashboard">
      {/* Header */}
      <div className="dash-header">
        <div className="dash-brand">
          <h1>DevBrand</h1>
          <p>GitHub → LinkedIn posts + resume bullets</p>
        </div>
        <div className="dash-user">
          <span className={`dash-plan-badge ${plan === 'pro' ? 'pro' : ''}`}>
            {plan}
          </span>
          {session?.user?.image && (
            <img src={session.user.image} alt="" className="dash-avatar" />
          )}
          <button onClick={() => signOut()} className="btn-signout">
            Sign out
          </button>
        </div>
      </div>

      {/* Upgrade success banner */}
      {upgraded && (
        <div
          style={{
            padding: '14px 18px',
            background: 'var(--success-bg)',
            border: '1px solid var(--success)',
            borderRadius: 'var(--radius-md)',
            fontSize: '13px',
            color: 'var(--success)',
            marginBottom: '20px',
            fontWeight: 500,
          }}
        >
          Welcome to Pro! You now have unlimited generations.
        </div>
      )}

      {/* Usage bar (free plan only) */}
      {plan === 'free' && (
        <div className="usage-bar">
          <span>
            {generationsUsed}/{maxFree} free generations used
          </span>
          <div className="usage-track">
            <div
              className={`usage-fill ${generationsUsed >= maxFree ? 'danger' : ''}`}
              style={{ width: `${Math.min((generationsUsed / maxFree) * 100, 100)}%` }}
            />
          </div>
          <button onClick={handleUpgrade} className="btn-upgrade">
            Upgrade to Pro
          </button>
        </div>
      )}

      {/* Tabs */}
      <div className="dash-tabs">
        <button
          className={`dash-tab ${tab === 'generate' ? 'active' : ''}`}
          onClick={() => setTab('generate')}
        >
          Generate
        </button>
        <button
          className={`dash-tab ${tab === 'history' ? 'active' : ''}`}
          onClick={() => setTab('history')}
        >
          History
        </button>
      </div>

      {tab === 'generate' && (
        <>
          {/* Controls */}
          <div className="controls-panel">
            <div className="control-group">
              <label>Seniority</label>
              <div className="toggle-group">
                {(['junior', 'mid', 'senior'] as Seniority[]).map((s) => (
                  <button
                    key={s}
                    onClick={() => setSeniority(s)}
                    className={`toggle-btn ${seniority === s ? 'active' : ''}`}
                  >
                    {s}
                  </button>
                ))}
              </div>
            </div>
            <div className="control-group">
              <label>Voice</label>
              <div className="toggle-group">
                {(['direct', 'storytelling', 'technical'] as Tone[]).map((t) => (
                  <button
                    key={t}
                    onClick={() => setTone(t)}
                    className={`toggle-btn ${tone === t ? 'active' : ''}`}
                  >
                    {t}
                  </button>
                ))}
              </div>
            </div>
            <button
              onClick={generate}
              disabled={loading}
              className="btn-generate"
            >
              {loading ? 'Generating...' : 'Generate'}
            </button>
          </div>

          {/* Loading State */}
          {loading && (
            <div className="loading-card">
              <div className="loading-spinner" />
              <p style={{ fontSize: '14px', fontWeight: 500, marginBottom: '4px' }}>
                Analyzing your work
              </p>
              <p style={{ fontSize: '12px', color: 'var(--text-muted)' }}>
                This usually takes 10-15 seconds
              </p>
              <div className="loading-steps">
                <span className={`loading-step ${loadingStep >= 0 ? 'active' : ''} ${loadingStep > 0 ? 'done' : ''}`}>
                  Scanning PRs
                </span>
                <span className={`loading-step ${loadingStep >= 1 ? 'active' : ''} ${loadingStep > 1 ? 'done' : ''}`}>
                  Detecting stack
                </span>
                <span className={`loading-step ${loadingStep >= 2 ? 'active' : ''}`}>
                  Generating content
                </span>
              </div>
            </div>
          )}

          {/* Error */}
          {error && (
            <div className="error-banner">
              <span>⚠</span>
              <span>{error}</span>
              {showUpgrade && (
                <button onClick={handleUpgrade} className="btn-upgrade" style={{ marginLeft: 'auto' }}>
                  Upgrade to Pro
                </button>
              )}
            </div>
          )}

          {/* Results */}
          {results.map((result, i) => (
            <div key={i} className="result-card">
              <div className="result-header">
                <div>
                  <p className="result-title">{result.pr.title}</p>
                  <p className="result-signals">{result.pr.signals?.join(' · ')}</p>
                </div>
                <a href={result.pr.html_url} target="_blank" rel="noopener noreferrer" className="result-link">
                  View PR →
                </a>
              </div>

              {result.error ? (
                <p style={{ fontSize: '13px', color: 'var(--danger)' }}>Error: {result.error}</p>
              ) : (
                <>
                  <div style={{ marginBottom: '16px' }}>
                    <div className="post-tabs">
                      {['Problem', 'Tradeoff', 'Learnings'].map((label, pi) => (
                        <button
                          key={pi}
                          onClick={() => setActivePost((p) => ({ ...p, [i]: pi }))}
                          className={`post-tab ${(activePost[i] ?? 0) === pi ? 'active' : ''}`}
                        >
                          {label}
                        </button>
                      ))}
                    </div>
                    <div className="content-block">
                      <p>{result.output.linkedin_posts[activePost[i] ?? 0]}</p>
                      <button
                        onClick={() => copy(result.output.linkedin_posts[activePost[i] ?? 0], `post-${i}`)}
                        className={`btn-copy ${copied === `post-${i}` ? 'copied' : ''}`}
                      >
                        {copied === `post-${i}` ? 'Copied!' : 'Copy'}
                      </button>
                    </div>
                  </div>

                  <div className="output-grid">
                    <div className="output-block">
                      <p className="output-label">Resume bullet</p>
                      <p className="output-text">{result.output.resume_bullet}</p>
                      <button
                        onClick={() => copy(result.output.resume_bullet, `resume-${i}`)}
                        className={`btn-copy-sm ${copied === `resume-${i}` ? 'copied' : ''}`}
                      >
                        {copied === `resume-${i}` ? 'Copied!' : 'Copy'}
                      </button>
                    </div>
                    <div className="output-block">
                      <p className="output-label">Interview hook</p>
                      <p className="output-text">{result.output.interview_hook}</p>
                      <button
                        onClick={() => copy(result.output.interview_hook, `hook-${i}`)}
                        className={`btn-copy-sm ${copied === `hook-${i}` ? 'copied' : ''}`}
                      >
                        {copied === `hook-${i}` ? 'Copied!' : 'Copy'}
                      </button>
                    </div>
                  </div>
                </>
              )}
            </div>
          ))}

          {/* Empty state */}
          {!loading && results.length === 0 && !error && (
            <div className="empty-state">
              <div className="empty-state-icon">⌨️</div>
              <h3>Ready to generate</h3>
              <p>
                Set your seniority level and voice preference, then hit Generate
                to scan your recent PRs.
              </p>
            </div>
          )}
        </>
      )}

      {tab === 'history' && (
        <>
          {historyLoading ? (
            <div style={{ padding: '40px 0', textAlign: 'center', color: 'var(--text-muted)', fontSize: '13px' }}>
              Loading history...
            </div>
          ) : history.length === 0 ? (
            <div className="empty-state">
              <div className="empty-state-icon">📂</div>
              <h3>No history yet</h3>
              <p>Generate your first LinkedIn posts to see them here.</p>
            </div>
          ) : (
            history.map((item) => (
              <div key={item.id} className="result-card">
                <div className="result-header">
                  <div>
                    <p className="result-title">{item.pr_title}</p>
                    <p className="result-signals">
                      {item.repo_name} · {formatDate(item.created_at)}
                    </p>
                  </div>
                  {item.pr_url && (
                    <a href={item.pr_url} target="_blank" rel="noopener noreferrer" className="result-link">
                      View PR →
                    </a>
                  )}
                </div>

                <div style={{ marginBottom: '16px' }}>
                  <div className="content-block">
                    <p>{item.linkedin_post_1}</p>
                    <button
                      onClick={() => copy(item.linkedin_post_1, `hist-${item.id}`)}
                      className={`btn-copy ${copied === `hist-${item.id}` ? 'copied' : ''}`}
                    >
                      {copied === `hist-${item.id}` ? 'Copied!' : 'Copy'}
                    </button>
                  </div>
                </div>

                <div className="output-grid">
                  <div className="output-block">
                    <p className="output-label">Resume bullet</p>
                    <p className="output-text">{item.resume_bullet}</p>
                    <button
                      onClick={() => copy(item.resume_bullet, `hist-r-${item.id}`)}
                      className={`btn-copy-sm ${copied === `hist-r-${item.id}` ? 'copied' : ''}`}
                    >
                      {copied === `hist-r-${item.id}` ? 'Copied!' : 'Copy'}
                    </button>
                  </div>
                  <div className="output-block">
                    <p className="output-label">Interview hook</p>
                    <p className="output-text">{item.interview_hook}</p>
                    <button
                      onClick={() => copy(item.interview_hook, `hist-h-${item.id}`)}
                      className={`btn-copy-sm ${copied === `hist-h-${item.id}` ? 'copied' : ''}`}
                    >
                      {copied === `hist-h-${item.id}` ? 'Copied!' : 'Copy'}
                    </button>
                  </div>
                </div>
              </div>
            ))
          )}
        </>
      )}
    </div>
  )
}
