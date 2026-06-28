import { useEffect, useRef, useState } from "react";

const TRAVEL_MODES = [
  { id: "driving", label: "Drive", icon: "car", osrm: "driving" },
  { id: "walking", label: "Walk", icon: "walk", osrm: "foot" },
  { id: "cycling", label: "Cycle", icon: "bike", osrm: "bike" },
];

function formatDistance(meters) {
  if (meters < 1000) return `${Math.round(meters)} m`;
  return `${(meters / 1000).toFixed(1)} km`;
}

function formatDuration(seconds) {
  const mins = Math.round(seconds / 60);
  if (mins < 60) return `${mins} min`;
  const hrs = Math.floor(mins / 60);
  const rem = mins % 60;
  return rem > 0 ? `${hrs} hr ${rem} min` : `${hrs} hr`;
}

// Convert OSRM step maneuver to human-readable instruction
function stepInstruction(step) {
  const { maneuver, name } = step;
  const road = name && name !== "" ? `onto ${name}` : "";
  const type = maneuver.type;
  const mod = maneuver.modifier;

  if (type === "depart") return `Head ${mod || "forward"} ${road}`;
  if (type === "arrive") return "You have arrived at your destination";
  if (type === "turn") {
    if (mod === "left") return `Turn left ${road}`;
    if (mod === "right") return `Turn right ${road}`;
    if (mod === "slight left") return `Keep slight left ${road}`;
    if (mod === "slight right") return `Keep slight right ${road}`;
    if (mod === "sharp left") return `Turn sharp left ${road}`;
    if (mod === "sharp right") return `Turn sharp right ${road}`;
    if (mod === "uturn") return `Make a U-turn ${road}`;
    return `Turn ${road}`;
  }
  if (type === "new name") return `Continue ${road}`;
  if (type === "continue") return `Continue ${mod || ""} ${road}`;
  if (type === "merge") return `Merge ${mod || ""} ${road}`;
  if (type === "on ramp") return `Take the ramp ${road}`;
  if (type === "off ramp") return `Take the exit ${road}`;
  if (type === "roundabout") return `Enter the roundabout and exit ${road}`;
  if (type === "rotary") return `Enter the rotary ${road}`;
  if (type === "fork") return `Keep ${mod || "straight"} at the fork ${road}`;
  return `Continue ${road}`;
}

function stepIcon(step) {
  const type = step.maneuver.type;
  const mod = step.maneuver.modifier;
  if (type === "depart") return "ti-navigation";
  if (type === "arrive") return "ti-map-pin";
  if (type === "roundabout" || type === "rotary") return "ti-rotate-clockwise";
  if (mod === "left" || mod === "sharp left" || mod === "slight left") return "ti-arrow-bear-left";
  if (mod === "right" || mod === "sharp right" || mod === "slight right") return "ti-arrow-bear-right";
  if (mod === "uturn") return "ti-arrow-back-up";
  return "ti-arrow-up";
}

