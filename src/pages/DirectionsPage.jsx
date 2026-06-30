import { useEffect, useRef, useState, useCallback, useMemo } from "react";

// Each mode uses a separate OSRM backend so walk/cycle actually differ from drive
const MODES = [
  { id: "driving", label: "Drive",  icon: "car",  base: "https://router.project-osrm.org/route/v1/driving/" },
  { id: "walking", label: "Walk",   icon: "walk", base: "https://routing.openstreetmap.de/routed-foot/route/v1/walking/" },
  { id: "cycling", label: "Cycle",  icon: "bike", base: "https://routing.openstreetmap.de/routed-bike/route/v1/cycling/" },
];

const TILE_LAYERS = {
  standard:  { label: "Map",       url: "https://{s}.tile.openstreetmap.org/{z}/{x}/{y}.png", attr: "© OpenStreetMap" },
  satellite: { label: "Satellite", url: "https://server.arcgisonline.com/ArcGIS/rest/services/World_Imagery/MapServer/tile/{z}/{y}/{x}", attr: "© Esri" },
  terrain:   { label: "Terrain",   url: "https://tile.opentopomap.org/{z}/{x}/{y}.png", attr: "© OpenTopoMap" },
  dark:      { label: "Dark",      url: "https://{s}.basemaps.cartocdn.com/dark_all/{z}/{x}/{y}{r}.png", attr: "© OpenStreetMap © CARTO" },
};

function fmtDist(m) { return m < 1000 ? `${Math.round(m)} m` : `${(m / 1000).toFixed(1)} km`; }
function fmtTime(s) {
  const m = Math.round(s / 60);
  if (m < 60) return `${m} min`;
  return `${Math.floor(m / 60)} hr ${m % 60} min`;
}

function stepIcon(step) {
  const t = step.maneuver.type, m = step.maneuver.modifier;
  if (t === "depart") return "ti-navigation";
  if (t === "arrive") return "ti-map-pin";
  if (t === "roundabout" || t === "rotary") return "ti-rotate-clockwise";
  if (m === "left" || m === "sharp left" || m === "slight left") return "ti-arrow-bear-left";
  if (m === "right" || m === "sharp right" || m === "slight right") return "ti-arrow-bear-right";
  if (m === "uturn") return "ti-arrow-back-up";
  return "ti-arrow-up";
}

function stepText(step) {
  const { maneuver: { type: t, modifier: m }, name } = step;
  const on = name ? ` onto ${name}` : "";
  if (t === "depart") return `Head ${m || "forward"}${on}`;
  if (t === "arrive") return "You have arrived";
  if (t === "turn") {
    if (m === "left") return `Turn left${on}`;
    if (m === "right") return `Turn right${on}`;
    if (m === "slight left") return `Keep slight left${on}`;
    if (m === "slight right") return `Keep slight right${on}`;
    if (m === "uturn") return `Make a U-turn${on}`;
    return `Turn${on}`;
  }
  if (t === "roundabout") return `Enter roundabout${on}`;
  if (t === "fork") return `Keep ${m || "straight"} at fork${on}`;
  return `Continue${on}`;
}

function haversine(lat1, lng1, lat2, lng2) {
  const R = 6371000, φ1 = lat1 * Math.PI / 180, φ2 = lat2 * Math.PI / 180;
  const Δφ = (lat2 - lat1) * Math.PI / 180, Δλ = (lng2 - lng1) * Math.PI / 180;
  const a = Math.sin(Δφ/2)**2 + Math.cos(φ1)*Math.cos(φ2)*Math.sin(Δλ/2)**2;
  return R * 2 * Math.atan2(Math.sqrt(a), Math.sqrt(1-a));
}

// Calculate bearing between two GPS points (degrees 0–360)
function calcBearing(lat1, lon1, lat2, lon2) {
  const dLon = (lon2 - lon1) * Math.PI / 180;
  const y = Math.sin(dLon) * Math.cos(lat2 * Math.PI / 180);
  const x = Math.cos(lat1 * Math.PI / 180) * Math.sin(lat2 * Math.PI / 180) -
    Math.sin(lat1 * Math.PI / 180) * Math.cos(lat2 * Math.PI / 180) * Math.cos(dLon);
  return (Math.atan2(y, x) * 180 / Math.PI + 360) % 360;
}

