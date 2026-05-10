'use client'
import { signIn } from 'next-auth/react'

export default function Landing() {
  return (
    <main style={{ minHeight: '100vh', background: '#0d0d0d', color: '#e8e8e8', fontFamily: 'system-ui, sans-serif' }}>
      <nav style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', padding: '18px 32px', borderBottom: '0.5px solid #222' }}>
        <span style={{ fontFamily: 'monospace', fontSize: '15px', color: '#c8f542' }}>devbrand//</span>
        <button onClick={() => signIn('github', { callbackUrl: '/dashboard' })}
          style={{ padding: '8px 18px', fontSize: '13px', fontWeight: 500, borderRadius: '7px', background: '#c8f542', color: '#0d0d0d', border: 'none', cursor: 'pointer' }}>
          Connect GitHub →
        </button>
      </nav>

      <div style={{ maxWidth: '640px', margin: '0 auto', padding: '80px 32px 48px', textAlign: 'center' }}>
        <div style={{ display: 'inline-block', fontSize: '11px', fontFamily: 'monospace', color: '#c8f542', border: '0.5px solid #c8f542', borderRadius: '20px', padding: '4px 14px', marginBottom: '28px', letterSpacing: '0.5px' }}>
          github → linkedin · no cringe
        </div>

        <h1 style={{ fontSize: '48px', fontWeight: 300, lineHeight: 1.1, marginBottom: '20px', letterSpacing: '-1px' }}>
          Your code deserves<br />
          <em style={{ fontStyle: 'italic', color: '#c8f542' }}>to be seen.</em>
        </h1>

        <p style={{ fontSize: '15px', color: '#666', lineHeight: 1.8, marginBottom: '36px', maxWidth: '440px', margin: '0 auto 36px' }}>
          DevBrand reads your merged PRs and generates honest LinkedIn posts, resume bullets, and interview stories. No hype. No emoji. Just your actual work, written well.
        </p>

        <button onClick={() => signIn('github', { callbackUrl: '/dashboard' })}
          style={{ padding: '14px 32px', fontSize: '15px', fontWeight: 500, borderRadius: '9px', background: '#c8f542', color: '#0d0d0d', border: 'none', cursor: 'pointer', marginBottom: '12px', display: 'block', width: '100%', maxWidth: '320px', margin: '0 auto 12px' }}>
          Connect GitHub — it&apos;s free
        </button>
        <p style={{ fontSize: '12px', color: '#444', margin: '10px 0 0' }}>Read-only access · no auto-posting · you control everything</p>
      </div>

      <div style={{ display: 'flex', maxWidth: '640px', margin: '0 auto 60px', border: '0.5px solid #222', borderRadius: '10px', overflow: 'hidden' }}>
        {['Connect GitHub', 'We scan PRs', 'AI generates', 'You copy & post'].map((s, i) => (
          <div key={i} style={{ flex: 1, padding: '16px 12px', borderRight: i < 3 ? '0.5px solid #222' : 'none', textAlign: 'center' }}>
            <div style={{ fontSize: '10px', fontFamily: 'monospace', color: '#444', marginBottom: '6px' }}>0{i + 1}</div>
            <div style={{ fontSize: '12px', color: '#ccc', fontWeight: 500 }}>{s}</div>
          </div>
        ))}
      </div>

      <div style={{ borderTop: '0.5px solid #222', padding: '20px 32px', display: 'flex', justifyContent: 'space-between', alignItems: 'center', maxWidth: '100%' }}>
        <span style={{ fontFamily: 'monospace', fontSize: '12px', color: '#c8f542' }}>devbrand//</span>
        <span style={{ fontSize: '11px', color: '#444' }}>No auto-posting. You control what goes live.</span>
      </div>
    </main>
  )
}
