import { useState, useMemo } from "react";

function getDistance(lat1, lng1, lat2, lng2) {
  const R = 6371;
  const dLat = ((lat2 - lat1) * Math.PI) / 180;
  const dLng = ((lng2 - lng1) * Math.PI) / 180;
  const a = Math.sin(dLat / 2) ** 2 +
    Math.cos((lat1 * Math.PI) / 180) * Math.cos((lat2 * Math.PI) / 180) * Math.sin(dLng / 2) ** 2;
  return R * 2 * Math.atan2(Math.sqrt(a), Math.sqrt(1 - a));
}

const SORT_OPTIONS = [
  { id: "distance", label: "Distance", icon: "ti-location" },
  { id: "price", label: "Price", icon: "ti-tag" },
  { id: "verified", label: "Most verified", icon: "ti-shield-check" },
  { id: "recent", label: "Most recent", icon: "ti-clock" },
];

const STATUS_META = {
  verified:   { label: "Verified",     color: "#059669", bg: "rgba(5,150,105,0.12)" },
  pending:    { label: "Needs verify", color: "#f59e0b", bg: "rgba(245,158,11,0.12)" },
  unverified: { label: "Unconfirmed",  color: "#9ca3af", bg: "rgba(156,163,175,0.12)" },
  gone:       { label: "Gone",         color: "#ef4444", bg: "rgba(239,68,68,0.12)" },
};

function StoreCard({ store, onClick }) {
  const meta = STATUS_META[store.status] || STATUS_META.unverified;
  const typeIcon = store.type === "gas" ? "gas-station"
    : store.type === "pharmacy" ? "pill" : "building-store";
  const typeName = store.type === "gas" ? "Gas Station"
    : store.type === "pharmacy" ? "Pharmacy" : "Convenience";

  return (
    <div className="sc-card" onClick={() => onClick(store)} role="button" tabIndex={0}
      onKeyDown={e => e.key === "Enter" && onClick(store)}>
      <div className="sc-header">
        <div className="sc-type-badge">
          <i className={`ti ti-${typeIcon}`} /> {typeName}
        </div>
        <div className="sc-status-badge" style={{ color: meta.color, background: meta.bg }}>
          {meta.label}
        </div>
      </div>

      <div className="sc-name">{store.name}</div>
      <div className="sc-addr">{store.address}</div>

      <div className="sc-stats">
        {store.latest_price && (
          <div className="sc-stat price">
            <i className="ti ti-tag" />
            <span>${parseFloat(store.latest_price).toFixed(2)}</span>
            {store.latest_can_size && <span className="sc-per-can">/ {store.latest_can_size}pk</span>}
          </div>
        )}
        {store.distance != null && (
          <div className="sc-stat dist">
            <i className="ti ti-navigation" />
            <span>
              {store.distance < 1
                ? `${Math.round(store.distance * 1000)} m`
                : `${store.distance.toFixed(1)} km`}
            </span>
          </div>
        )}
        {store.confirmations > 0 && (
          <div className="sc-stat confirms">
            <i className="ti ti-shield-check" />
            <span>{store.confirmations}</span>
          </div>
        )}
      </div>

      {store.flavors?.length > 0 && (
        <div className="sc-flavors">
          {store.flavors.slice(0, 3).map(f => (
            <span key={f} className="flavor-tag">{f}</span>
          ))}
          {store.flavors.length > 3 && (
            <span className="flavor-tag">+{store.flavors.length - 3}</span>
          )}
        </div>
      )}

      <div className="sc-footer">
        {store.last_seen && (
          <span className="sc-last-seen">
            <i className="ti ti-clock" />
            {new Date(store.last_seen).toLocaleDateString("en-US", { month: "short", day: "numeric" })}
          </span>
        )}
        <span className="sc-cta">View details <i className="ti ti-arrow-right" /></span>
      </div>
    </div>
  );
}

