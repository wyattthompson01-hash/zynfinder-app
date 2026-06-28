import { useEffect, useRef, useState } from "react";

const STATUS_COLORS = {
  verified: "#059669",
  pending: "#f59e0b",
  unverified: "#9ca3af",
  gone: "#ef4444",
};

export default function Map({ stores, userCoords, onAddClick, onStoreClick }) {
  const mapContainer = useRef(null);
  const mapRef = useRef(null);
  const markersRef = useRef([]);
  const [hoverPopup, setHoverPopup] = useState(null);

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
  }, []);

  useEffect(() => {
    if (!mapRef.current || !userCoords) return;
    mapRef.current.setView([userCoords.lat, userCoords.lng], 13);
  }, [userCoords]);

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

  const statusLabel = (s) => ({ verified: "✓ Verified", pending: "Needs verification", gone: "No longer sells", unverified: "Unconfirmed" }[s] || "Unconfirmed");

  return (
    <div className="map-wrapper">
      <div ref={mapContainer} className="map-container" />
      <div className="map-legend">
        <div className="legend-title">Status</div>
        <div className="legend-row"><span className="legend-dot" style={{ background: "#059669" }} />Verified</div>
        <div className="legend-row"><span className="legend-dot" style={{ background: "#f59e0b" }} />Needs verify</div>
        <div className="legend-row"><span className="legend-dot" style={{ background: "#9ca3af" }} />Unconfirmed</div>
        <div className="legend-row"><span className="legend-dot" style={{ background: "#ef4444" }} />Gone</div>
      </div>
      <button className="fab" onClick={onAddClick}>
        <i className="ti ti-plus" /> Report location
      </button>
      {hoverPopup && (
        <div className="map-hover-popup" style={{ left: hoverPopup.x, top: hoverPopup.y }}>
          <div className="hover-popup-name">{hoverPopup.store.name}</div>
          <div className="hover-popup-addr">{hoverPopup.store.address}</div>
          <span className={`status-badge ${hoverPopup.store.status}`}>{statusLabel(hoverPopup.store.status)}</span>
          <div className="hover-popup-hint" style={{ marginTop: 6 }}>Click for details →</div>
        </div>
      )}
    </div>
  );
}
