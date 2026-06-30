import { useEffect, useRef, useState, useCallback } from "react";

const STATUS_COLORS = {
  verified: "#059669",
  pending: "#f59e0b",
  unverified: "#9ca3af",
  gone: "#ef4444",
  unknown: "#d1d5db",
};

async function fetchOverpassStores(bounds) {
  const { south, west, north, east } = bounds;
  const bbox = `${south},${west},${north},${east}`;
  const query = `
    [out:json][timeout:10];
    (
      node["amenity"="fuel"](${bbox});
      node["shop"="convenience"](${bbox});
      node["shop"="gas"](${bbox});
    );
    out body;
  `.trim();
  try {
    const res = await fetch("https://overpass-api.de/api/interpreter", {
      method: "POST",
      body: `data=${encodeURIComponent(query)}`,
      headers: { "Content-Type": "application/x-www-form-urlencoded" },
    });
    const data = await res.json();
    return (data.elements || []).map((el) => ({
      id: `osm-${el.id}`,
      name: el.tags?.name || el.tags?.brand || "Unknown Store",
      address: [el.tags?.["addr:housenumber"], el.tags?.["addr:street"], el.tags?.["addr:city"]]
        .filter(Boolean).join(" ") || "Address not available",
      lat: el.lat,
      lng: el.lon,
      type: el.tags?.amenity === "fuel" ? "gas" : "convenience",
      status: "unknown",
      confirmations: 0,
      reports: 0,
      flavors: [],
      strength: "Unsure",
    }));
  } catch (e) {
    console.warn("Overpass fetch failed:", e);
    return [];
  }
}

const FILTER_TYPES = [
  { id: "all", label: "All types" },
  { id: "gas", label: "Gas station" },
  { id: "convenience", label: "Convenience" },
  { id: "pharmacy", label: "Pharmacy" },
];
const FILTER_STATUS = [
  { id: "all", label: "Any status" },
  { id: "verified", label: "Verified" },
  { id: "pending", label: "Needs verify" },
  { id: "unverified", label: "Unconfirmed" },
];

