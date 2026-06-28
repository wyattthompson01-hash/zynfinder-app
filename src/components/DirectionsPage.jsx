import { useEffect, useRef, useState, useCallback } from "react";

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

// Haversine distance in meters between two [lat,lng] points
function distanceM(lat1, lng1, lat2, lng2) {
  const R = 6371000;
  const φ1 = (lat1 * Math.PI) / 180, φ2 = (lat2 * Math.PI) / 180;
  const Δφ = ((lat2 - lat1) * Math.PI) / 180;
  const Δλ = ((lng2 - lng1) * Math.PI) / 180;
  const a = Math.sin(Δφ / 2) ** 2 + Math.cos(φ1) * Math.cos(φ2) * Math.sin(Δλ / 2) ** 2;
  return R * 2 * Math.atan2(Math.sqrt(a), Math.sqrt(1 - a));
}

export default function DirectionsPage({ store, userCoords, onBack }) {
  const mapContainer = useRef(null);
  const mapRef = useRef(null);
  const routeLayerRef = useRef(null);
  const userMarkerRef = useRef(null);
  const watchIdRef = useRef(null);
  const stepListRef = useRef(null);

  const [mode, setMode] = useState("driving");
  const [route, setRoute] = useState(null);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState(null);
  const [liveCoords, setLiveCoords] = useState(userCoords);
  const [isFollowing, setIsFollowing] = useState(true);
  const [currentStepIdx, setCurrentStepIdx] = useState(0);
  const [arrived, setArrived] = useState(false);

  // ── Init map ──────────────────────────────────────────────────────────────
  useEffect(() => {
    if (mapRef.current) return;
    const L = window.L;
    const center = userCoords ? [userCoords.lat, userCoords.lng] : [store.lat, store.lng];
    const map = L.map(mapContainer.current, { zoomControl: false }).setView(center, 15);

    L.tileLayer("https://{s}.tile.openstreetmap.org/{z}/{x}/{y}.png", {
      attribution: '© <a href="https://www.openstreetmap.org/copyright">OpenStreetMap</a>',
      maxZoom: 19,
    }).addTo(map);
    L.control.zoom({ position: "topright" }).addTo(map);

    // Destination pin
    const destIcon = L.divIcon({
      className: "",
      html: `<div style="width:36px;height:36px;background:#059669;border:2.5px solid #fff;border-radius:50% 50% 50% 0;transform:rotate(-45deg);display:flex;align-items:center;justify-content:center;box-shadow:0 2px 8px rgba(0,0,0,0.25);">
        <i class="ti ti-map-pin" style="transform:rotate(45deg);font-size:15px;color:#fff;"></i></div>`,
      iconSize: [36, 36], iconAnchor: [18, 36],
    });
    L.marker([store.lat, store.lng], { icon: destIcon }).addTo(map).bindTooltip(store.name);

    // User live position marker
    if (userCoords) {
      const userIcon = L.divIcon({
        className: "",
        html: `<div style="width:22px;height:22px;background:#3b82f6;border:3px solid #fff;border-radius:50%;box-shadow:0 2px 8px rgba(59,130,246,0.6);"></div>
               <div style="width:44px;height:44px;background:rgba(59,130,246,0.15);border-radius:50%;position:absolute;top:-11px;left:-11px;animation:pulse-ring 1.5s ease infinite;"></div>`,
        iconSize: [22, 22], iconAnchor: [11, 11],
      });
      const userM = L.marker([userCoords.lat, userCoords.lng], { icon: userIcon, zIndexOffset: 1000 }).addTo(map);
      userMarkerRef.current = userM;
    }

    // Stop following when user manually pans
    map.on("dragstart", () => setIsFollowing(false));

    mapRef.current = map;
  }, [store, userCoords]);

  // ── watchPosition — real-time tracking ───────────────────────────────────
  useEffect(() => {
    if (!navigator.geolocation) return;

    watchIdRef.current = navigator.geolocation.watchPosition(
      (pos) => {
        const coords = { lat: pos.coords.latitude, lng: pos.coords.longitude };
        setLiveCoords(coords);

        if (userMarkerRef.current) {
          userMarkerRef.current.setLatLng([coords.lat, coords.lng]);
        }

        if (isFollowing && mapRef.current) {
          mapRef.current.setView([coords.lat, coords.lng], mapRef.current.getZoom(), { animate: true });
        }
      },
      () => {},
      { enableHighAccuracy: true, maximumAge: 2000, timeout: 10000 }
    );

    return () => {
      if (watchIdRef.current !== null) {
        navigator.geolocation.clearWatch(watchIdRef.current);
      }
    };
  }, [isFollowing]);

  // ── Auto-advance steps based on proximity ────────────────────────────────
  useEffect(() => {
    if (!route || !liveCoords || arrived) return;
    const steps = route.steps;

    // Check if arrived at destination
    const destDist = distanceM(liveCoords.lat, liveCoords.lng, store.lat, store.lng);
    if (destDist < 30) { setArrived(true); return; }

    // Find next step within 40 m
    let best = currentStepIdx;
    for (let i = currentStepIdx; i < steps.length - 1; i++) {
      const [sLng, sLat] = steps[i].maneuver.location;
      const d = distanceM(liveCoords.lat, liveCoords.lng, sLat, sLng);
      if (d < 40) { best = Math.min(i + 1, steps.length - 1); break; }
    }
    if (best !== currentStepIdx) {
      setCurrentStepIdx(best);
      // Scroll step list to active step
      if (stepListRef.current) {
        const el = stepListRef.current.querySelector(`[data-step="${best}"]`);
        if (el) el.scrollIntoView({ behavior: "smooth", block: "nearest" });
      }
    }
  }, [liveCoords, route, arrived]);

  // ── Fetch route ───────────────────────────────────────────────────────────
  const fetchRoute = useCallback(async (coords) => {
    const origin = coords || liveCoords;
    if (!origin) { setError("Could not determine your location."); return; }
    setLoading(true); setError(null); setCurrentStepIdx(0); setArrived(false);

    try {
      const modeMap = { driving: "driving", walking: "foot", cycling: "bike" };
      const url = `https://router.project-osrm.org/route/v1/${modeMap[mode]}/${origin.lng},${origin.lat};${store.lng},${store.lat}?overview=full&geometries=geojson&steps=true`;
      const res = await fetch(url);
      const data = await res.json();
      if (data.code !== "Ok" || !data.routes.length) { setError("Could not find a route."); return; }

      const r = data.routes[0];
      setRoute({ distance: r.distance, duration: r.duration, geometry: r.geometry, steps: r.legs[0].steps });

      const L = window.L;
      if (routeLayerRef.current) mapRef.current.removeLayer(routeLayerRef.current);
      const layer = L.geoJSON(r.geometry, {
        style: { color: "#3b82f6", weight: 6, opacity: 0.85, lineCap: "round", lineJoin: "round" },
      }).addTo(mapRef.current);
      routeLayerRef.current = layer;

      // Fit to show entire route + some padding
      const bounds = layer.getBounds().extend([origin.lat, origin.lng]).extend([store.lat, store.lng]);
      mapRef.current.fitBounds(bounds, { padding: [60, 60] });
    } catch { setError("Failed to load directions."); }
    finally { setLoading(false); }
  }, [mode, liveCoords, store]);

  useEffect(() => {
    if (liveCoords) fetchRoute(liveCoords);
  }, [mode]);

  const recenter = () => {
    setIsFollowing(true);
    if (liveCoords && mapRef.current) {
      mapRef.current.setView([liveCoords.lat, liveCoords.lng], 16, { animate: true });
    }
  };

  // ── Remaining distance / time to destination ──────────────────────────────
  const remainingSteps = route ? route.steps.slice(currentStepIdx) : [];
  const remainingDist = remainingSteps.reduce((acc, s) => acc + s.distance, 0);
  const remainingTime = remainingSteps.reduce((acc, s) => acc + s.duration, 0);
  const currentStep = route?.steps[currentStepIdx];
  const nextStep = route?.steps[currentStepIdx + 1];

  return (
    <div className="directions-page">
      {/* Top bar */}
      <div className="directions-header">
        <button className="detail-back" onClick={onBack} style={{ margin: 0, flexShrink: 0 }}>
          <i className="ti ti-arrow-left" /> Back
        </button>
        <div className="directions-title">
          <div style={{ fontWeight: 700, fontSize: 15 }}>{store.name}</div>
          <div style={{ fontSize: 12, color: "#6b7280" }}>{store.address}</div>
        </div>
      </div>

      {/* Mode switcher */}
      <div className="directions-modes">
        {TRAVEL_MODES.map((m) => (
          <button key={m.id} className={`mode-btn ${mode === m.id ? "active" : ""}`} onClick={() => setMode(m.id)}>
            <i className={`ti ti-${m.icon}`} />{m.label}
          </button>
        ))}
      </div>

      {/* Arrived banner */}
      {arrived && (
        <div className="nav-arrived">
          <i className="ti ti-circle-check" style={{ fontSize: 22 }} />
          <div>
            <div style={{ fontWeight: 700, fontSize: 15 }}>You have arrived!</div>
            <div style={{ fontSize: 12, opacity: 0.8 }}>{store.name}</div>
          </div>
        </div>
      )}

      {/* Active step banner */}
      {!arrived && currentStep && !loading && (
        <div className="nav-step-banner">
          <div className="nav-step-icon">
            <i className={`ti ${stepIcon(currentStep)}`} />
          </div>
          <div className="nav-step-text">
            <div className="nav-step-instruction">{stepInstruction(currentStep)}</div>
            {nextStep && (
              <div className="nav-step-then">
                then · {stepInstruction(nextStep).slice(0, 50)}
              </div>
            )}
          </div>
          <div className="nav-step-dist">
            {currentStep.distance > 0 && formatDistance(currentStep.distance)}
          </div>
        </div>
      )}

      {/* ETA bar */}
      {route && !loading && !arrived && (
        <div className="nav-eta-bar">
          <div className="nav-eta-item">
            <i className="ti ti-clock" />
            <strong>{formatDuration(remainingTime)}</strong>
          </div>
          <div className="nav-eta-divider" />
          <div className="nav-eta-item">
            <i className="ti ti-ruler" />
            <strong>{formatDistance(remainingDist)}</strong>
          </div>
          <div style={{ marginLeft: "auto", display: "flex", gap: 8 }}>
            {!isFollowing && (
              <button className="nav-recenter-btn" onClick={recenter}>
                <i className="ti ti-crosshair" /> Recenter
              </button>
            )}
          </div>
        </div>
      )}

      {loading && (
        <div className="route-summary" style={{ justifyContent: "center", gap: 8 }}>
          <div className="spinner" style={{ width: 18, height: 18, borderWidth: 2 }} />
          <span style={{ fontSize: 13, color: "#6b7280" }}>Finding route…</span>
        </div>
      )}
      {error && <div className="route-error">{error}</div>}

      {/* Map */}
      <div ref={mapContainer} className="directions-map" />

      {/* Turn-by-turn list */}
      {route && !arrived && (
        <div className="steps-panel" ref={stepListRef}>
          <div className="steps-title">All turns</div>
          <ol className="steps-list">
            {route.steps.map((step, i) => (
              <li key={i} data-step={i} className={`step-item ${i === currentStepIdx ? "active-step" : ""} ${i < currentStepIdx ? "passed-step" : ""}`}>
                <div className="step-icon">
                  <i className={`ti ${stepIcon(step)}`} />
                </div>
                <div className="step-info">
                  <div className="step-instruction">{stepInstruction(step)}</div>
                  {step.distance > 0 && <div className="step-distance">{formatDistance(step.distance)}</div>}
                </div>
              </li>
            ))}
          </ol>
        </div>
      )}
    </div>
  );
}
