import { useEffect, useRef, useState, useCallback } from "react";

const STATUS_COLORS = {
  verified: "#059669",
  pending: "#f59e0b",
  unverified: "#9ca3af",
  gone: "#ef4444",
  unknown: "#d1d5db", // Overpass stations not yet reported
};

// Fetch nearby gas stations and convenience stores from Overpass API
async function fetchOverpassStores(bounds) {
  const { south, west, north, east } = bounds;
  const bbox = `${south},${west},${north},${east}`;

  // Query for gas stations and convenience stores
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

export default function Map({ stores, userCoords, onAddClick, onStoreClick }) {
  const mapContainer = useRef(null);
  const mapRef = useRef(null);
  const markersRef = useRef([]);
  const overpassMarkersRef = useRef([]);
  const overpassFetchedRef = useRef(new Set()); // Track fetched viewports to avoid duplicates
  const [hoverPopup, setHoverPopup] = useState(null);
  const [overpassStores, setOverpassStores] = useState([]);
  const [overpassLoading, setOverpassLoading] = useState(false);
  const fetchTimeoutRef = useRef(null);

  // Fetch Overpass stations for the current viewport
  const fetchOverpassForViewport = useCallback(async (map) => {
    const bounds = map.getBounds();
    const zoom = map.getZoom();

    // Only fetch at zoom >= 12 to avoid too-wide queries
    if (zoom < 12) return;

    const south = bounds.getSouth().toFixed(3);
    const west = bounds.getWest().toFixed(3);
    const north = bounds.getNorth().toFixed(3);
    const east = bounds.getEast().toFixed(3);
    const key = `${south},${west},${north},${east}`;

    // Skip if already fetched this viewport
    if (overpassFetchedRef.current.has(key)) return;
    overpassFetchedRef.current.add(key);

    setOverpassLoading(true);
    try {
      const results = await fetchOverpassStores({ south, west, north, east });
      if (results.length > 0) {
        setOverpassStores((prev) => {
          // Merge, deduplicating by OSM id
          const existingIds = new Set(prev.map((s) => s.id));
          const newOnes = results.filter((r) => !existingIds.has(r.id));
          return [...prev, ...newOnes];
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

    // Debounced Overpass fetch on map move
    const handleMoveEnd = () => {
      clearTimeout(fetchTimeoutRef.current);
      fetchTimeoutRef.current = setTimeout(() => {
        fetchOverpassForViewport(map);
      }, 600);
    };

    map.on("moveend", handleMoveEnd);
    map.on("zoomend", handleMoveEnd);

    // Initial fetch
    setTimeout(() => fetchOverpassForViewport(map), 800);

    return () => {
      map.off("moveend", handleMoveEnd);
      map.off("zoomend", handleMoveEnd);
      clearTimeout(fetchTimeoutRef.current);
    };
  }, [fetchOverpassForViewport]);

  // Pan to user location
  useEffect(() => {
    if (!mapRef.current || !userCoords) return;
    mapRef.current.setView([userCoords.lat, userCoords.lng], 13);
  }, [userCoords]);

  // Render reported store markers
  useEffect(() => {
    if (!mapRef.current) return;
    const L = window.L;
    markersRef.current.forEach((m) => m.remove());
    markersRef.current = [];

    stores.forEach((store) => {
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
  }, [stores, onStoreClick]);

  // Render Overpass (gray "unknown") markers
  // Only show Overpass stations that aren't already in the reported stores
  useEffect(() => {
    if (!mapRef.current) return;
    const L = window.L;
    overpassMarkersRef.current.forEach((m) => m.remove());
    overpassMarkersRef.current = [];

    // Build a set of approximate lat/lng from reported stores to avoid duplicates
    const reportedLocations = new Set(
      stores.map((s) => `${parseFloat(s.lat).toFixed(3)},${parseFloat(s.lng).toFixed(3)}`)
    );

    overpassStores.forEach((store) => {
      const locKey = `${parseFloat(store.lat).toFixed(3)},${parseFloat(store.lng).toFixed(3)}`;
      // Skip if there's a reported store very close to this one
      if (reportedLocations.has(locKey)) return;

      const isGas = store.type === "gas";
      const color = STATUS_COLORS.unknown;

      const markerEl = L.divIcon({
        className: "",
        html: `<div style="
          width:26px;height:26px;background:#f9fafb;
          border:2px solid ${color};
          border-radius:50%;
          display:flex;align-items:center;justify-content:center;
          box-shadow:0 1px 4px rgba(0,0,0,0.1);cursor:pointer;
          opacity:0.8;">
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
        setHoverPopup({
          store: { ...store, _isOverpass: true },
          x: mRect.left - rect.left + mRect.width / 2,
          y: mRect.top - rect.top,
        });
      });
      el.addEventListener("mouseleave", () => setHoverPopup(null));
      el.addEventListener("click", () => {
        // When clicking an Overpass location, open it as a "pre-filled" report prompt
        onStoreClick({ ...store, _isOverpass: true });
      });

      overpassMarkersRef.current.push(marker);
    });
  }, [overpassStores, stores, onStoreClick]);

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
          {hoverPopup.store._isOverpass ? (
            <div className="hover-popup-hint" style={{ marginTop: 6, color: "#059669" }}>
              Click to report this location →
            </div>
          ) : (
            <div className="hover-popup-hint" style={{ marginTop: 6 }}>Click for details →</div>
          )}
        </div>
      )}
    </div>
  );
}
