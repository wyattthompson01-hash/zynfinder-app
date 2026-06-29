function SnusWorldLogo() {
  return (
    <svg viewBox="0 0 40 40" xmlns="http://www.w3.org/2000/svg" aria-label="SnusWorld">
      <circle cx="20" cy="20" r="16" fill="rgba(255,255,255,0.12)" stroke="rgba(255,255,255,0.55)" strokeWidth="1.4"/>
      <ellipse cx="20" cy="20" rx="16" ry="6" fill="none" stroke="rgba(255,255,255,0.3)" strokeWidth="1"/>
      <ellipse cx="20" cy="20" rx="16" ry="11" fill="none" stroke="rgba(255,255,255,0.18)" strokeWidth="0.8"/>
      <line x1="20" y1="4" x2="20" y2="36" stroke="rgba(255,255,255,0.3)" strokeWidth="1"/>
      <path d="M20,4 Q10,20 20,36" fill="none" stroke="rgba(255,255,255,0.18)" strokeWidth="0.8"/>
      <path d="M20,4 Q30,20 20,36" fill="none" stroke="rgba(255,255,255,0.18)" strokeWidth="0.8"/>
      <path d="M27 8 C24.2 8 22 10.2 22 13 C22 16.3 27 22 27 22 C27 22 32 16.3 32 13 C32 10.2 29.8 8 27 8Z"
        fill="#10b981" stroke="rgba(255,255,255,0.3)" strokeWidth="0.5"/>
      <circle cx="27" cy="13" r="2.2" fill="#fff"/>
    </svg>
  );
}

export default function Header({ tab, setTab, userPoints, user, onProfileClick }) {
  const tabs = [
    { id: "map",         label: "Map",      icon: "map-2" },
    { id: "list",        label: "Nearby",   icon: "list" },
    { id: "prices",      label: "Market",   icon: "chart-candle" },
    { id: "marketplace", label: "Shop",     icon: "shopping-bag" },
    { id: "report",      label: "Report",   icon: "plus" },
    { id: "verify",      label: "Verify",   icon: "shield-check" },
    { id: "leaderboard", label: "Ranks",    icon: "trophy" },
    { id: "feedback",    label: "Feedback", icon: "message-heart" },
  ];

  return (
    <header className="header">
      <div className="header-top">
        <div className="header-brand">
          <div className="brand-logo"><SnusWorldLogo /></div>
          <div>
            <div className="brand-name">SnusWorld</div>
            <div className="brand-sub">Find nicotine pouches worldwide</div>
          </div>
        </div>
        <div className="header-right">
          <div className="points-badge">
            <i className="ti ti-star-filled points-star" />
            <span className="points-num">{userPoints}</span>
            <span className="points-label">pts</span>
          </div>
          <button className={`profile-btn ${user ? "logged-in" : ""}`}
            onClick={onProfileClick}
            aria-label={user ? "View profile" : "Sign in"}>
            {user
              ? <i className="ti ti-user-circle" style={{ fontSize: 22 }} />
              : <i className="ti ti-user" style={{ fontSize: 20 }} />}
          </button>
        </div>
      </div>
      <nav className="tab-bar" role="tablist">
        {tabs.map((t) => (
          <button key={t.id} role="tab" aria-selected={tab === t.id}
            className={`tab-btn ${tab === t.id ? "active" : ""}`}
            onClick={() => setTab(t.id)}>
            <i className={`ti ti-${t.icon}`} aria-hidden="true" />
            <span>{t.label}</span>
          </button>
        ))}
      </nav>
    </header>
  );
}
