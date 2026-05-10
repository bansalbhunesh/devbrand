import { getPublicProfile } from '@/lib/db'
import { notFound } from 'next/navigation'
import { Metadata } from 'next'

export async function generateMetadata({ params }: { params: { username: string } }): Promise<Metadata> {
  const profile = await getPublicProfile(params.username)
  if (!profile) return { title: 'Not Found' }
  return {
    title: `${profile.name || params.username}'s Developer Portfolio | DevBrand`,
    description: `Verified work and shipped code by ${params.username}. Total Impact Score: ${profile.total_impact_score}.`,
  }
}

export default async function PublicProfile({ params }: { params: { username: string } }) {
  const profile = await getPublicProfile(params.username)

  if (!profile) {
    notFound()
  }

  const outputs = profile.public_outputs || []

  return (
    <main className={`profile-layout ${profile.theme === 'light' ? 'theme-light' : ''}`}>
      <div className="profile-header-wrap">
        <div className="profile-header-inner">
          <div className="profile-avatar">
            <img src={profile.avatar_url || ''} alt={profile.name || params.username} />
          </div>
          <div className="profile-info">
            <h1>{profile.name || params.username}</h1>
            <p className="profile-bio">
              {profile.bio || `Developer building and shipping code.`}
            </p>
            <div className="profile-stats">
              <div className="stat-card">
                <span className="stat-value">{profile.total_impact_score}</span>
                <span className="stat-label">Impact Score</span>
              </div>
              <div className="stat-card">
                <span className="stat-value">{outputs.length}</span>
                <span className="stat-label">Verified PRs</span>
              </div>
              <div className="stat-card">
                <span className="stat-value" style={{ textTransform: 'capitalize' }}>
                  {profile.seniority}
                </span>
                <span className="stat-label">Level</span>
              </div>
            </div>
          </div>
        </div>
      </div>

      <div className="profile-content">
        <div className="profile-tabs">
          <div className="profile-tab active">Verified Work</div>
        </div>

        {outputs.length === 0 ? (
          <div className="empty-state">
            <div className="empty-state-icon">🔒</div>
            <h3>No public work yet</h3>
            <p>{profile.name || params.username} hasn't made any PRs public.</p>
          </div>
        ) : (
          <div className="portfolio-grid">
            {outputs.map((output: any) => (
              <div key={output.id} className="portfolio-item">
                <div className="portfolio-item-header">
                  <div className="portfolio-item-meta">
                    <span className="portfolio-score">+{output.impact_score} Impact</span>
                    {output.category && <span className="portfolio-tag">{output.category}</span>}
                    {output.complexity_level && <span className="portfolio-tag">{output.complexity_level}</span>}
                  </div>
                  <h3 className="portfolio-title">{output.pr_title}</h3>
                  <p className="portfolio-repo">{output.repo_name}</p>
                </div>
                
                <div className="portfolio-item-body">
                  <div className="portfolio-section">
                    <h4>The Problem Solved</h4>
                    <p>{output.linkedin_post_1}</p>
                  </div>
                  <div className="portfolio-section">
                    <h4>Technical Tradeoffs</h4>
                    <p>{output.linkedin_post_2}</p>
                  </div>
                  <div className="portfolio-section">
                    <h4>Key Takeaways</h4>
                    <p>{output.linkedin_post_3}</p>
                  </div>
                </div>

                <div className="portfolio-item-footer">
                  <a href={output.pr_url} target="_blank" rel="noopener noreferrer" className="btn-view-pr">
                    View Pull Request →
                  </a>
                </div>
              </div>
            ))}
          </div>
        )}
      </div>
      <footer className="profile-footer">
        Powered by <a href="/">devbrand//</a> — The Proof of Work platform for developers.
      </footer>
    </main>
  )
}
