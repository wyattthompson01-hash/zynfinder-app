import { useState, useMemo, useRef, useEffect } from "react";

export function getDistance(lat1, lng1, lat2, lng2) {
  const R = 6371;
  const dLat = ((lat2 - lat1) * Math.PI) / 180;
  const dLng = ((lng2 - lng1) * Math.PI) / 180;
  const a =
    Math.sin(dLat / 2) ** 2 +
    Math.cos((lat1 * Math.PI) / 180) *
      Math.cos((lat2 * Math.PI) / 180) *
      Math.sin(dLng / 2) ** 2;
  return R * 2 * Math.atan2(Math.sqrt(a), Math.sqrt(1 - a));
}

export function currencySymbol(currency) {
  const map = {
    CAD: "CA$", USD: "$", GBP: "\u00a3", EUR: "\u20ac",
    SEK: "kr", NOK: "kr", DKK: "kr", CHF: "Fr",
    JPY: "\u00a5", AUD: "A$", NZD: "NZ$", SGD: "S$",
    MXN: "MX$", AED: "AED",
  };
  return map[currency] || currency || "$";
}

export default function StoreList({ stores, loading, userCoords, onStoreClick }) {
  const [search, setSearch] = useState("");
  const [filter, setFilter] = useState("all");
  const [showDropdown, setShowDropdown] = useState(false);
  const [activeIdx, setActiveIdx] = useState(-1);
  const inputRef = useRef(null);
  const dropRef = useRef(null);

  const suggestions = useMemo(() => {
    if (!search || search.length < 1) return [];
    const q = search.toLowerCase();
    return stores
      .filter((s) => {
        const name = (s.name || "").toLowerCase();
        const city = (s.city || "").toLowerCase();
        const addr = (s.address || "").toLowerCase();
        const country = (s.country || "").toLowerCase();
        return (
          name.startsWith(q) ||
          city.startsWith(q) ||
          country.startsWith(q) ||
          name.includes(q) ||
          addr.includes(q)
        );
      })
      .slice(0, 7);
  }, [stores, search]);

  useEffect(() => {
    const handler = (e) => {
      if (
        !dropRef.current?.contains(e.target) &&
        !inputRef.current?.contains(e.target)
      ) {
        setShowDropdown(false);
      }
    };
    document.addEventListener("mousedown", handler);
    return () => document.removeEventListener("mousedown", handler);
  }, []);

  const enriched = useMemo(() => {
    return stores
      .map((s) => ({
        ...s,
        distance: userCoords
          ? getDistance(userCoords.lat, userCoords.lng, s.lat, s.lng)
          : null,
      }))
      .filter((s) => {
        const q = search.toLowerCase();
        const matchSearch =
          !q ||
          (s.name || "").toLowerCase().includes(q) ||
          (s.address || "").toLowerCase().includes(q) ||
          (s.city || "").toLowerCase().includes(q) ||
          (s.country || "").toLowerCase().includes(q);
        const matchFilter = filter === "all" || s.status === filter;
        return matchSearch && matchFilter;
      })
      .sort((a, b) => (a.distance ?? 999) - (b.distance ?? 999));
  }, [stores, search, filter, userCoords]);

  const statusLabel = (s) => {
    if (s === "verified") return "\u2713 Verified";
    if (s === "pending") return "Needs verify";
    if (s === "gone") return "Gone";
    return "Unconfirmed";
  };

  const typeIcon = (type) => {
    if (type === "gas") return "gas-station";
    if (type === "pharmacy") return "pill";
    return "building-store";
  };

  const handleKeyDown = (e) => {
    if (!showDropdown || suggestions.length === 0) return;
    if (e.key === "ArrowDown") {
      e.preventDefault();
      setActiveIdx((i) => Math.min(i + 1, suggestions.length - 1));
    } else if (e.key === "ArrowUp") {
      e.preventDefault();
      setActiveIdx((i) => Math.max(i - 1, -1));
    } else if (e.key === "Enter" && activeIdx >= 0) {
      e.preventDefault();
      onStoreClick(suggestions[activeIdx]);
      setShowDropdown(false);
      setSearch("");
    } else if (e.key === "Escape") {
      setShowDropdown(false);
    }
  };

  return (
    <div className="list-panel">
      <div className="list-toolbar">
        <div
          style={{ position: "relative" }}
          onFocus={() => { if (search) setShowDropdown(true); }}
        >
          <div
            style={{
              position: "relative",
              background: "rgba(255,255,255,0.06)",
              borderRadius: 14,
              border: "1.5px solid rgba(255,255,255,0.12)",
              transition: "border-color 0.2s, box-shadow 0.2s",
              boxShadow: showDropdown && suggestions.length > 0
                ? "0 0 0 3px rgba(99,102,241,0.2)"
                : "none",
            }}
            className="search-focus-wrap"
          >
            <i
              className="ti ti-search"
              style={{
                position: "absolute",
                left: 14,
                top: "50%",
                transform: "translateY(-50%)",
                fontSize: 16,
                color: "#6b7280",
                pointerEvents: "none",
              }}
            />
            <input
              ref={inputRef}
              style={{
                width: "100%",
                background: "transparent",
                border: "none",
                outline: "none",
                padding: "12px 40px 12px 42px",
                fontSize: 14,
                color: "#f1f5f9",
                fontFamily: "inherit",
                boxSizing: "border-box",
              }}
              placeholder="Search stores, cities, countries\u2026"
              value={search}
              onChange={(e) => {
                setSearch(e.target.value);
                setShowDropdown(true);
                setActiveIdx(-1);
              }}
              onFocus={() => { if (search) setShowDropdown(true); }}
              onKeyDown={handleKeyDown}
              autoComplete="off"
              spellCheck={false}
            />
            {search && (
              <button
                onClick={() => { setSearch(""); setShowDropdown(false); }}
                style={{
                  position: "absolute",
                  right: 12,
                  top: "50%",
                  transform: "translateY(-50%)",
                  background: "rgba(255,255,255,0.1)",
                  border: "none",
                  cursor: "pointer",
                  color: "#9ca3af",
                  fontSize: 12,
                  padding: "3px 6px",
                  borderRadius: 6,
                  lineHeight: 1,
                }}
                aria-label="Clear search"
              >
                <i className="ti ti-x" />
              </button>
            )}
          </div>

          {showDropdown && suggestions.length > 0 && (
            <div
              ref={dropRef}
              style={{
                position: "absolute",
                top: "calc(100% + 8px)",
                left: 0,
                right: 0,
                background: "#1a1d2e",
                border: "1px solid rgba(255,255,255,0.1)",
                borderRadius: 14,
                boxShadow: "0 12px 40px rgba(0,0,0,0.5), 0 0 0 1px rgba(99,102,241,0.15)",
                zIndex: 1000,
                overflow: "hidden",
              }}
            >
              <div style={{ padding: "6px 12px 4px", fontSize: 10, fontWeight: 700, color: "#6b7280", textTransform: "uppercase", letterSpacing: "0.08em" }}>
                Locations
              </div>
              {suggestions.map((s, idx) => {
                const loc = [s.city, s.region, s.country].filter(Boolean).join(", ") || s.address;
                return (
                  <div
                    key={s.id}
                    onMouseDown={() => {
                      onStoreClick(s);
                      setShowDropdown(false);
                      setSearch("");
                    }}
                    style={{
                      display: "flex",
                      alignItems: "center",
                      gap: 10,
                      padding: "9px 14px",
                      cursor: "pointer",
                      background:
                        idx === activeIdx
                          ? "rgba(99,102,241,0.18)"
                          : "transparent",
                      borderTop: "1px solid rgba(255,255,255,0.05)",
                      transition: "background 0.12s",
                    }}
                    onMouseEnter={() => setActiveIdx(idx)}
                    onMouseLeave={() => setActiveIdx(-1)}
                  >
                    <div
                      style={{
                        width: 32,
                        height: 32,
                        borderRadius: 9,
                        background:
                          s.status === "verified"
                            ? "rgba(52,211,153,0.15)"
                            : "rgba(99,102,241,0.15)",
                        display: "flex",
                        alignItems: "center",
                        justifyContent: "center",
                        flexShrink: 0,
                      }}
                    >
                      <i
                        className={"ti ti-" + typeIcon(s.type)}
                        style={{
                          fontSize: 14,
                          color:
                            s.status === "verified" ? "#34d399" : "#818cf8",
                        }}
                      />
                    </div>
                    <div style={{ minWidth: 0, flex: 1 }}>
                      <div
                        style={{
                          fontSize: 13,
                          fontWeight: 600,
                          color: "#f1f5f9",
                          whiteSpace: "nowrap",
                          overflow: "hidden",
                          textOverflow: "ellipsis",
                        }}
                      >
                        {s.name}
                      </div>
                      <div
                        style={{
                          fontSize: 11,
                          color: "#94a3b8",
                          marginTop: 1,
                          whiteSpace: "nowrap",
                          overflow: "hidden",
                          textOverflow: "ellipsis",
                        }}
                      >
                        {loc}
                      </div>
                    </div>
                    {s.latest_price != null && (
                      <div
                        style={{
                          fontSize: 13,
                          fontWeight: 700,
                          color: "#34d399",
                          flexShrink: 0,
                        }}
                      >
                        {currencySymbol(s.currency)}{s.latest_price}
                      </div>
                    )}
                  </div>
                );
              })}
              <div style={{ padding: "6px 14px 8px", fontSize: 11, color: "#4b5563", display: "flex", alignItems: "center", gap: 4 }}>
                <i className="ti ti-keyboard" style={{ fontSize: 11 }} />
                Arrow keys to navigate · Enter to select · Esc to close
              </div>
            </div>
          )}
        </div>
      </div>

      <div className="filter-chips">
        {["all", "verified", "pending", "unverified"].map((f) => (
          <button
            key={f}
            className={"filter-chip " + (filter === f ? "active" : "")}
            onClick={() => setFilter(f)}
          >
            {f === "all" ? "All" : f.charAt(0).toUpperCase() + f.slice(1)}
          </button>
        ))}
      </div>

      {loading ? (
        <div className="list-loading">
          <div className="spinner" />
          <span>Finding locations\u2026</span>
        </div>
      ) : enriched.length === 0 ? (
        <div className="list-empty">
          <i className="ti ti-map-pin-off" style={{ fontSize: 36 }} />
          <p>No locations found.</p>
          <p>Be the first to report one!</p>
        </div>
      ) : (
        <ul className="store-list" role="list">
          {enriched.map((store) => (
            <li
              key={store.id}
              className="store-item"
              onClick={() => onStoreClick(store)}
            >
              <div className={"store-type-icon " + store.type}>
                <i className={"ti ti-" + typeIcon(store.type)} />
              </div>
              <div className="store-info">
                <div className="store-name">{store.name}</div>
                <div className="store-addr">
                  {store.city
                    ? [store.city, store.country].filter(Boolean).join(", ")
                    : store.address}
                </div>
                <div className="store-badges">
                  <span className={"status-badge " + store.status}>
                    {statusLabel(store.status)}
                  </span>
                  {store.confirmations > 0 && (
                    <span className="confirm-count">
                      {store.confirmations} confirmations
                    </span>
                  )}
                </div>
                {store.flavors?.length > 0 && (
                  <div className="flavor-row">
                    {store.flavors.slice(0, 3).map((f) => (
                      <span key={f} className="flavor-tag">
                        {f}
                      </span>
                    ))}
                    {store.flavors.length > 3 && (
                      <span className="flavor-tag">
                        +{store.flavors.length - 3}
                      </span>
                    )}
                  </div>
                )}
              </div>
              <div
                style={{
                  display: "flex",
                  flexDirection: "column",
                  alignItems: "flex-end",
                  gap: 4,
                  flexShrink: 0,
                }}
              >
                {store.latest_price != null && (
                  <div
                    style={{ fontSize: 13, fontWeight: 700, color: "#34d399" }}
                  >
                    {currencySymbol(store.currency)}{store.latest_price}
                  </div>
                )}
                {store.distance != null && (
                  <div className="store-distance">
                    {store.distance < 1
                      ? Math.round(store.distance * 1000) + " m"
                      : store.distance.toFixed(1) + " km"}
                  </div>
                )}
                <i
                  className="ti ti-chevron-right"
                  style={{ fontSize: 14, color: "#d1d5db" }}
                />
              </div>
            </li>
          ))}
        </ul>
      )}
    </div>
  );
}
