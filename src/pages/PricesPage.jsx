import { useState, useEffect, useRef, useCallback } from "react";

const SUPABASE_URL = import.meta.env.VITE_SUPABASE_URL;
const SUPABASE_KEY = import.meta.env.VITE_SUPABASE_ANON_KEY;
const headers = {
  "apikey": SUPABASE_KEY,
  "Authorization": `Bearer ${SUPABASE_KEY}`,
  "Content-Type": "application/json",
};

// Ã¢ÂÂÃ¢ÂÂ Address parser Ã¢ÂÂÃ¢ÂÂÃ¢ÂÂÃ¢ÂÂÃ¢ÂÂÃ¢ÂÂÃ¢ÂÂÃ¢ÂÂÃ¢ÂÂÃ¢ÂÂÃ¢ÂÂÃ¢ÂÂÃ¢ÂÂÃ¢ÂÂÃ¢ÂÂÃ¢ÂÂÃ¢ÂÂÃ¢ÂÂÃ¢ÂÂÃ¢ÂÂÃ¢ÂÂÃ¢ÂÂÃ¢ÂÂÃ¢ÂÂÃ¢ÂÂÃ¢ÂÂÃ¢ÂÂÃ¢ÂÂÃ¢ÂÂÃ¢ÂÂÃ¢ÂÂÃ¢ÂÂÃ¢ÂÂÃ¢ÂÂÃ¢ÂÂÃ¢ÂÂÃ¢ÂÂÃ¢ÂÂÃ¢ÂÂÃ¢ÂÂÃ¢ÂÂÃ¢ÂÂÃ¢ÂÂÃ¢ÂÂÃ¢ÂÂÃ¢ÂÂÃ¢ÂÂÃ¢ÂÂÃ¢ÂÂÃ¢ÂÂÃ¢ÂÂÃ¢ÂÂÃ¢ÂÂÃ¢ÂÂÃ¢ÂÂÃ¢ÂÂÃ¢ÂÂ
const CA_PROVINCES = new Set([
  "ON","BC","AB","QC","MB","SK","NS","NB","NL","PE","NT","YT","NU",
  "Ontario","British Columbia","Alberta","Quebec","Manitoba","Saskatchewan",
  "Nova Scotia","New Brunswick","Newfoundland","Prince Edward Island",
]);
const US_STATES = new Set([
  "AL","AK","AZ","AR","CA","CO","CT","DE","FL","GA","HI","ID","IL","IN","IA",
  "KS","KY","LA","ME","MD","MA","MI","MN","MS","MO","MT","NE","NV","NH","NJ",
  "NM","NY","NC","ND","OH","OK","OR","PA","RI","SC","SD","TN","TX","UT","VT",
  "VA","WA","WV","WI","WY","DC",
  "California","New York","Texas","Florida","Washington","Illinois",
]);

function parseAddress(address) {
  if (!address) return { city: "Unknown", region: "Unknown", country: "Other" };
  const parts = address.split(",").map(s => s.trim()).filter(Boolean);
  if (parts.length === 1) return { city: parts[0], region: "", country: "Other" };
  const last = parts[parts.length - 1];
  const secondLast = parts[parts.length - 2] || "";
  // Strip postal codes from last segment
  const regionClean = last.replace(/\s*[A-Z]\d[A-Z]\s*\d[A-Z]\d.*$/i, "")
                          .replace(/\s*\d{5}(-\d{4})?.*$/, "").trim();
  let country = "Other";
  if (CA_PROVINCES.has(regionClean) || CA_PROVINCES.has(secondLast)) country = "Canada";
  else if (US_STATES.has(regionClean) || US_STATES.has(secondLast)) country = "United States";
  const city = parts.length >= 3 ? parts[parts.length - 2] : parts[0];
  return { city: city.replace(/\s*\d.*$/, "").trim(), region: regionClean, country };
}

// Ã¢ÂÂÃ¢ÂÂ Time period filter Ã¢ÂÂÃ¢ÂÂÃ¢ÂÂÃ¢ÂÂÃ¢ÂÂÃ¢ÂÂÃ¢ÂÂÃ¢ÂÂÃ¢ÂÂÃ¢ÂÂÃ¢ÂÂÃ¢ÂÂÃ¢ÂÂÃ¢ÂÂÃ¢ÂÂÃ¢ÂÂÃ¢ÂÂÃ¢ÂÂÃ¢ÂÂÃ¢ÂÂÃ¢ÂÂÃ¢ÂÂÃ¢ÂÂÃ¢ÂÂÃ¢ÂÂÃ¢ÂÂÃ¢ÂÂÃ¢ÂÂÃ¢ÂÂÃ¢ÂÂÃ¢ÂÂÃ¢ÂÂÃ¢ÂÂÃ¢ÂÂÃ¢ÂÂÃ¢ÂÂÃ¢ÂÂÃ¢ÂÂÃ¢ÂÂÃ¢ÂÂÃ¢ÂÂÃ¢ÂÂÃ¢ÂÂÃ¢ÂÂÃ¢ÂÂÃ¢ÂÂÃ¢ÂÂÃ¢ÂÂÃ¢ÂÂÃ¢ÂÂÃ¢ÂÂÃ¢ÂÂÃ¢ÂÂ
const PERIODS = [
  { id: "1W", label: "1W", days: 7 },
  { id: "1M", label: "1M", days: 30 },
  { id: "3M", label: "3M", days: 90 },
  { id: "6M", label: "6M", days: 180 },
  { id: "1Y", label: "1Y", days: 365 },
  { id: "ALL", label: "ALL", days: null },
];

function filterByPeriod(data, periodId) {
  const p = PERIODS.find(p => p.id === periodId);
  if (!p || !p.days) return data;
  const cutoff = new Date(Date.now() - p.days * 86400000).toISOString();
  return data.filter(d => d.date >= cutoff.split("T")[0]);
}

