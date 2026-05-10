'use client'

import { signIn } from 'next-auth/react'

export default function Landing() {
  return (
    <main className="landing">
      <nav className="landing-nav">
        <span className="landing-logo">devbrand//</span>
        <button
          onClick={() => signIn('github', { callbackUrl: '/dashboard' })}
          className="landing-nav-btn"
        >
          Connect GitHub →
        </button>
      </nav>

      <div className="landing-hero">
        <div className="landing-badge">github → linkedin · no cringe</div>

        <h1 className="landing-title">
          Your code deserves<br />
          <em>to be seen.</em>
        </h1>

        <p className="landing-subtitle">
          DevBrand reads your merged PRs and generates honest LinkedIn posts,
          resume bullets, and interview stories. No hype. No emoji. Just your
          actual work, written well.
        </p>

        <button
          onClick={() => signIn('github', { callbackUrl: '/dashboard' })}
          className="landing-cta"
        >
          Connect GitHub — it&apos;s free
        </button>
        <p className="landing-trust">
          Read-only access · no auto-posting · you control everything
        </p>
      </div>

      <div className="landing-steps">
        {['Connect GitHub', 'We scan PRs', 'AI generates', 'You copy & post'].map(
          (s, i) => (
            <div key={i} className="landing-step">
              <div className="landing-step-num">0{i + 1}</div>
              <div className="landing-step-label">{s}</div>
            </div>
          )
        )}
      </div>

      <div className="landing-features">
        <div className="landing-feature">
          <div className="landing-feature-icon">⚡</div>
          <div className="landing-feature-title">Smart PR Scoring</div>
          <div className="landing-feature-desc">
            Filters noise commits and ranks your PRs by impact, description
            quality, and change size.
          </div>
        </div>
        <div className="landing-feature">
          <div className="landing-feature-icon">🎯</div>
          <div className="landing-feature-title">Seniority-Aware</div>
          <div className="landing-feature-desc">
            Adjusts tone for junior, mid, and senior engineers. Your voice, your
            level.
          </div>
        </div>
        <div className="landing-feature">
          <div className="landing-feature-icon">📋</div>
          <div className="landing-feature-title">Resume + Interview</div>
          <div className="landing-feature-desc">
            Get STAR-format resume bullets and interview hooks alongside every
            post.
          </div>
        </div>
      </div>

      <div className="landing-pricing">
        <div className="landing-pricing-header">
          <h2>Simple pricing</h2>
        </div>
        <div className="landing-pricing-grid">
          <div className="pricing-card">
            <div className="pricing-card-name">Free</div>
            <div className="pricing-card-price">
              $0<span>/mo</span>
            </div>
            <div className="pricing-card-period">No credit card needed</div>
            <ul className="pricing-card-features">
              <li>3 generations per month</li>
              <li>All 3 post variations</li>
              <li>Resume bullets</li>
              <li>Interview hooks</li>
            </ul>
          </div>
          <div className="pricing-card pro">
            <div className="pricing-card-name" style={{ color: '#c8f542' }}>
              Pro
            </div>
            <div className="pricing-card-price">
              $15<span>/mo</span>
            </div>
            <div className="pricing-card-period">Cancel anytime</div>
            <ul className="pricing-card-features">
              <li>Unlimited generations</li>
              <li>All 3 post variations</li>
              <li>Resume bullets</li>
              <li>Interview hooks</li>
              <li>Full history access</li>
            </ul>
          </div>
        </div>
      </div>

      <footer className="landing-footer">
        <span className="landing-logo">devbrand//</span>
        <span className="landing-footer-note">
          No auto-posting. You control what goes live.
        </span>
      </footer>
    </main>
  )
}
