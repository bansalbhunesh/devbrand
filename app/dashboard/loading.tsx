export default function DashboardLoading() {
  return (
    <div className="dashboard">
      <div className="dash-header">
        <div className="dash-brand">
          <div className="skeleton" style={{ width: 120, height: 24, marginBottom: 6 }} />
          <div className="skeleton" style={{ width: 220, height: 14 }} />
        </div>
        <div className="dash-user">
          <div className="skeleton" style={{ width: 34, height: 34, borderRadius: '50%' }} />
        </div>
      </div>
      <div className="skeleton" style={{ width: '100%', height: 80, borderRadius: 14, marginBottom: 20 }} />
      <div className="skeleton" style={{ width: '100%', height: 200, borderRadius: 14 }} />
    </div>
  )
}