// Ã¢ÂÂÃ¢ÂÂ Chart component Ã¢ÂÂÃ¢ÂÂÃ¢ÂÂÃ¢ÂÂÃ¢ÂÂÃ¢ÂÂÃ¢ÂÂÃ¢ÂÂÃ¢ÂÂÃ¢ÂÂÃ¢ÂÂÃ¢ÂÂÃ¢ÂÂÃ¢ÂÂÃ¢ÂÂÃ¢ÂÂÃ¢ÂÂÃ¢ÂÂÃ¢ÂÂÃ¢ÂÂÃ¢ÂÂÃ¢ÂÂÃ¢ÂÂÃ¢ÂÂÃ¢ÂÂÃ¢ÂÂÃ¢ÂÂÃ¢ÂÂÃ¢ÂÂÃ¢ÂÂÃ¢ÂÂÃ¢ÂÂÃ¢ÂÂÃ¢ÂÂÃ¢ÂÂÃ¢ÂÂÃ¢ÂÂÃ¢ÂÂÃ¢ÂÂÃ¢ÂÂÃ¢ÂÂÃ¢ÂÂÃ¢ÂÂÃ¢ÂÂÃ¢ÂÂÃ¢ÂÂÃ¢ÂÂÃ¢ÂÂÃ¢ÂÂÃ¢ÂÂÃ¢ÂÂÃ¢ÂÂÃ¢ÂÂÃ¢ÂÂÃ¢ÂÂÃ¢ÂÂÃ¢ÂÂ
function MarketChart({ data, period, currency }) {
  const svgRef = useRef(null);
  const [crosshair, setCrosshair] = useState(null);

  const filtered = filterByPeriod(data, period);
  if (filtered.length < 2) {
    return (
      <div className="chart-empty">
        <i className="ti ti-chart-line" />
        <p>Not enough data for this period. Report prices to see the market chart.</p>
      </div>
    );
  }

  const W = 800, H = 280;
  const pad = { top: 16, right: 24, bottom: 48, left: 68 };
  const iW = W - pad.left - pad.right;
  const iH = H - pad.top - pad.bottom;

  const prices = filtered.map(d => d.price);
  const minP = Math.min(...prices);
  const maxP = Math.max(...prices);
  const pRange = maxP - minP || 1;
  const padP = pRange * 0.12;

  const yMin = minP - padP;
  const yMax = maxP + padP;

  const dates = filtered.map(d => new Date(d.date + "T12:00:00Z").getTime());
  const dMin = dates[0];
  const dMax = dates[dates.length - 1];
  const dRange = dMax - dMin || 1;

  const xScale = (ts) => pad.left + ((ts - dMin) / dRange) * iW;
  const yScale = (p) => pad.top + iH - ((p - yMin) / (yMax - yMin)) * iH;

  const pts = filtered.map((d, i) => ({
    x: xScale(dates[i]),
    y: yScale(d.price),
    ...d,
  }));

  const linePath = pts.map((p, i) => `${i === 0 ? "M" : "L"} ${p.x.toFixed(1)},${p.y.toFixed(1)}`).join(" ");
  const areaPath = [
    `M ${pts[0].x.toFixed(1)},${(pad.top + iH).toFixed(1)}`,
    ...pts.map(p => `L ${p.x.toFixed(1)},${p.y.toFixed(1)}`),
    `L ${pts[pts.length - 1].x.toFixed(1)},${(pad.top + iH).toFixed(1)}`,
    "Z",
  ].join(" ");

  const startPrice = filtered[0].price;
  const endPrice = filtered[filtered.length - 1].price;
  const isUp = endPrice > startPrice;
  const lineColor = isUp ? "#ef4444" : "#00ffff"; // up = red (expensive), down = cyan (cheaper)
  const gradId = `grad-${period}`;

  // Y gridlines
  const yTicks = 5;
  const yStep = (yMax - yMin) / yTicks;
  const yTickVals = Array.from({ length: yTicks + 1 }, (_, i) => yMin + i * yStep);

  // X date labels
  const xTickCount = Math.min(filtered.length, period === "1W" ? 7 : period === "1M" ? 6 : 5);
  const xTickStep = Math.max(1, Math.floor(filtered.length / xTickCount));
  const xTicks = filtered.filter((_, i) => i % xTickStep === 0 || i === filtered.length - 1);

  const fmtDate = (dateStr) => {
    const d = new Date(dateStr + "T12:00:00Z");
    return d.toLocaleDateString("en-US", { month: "short", day: "numeric" });
  };

  const findNearest = useCallback((clientX) => {
    const svg = svgRef.current;
    if (!svg) return;
    const rect = svg.getBoundingClientRect();
    const scaleX = W / rect.width;
    const mx = (clientX - rect.left) * scaleX;
    let nearest = pts[0], minDist = Infinity;
    pts.forEach(p => {
      const dist = Math.abs(p.x - mx);
      if (dist < minDist) { minDist = dist; nearest = p; }
    });
    setCrosshair(nearest);
  }, [pts]);

  const handleMouseMove = useCallback((e) => findNearest(e.clientX), [findNearest]);
  const handleMouseLeave = useCallback(() => setCrosshair(null), []);

  const handleTouchMove = useCallback((e) => {
    if (e.touches[0]) findNearest(e.touches[0].clientX);
  }, [findNearest]);
  const handleTouchEnd = useCallback(() => setCrosshair(null), []);

  return (
    <div className="market-chart-wrap">
      <svg
        ref={svgRef}
        viewBox={`0 0 ${W} ${H}`}
        className="market-chart-svg"
        onMouseMove={handleMouseMove}
        onMouseLeave={handleMouseLeave}
        onTouchMove={handleTouchMove}
        onTouchEnd={handleTouchEnd}
        style={{ touchAction: "none" }}
      >
        <defs>
          <linearGradient id={gradId} x1="0" y1="0" x2="0" y2="1">
            <stop offset="0%" stopColor={lineColor} stopOpacity="0.25" />
            <stop offset="100%" stopColor={lineColor} stopOpacity="0.02" />
          </linearGradient>
        </defs>

        {/* Y gridlines */}
        {yTickVals.map((val, i) => {
          const y = yScale(val).toFixed(1);
          return (
            <g key={i}>
              <line x1={pad.left} x2={pad.left + iW} y1={y} y2={y}
                stroke="rgba(255,255,255,0.06)" strokeWidth="1" strokeDasharray="4,4" />
              <text x={pad.left - 8} y={parseFloat(y) + 4} textAnchor="end"
                fill="rgba(255,255,255,0.45)" fontSize="11">
                {currency}{val.toFixed(2)}
              </text>
            </g>
          );
        })}

        {/* X date labels */}
        {xTicks.map((d, i) => {
          const x = xScale(new Date(d.date + "T12:00:00Z").getTime()).toFixed(1);
          return (
            <text key={i} x={x} y={pad.top + iH + 20} textAnchor="middle"
              fill="rgba(255,255,255,0.4)" fontSize="11">
              {fmtDate(d.date)}
            </text>
          );
        })}

        {/* Area fill */}
        <path d={areaPath} fill={`url(#${gradId})`} />

        {/* Line */}
        <path d={linePath} fill="none" stroke={lineColor} strokeWidth="2.2"
          strokeLinecap="round" strokeLinejoin="round" />

        {/* Crosshair */}
        {crosshair && (
          <g>
            <line x1={crosshair.x} x2={crosshair.x} y1={pad.top} y2={pad.top + iH}
              stroke="rgba(255,255,255,0.3)" strokeWidth="1" strokeDasharray="4,3" />
            <line x1={pad.left} x2={pad.left + iW} y1={crosshair.y} y2={crosshair.y}
              stroke="rgba(255,255,255,0.15)" strokeWidth="1" strokeDasharray="4,3" />
            <circle cx={crosshair.x} cy={crosshair.y} r="4.5" fill={lineColor}
              stroke="#1a1a2e" strokeWidth="2" />
          </g>
        )}
      </svg>

      {crosshair && (
        <div className="chart-tooltip" style={{
          left: `${Math.min(Math.max(((crosshair.x / W) * 100), 7), 93).toFixed(1)}%`,
        }}>
          <div className="ct-date">{fmtDate(crosshair.date)}</div>
          <div className="ct-price">{currency}{parseFloat(crosshair.price).toFixed(2)}</div>
          <div className="ct-count">{crosshair.count} report{crosshair.count !== 1 ? "s" : ""}</div>
        </div>
      )}
    </div>
  );
}