// Offset a lat/lng point N meters in a given bearing direction
function offsetPoint(lat, lng, bearingDeg, distMeters) {
  const R = 6371000;
  const δ = distMeters / R;
  const θ = bearingDeg * Math.PI / 180;
  const φ1 = lat * Math.PI / 180;
  const λ1 = lng * Math.PI / 180;
  const φ2 = Math.asin(Math.sin(φ1) * Math.cos(δ) + Math.cos(φ1) * Math.sin(δ) * Math.cos(θ));
  const λ2 = λ1 + Math.atan2(Math.sin(θ) * Math.sin(δ) * Math.cos(φ1), Math.cos(δ) - Math.sin(φ1) * Math.sin(φ2));
  return { lat: φ2 * 180 / Math.PI, lng: λ2 * 180 / Math.PI };
}

export default function DirectionsPage({ store, userCoords, onBack }) {
  const mapContainer = useRef(null);
  const mapRef = useRef(null);
  const routeLayerRef = useRef(null);
  const casingLayerRef = useRef(null);
  const userMarkerRef = useRef(null);
  const tileLayerRef = useRef(null);
  const watchIdRef = useRef(null);
  const stepListRef = useRef(null);
  const prevCoordsRef = useRef(null);
  const bearingRef = useRef(0);

  const [mode, setMode] = useState("driving");
  const [tileKey, setTileKey] = useState("standard");
  const [route, setRoute] = useState(null);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState(null);
  const [liveCoords, setLiveCoords] = useState(userCoords);
  const [bearing, setBearing] = useState(0);
  const [isFollowing, setIsFollowing] = useState(true);
  const [stepIdx, setStepIdx] = useState(0);
  const [arrived, setArrived] = useState(false);
  const [showStepList, setShowStepList] = useState(false);

  // ── Init map ────────────────────────────────────────────────────────────────
  useEffect(() => {
    if (mapRef.current) return;
    const L = window.L;
    const center = userCoords ? [userCoords.lat, userCoords.lng] : [store.lat, store.lng];
    const map = L.map(mapContainer.current, { zoomControl: false }).setView(center, 15);

    const tile = TILE_LAYERS.standard;
    tileLayerRef.current = L.tileLayer(tile.url, { attribution: tile.attr, maxZoom: 19 }).addTo(map);
    L.control.zoom({ position: "topright" }).addTo(map);

    // Destination marker
    L.marker([store.lat, store.lng], {
      icon: L.divIcon({
        className: "",
        html: `<div style="width:36px;height:36px;background:#10b981;border:3px solid #fff;border-radius:50% 50% 50% 0;transform:rotate(-45deg);display:flex;align-items:center;justify-content:center;box-shadow:0 3px 10px rgba(0,0,0,0.3);">
          <i class="ti ti-map-pin" style="transform:rotate(45deg);font-size:15px;color:#fff;"></i></div>`,
        iconSize: [36,36], iconAnchor: [18,36],
      }),
    }).addTo(map).bindTooltip(store.name, { permanent: false });

    // User marker (direction arrow + pulse)
    if (userCoords) {
      userMarkerRef.current = L.marker([userCoords.lat, userCoords.lng], {
        icon: L.divIcon({
          className: "",
          html: `<div id="user-nav-dot" style="position:relative;width:48px;height:48px;display:flex;align-items:center;justify-content:center;">
            <div style="position:absolute;width:48px;height:48px;background:rgba(59,130,246,0.2);border-radius:50%;animation:pulse-ring 1.5s ease infinite;"></div>
            <div style="width:22px;height:22px;background:#3b82f6;border:3px solid #fff;border-radius:50%;box-shadow:0 2px 8px rgba(59,130,246,0.7);position:relative;z-index:1;display:flex;align-items:center;justify-content:center;">
              <div style="width:0;height:0;border-left:4px solid transparent;border-right:4px solid transparent;border-bottom:7px solid #fff;position:absolute;top:2px;"></div>
            </div>
          </div>`,
          iconSize: [48,48], iconAnchor: [24,24],
        }),
        zIndexOffset: 1000,
      }).addTo(map);
    }

    map.on("dragstart", () => setIsFollowing(false));
    mapRef.current = map;
  }, [store, userCoords]);

  // ── Swap tile layer ───────────────────────────────────────────────────────
  useEffect(() => {
    if (!mapRef.current || !tileLayerRef.current) return;
    const L = window.L;
    mapRef.current.removeLayer(tileLayerRef.current);
    const t = TILE_LAYERS[tileKey];
    tileLayerRef.current = L.tileLayer(t.url, { attribution: t.attr, maxZoom: 19 }).addTo(mapRef.current);
  }, [tileKey]);

  // ── watchPosition with bearing calculation ────────────────────────────────
  useEffect(() => {
    if (!navigator.geolocation) return;
    watchIdRef.current = navigator.geolocation.watchPosition(
      (pos) => {
        const c = { lat: pos.coords.latitude, lng: pos.coords.longitude };

        // Calculate bearing from previous point
        if (prevCoordsRef.current) {
          const b = calcBearing(
            prevCoordsRef.current.lat, prevCoordsRef.current.lng,
            c.lat, c.lng
          );
          bearingRef.current = b;
          setBearing(b);

          // Update user marker arrow rotation
          const dot = document.getElementById("user-nav-dot");
          if (dot) {
            const arrow = dot.querySelector("div[style*='border-bottom']");
            if (arrow) arrow.style.transform = `rotate(${b}deg)`;
          }
        }
        prevCoordsRef.current = c;
        setLiveCoords(c);
        userMarkerRef.current?.setLatLng([c.lat, c.lng]);

        // "From behind" following: center slightly behind user so road ahead is visible
        if (isFollowing && mapRef.current) {
          // Offset center 80m behind user (opposite of travel direction)
          const behind = offsetPoint(c.lat, c.lng, (bearingRef.current + 180) % 360, 80);
          mapRef.current.setView([behind.lat, behind.lng], 17, { animate: true });
        }
      },
      () => {},
      { enableHighAccuracy: true, maximumAge: 2000, timeout: 10000 }
    );
    return () => { if (watchIdRef.current != null) navigator.geolocation.clearWatch(watchIdRef.current); };
  }, [isFollowing]);

  // ── Auto-advance steps ────────────────────────────────────────────────────
  useEffect(() => {
    if (!route || !liveCoords || arrived) return;
    const destDist = haversine(liveCoords.lat, liveCoords.lng, store.lat, store.lng);
    if (destDist < 30) { setArrived(true); return; }
    let best = stepIdx;
    for (let i = stepIdx; i < route.steps.length - 1; i++) {
      const [sLng, sLat] = route.steps[i].maneuver.location;
      if (haversine(liveCoords.lat, liveCoords.lng, sLat, sLng) < 40) {
        best = Math.min(i + 1, route.steps.length - 1); break;
      }
    }
    if (best !== stepIdx) {
      setStepIdx(best);
      stepListRef.current?.querySelector(`[data-step="${best}"]`)
        ?.scrollIntoView({ behavior: "smooth", block: "nearest" });
    }
  }, [liveCoords, route, arrived]);

  // ── Fetch route ───────────────────────────────────────────────────────────
  const fetchRoute = useCallback(async (currentMode, currentCoords) => {
    const origin = currentCoords || liveCoords;
    if (!origin) { setError("Location unavailable"); return; }
    setLoading(true); setError(null); setStepIdx(0); setArrived(false);
    try {
      const modeObj = MODES.find(m => m.id === currentMode) || MODES[0];
      const url = `${modeObj.base}${origin.lng},${origin.lat};${store.lng},${store.lat}?overview=full&geometries=geojson&steps=true`;
      const r = await fetch(url).then(r => r.json());
      if (r.code !== "Ok" || !r.routes.length) { setError("No route found."); return; }
      const rt = r.routes[0];
      setRoute({ distance: rt.distance, duration: rt.duration, geometry: rt.geometry, steps: rt.legs[0].steps });
      const L = window.L;
      if (routeLayerRef.current) mapRef.current.removeLayer(routeLayerRef.current);
      if (casingLayerRef.current) mapRef.current.removeLayer(casingLayerRef.current);
      const colors = { driving: "#3b82f6", walking: "#f59e0b", cycling: "#10b981" };
      const casingColors = { driving: "#1e3a8a", walking: "#78350f", cycling: "#064e3b" };
      casingLayerRef.current = L.geoJSON(rt.geometry, {
        style: { color: casingColors[currentMode] || "#1e3a8a", weight: 13, opacity: 0.55, lineCap: "round", lineJoin: "round" },
      }).addTo(mapRef.current);
      const layer = L.geoJSON(rt.geometry, {
        style: { color: colors[currentMode] || "#3b82f6", weight: 7, opacity: 0.95, lineCap: "round", lineJoin: "round" },
      }).addTo(mapRef.current);
      routeLayerRef.current = layer;
      mapRef.current.fitBounds(
        layer.getBounds().extend([origin.lat, origin.lng]).extend([store.lat, store.lng]),
        { padding: [120, 60] }
      );
    } catch { setError("Failed to load route."); }
    finally { setLoading(false); }
  }, [liveCoords, store]);

  // Fetch on mode change with the new mode value
  useEffect(() => {
    if (liveCoords) fetchRoute(mode, liveCoords);
  }, [mode]);

  // Initial fetch on mount
  useEffect(() => {
    if (liveCoords) fetchRoute("driving", liveCoords);
  }, []);

  const recenter = () => {
    setIsFollowing(true);
    if (liveCoords && mapRef.current) {
      const behind = offsetPoint(liveCoords.lat, liveCoords.lng, (bearingRef.current + 180) % 360, 80);
      mapRef.current.setView([behind.lat, behind.lng], 17, { animate: true });
    }
  };

  const remaining = route?.steps.slice(stepIdx) ?? [];
  const remDist = remaining.reduce((a, s) => a + s.distance, 0);
  const remTime = remaining.reduce((a, s) => a + s.duration, 0);
  const curStep = route?.steps[stepIdx];
  const nxtStep = route?.steps[stepIdx + 1];

  const distToNextTurn = useMemo(() => {
    if (!liveCoords || !curStep) return null;
    const [sLng, sLat] = curStep.maneuver.location;
    return haversine(liveCoords.lat, liveCoords.lng, sLat, sLng);
  }, [liveCoords, curStep]);

  const arrivalTime = remTime > 0
    ? new Date(Date.now() + remTime * 1000).toLocaleTimeString([], { hour: "2-digit", minute: "2-digit" })
    : null;

  // Auto-zoom approaching turns: zoom in when within 150 m of maneuver
  useEffect(() => {
    if (!mapRef.current || distToNextTurn == null || !isFollowing) return;
    const z = distToNextTurn < 60 ? 19 : distToNextTurn < 150 ? 18 : 17;
    if (Math.abs(mapRef.current.getZoom() - z) >= 1) {
      mapRef.current.setZoom(z, { animate: true });
    }
  }, [distToNextTurn, isFollowing]);

  const modeColors = { driving: "#3b82f6", walking: "#f59e0b", cycling: "#10b981" };
  const activeColor = modeColors[mode] || "#3b82f6";

  return (
    <div className="dir-fullscreen">
      {/* Full-screen map */}
      <div ref={mapContainer} className="dir-map" />

      {/* Floating top bar */}
      <div className="dir-top-bar">
        <button className="dir-back-btn" onClick={onBack}>
          <i className="ti ti-arrow-left" />
        </button>
        <div className="dir-store-label">
          <div className="dir-store-name">{store.name}</div>
          <div className="dir-store-addr">{store.address}</div>
        </div>
      </div>

      {/* Mode tabs */}
      <div className="dir-mode-bar">
        {MODES.map((m) => (
          <button key={m.id}
            className={`dir-mode-btn ${mode === m.id ? "active" : ""}`}
            style={mode === m.id ? { background: modeColors[m.id] } : {}}
            onClick={() => setMode(m.id)}>
            <i className={`ti ti-${m.icon}`} />{m.label}
          </button>
        ))}
      </div>

      {/* Compass / bearing indicator */}
      {bearing !== 0 && (
        <div className="dir-compass">
          <div className="dir-compass-needle" style={{ transform: `rotate(${bearing}deg)` }}>
            <i className="ti ti-navigation" />
          </div>
        </div>
      )}

      {/* Tile layer switcher */}
      <div className="dir-tile-bar">
        {Object.entries(TILE_LAYERS).map(([key, t]) => (
          <button key={key} className={`dir-tile-btn ${tileKey === key ? "active" : ""}`}
            onClick={() => setTileKey(key)}>{t.label}</button>
        ))}
      </div>

      {/* Arrived banner */}
      {arrived && (
        <div className="dir-arrived">
          <i className="ti ti-circle-check" style={{ fontSize: 24 }} />
          <div>
            <div style={{ fontWeight: 700 }}>You have arrived!</div>
            <div style={{ fontSize: 12, opacity: 0.8 }}>{store.name}</div>
          </div>
        </div>
      )}

      {/* Current step banner */}
      {!arrived && curStep && !loading && (
        <div className="dir-step-banner" style={{ background: activeColor }}>
          <div className="dir-step-icon"><i className={`ti ${stepIcon(curStep)}`} /></div>
          <div className="dir-step-text">
            <div className="dir-step-main">{stepText(curStep)}</div>
            {nxtStep && <div className="dir-step-then">then · {stepText(nxtStep).slice(0, 50)}</div>}
          </div>
          <div className="dir-step-right">
            <div className="dir-step-dist">
              {distToNextTurn != null ? fmtDist(distToNextTurn) : (curStep.distance > 0 ? fmtDist(curStep.distance) : "")}
            </div>
            <div className="dir-step-counter">{stepIdx + 1} / {route.steps.length}</div>
          </div>
        </div>
      )}

      {loading && (
        <div className="dir-step-banner" style={{ justifyContent: "center", gap: 10, background: activeColor }}>
          <div className="spinner" style={{ width: 18, height: 18, borderWidth: 2, borderColor: "rgba(255,255,255,0.3)", borderTopColor: "#fff" }} />
          <span style={{ fontSize: 13 }}>Finding route…</span>
        </div>
      )}
      {error && <div className="dir-error">{error}</div>}

      {/* Bottom ETA bar */}
      {route && !loading && !arrived && (
        <div className="dir-eta-bar">
          <div className="dir-eta-item" style={{ color: activeColor }}>
            <i className="ti ti-clock" />
            <strong>{fmtTime(remTime)}</strong>
            {arrivalTime && <span className="dir-eta-arrives">· {arrivalTime}</span>}
          </div>
          <div className="dir-eta-divider" />
          <div className="dir-eta-item" style={{ color: activeColor }}>
            <i className="ti ti-ruler" />
            <strong>{fmtDist(remDist)}</strong>
          </div>
          <div className="dir-eta-mode">
            <i className={`ti ti-${MODES.find(m => m.id === mode)?.icon}`} style={{ color: activeColor }} />
          </div>
          <div style={{ marginLeft: "auto", display: "flex", gap: 8, alignItems: "center" }}>
            {!isFollowing && (
              <button className="dir-recenter-btn" onClick={recenter}
                style={{ borderColor: activeColor, color: activeColor }}>
                <i className="ti ti-crosshair" /> Recenter
              </button>
            )}
            <button className="dir-steps-toggle" onClick={() => setShowStepList(!showStepList)}>
              <i className={`ti ${showStepList ? "ti-chevron-down" : "ti-list"}`} />
              {showStepList ? "Hide" : "Steps"}
            </button>
          </div>
        </div>
      )}

      {/* Bottom sheet: turn-by-turn */}
      {showStepList && route && !arrived && (
        <div className="dir-steps-sheet" ref={stepListRef}>
          <div className="dir-steps-handle" />
          <div className="dir-steps-title">Turn-by-turn</div>
          <ol className="steps-list">
            {route.steps.map((step, i) => (
              <li key={i} data-step={i}
                className={`step-item ${i === stepIdx ? "active-step" : ""} ${i < stepIdx ? "passed-step" : ""}`}
                style={i === stepIdx ? { borderLeftColor: activeColor } : {}}>
                <div className="step-icon"><i className={`ti ${stepIcon(step)}`} /></div>
                <div className="step-info">
                  <div className="step-instruction">{stepText(step)}</div>
                  {step.distance > 0 && <div className="step-distance">{fmtDist(step.distance)}</div>}
                </div>
              </li>
            ))}
          </ol>
        </div>
      )}
    </div>
  );
}
