export default function Loading() {
  return (
    <main className="profile-layout">
      <div className="profile-header-wrap skeleton-bg">
        <div className="profile-header-inner" style={{ height: '200px' }}>
        </div>
      </div>
      <div className="profile-content">
        <div className="portfolio-grid">
          {[1, 2, 3].map((i) => (
            <div key={i} className="portfolio-item skeleton-bg" style={{ height: '300px' }} />
          ))}
        </div>
      </div>
    </main>
  )
}