// Ã¢ÂÂÃ¢ÂÂ Change badge Ã¢ÂÂÃ¢ÂÂÃ¢ÂÂÃ¢ÂÂÃ¢ÂÂÃ¢ÂÂÃ¢ÂÂÃ¢ÂÂÃ¢ÂÂÃ¢ÂÂÃ¢ÂÂÃ¢ÂÂÃ¢ÂÂÃ¢ÂÂÃ¢ÂÂÃ¢ÂÂÃ¢ÂÂÃ¢ÂÂÃ¢ÂÂÃ¢ÂÂÃ¢ÂÂÃ¢ÂÂÃ¢ÂÂÃ¢ÂÂÃ¢ÂÂÃ¢ÂÂÃ¢ÂÂÃ¢ÂÂÃ¢ÂÂÃ¢ÂÂÃ¢ÂÂÃ¢ÂÂÃ¢ÂÂÃ¢ÂÂÃ¢ÂÂÃ¢ÂÂÃ¢ÂÂÃ¢ÂÂÃ¢ÂÂÃ¢ÂÂÃ¢ÂÂÃ¢ÂÂÃ¢ÂÂÃ¢ÂÂÃ¢ÂÂÃ¢ÂÂÃ¢ÂÂÃ¢ÂÂÃ¢ÂÂÃ¢ÂÂÃ¢ÂÂÃ¢ÂÂÃ¢ÂÂÃ¢ÂÂÃ¢ÂÂÃ¢ÂÂÃ¢ÂÂÃ¢ÂÂÃ¢ÂÂ
function ChangeBadge({ current, previous }) {
  if (!previous || !current) return null;
  const pct = ((current - previous) / previous) * 100;
  const isUp = pct > 0;
  return (
    <span className={`change-badge ${isUp ? "up" : "down"}`}>
      <i className={`ti ti-trending-${isUp ? "up" : "down"}`} />
      {isUp ? "+" : ""}{pct.toFixed(1)}%
    </span>
  );
}