export default function StoreList({ stores, loading, userCoords, onStoreClick }) {
  const [search, setSearch] = useState("");
  const [filter, setFilter] = useState("all");
  const [sortBy, setSortBy] = useState("distance");
  const [viewMode, setViewMode] = useState("grid"); // grid | list
  const [typeFilter, setTypeFilter] = useState("all");

  const enriched = useMemo(() => {
    return stores
      .map((s) => ({
        ...s,
        distance: userCoords ? getDistance(userCoords.lat, userCoords.lng, s.lat, s.lng) : null,
      }))
      .filter((s) => {
        const q = search.toLowerCase();
        const matchSearch = !q || s.name.toLowerCase().includes(q) || s.address.toLowerCase().includes(q);
        const matchFilter = filter === "all" || s.status === filter;
        const matchType = typeFilter === "all" || s.type === typeFilter;
        return matchSearch && matchFilter && matchType;
      })
      .sort((a, b) => {
        if (sortBy === "distance") return (a.distance ?? 999) - (b.distance ?? 999);
        if (sortBy === "price") {
          if (!a.latest_price && !b.latest_price) return 0;
          if (!a.latest_price) return 1;
          if (!b.latest_price) return -1;
          return parseFloat(a.latest_price) - parseFloat(b.latest_price);
        }
        if (sortBy === "verified") return (b.confirmations ?? 0) - (a.confirmations ?? 0);
        if (sortBy === "recent") return new Date(b.reported_at || 0) - new Date(a.reported_at || 0);
        return 0;
      });
  }, [stores, search, filter, sortBy, userCoords, typeFilter]);

  const nearbyCount = enriched.filter(s => s.distance != null && s.distance < 5).length;
  const pricedCount = enriched.filter(s => s.latest_price).length;
  const verifiedCount = enriched.filter(s => s.status === "verified").length;

  return (
    <div className="list-panel">
      {/* ── Toolbar ── */}
      <div className="list-toolbar">
        <div className="search-wrap">
          <i className="ti ti-search search-icon" />
          <input
            className="search-input"
            placeholder="Search stores or addresses…"
            value={search}
            onChange={(e) => setSearch(e.target.value)}
          />
        </div>
        <div className="list-view-toggle">
          <button className={`view-btn ${viewMode === "grid" ? "active" : ""}`}
            onClick={() => setViewMode("grid")} title="Grid view">
            <i className="ti ti-layout-grid" />
          </button>
          <button className={`view-btn ${viewMode === "list" ? "active" : ""}`}
            onClick={() => setViewMode("list")} title="List view">
            <i className="ti ti-list" />
          </button>
        </div>
      </div>

      {/* ── Stats bar ── */}
      <div className="list-stats-bar">
        <div className="lsb-item">
          <i className="ti ti-map-pin" />
          <span>{enriched.length} locations</span>
        </div>
        {nearbyCount > 0 && (
          <div className="lsb-item">
            <i className="ti ti-navigation" />
            <span>{nearbyCount} within 5km</span>
          </div>
        )}
        <div className="lsb-item">
          <i className="ti ti-tag" style={{ color: "#10b981" }} />
          <span>{pricedCount} with prices</span>
        </div>
        <div className="lsb-item">
          <i className="ti ti-shield-check" style={{ color: "#059669" }} />
          <span>{verifiedCount} verified</span>
        </div>
      </div>

      {/* ── Filter chips ── */}
      <div className="filter-row">
        <div className="filter-chips">
          <span className="filter-group-label">Status:</span>
          {["all", "verified", "pending", "unverified"].map((f) => (
            <button key={f} className={`filter-chip ${filter === f ? "active" : ""}`}
              onClick={() => setFilter(f)}>
              {f === "all" ? "All" : f.charAt(0).toUpperCase() + f.slice(1)}
            </button>
          ))}
        </div>
        <div className="filter-chips">
          <span className="filter-group-label">Type:</span>
          {[
            { id: "all", label: "All" },
            { id: "gas", label: "Gas" },
            { id: "convenience", label: "Convenience" },
            { id: "pharmacy", label: "Pharmacy" },
          ].map(f => (
            <button key={f.id} className={`filter-chip ${typeFilter === f.id ? "active" : ""}`}
              onClick={() => setTypeFilter(f.id)}>
              {f.label}
            </button>
          ))}
        </div>
      </div>

      {/* ── Sort ── */}
      <div className="sort-row">
        <span className="sort-label">Sort:</span>
        <div className="sort-chips">
          {SORT_OPTIONS.map((s) => (
            <button key={s.id} className={`sort-chip ${sortBy === s.id ? "active" : ""}`}
              onClick={() => setSortBy(s.id)}>
              <i className={`ti ${s.icon}`} /> {s.label}
            </button>
          ))}
        </div>
      </div>

      {/* ── Content ── */}
      {loading ? (
        <div className="list-loading"><div className="spinner" /><span>Finding locations…</span></div>
      ) : enriched.length === 0 ? (
        <div className="list-empty">
          <i className="ti ti-map-pin-off" style={{ fontSize: 36 }} />
          <p>No locations found.</p>
          <p>Be the first to report one!</p>
        </div>
      ) : viewMode === "grid" ? (
        <div className="store-card-grid">
          {enriched.map((store) => (
            <StoreCard key={store.id} store={store} onClick={onStoreClick} />
          ))}
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
                  <span className={`status-badge ${store.status}`}>
                    {STATUS_META[store.status]?.label || "Unconfirmed"}
                  </span>
                  {store.confirmations > 0 && (
                    <span className="confirm-count">{store.confirmations} confirmations</span>
                  )}
                  {store.latest_price && (
                    <span className="price-badge">
                      <i className="ti ti-tag" /> ${parseFloat(store.latest_price).toFixed(2)}
                    </span>
                  )}
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