export default function DirectionsPage({ store, userCoords, onBack }) {
  const mapContainer = useRef(null);
  const mapRef = useRef(null);
  const routeLayerRef = useRef(null);
  const [mode, setMode] = useState("driving");
  const [route, setRoute] = useState(null);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState(null);

  // Init map
  useEffect(() => {
    if (mapRef.current) return;
    const L = window.L;
    const map = L.map(mapContainer.current, { zoomControl: false }).setView(
      userCoords ? [userCoords.lat, userCoords.lng] : [store.lat, store.lng],
      14
    );
    L.tileLayer("https://{s}.tile.openstreetmap.org/{z}/{x}/{y}.png", {
      attribution: '© <a href="https://www.openstreetmap.org/copyright">OpenStreetMap</a>',
      maxZoom: 19,
    }).addTo(map);
    L.control.zoom({ position: "topright" }).addTo(map);

    // Destination marker
    const destIcon = L.divIcon({
      className: "",
      html: `<div style="width:32px;height:32px;background:#059669;border:2.5px solid #fff;border-radius:50% 50% 50% 0;transform:rotate(-45deg);display:flex;align-items:center;justify-content:center;box-shadow:0 2px 8px rgba(0,0,0,0.25);">
        <i class="ti ti-map-pin" style="transform:rotate(45deg);font-size:14px;color:#fff;"></i>
      </div>`,
      iconSize: [32, 32],
      iconAnchor: [16, 32],
    });
    L.marker([store.lat, store.lng], { icon: destIcon }).addTo(map)
      .bindTooltip(store.name, { permanent: false });

    // User marker
    if (userCoords) {
      const userIcon = L.divIcon({
        className: "",
        html: `<div style="width:16px;height:16px;background:#3b82f6;border:3px solid #fff;border-radius:50%;box-shadow:0 2px 6px rgba(59,130,246,0.5);"></div>`,
        iconSize: [16, 16],
        iconAnchor: [8, 8],
      });
      L.marker([userCoords.lat, userCoords.lng], { icon: userIcon }).addTo(map)
        .bindTooltip("Your location", { permanent: false });
    }

    mapRef.current = map;
  }, [store, userCoords]);

  // Fetch route when mode changes
  useEffect(() => {
    if (!userCoords) return;
    fetchRoute();
  }, [mode, userCoords]);

  const fetchRoute = async () => {
    if (!userCoords) { setError("Could not determine your location."); return; }
    setLoading(true);
    setError(null);

    try {
      const modeMap = { driving: "driving", walking: "foot", cycling: "bike" };
      const osrmMode = modeMap[mode];
      const url = `https://router.project-osrm.org/route/v1/${osrmMode}/${userCoords.lng},${userCoords.lat};${store.lng},${store.lat}?overview=full&geometries=geojson&steps=true&annotations=false`;

      const res = await fetch(url);
      const data = await res.json();

      if (data.code !== "Ok" || !data.routes.length) {
        setError("Could not find a route. Try a different travel mode.");
        return;
      }

      const r = data.routes[0];
      setRoute({
        distance: r.distance,
        duration: r.duration,
        geometry: r.geometry,
        steps: r.legs[0].steps,
      });

      // Draw route on map
      const L = window.L;
      if (routeLayerRef.current) {
        mapRef.current.removeLayer(routeLayerRef.current);
      }
      const layer = L.geoJSON(r.geometry, {
        style: { color: "#3b82f6", weight: 5, opacity: 0.8, lineCap: "round", lineJoin: "round" },
      }).addTo(mapRef.current);
      routeLayerRef.current = layer;

      // Fit map to route
      mapRef.current.fitBounds(layer.getBounds(), { padding: [40, 40] });
    } catch (e) {
      setError("Failed to load directions. Check your connection.");
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="directions-page">
      {/* Top bar */}
      <div className="directions-header">
        <button className="detail-back" onClick={onBack} style={{ margin: 0 }}>
          <i className="ti ti-arrow-left" /> Back
        </button>
        <div className="directions-title">
          <div style={{ fontWeight: 700, fontSize: 15, color: "var(--gray-900)" }}>{store.name}</div>
          <div style={{ fontSize: 12, color: "var(--gray-500)" }}>{store.address}</div>
        </div>
      </div>

      {/* Mode switcher */}
      <div className="directions-modes">
        {TRAVEL_MODES.map((m) => (
          <button
            key={m.id}
            className={`mode-btn ${mode === m.id ? "active" : ""}`}
            onClick={() => setMode(m.id)}
          >
            <i className={`ti ti-${m.icon}`} />
            {m.label}
          </button>
        ))}
      </div>

      {/* Route summary */}
      {route && !loading && (
        <div className="route-summary">
          <div className="route-stat">
            <i className="ti ti-clock" />
            <span>{formatDuration(route.duration)}</span>
          </div>
          <div className="route-divider" />
          <div className="route-stat">
            <i className="ti ti-ruler" />
            <span>{formatDistance(route.distance)}</span>
          </div>
        </div>
      )}

      {loading && (
        <div className="route-summary" style={{ justifyContent: "center" }}>
          <div className="spinner" style={{ width: 20, height: 20, borderWidth: 2 }} />
          <span style={{ fontSize: 13, color: "var(--gray-500)" }}>Finding route…</span>
        </div>
      )}

      {error && (
        <div className="route-error">{error}</div>
      )}

      {/* Map */}
      <div ref={mapContainer} className="directions-map" />

      {/* Turn by turn */}
      {route && (
        <div className="steps-panel">
          <div className="steps-title">Turn-by-turn directions</div>
          <ol className="steps-list">
            {route.steps.map((step, i) => (
              <li key={i} className="step-item">
                <div className="step-icon">
                  <i className={`ti ${stepIcon(step)}`} />
                </div>
                <div className="step-info">
                  <div className="step-instruction">{stepInstruction(step)}</div>
                  {step.distance > 0 && (
                    <div className="step-distance">{formatDistance(step.distance)}</div>
                  )}
                </div>
              </li>
            ))}
          </ol>
        </div>
      )}
    </div>
  );
}