// Ã¢ÂÂÃ¢ÂÂ Sparkline Ã¢ÂÂÃ¢ÂÂÃ¢ÂÂÃ¢ÂÂÃ¢ÂÂÃ¢ÂÂÃ¢ÂÂÃ¢ÂÂÃ¢ÂÂÃ¢ÂÂÃ¢ÂÂÃ¢ÂÂÃ¢ÂÂÃ¢ÂÂÃ¢ÂÂÃ¢ÂÂÃ¢ÂÂÃ¢ÂÂÃ¢ÂÂÃ¢ÂÂÃ¢ÂÂÃ¢ÂÂÃ¢ÂÂÃ¢ÂÂÃ¢ÂÂÃ¢ÂÂÃ¢ÂÂÃ¢ÂÂÃ¢ÂÂÃ¢ÂÂÃ¢ÂÂÃ¢ÂÂÃ¢ÂÂÃ¢ÂÂÃ¢ÂÂÃ¢ÂÂÃ¢ÂÂÃ¢ÂÂÃ¢ÂÂÃ¢ÂÂÃ¢ÂÂÃ¢ÂÂÃ¢ÂÂÃ¢ÂÂÃ¢ÂÂÃ¢ÂÂÃ¢ÂÂÃ¢ÂÂÃ¢ÂÂÃ¢ÂÂÃ¢ÂÂÃ¢ÂÂÃ¢ÂÂÃ¢ÂÂÃ¢ÂÂÃ¢ÂÂÃ¢ÂÂÃ¢ÂÂÃ¢ÂÂÃ¢ÂÂÃ¢ÂÂ
function Sparkline({ values, color: propColor }) {
  if (!values || values.length < 2) return null;
  const W = 72, H = 28;
  const min = Math.min(...values), max = Math.max(...values);
  const range = max - min || 1;
  const pts = values.map((v, i) => {
    const x = (i / (values.length - 1)) * W;
    const y = H - ((v - min) / range) * (H - 4) - 2;
    return `${x.toFixed(1)},${y.toFixed(1)}`;
  });
  const isDown = values[values.length - 1] <= values[0];
  const color = isDown ? "#00ffff" : "#ef4444";
  return (
    <svg viewBox={`0 0 ${W} ${H}`} width={W} height={H} style={{ display: "block" }}>
      <polyline points={pts.join(" ")} fill="none" stroke={propColor || color} strokeWidth="1.8"
        strokeLinecap="round" strokeLinejoin="round" />
    </svg>
  );
}

// Ã¢ÂÂÃ¢ÂÂ Ticker bar Ã¢ÂÂÃ¢ÂÂÃ¢ÂÂÃ¢ÂÂÃ¢ÂÂÃ¢ÂÂÃ¢ÂÂÃ¢ÂÂÃ¢ÂÂÃ¢ÂÂÃ¢ÂÂÃ¢ÂÂÃ¢ÂÂÃ¢ÂÂÃ¢ÂÂÃ¢ÂÂÃ¢ÂÂÃ¢ÂÂÃ¢ÂÂÃ¢ÂÂÃ¢ÂÂÃ¢ÂÂÃ¢ÂÂÃ¢ÂÂÃ¢ÂÂÃ¢ÂÂÃ¢ÂÂÃ¢ÂÂÃ¢ÂÂÃ¢ÂÂÃ¢ÂÂÃ¢ÂÂÃ¢ÂÂÃ¢ÂÂÃ¢ÂÂÃ¢ÂÂÃ¢ÂÂÃ¢ÂÂÃ¢ÂÂÃ¢ÂÂÃ¢ÂÂÃ¢ÂÂÃ¢ÂÂÃ¢ÂÂÃ¢ÂÂÃ¢ÂÂÃ¢ÂÂÃ¢ÂÂÃ¢ÂÂÃ¢ÂÂÃ¢ÂÂÃ¢ÂÂÃ¢ÂÂÃ¢ÂÂÃ¢ÂÂÃ¢ÂÂÃ¢ÂÂÃ¢ÂÂÃ¢ÂÂÃ¢ÂÂÃ¢ÂÂ
function TickerBar({ stores, onSelect }) {
  const priced = stores.filter(s => s.latest_price);
  if (!priced.length) return null;
  const items = [...priced, ...priced]; // duplicate for seamless loop
  return (
    <div className="ticker-wrap">
      <div className="ticker-track">
        {items.map((s, i) => (
          <span key={i} className="ticker-item" onClick={() => onSelect?.(s)} style={{cursor:'pointer'}}>
            <span className="ticker-name">{s.name}</span>
            <span className="ticker-price">${parseFloat(s.latest_price).toFixed(2)}</span>
            <span className="ticker-sep">Â·</span>
          </span>
        ))}
      </div>
    </div>
  );
}

// Ã¢ÂÂÃ¢ÂÂ Main component Ã¢ÂÂÃ¢ÂÂÃ¢ÂÂÃ¢ÂÂÃ¢ÂÂÃ¢ÂÂÃ¢ÂÂÃ¢ÂÂÃ¢ÂÂÃ¢ÂÂÃ¢ÂÂÃ¢ÂÂÃ¢ÂÂÃ¢ÂÂÃ¢ÂÂÃ¢ÂÂÃ¢ÂÂÃ¢ÂÂÃ¢ÂÂÃ¢ÂÂÃ¢ÂÂÃ¢ÂÂÃ¢ÂÂÃ¢ÂÂÃ¢ÂÂÃ¢ÂÂÃ¢ÂÂÃ¢ÂÂÃ¢ÂÂÃ¢ÂÂÃ¢ÂÂÃ¢ÂÂÃ¢ÂÂÃ¢ÂÂÃ¢ÂÂÃ¢ÂÂÃ¢ÂÂÃ¢ÂÂÃ¢ÂÂÃ¢ÂÂÃ¢ÂÂÃ¢ÂÂÃ¢ÂÂÃ¢ÂÂÃ¢ÂÂÃ¢ÂÂÃ¢ÂÂÃ¢ÂÂÃ¢ÂÂÃ¢ÂÂÃ¢ÂÂÃ¢ÂÂÃ¢ÂÂÃ¢ÂÂÃ¢ÂÂÃ¢ÂÂÃ¢ÂÂ

const TIMEFRAMES = [
  { id: "1W", label: "1W", days: 7 },
  { id: "1M", label: "1M", days: 30 },
  { id: "3M", label: "3M", days: 90 },
  { id: "6M", label: "6M", days: 180 },
  { id: "ALL", label: "ALL", days: 9999 },
];