export default function Map({ stores, userCoords, onAddClick, onStoreClick }) {
  const mapContainer = useRef(null);
  const mapRef = useRef(null);
  const markersRef = useRef([]);
  const overpassMarkersRef = useRef([]);
  const overpassFetchedRef = useRef(new Set());
  const [hoverPopup, setHoverPopup] = useState(null);
  const [overpassStores, setOverpassStores] = useState([]);
  const [overpassLoading, setOverpassLoading] = useState(false);
  const fetchTimeoutRef = useRef(null);

  // Search state
  const [searchQuery, setSearchQuery] = useState("");
  const [searchFocused, setSearchFocused] = useState(false);
  const [filterType, setFilterType] = useState("all");
  const [filterStatus, setFilterStatus] = useState("all");
  const [filterHasPrice, setFilterHasPrice] = useState(false);
  const [showFilters, setShowFilters] = useState(false);
  const searchInputRef = useRef(null);
  const suggestDebounceRef = useRef(null);

  // Geocode suggestions
  const [geocoding, setGeocoding] = useState(false);
  const [placeSuggestions, setPlaceSuggestions] = useState([]);
  const [placesLoading, setPlacesLoading] = useState(false);

  // Filtered store results for dropdown
  const allDisplayStores = [...stores, ...overpassStores];
  const searchResults = searchQuery.length >= 2
    ? allDisplayStores.filter(s => {
        const q = searchQuery.toLowerCase();
        return s.name.toLowerCase().includes(q) || s.address.toLowerCase().includes(q);
      }).slice(0, 5)
    : [];

  // Fetch Nominatim place suggestions as user types
  useEffect(() => {
    clearTimeout(suggestDebounceRef.current);
    if (searchQuery.length < 2) { setPlaceSuggestions([]); return; }
    suggestDebounceRef.current = setTimeout(async () => {
      setPlacesLoading(true);
      try {
        const res = await fetch(
          `https://nominatim.openstreetmap.org/search?q=${encodeURIComponent(searchQuery)}&format=json&limit=4`,
          { headers: { "Accept-Language": "en", "User-Agent": "ZynFinder/1.0" } }
        );
        const data = await res.json();
        setPlaceSuggestions(data);
      } catch {}
      setPlacesLoading(false);
    }, 350);
    return () => clearTimeout(suggestDebounceRef.current);
  }, [searchQuery]);

  // Active filter count
  const activeFilters = [filterType !== "all", filterStatus !== "all", filterHasPrice].filter(Boolean).length;

  // Filter markers based on active filters
  const filteredForMarkers = useCallback((storeList) => {
    return storeList.filter(s => {
      if (filterType !== "all" && s.type !== filterType) return false;
      if (filterStatus !== "all" && s.status !== filterStatus) return false;
      if (filterHasPrice && !s.latest_price) return false;
      return true;
    });
  }, [filterType, filterStatus, filterHasPrice]);

  const fetchOverpassForViewport = useCallback(async (map) => {
    const bounds = map.getBounds();
    const zoom = map.getZoom();
    if (zoom < 12) return;
    const south = bounds.getSouth().toFixed(3);
    const west = bounds.getWest().toFixed(3);
    const north = bounds.getNorth().toFixed(3);
    const east = bounds.getEast().toFixed(3);
    const key = `${south},${west},${north},${east}`;
    if (overpassFetchedRef.current.has(key)) return;
    overpassFetchedRef.current.add(key);
    setOverpassLoading(true);
    try {
      const results = await fetchOverpassStores({ south, west, north, east });
      if (results.length > 0) {
        setOverpassStores((prev) => {
          const existingIds = new Set(prev.map((s) => s.id));
          return [...prev, ...results.filter((r) => !existingIds.has(r.id))];
        });
      }
    } finally {
      setOverpassLoading(false);
    }
  }, []);

  // Init map
  useEffect(() => {
    if (mapRef.current) return;
    const L = window.L;
    const center = userCoords ? [userCoords.lat, userCoords.lng] : [43.6532, -79.3832];
    const map = L.map(mapContainer.current, { zoomControl: false }).setView(center, 13);
    L.tileLayer("https://{s}.tile.openstreetmap.org/{z}/{x}/{y}.png", {
      attribution: '© <a href="https://www.openstreetmap.org/copyright">OpenStreetMap</a>',
      maxZoom: 19,
    }).addTo(map);
    L.control.zoom({ position: "topright" }).addTo(map);
    mapRef.current = map;

    const handleMoveEnd = () => {
      clearTimeout(fetchTimeoutRef.current);
      fetchTimeoutRef.current = setTimeout(() => fetchOverpassForViewport(map), 600);
    };
    map.on("moveend", handleMoveEnd);
    map.on("zoomend", handleMoveEnd);
    setTimeout(() => fetchOverpassForViewport(map), 800);

    return () => {
      map.off("moveend", handleMoveEnd);
      map.off("zoomend", handleMoveEnd);
      clearTimeout(fetchTimeoutRef.current);
    };
  }, [fetchOverpassForViewport]);

  useEffect(() => {
    if (!mapRef.current || !userCoords) return;
    mapRef.current.setView([userCoords.lat, userCoords.lng], 13);
  }, [userCoords]);

  // Render reported markers (filtered)
  useEffect(() => {
    if (!mapRef.current) return;
    const L = window.L;
    markersRef.current.forEach((m) => m.remove());
    markersRef.current = [];

    filteredForMarkers(stores).forEach((store) => {
      const color = STATUS_COLORS[store.status] || STATUS_COLORS.unverified;
      const isGas = store.type === "gas";
      const markerEl = L.divIcon({
        className: "",
        html: `<div style="
          width:36px;height:36px;background:#fff;
          border:2.5px solid ${color};
          border-radius:50% 50% 50% 0;
          transform:rotate(-45deg);
          display:flex;align-items:center;justify-content:center;
          box-shadow:0 2px 8px rgba(0,0,0,0.2);cursor:pointer;">
          <i class="ti ti-${isGas ? "gas-station" : "building-store"}" style="transform:rotate(45deg);font-size:15px;color:${color};"></i>
        </div>`,
        iconSize: [36, 36],
        iconAnchor: [18, 36],
      });
      const marker = L.marker([store.lat, store.lng], { icon: markerEl }).addTo(mapRef.current);
      const el = marker.getElement();
      el.addEventListener("mouseenter", () => {
        const rect = mapContainer.current.getBoundingClientRect();
        const mRect = el.getBoundingClientRect();
        setHoverPopup({ store, x: mRect.left - rect.left + mRect.width / 2, y: mRect.top - rect.top });
      });
      el.addEventListener("mouseleave", () => setHoverPopup(null));
      el.addEventListener("click", () => onStoreClick(store));
      markersRef.current.push(marker);
    });
  }, [stores, filteredForMarkers, onStoreClick]);

  // Render Overpass markers (filtered)
  useEffect(() => {
    if (!mapRef.current) return;
    const L = window.L;
    overpassMarkersRef.current.forEach((m) => m.remove());
    overpassMarkersRef.current = [];

    const reportedLocations = new Set(
      stores.map((s) => `${parseFloat(s.lat).toFixed(3)},${parseFloat(s.lng).toFixed(3)}`)
    );

    filteredForMarkers(overpassStores).forEach((store) => {
      const locKey = `${parseFloat(store.lat).toFixed(3)},${parseFloat(store.lng).toFixed(3)}`;
      if (reportedLocations.has(locKey)) return;
      const isGas = store.type === "gas";
      const markerEl = L.divIcon({
        className: "",
        html: `<div style="
          width:26px;height:26px;background:#f9fafb;
          border:2px solid #d1d5db;
          border-radius:50%;
          display:flex;align-items:center;justify-content:center;
          box-shadow:0 1px 4px rgba(0,0,0,0.1);cursor:pointer;opacity:0.8;">
          <i class="ti ti-${isGas ? "gas-station" : "building-store"}" style="font-size:12px;color:#9ca3af;"></i>
        </div>`,
        iconSize: [26, 26],
        iconAnchor: [13, 13],
      });
      const marker = L.marker([store.lat, store.lng], { icon: markerEl, zIndexOffset: -100 }).addTo(mapRef.current);
      const el = marker.getElement();
      el.addEventListener("mouseenter", () => {
        const rect = mapContainer.current.getBoundingClientRect();
        const mRect = el.getBoundingClientRect();
        setHoverPopup({ store: { ...store, _isOverpass: true }, x: mRect.left - rect.left + mRect.width / 2, y: mRect.top - rect.top });
      });
      el.addEventListener("mouseleave", () => setHoverPopup(null));
      el.addEventListener("click", () => onStoreClick({ ...store, _isOverpass: true }));
      overpassMarkersRef.current.push(marker);
    });
  }, [overpassStores, stores, filteredForMarkers, onStoreClick]);

  // Fly to store from search result
  const flyToStore = useCallback((store) => {
    if (!mapRef.current) return;
    mapRef.current.setView([store.lat, store.lng], 16, { animate: true });
    setSearchQuery("");
    setSearchFocused(false);
    // Short delay then trigger the click popup
    setTimeout(() => onStoreClick(store), 400);
  }, [onStoreClick]);

  // Geocode arbitrary address (when search result doesn't match a known store)
  const geocodeSearch = useCallback(async (query) => {
    if (!query.trim()) return;
    setGeocoding(true);
    try {
      const res = await fetch(
        `https://nominatim.openstreetmap.org/search?q=${encodeURIComponent(query)}&format=json&limit=1`,
        { headers: { "Accept-Language": "en", "User-Agent": "SnusWorld/1.0" } }
      );
      const data = await res.json();
      if (data.length && mapRef.current) {
        mapRef.current.setView([parseFloat(data[0].lat), parseFloat(data[0].lon)], 14, { animate: true });
      }
    } catch {}
    setGeocoding(false);
    setSearchFocused(false);
  }, []);

  const statusLabel = (s) => ({
    verified: "✓ Verified",
    pending: "Needs verification",
    gone: "No longer sells",
    unverified: "Unconfirmed",
    unknown: "Not yet reported",
  }[s] || "Unconfirmed");

  return (
    <div className="map-wrapper">
      <div ref={mapContainer} className="map-container" />

      {/* ── Search overlay ── */}
      <div className={`map-search-overlay ${searchFocused || searchQuery ? "focused" : ""}`}>
        <div className="map-search-bar">
          <i className="ti ti-search map-search-icon" />
          <input
            ref={searchInputRef}
            className="map-search-input"
            placeholder="Search stores or type an address…"
            value={searchQuery}
            onChange={e => { setSearchQuery(e.target.value); setSearchFocused(true); }}
            onFocus={() => setSearchFocused(true)}
            onBlur={() => setTimeout(() => setSearchFocused(false), 200)}
            onKeyDown={e => {
              if (e.key === "Enter") {
                if (searchResults.length > 0) flyToStore(searchResults[0]);
                else if (placeSuggestions.length > 0) {
                  const p = placeSuggestions[0];
                  mapRef.current?.setView([parseFloat(p.lat), parseFloat(p.lon)], 14, { animate: true });
                  setSearchQuery("");
                  setSearchFocused(false);
                } else geocodeSearch(searchQuery);
              }
              if (e.key === "Escape") { setSearchFocused(false); searchInputRef.current?.blur(); }
            }}
          />
          {(geocoding || placesLoading) && (
            <div className="map-search-spinner"><div className="spinner" style={{ width: 14, height: 14, borderWidth: 2 }} /></div>
          )}
          {searchQuery && (
            <button className="map-search-clear" onClick={() => { setSearchQuery(""); setPlaceSuggestions([]); searchInputRef.current?.focus(); }}>
              <i className="ti ti-x" />
            </button>
          )}
          <button
            className={`map-filter-btn ${showFilters ? "active" : ""} ${activeFilters > 0 ? "has-filters" : ""}`}
            onClick={() => setShowFilters(f => !f)}
            title="Filters"
          >
            <i className="ti ti-adjustments-horizontal" />
            {activeFilters > 0 && <span className="filter-count-dot">{activeFilters}</span>}
          </button>
        </div>

        {/* Dropdown results */}
        {searchFocused && searchQuery.length >= 2 && (searchResults.length > 0 || placeSuggestions.length > 0 || placesLoading) && (
          <div className="map-search-results">
            {/* Known store matches */}
            {searchResults.length > 0 && (
              <>
                <div className="msr-section-label">Stores</div>
                {searchResults.map((s, i) => (
                  <button key={i} className="msr-item" onMouseDown={() => flyToStore(s)}>
                    <div className={`msr-type-icon ${s.status === "verified" ? "verified" : s.type}`}>
                      <i className={`ti ti-${s.type === "gas" ? "gas-station" : "building-store"}`} />
                    </div>
                    <div className="msr-info">
                      <div className="msr-name">{s.name}</div>
                      <div className="msr-addr">{s.address}</div>
                    </div>
                    {s.status !== "unknown" && (
                      <span className={`status-badge ${s.status}`} style={{ fontSize: 10, padding: "2px 6px", flexShrink: 0 }}>
                        {statusLabel(s.status)}
                      </span>
                    )}
                  </button>
                ))}
              </>
            )}

            {/* Geocoded place suggestions */}
            {placeSuggestions.length > 0 && (
              <>
                <div className="msr-section-label">Places</div>
                {placeSuggestions.map((place, i) => {
                  const parts = place.display_name.split(",");
                  const title = parts[0].trim();
                  const subtitle = parts.slice(1, 3).join(",").trim();
                  return (
                    <button key={`place-${i}`} className="msr-item" onMouseDown={() => {
                      mapRef.current?.setView([parseFloat(place.lat), parseFloat(place.lon)], 14, { animate: true });
                      setSearchQuery("");
                      setPlaceSuggestions([]);
                      setSearchFocused(false);
                    }}>
                      <div className="msr-type-icon place">
                        <i className="ti ti-map-pin" />
                      </div>
                      <div className="msr-info">
                        <div className="msr-name">{title}</div>
                        <div className="msr-addr">{subtitle}</div>
                      </div>
                    </button>
                  );
                })}
              </>
            )}

            {/* Loading state */}
            {placesLoading && searchResults.length === 0 && placeSuggestions.length === 0 && (
              <div className="msr-empty">
                <div className="spinner" style={{ width: 13, height: 13, borderWidth: 2, display: "inline-block", verticalAlign: "middle", marginRight: 6 }} />
                Searching…
              </div>
            )}
          </div>
        )}

        {/* Filter panel */}
        {showFilters && (
          <div className="map-filter-panel">
            <div className="mfp-section">
              <div className="mfp-label">Store type</div>
              <div className="mfp-chips">
                {FILTER_TYPES.map(f => (
                  <button key={f.id}
                    className={`mfp-chip ${filterType === f.id ? "active" : ""}`}
                    onClick={() => setFilterType(f.id)}>
                    {f.label}
                  </button>
                ))}
              </div>
            </div>
            <div className="mfp-section">
              <div className="mfp-label">Status</div>
              <div className="mfp-chips">
                {FILTER_STATUS.map(f => (
                  <button key={f.id}
                    className={`mfp-chip ${filterStatus === f.id ? "active" : ""}`}
                    onClick={() => setFilterStatus(f.id)}>
                    {f.label}
                  </button>
                ))}
              </div>
            </div>
            <div className="mfp-section">
              <label className="mfp-toggle">
                <input type="checkbox" checked={filterHasPrice}
                  onChange={e => setFilterHasPrice(e.target.checked)} />
                <span className="mfp-toggle-track" />
                <span className="mfp-toggle-label">Has price data only</span>
              </label>
            </div>
            {activeFilters > 0 && (
              <button className="mfp-clear" onClick={() => {
                setFilterType("all"); setFilterStatus("all"); setFilterHasPrice(false);
              }}>
                <i className="ti ti-x" /> Clear all filters
              </button>
            )}
          </div>
        )}
      </div>

      {/* Legend */}
      <div className="map-legend">
        <div className="legend-title">Status</div>
        <div className="legend-row"><span className="legend-dot" style={{ background: "#059669" }} />Verified</div>
        <div className="legend-row"><span className="legend-dot" style={{ background: "#f59e0b" }} />Needs verify</div>
        <div className="legend-row"><span className="legend-dot" style={{ background: "#9ca3af" }} />Unconfirmed</div>
        <div className="legend-row"><span className="legend-dot" style={{ background: "#ef4444" }} />Gone</div>
        <div className="legend-row">
          <span className="legend-dot" style={{ background: "#d1d5db", border: "1px solid #9ca3af" }} />
          Potential
        </div>
        {activeFilters > 0 && (
          <div className="legend-row" style={{ marginTop: 6, color: "#10b981", fontSize: 11 }}>
            <i className="ti ti-filter" /> {activeFilters} filter{activeFilters !== 1 ? "s" : ""} active
          </div>
        )}
      </div>

      {overpassLoading && (
        <div className="overpass-loading-badge">
          <div className="spinner" style={{ width: 12, height: 12, borderWidth: 2 }} />
          Loading nearby stores…
        </div>
      )}

      <button className="fab" onClick={onAddClick}>
        <i className="ti ti-plus" /> Report location
      </button>

      {hoverPopup && (
        <div className="map-hover-popup" style={{ left: hoverPopup.x, top: hoverPopup.y }}>
          <div className="hover-popup-name">{hoverPopup.store.name}</div>
          <div className="hover-popup-addr">{hoverPopup.store.address}</div>
          <span className={`status-badge ${hoverPopup.store.status}`}>{statusLabel(hoverPopup.store.status)}</span>
          {hoverPopup.store.latest_price && (
            <div style={{ marginTop: 4, color: "#10b981", fontSize: 13, fontWeight: 600 }}>
              <i className="ti ti-tag" style={{ marginRight: 4 }} />
              ${parseFloat(hoverPopup.store.latest_price).toFixed(2)}
            </div>
          )}
          {hoverPopup.store._isOverpass ? (
            <div className="hover-popup-hint" style={{ marginTop: 6, color: "#059669" }}>Click to report →</div>
          ) : (
            <div className="hover-popup-hint" style={{ marginTop: 6 }}>Click for details →</div>
          )}
        </div>
      )}
    </div>
  );
}
