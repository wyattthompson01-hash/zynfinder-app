export default function Header({ tab, setTab, userPoints }) {
  const tabs = [
    { id: "map", label: "Map", icon: "map-2" },
    { id: "list", label: "Nearby", icon: "list" },
    { id: "report", label: "Report", icon: "plus" },
    { id: "verify", label: "Verify", icon: "shield-check" },
  ];

  return (
    <header className="header">
      <div className="header-top">
        <div className="header-brand">
          <div className="brand-logo">
            <svg viewBox="0 0 24 24" xmlns="http://www.w3.org/2000/svg">
              <path d="M12 2C8.13 2 5 5.13 5 9c0 5.25 7 13 7 13s7-7.75 7-13c0-3.87-3.13-7-7-7zm0 9.5c-1.38 0-2.5-1.12-2.5-2.5s1.12-2.5 2.5-2.5 2.5 1.12 2.5 2.5-1.12 2.5-2.5 2.5z"/>
            </svg>
          </div>
          <div>
            <div className="brand-name">ZynFinder</div>
            <div className="brand-sub">Canada's Zyn map</div>
          </div>
        </div>
        <div className="header-right">
          <div className="points-badge">
            <i className="ti ti-star-filled points-star" />
            <span className="points-num">{userPoints}</span>
            <span className="points-label">pts</span>
          </div>
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
