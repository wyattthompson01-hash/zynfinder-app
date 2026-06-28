import { useState, useMemo } from "react";

function getDistance(lat1, lng1, lat2, lng2) {
  const R = 6371;
  const dLat = ((lat2 - lat1) * Math.PI) / 180;
  const dLng = ((lng2 - lng1) * Math.PI) / 180;
  const a = Math.sin(dLat / 2) ** 2 + Math.cos((lat1 * Math.PI) / 180) * Math.cos((lat2 * Math.PI) / 180) * Math.sin(dLng / 2) ** 2;
  return R * 2 * Math.atan2(Math.sqrt(a), Math.sqrt(1 - a));
}

export default function StoreList({ stores, loading, userCoords, onStoreClick }) {
  const [search, setSearch] = useState("");
  const [filter, setFilter] = useState("all");

  const enriched = useMemo(() => {
    return stores
      .map((s) => ({ ...s, distance: userCoords ? getDistance(userCoords.lat, userCoords.lng, s.lat, s.lng) : null }))
      .filter((s) => {
        const q = search.toLowerCase();
        const matchSearch = !q || s.name.toLowerCase().includes(q) || s.address.toLowerCase().includes(q);
        const matchFilter = filter === "all" || s.status === filter;
        return matchSearch && matchFilter;
      })
      .sort((a, b) => (a.distance ?? 999) - (b.distance ?? 999));
  }, [stores, search, filter, userCoords]);

  const statusLabel = (s) => {
    if (s === "verified") return "✓ Verified";
    if (s === "pending") return "Needs verify";
    if (s === "gone") return "Gone";
    return "Unconfirmed";
  };

  return (
    <div className="list-panel">
      <div className="list-toolbar">
        <div className="search-wrap">
          <i className="ti ti-search search-icon" />
          <input className="search-input" placeholder="Search stores or addresses…" value={search} onChange={(e) => setSearch(e.target.value)} />
        </div>
      </div>
      <div className="filter-chips">
        {["all", "verified", "pending", "unverified"].map((f) => (
          <button key={f} className={`filter-chip ${filter === f ? "active" : ""}`} onClick={() => setFilter(f)}>
            {f === "all" ? "All" : f.charAt(0).toUpperCase() + f.slice(1)}
          </button>
        ))}
      </div>
      {loading ? (
        <div className="list-loading"><div className="spinner" /><span>Finding locations…</span></div>
      ) : enriched.length === 0 ? (
        <div className="list-empty">
          <i className="ti ti-map-pin-off" style={{ fontSize: 36 }} />
          <p>No locations found.</p>
          <p>Be the first to report one!</p>
        </div>
      ) : (
        <ul className="store-list" role="list">
          {enriched.map((store) => (
            <li key={store.id} className="store-item" onClick={() => onStoreClick(store)}>
              <div className={`store-type-icon ${store.type}`}>
                <i className={`ti ti-${store.type === "gas" ? "gas-station" : store.type === "pharmacy" ? "pill" : "building-store"}`} />
              </div>
              <div className="store-info">
                <div className="store-name">{store.name}</div>
                <div className="store-addr">{store.address}</div>
                <div className="store-badges">
                  <span className={`status-badge ${store.status}`}>{statusLabel(store.status)}</span>
                  {store.confirmations > 0 && <span className="confirm-count">{store.confirmations} confirmations</span>}
                </div>
                {store.flavors?.length > 0 && (
                  <div className="flavor-row">
                    {store.flavors.slice(0, 3).map((f) => <span key={f} className="flavor-tag">{f}</span>)}
                    {store.flavors.length > 3 && <span className="flavor-tag">+{store.flavors.length - 3}</span>}
                  </div>
                )}
              </div>
              <div style={{ display: "flex", flexDirection: "column", alignItems: "flex-end", gap: 4, flexShrink: 0 }}>
                {store.distance != null && (
                  <div className="store-distance">
                    {store.distance < 1 ? `${Math.round(store.distance * 1000)} m` : `${store.distance.toFixed(1)} km`}
                  </div>
                )}
                <i className="ti ti-chevron-right" style={{ fontSize: 14, color: "#d1d5db" }} />
              </div>
            </li>
          ))}
        </ul>
      )}
    </div>
  );
}
