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
          <div className="brand-logo">
            <img
              src="/snusworld_logo.svg"
              alt="SnusWorld"
              style={{ width: "36px", height: "36px", objectFit: "contain", borderRadius: "50%" }}
            />
          </div>
          <div>
            <div className="brand-name">SnusWorld</div>
            <div className="brand-sub">Find Zyn near you</div>
          </div>
        </div>
        <div className="header-right">
          <div className="points-badge">
            <i className="ti ti-star-filled points-star" />
            <span className="points-num">{userPoints}</span>
            <span className="points-label">pts</span>
          </div>
          <button
            className={`profile-btn ${user ? "logged-in" : ""}`}
            onClick={onProfileClick}
            title={user ? "My profile" : "Sign in"}
          >
            <i className="ti ti-user" />
          </button>
        </div>
      </div>
      <nav className="tab-bar" role="tablist">
        {tabs.map((t) => (
          <button
            key={t.id}
            role="tab"
            aria-selected={tab === t.id}
            className={`tab-btn ${tab === t.id ? "active" : ""}`}
            onClick={() => setTab(t.id)}
          >
            <i className={`ti ti-${t.icon}`} aria-hidden="true" />
            <span>{t.label}</span>
          </button>
        ))}
      </nav>
    </header>
  );
}
