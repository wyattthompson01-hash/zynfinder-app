const BADGES = [
  {
    id: "pioneer",
    label: "Pioneer",
    icon: "ti-flag",
    desc: "Report your first location",
    test: (p) => p.reports_count >= 1,
    color: "#f59e0b",
    bg: "#fffbeb",
  },
  {
    id: "scout",
    label: "Scout",
    icon: "ti-map-search",
    desc: "Report 5 locations",
    test: (p) => p.reports_count >= 5,
    color: "#3b82f6",
    bg: "#eff6ff",
  },
  {
    id: "explorer",
    label: "Explorer",
    icon: "ti-compass",
    desc: "Report 10 locations",
    test: (p) => p.reports_count >= 10,
    color: "#8b5cf6",
    bg: "#f5f3ff",
  },
  {
    id: "fact-checker",
    label: "Fact Checker",
    icon: "ti-shield-check",
    desc: "Verify 5 locations",
    test: (p) => p.verifications_count >= 5,
    color: "#059669",
    bg: "#ecfdf5",
  },
  {
    id: "veteran",
    label: "Verified Veteran",
    icon: "ti-certificate",
    desc: "Verify 20 locations",
    test: (p) => p.verifications_count >= 20,
    color: "#dc2626",
    bg: "#fef2f2",
  },
  {
    id: "century",
    label: "Century Club",
    icon: "ti-star",
    desc: "Earn 100 points",
    test: (p) => p.points >= 100,
    color: "#d97706",
    bg: "#fffbeb",
  },
  {
    id: "legend",
    label: "Legend",
    icon: "ti-crown",
    desc: "Earn 500 points",
    test: (p) => p.points >= 500,
    color: "#7c3aed",
    bg: "#faf5ff",
  },
];

export default function ProfilePage({ user, profile, onBack, onSignOut }) {
  const earned = profile ? BADGES.filter((b) => b.test(profile)) : [];
  const locked = profile ? BADGES.filter((b) => !b.test(profile)) : BADGES;

  const joinDate = user?.created_at
    ? new Date(user.created_at).toLocaleDateString("en-CA", { year: "numeric", month: "long" })
    : null;

  return (
    <div className="detail-page">
      <div className="detail-container" style={{ maxWidth: 480 }}>
        <button className="detail-back" onClick={onBack}>
          <i className="ti ti-arrow-left" /> Back
        </button>

        {/* Avatar + identity */}
        <div className="profile-hero">
          <div className="profile-avatar">
            <i className="ti ti-user" style={{ fontSize: 32, color: "#fff" }} />
          </div>
          <div className="profile-identity">
            <div className="profile-username">{profile?.username || user?.email?.split("@")[0] || "Anonymous"}</div>
            <div className="profile-email">{user?.email}</div>
            {joinDate && <div className="profile-joined">Member since {joinDate}</div>}
          </div>
        </div>

        {/* Stats */}
        <div className="detail-stats" style={{ marginTop: 0, marginBottom: 20 }}>
          <div className="stat-box">
            <div className="stat-val" style={{ color: "#f59e0b" }}>
              {profile?.points ?? 0}
            </div>
            <div className="stat-label">Points</div>
          </div>
          <div className="stat-box">
            <div className="stat-val" style={{ color: "#059669" }}>
              {profile?.reports_count ?? 0}
            </div>
            <div className="stat-label">Reports</div>
          </div>
          <div className="stat-box">
            <div className="stat-val" style={{ color: "#3b82f6" }}>
              {profile?.verifications_count ?? 0}
            </div>
            <div className="stat-label">Verifications</div>
          </div>
        </div>

        {/* Earned badges */}
        {earned.length > 0 && (
          <div className="detail-section">
            <div className="detail-section-title">Badges earned ({earned.length})</div>
            <div className="badges-grid">
              {earned.map((b) => (
                <div key={b.id} className="badge-item earned" style={{ "--badge-color": b.color, "--badge-bg": b.bg }}>
                  <div className="badge-icon">
                    <i className={`ti ${b.icon}`} />
                  </div>
                  <div className="badge-label">{b.label}</div>
                  <div className="badge-desc">{b.desc}</div>
                </div>
              ))}
            </div>
          </div>
        )}

        {/* Locked badges */}
        {locked.length > 0 && (
          <div className="detail-section">
            <div className="detail-section-title" style={{ color: "#9ca3af" }}>
              Locked badges ({locked.length})
            </div>
            <div className="badges-grid">
              {locked.map((b) => (
                <div key={b.id} className="badge-item locked">
                  <div className="badge-icon locked-icon">
                    <i className="ti ti-lock" />
                  </div>
                  <div className="badge-label" style={{ color: "#9ca3af" }}>{b.label}</div>
                  <div className="badge-desc">{b.desc}</div>
                </div>
              ))}
            </div>
          </div>
        )}

        {/* Sign out */}
        <div style={{ paddingTop: 8, paddingBottom: 24 }}>
          <button className="signout-btn" onClick={onSignOut}>
            <i className="ti ti-logout" /> Sign out
          </button>
        </div>
      </div>
    </div>
  );
}
