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
            <img src="/snusworld_logo.svg" alt="SnusWorld"
              style={{ width: "36px", height: "36px", objectFit: "contain", borderRadius: "50%" }} />
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
        </div>
      </div>
      <nav className="tab-bar" role="tablist">
        {tabs.map((t) => (
          <button key={t.id} role="tab" aria-selected={tab === t.id}
            className={tab === t.id ? "tab-btn active" : "tab-btn"}
            onClick={() => setTab(t.id)}>
            <i className={"ti ti-" + t.icon} aria-hidden="true" />
            <span>{t.label}</span>
          </button>
        ))}
      </nav>
    </header>
  );
}