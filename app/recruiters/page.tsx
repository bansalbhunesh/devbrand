import Link from 'next/link'

export default function Recruiters() {
  return (
    <main className="landing">
      <nav className="landing-nav">
        <Link href="/" className="landing-logo" style={{ textDecoration: 'none' }}>
          devbrand// <span style={{ color: '#888', fontWeight: 300 }}>for recruiters</span>
        </Link>
        <Link href="/" className="landing-nav-btn" style={{ textDecoration: 'none', background: 'transparent', color: '#ccc', border: '1px solid #333' }}>
          Back to Developers
        </Link>
      </nav>

      <div className="landing-hero" style={{ paddingTop: '80px', maxWidth: '800px' }}>
        <div className="landing-badge" style={{ borderColor: 'rgba(255, 255, 255, 0.2)', color: '#fff' }}>
          Enterprise Early Access
        </div>

        <h1 className="landing-title" style={{ fontSize: '42px', marginBottom: '30px' }}>
          Stop guessing from resumes.<br />
          Hire based on <em>Proof of Work.</em>
        </h1>

        <p className="landing-subtitle" style={{ maxWidth: '560px', marginBottom: '50px' }}>
          DevBrand Enterprise lets you search a verified database of developers
          based on the actual code they ship. Find the perfect engineer who has
          recently merged high-impact React, Go, or Python code.
        </p>

        <form className="waitlist-form" style={{ display: 'flex', gap: '10px', maxWidth: '400px', margin: '0 auto 40px', animation: 'fadeInUp 0.6s ease 0.3s both' }}>
          <input 
            type="email" 
            placeholder="Work email address" 
            style={{ flex: 1, padding: '14px 20px', borderRadius: 'var(--radius-md)', border: '1px solid #333', background: '#111', color: '#fff', fontSize: '15px' }}
          />
          <button type="button" className="landing-cta" style={{ margin: 0, width: 'auto', padding: '14px 24px' }}>
            Join Waitlist
          </button>
        </form>
      </div>

      <div className="landing-features" style={{ maxWidth: '800px', gridTemplateColumns: '1fr 1fr' }}>
        <div className="landing-feature">
          <div className="landing-feature-icon">🔍</div>
          <div className="landing-feature-title">Code-Level Search</div>
          <div className="landing-feature-desc">
            Filter talent not by what they claim to know, but by what they've recently built and merged.
          </div>
        </div>
        <div className="landing-feature">
          <div className="landing-feature-icon">📈</div>
          <div className="landing-feature-title">Verified Impact Scores</div>
          <div className="landing-feature-desc">
            See objective, AI-driven complexity and impact scores for every pull request they've made public.
          </div>
        </div>
      </div>
    </main>
  )
}