function StoreDetailChart({ store, allPrices, currency, onBack, onReportPrice, onViewStore }) {
  const [tf, setTf] = useState("1M");
  const [crosshair, setCrosshair] = useState(null);
  const svgRef = useRef(null);

  const storeData = allPrices
    .filter(p => String(p.store_id) === String(store.id))
    .map(p => ({ date: (p.reported_at || "").slice(0,10), price: parseFloat(p.price) }))
    .filter(p => p.date && !isNaN(p.price))
    .sort((a,b) => a.date.localeCompare(b.date));

  const byDay = {};
  storeData.forEach(p => {
    if (!byDay[p.date]) byDay[p.date] = [];
    byDay[p.date].push(p.price);
  });
  const daily = Object.entries(byDay)
    .map(([date, prices]) => ({ date, price: prices.reduce((a,b)=>a+b,0)/prices.length }))
    .sort((a,b)=>a.date.localeCompare(b.date));

  const tfDays = TIMEFRAMES.find(t=>t.id===tf)?.days ?? 30;
  const cutoff = new Date(); cutoff.setDate(cutoff.getDate()-tfDays);
  const filtered = daily.filter(d => tfDays>=9999 || new Date(d.date)>=cutoff);

  const currentPrice = filtered.length ? filtered[filtered.length-1].price : null;
  const firstPrice = filtered.length ? filtered[0].price : null;
  const change = (currentPrice!=null&&firstPrice!=null) ? currentPrice-firstPrice : null;
  const changePct = (change!=null&&firstPrice) ? (change/firstPrice)*100 : null;
  const isUp = changePct>=0;

  const W=360, H=220;
  const pad={top:16,right:16,bottom:32,left:48};
  const iW=W-pad.left-pad.right, iH=H-pad.top-pad.bottom;

  let chartSvg = null;
  if (filtered.length>=2) {
    const prices=filtered.map(d=>d.price);
    const minP=Math.min(...prices), maxP=Math.max(...prices);
    const pRange=maxP-minP||1;
    const dates=filtered.map(d=>new Date(d.date).getTime());
    const minD=dates[0], maxD=dates[dates.length-1], dRange=maxD-minD||1;
    const xS=t=>pad.left+((t-minD)/dRange)*iW;
    const yS=p=>pad.top+iH-((p-minP)/pRange)*iH;
    const pts=filtered.map((d,i)=>({x:xS(dates[i]),y:yS(d.price),...d}));
    const linePath=pts.map((p,i)=>(i===0?"M":"L")+p.x.toFixed(1)+","+p.y.toFixed(1)).join(" ");
    const areaPath=["M "+pts[0].x.toFixed(1)+","+(pad.top+iH).toFixed(1),...pts.map(p=>"L "+p.x.toFixed(1)+","+p.y.toFixed(1)),"L "+pts[pts.length-1].x.toFixed(1)+","+(pad.top+iH).toFixed(1),"Z"].join(" ");
    const yTicks=4;
    const yGrid=Array.from({length:yTicks+1},(_,i)=>{const p=minP+(pRange*i/yTicks);return{y:yS(p),label:currency+p.toFixed(2)};});
    const xCount=Math.min(filtered.length,5);
    const xStep=Math.floor((filtered.length-1)/(xCount-1))||1;
    const xLabels=[];
    for(let i=0;i<filtered.length;i+=xStep){if(xLabels.length>=xCount)break;const d=new Date(filtered[i].date);xLabels.push({x:xS(dates[i]),label:d.toLocaleDateString("en-US",{month:"short",day:"numeric"})});}
    const handlePointer=e=>{const svg=svgRef.current;if(!svg)return;const rect=svg.getBoundingClientRect();const clientX=e.touches?e.touches[0].clientX:e.clientX;const rx=clientX-rect.left;const ratio=(rx-pad.left)/iW;const idx=Math.max(0,Math.min(pts.length-1,Math.round(ratio*(pts.length-1))));setCrosshair({pt:pts[idx],idx});};
    const handleLeave=()=>setCrosshair(null);
    const color=isUp?"#22c55e":"#ef4444";
    const gradId="sg"+store.id;
    chartSvg=(
      <svg ref={svgRef} viewBox={"0 0 "+W+" "+H} style={{width:"100%",height:"auto",touchAction:"none",cursor:"crosshair",display:"block"}}
        onMouseMove={handlePointer} onMouseLeave={handleLeave}
        onTouchMove={handlePointer} onTouchEnd={handleLeave}>
        <defs>
          <linearGradient id={gradId} x1="0" y1="0" x2="0" y2="1">
            <stop offset="0%" stopColor={color} stopOpacity="0.25"/>
            <stop offset="100%" stopColor={color} stopOpacity="0.02"/>
          </linearGradient>
        </defs>
        {yGrid.map((g,i)=>(
          <g key={i}>
            <line x1={pad.left} y1={g.y.toFixed(1)} x2={W-pad.right} y2={g.y.toFixed(1)} stroke="rgba(255,255,255,0.07)" strokeWidth="1"/>
            <text x={pad.left-6} y={g.y+4} textAnchor="end" fontSize="9" fill="rgba(255,255,255,0.35)">{g.label}</text>
          </g>
        ))}
        {xLabels.map((xl,i)=>(
          <text key={i} x={xl.x.toFixed(1)} y={H-8} textAnchor="middle" fontSize="9" fill="rgba(255,255,255,0.35)">{xl.label}</text>
        ))}
        <path d={areaPath} fill={"url(#"+gradId+")"}/>
        <path d={linePath} fill="none" stroke={color} strokeWidth="2" strokeLinejoin="round"/>
        {crosshair && (
          <>
            <line x1={crosshair.pt.x.toFixed(1)} y1={pad.top} x2={crosshair.pt.x.toFixed(1)} y2={pad.top+iH} stroke="rgba(255,255,255,0.3)" strokeWidth="1" strokeDasharray="3 3"/>
            <circle cx={crosshair.pt.x.toFixed(1)} cy={crosshair.pt.y.toFixed(1)} r="4" fill={color} stroke="#1a1b2e" strokeWidth="2"/>
          </>
        )}
      </svg>
    );
  }

  const displayPrice=crosshair?crosshair.pt.price:currentPrice;
  const displayDate=crosshair?new Date(crosshair.pt.date).toLocaleDateString("en-US",{weekday:"short",month:"short",day:"numeric",year:"numeric"}):"Current price";
  const recentReports=allPrices.filter(p=>String(p.store_id)===String(store.id)).sort((a,b)=>(b.reported_at||"").localeCompare(a.reported_at||"")).slice(0,15);

  return (
    <div style={{background:"#0d0e1a",minHeight:"100%",paddingBottom:32}}>
      <div style={{display:"flex",alignItems:"center",gap:12,padding:"16px 16px 8px",borderBottom:"1px solid rgba(255,255,255,0.08)"}}>
        <button onClick={onBack} style={{background:"none",border:"none",color:"rgba(255,255,255,0.7)",fontSize:20,cursor:"pointer",padding:"4px 8px",borderRadius:8}}>
          <i className="ti ti-arrow-left"/>
        </button>
        <div style={{flex:1,minWidth:0}}>
          <div style={{fontWeight:700,fontSize:15,color:"#eef2ff",overflow:"hidden",textOverflow:"ellipsis",whiteSpace:"nowrap"}}>{store.name}</div>
          <div style={{fontSize:11,color:"rgba(255,255,255,0.45)",marginTop:1}}>{store.address}</div>
        </div>
        <button onClick={()=>onReportPrice?.(store)} style={{background:"rgba(0,120,255,0.15)",border:"1px solid rgba(0,120,255,0.3)",color:"#60a5fa",borderRadius:8,padding:"6px 10px",fontSize:12,cursor:"pointer",whiteSpace:"nowrap"}}>+ Report</button>
              {onViewStore && <button onClick={() => onViewStore(store)} style={{background:"rgba(255,255,255,0.06)",border:"1px solid rgba(255,255,255,0.15)",color:"#e2e8f0",borderRadius:8,padding:"6px 10px",fontSize:12,cursor:"pointer",whiteSpace:"nowrap",marginLeft:6}}><i className="ti ti-map-pin" style={{marginRight:4,fontSize:11}}/>View Store</button>}
      </div>
      <div style={{padding:"20px 16px 8px"}}>
        <div style={{fontSize:36,fontWeight:800,color:"#eef2ff",fontVariantNumeric:"tabular-nums"}}>{displayPrice!=null?currency+parseFloat(displayPrice).toFixed(2):"â"}</div>
        <div style={{fontSize:12,color:"rgba(255,255,255,0.4)",marginTop:2}}>{displayDate}</div>
        {changePct!=null&&!crosshair&&(
          <div style={{marginTop:6,display:"inline-flex",alignItems:"center",gap:4,background:isUp?"rgba(34,197,94,0.12)":"rgba(239,68,68,0.12)",color:isUp?"#4ade80":"#f87171",borderRadius:6,padding:"3px 8px",fontSize:12,fontWeight:600}}>
            <i className={"ti ti-trending-"+(isUp?"up":"down")} style={{fontSize:13}}/>
            {isUp?"+":""}{change?.toFixed(2)} ({isUp?"+":""}{changePct?.toFixed(2)}%)
          </div>
        )}
      </div>
      <div style={{display:"flex",gap:4,padding:"0 16px 8px"}}>
        {TIMEFRAMES.map(t=>(
          <button key={t.id} onClick={()=>{setTf(t.id);setCrosshair(null);}} style={{flex:1,padding:"5px 0",borderRadius:6,border:"none",cursor:"pointer",fontSize:12,fontWeight:600,background:tf===t.id?"rgba(255,255,255,0.12)":"transparent",color:tf===t.id?"#eef2ff":"rgba(255,255,255,0.4)"}}>{t.label}</button>
        ))}
      </div>
      <div style={{padding:"0 8px 8px"}}>
        {filtered.length>=2?chartSvg:(
          <div style={{textAlign:"center",padding:"40px 0",color:"rgba(255,255,255,0.35)",fontSize:13}}>
            <i className="ti ti-chart-line" style={{fontSize:28,display:"block",marginBottom:8}}/>
            Not enough data for this period.
          </div>
        )}
      </div>
      {filtered.length>=1&&(
        <div style={{display:"grid",gridTemplateColumns:"1fr 1fr 1fr",gap:1,background:"rgba(255,255,255,0.06)",margin:"0 16px 20px",borderRadius:10,overflow:"hidden"}}>
          {[{label:"Reports",value:storeData.length},{label:"Low",value:filtered.length?currency+Math.min(...filtered.map(d=>d.price)).toFixed(2):"â"},{label:"High",value:filtered.length?currency+Math.max(...filtered.map(d=>d.price)).toFixed(2):"â"}].map(({label,value})=>(
            <div key={label} style={{background:"#141520",padding:"12px 8px",textAlign:"center"}}>
              <div style={{fontSize:11,color:"rgba(255,255,255,0.4)",marginBottom:4}}>{label}</div>
              <div style={{fontSize:15,fontWeight:700,color:"#eef2ff"}}>{value}</div>
            </div>
          ))}
        </div>
      )}
      <div style={{padding:"0 16px"}}>
        <div style={{fontSize:12,fontWeight:600,color:"rgba(255,255,255,0.4)",marginBottom:10,letterSpacing:"0.05em",textTransform:"uppercase"}}>Price history</div>
        {recentReports.length===0?<div style={{color:"rgba(255,255,255,0.3)",fontSize:13}}>No reports yet.</div>:
          recentReports.map((p,i)=>(
            <div key={i} style={{display:"flex",justifyContent:"space-between",alignItems:"center",padding:"10px 0",borderBottom:"1px solid rgba(255,255,255,0.05)"}}>
              <span style={{fontSize:12,color:"rgba(255,255,255,0.45)"}}>{new Date(p.reported_at).toLocaleDateString("en-US",{month:"short",day:"numeric",year:"numeric"})}</span>
              <span style={{fontSize:15,fontWeight:700,color:"#eef2ff"}}>{currency}{parseFloat(p.price).toFixed(2)}</span>
            </div>
          ))
        }
      </div>
    </div>
  );
}

export default function PricesPage({ stores, onReportPrice, onViewStore }) {
  const [allPrices, setAllPrices] = useState([]);
  const [selectedStore, setSelectedStore] = useState(null);
  const [loadingPrices, setLoadingPrices] = useState(false);
  const [period, setPeriod] = useState("1M");
  const [currency] = useState("$");

  // Location filter state
  const [locLevel, setLocLevel] = useState("worldwide"); // worldwide | country | region | city
  const [selCountry, setSelCountry] = useState("all");
  const [selRegion, setSelRegion] = useState("all");
  const [selCity, setSelCity] = useState("all");

  // Store search
  const [storeSearch, setStoreSearch] = useState("");
  const [expandedStore, setExpandedStore] = useState(null);

  // Fetch all prices
  useEffect(() => {
    if (!SUPABASE_URL || !SUPABASE_KEY) return;
    setLoadingPrices(true);
    fetch(`${SUPABASE_URL}/rest/v1/prices?order=reported_at.asc&limit=5000`, { headers })
      .then(r => r.json())
      .then(data => {
        if (Array.isArray(data)) setAllPrices(data);
      })
      .catch(() => {})
      .finally(() => setLoadingPrices(false));
  }, []);

  // Parse locations from stores
  const storeLocations = stores.map(s => ({ ...s, ...parseAddress(s.address) }));

  // Build unique lists
  const countries = [...new Set(storeLocations.map(s => s.country))].filter(c => c !== "Other").sort();
  const regions = [...new Set(storeLocations
    .filter(s => selCountry === "all" || s.country === selCountry)
    .map(s => s.region))].filter(Boolean).sort();
  const cities = [...new Set(storeLocations
    .filter(s => (selCountry === "all" || s.country === selCountry) && (selRegion === "all" || s.region === selRegion))
    .map(s => s.city))].filter(Boolean).sort();

  // Filtered stores by location
  const filteredStores = storeLocations.filter(s => {
    if (selCountry !== "all" && s.country !== selCountry) return false;
    if (selRegion !== "all" && s.region !== selRegion) return false;
    if (selCity !== "all" && s.city !== selCity) return false;
    if (storeSearch && !s.name.toLowerCase().includes(storeSearch.toLowerCase()) &&
        !s.address.toLowerCase().includes(storeSearch.toLowerCase())) return false;
    return true;
  });

  const filteredStoreIds = new Set(filteredStores.map(s => String(s.id)));

  // Get prices for filtered stores
  const filteredPrices = allPrices.filter(p => filteredStoreIds.has(String(p.store_id)));

  // Aggregate by day (daily average across all filtered stores)
  const dailyData = (() => {
    const byDay = {};
    filteredPrices.forEach(p => {
      const day = p.reported_at?.split("T")[0];
      if (!day) return;
      if (!byDay[day]) byDay[day] = [];
      byDay[day].push(parseFloat(p.price));
    });
    return Object.entries(byDay)
      .map(([date, vals]) => ({
        date,
        price: vals.reduce((a, b) => a + b, 0) / vals.length,
        count: vals.length,
      }))
      .sort((a, b) => a.date.localeCompare(b.date));
  })();

  // Chart change
  const chartFiltered = filterByPeriod(dailyData, period);
  const chartChange = chartFiltered.length >= 2
    ? chartFiltered[chartFiltered.length - 1].price - chartFiltered[0].price
    : null;
  const chartChangePct = chartChange !== null && chartFiltered[0]?.price
    ? (chartChange / chartFiltered[0].price) * 100 : null;

  // Per-store summaries (priced stores only, filtered)
  const storeRows = filteredStores
    .filter(s => s.latest_price)
    .map(s => {
      const storePrices = allPrices
        .filter(p => String(p.store_id) === String(s.id))
        .sort((a, b) => a.reported_at?.localeCompare(b.reported_at));
      const vals = storePrices.map(p => parseFloat(p.price));
      return { ...s, priceHistory: vals };
    })
    .sort((a, b) => parseFloat(a.latest_price) - parseFloat(b.latest_price));

  // Market movers (cheapest 3)
  const movers = [...storeRows].slice(0, 3);

  const locLabel = selCity !== "all" ? selCity
    : selRegion !== "all" ? selRegion
    : selCountry !== "all" ? selCountry
    : "Worldwide";

      if (selectedStore) {
      return (<StoreDetailChart store={selectedStore} allPrices={allPrices} currency={currency} onBack={() => setSelectedStore(null)} onReportPrice={onReportPrice} onViewStore={onViewStore} />);
    }
    return (
    <div className="prices-page">
      <TickerBar stores={filteredStores} onSelect={setSelectedStore} />

      {/* Ã¢ÂÂÃ¢ÂÂ Header Ã¢ÂÂÃ¢ÂÂ */}
      <div className="prices-header">
        <div className="ph-top">
          <div>
            <h2 className="ph-title">
              <i className="ti ti-chart-candle" /> Snus Market Index
            </h2>
            <div className="ph-sub">{locLabel} Â· {filteredStores.length} locations tracked</div>
          </div>
          {chartChangePct !== null && (
            <div className={`ph-change ${chartChangePct > 0 ? "up" : "down"}`}>
              <i className={`ti ti-trending-${chartChangePct > 0 ? "up" : "down"}`} />
              {chartChangePct > 0 ? "+" : ""}{chartChangePct.toFixed(2)}%
              <span className="ph-change-label">vs {period} ago</span>
            </div>
          )}
        </div>

        {/* Ã¢ÂÂÃ¢ÂÂ Location filter Ã¢ÂÂÃ¢ÂÂ */}
        <div className="loc-filter-row">
          <div className="loc-filter-group">
            <label className="loc-label">Region</label>
            <div className="loc-chips">
              {["worldwide","country","region","city"].map(lvl => (
                <button key={lvl}
                  className={`loc-chip ${locLevel === lvl ? "active" : ""}`}
                  onClick={() => {
                    setLocLevel(lvl);
                    if (lvl === "worldwide") { setSelCountry("all"); setSelRegion("all"); setSelCity("all"); }
                  }}
                >
                  {lvl.charAt(0).toUpperCase() + lvl.slice(1)}
                </button>
              ))}
            </div>
          </div>

          {locLevel !== "worldwide" && (
            <div className="loc-selects">
              <select className="loc-select" value={selCountry}
                onChange={e => { setSelCountry(e.target.value); setSelRegion("all"); setSelCity("all"); }}>
                <option value="all">All countries</option>
                {countries.map(c => <option key={c} value={c}>{c}</option>)}
              </select>

              {(locLevel === "region" || locLevel === "city") && (
                <select className="loc-select" value={selRegion}
                  onChange={e => { setSelRegion(e.target.value); setSelCity("all"); }}>
                  <option value="all">All provinces/states</option>
                  {regions.map(r => <option key={r} value={r}>{r}</option>)}
                </select>
              )}

              {locLevel === "city" && (
                <select className="loc-select" value={selCity}
                  onChange={e => setSelCity(e.target.value)}>
                  <option value="all">All cities</option>
                  {cities.map(c => <option key={c} value={c}>{c}</option>)}
                </select>
              )}
            </div>
          )}
        </div>

        {/* Ã¢ÂÂÃ¢ÂÂ Period selector Ã¢ÂÂÃ¢ÂÂ */}
        <div className="period-row">
          {PERIODS.map(p => (
            <button key={p.id}
              className={`period-btn ${period === p.id ? "active" : ""}`}
              onClick={() => setPeriod(p.id)}
            >
              {p.label}
            </button>
          ))}
        </div>
      </div>

      {/* Ã¢ÂÂÃ¢ÂÂ Main chart Ã¢ÂÂÃ¢ÂÂ */}
      <div className="market-chart-panel">
        {loadingPrices ? (
          <div className="chart-loading"><div className="spinner" /><span>Loading market dataâ¦</span></div>
        ) : (
          <MarketChart data={dailyData} period={period} currency={currency} />
        )}
      </div>

      {/* Ã¢ÂÂÃ¢ÂÂ Market movers Ã¢ÂÂÃ¢ÂÂ */}
      {movers.length > 0 && (
        <div className="market-movers">
          <div className="movers-title"><i className="ti ti-flame" /> Best Prices</div>
          <div className="movers-list">
            {movers.map((s, i) => (
              <div key={s.id} className="mover-card">
                <div className="mover-rank">#{i + 1}</div>
                <div className="mover-info">
                  <div className="mover-name">{s.name}</div>
                  <div className="mover-addr">{s.city}, {s.region}</div>
                </div>
                <div className="mover-price">${parseFloat(s.latest_price).toFixed(2)}</div>
              </div>
            ))}
          </div>
        </div>
      )}

      {/* Ã¢ÂÂÃ¢ÂÂ Store list Ã¢ÂÂÃ¢ÂÂ */}
      <div className="prices-toolbar">
        <div className="search-wrap" style={{ maxWidth: 360 }}>
          <i className="ti ti-search search-icon" />
          <input className="search-input" placeholder="Search storesâ¦"
            value={storeSearch} onChange={e => setStoreSearch(e.target.value)} />
        </div>
        <div className="prices-count">{storeRows.length} stores with price data</div>
      </div>

      {storeRows.length === 0 ? (
        <div className="prices-empty">
          <i className="ti ti-chart-line" style={{ fontSize: 40 }} />
          <p>No price data yet for this region.</p>
          <p style={{ color: "rgba(255,255,255,0.4)", fontSize: 13 }}>
            Visit a store and report a price to see it here.
          </p>
        </div>
      ) : (
        <div className="prices-list">
          {storeRows.map(s => {
            const pct = s.priceHistory.length >= 2
              ? ((s.priceHistory[s.priceHistory.length-1] - s.priceHistory[0]) / s.priceHistory[0]) * 100
              : null;
            const up = pct !== null && pct >= 0;
            return (
              <div key={s.id}
                onClick={() => setSelectedStore(s)}
                style={{display:'flex',alignItems:'center',padding:'14px 16px',cursor:'pointer',borderBottom:'1px solid rgba(255,255,255,0.07)',WebkitTapHighlightColor:'transparent',userSelect:'none'}}>
                <div style={{flex:1,minWidth:0,marginRight:8}}>
                  <div style={{fontWeight:700,fontSize:15,color:'#e2e8f0',marginBottom:3,overflow:'hidden',textOverflow:'ellipsis',whiteSpace:'nowrap'}}>{s.name}</div>
                  <div style={{fontSize:12,color:'#94a3b8',overflow:'hidden',textOverflow:'ellipsis',whiteSpace:'nowrap'}}>{s.city ? s.city+' Â· '+s.region : s.address}</div>
                </div>
                <div style={{margin:'0 14px',flexShrink:0}}>
                  <Sparkline values={s.priceHistory.slice(-12)} color={up ? '#22c55e' : '#ef4444'} />
                </div>
                <div style={{textAlign:'right',flexShrink:0}}>
                  <div style={{fontWeight:700,fontSize:15,color:'#e2e8f0'}}>{currency}{parseFloat(s.latest_price).toFixed(2)}</div>
                  {pct !== null && (
                    <span style={{display:'inline-block',marginTop:3,fontSize:12,fontWeight:600,color:'#fff',background:up?'#16a34a':'#dc2626',borderRadius:4,padding:'1px 7px'}}>
                      {up ? '+' : ''}{pct.toFixed(2)}%
                    </span>
                  )}
                </div>
              </div>
            );
          })}
        </div>
      )}
    </div>
  );
}
