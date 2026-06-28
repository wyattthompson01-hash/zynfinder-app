// Stock-market style price chart — pure SVG, no dependencies

const W = 400;
const H = 140;
const PAD = { top: 16, right: 16, bottom: 28, left: 52 };

function fmt(p) { return `$${parseFloat(p).toFixed(2)}`; }
function fmtDate(iso) {
  return new Date(iso).toLocaleDateString("en-CA", { month: "short", day: "numeric" });
}

export default function PriceChart({ prices }) {
  if (!prices || prices.length === 0) return null;

  const values = prices.map((p) => parseFloat(p.price));
  const latest = values[values.length - 1];
  const first = values[0];
  const prev = values.length > 1 ? values[values.length - 2] : first;
  const change = latest - first;
  const changePct = first > 0 ? ((change / first) * 100).toFixed(1) : "0.0";
  const isUp = change >= 0;
  const color = isUp ? "#dc2626" : "#059669"; // price up = bad (red), price down = good (green)

  if (prices.length === 1) {
    // Single price — just show the ticker
    return (
      <div className="price-ticker">
        <div className="price-ticker-current">{fmt(latest)}</div>
        <div className="price-ticker-meta">
          <span>per {prices[0].can_size || 15} pouches</span>
          <span style={{ color: "#9ca3af" }}>1 report</span>
        </div>
      </div>
    );
  }

  const minVal = Math.min(...values) * 0.995;
  const maxVal = Math.max(...values) * 1.005;
  const range = maxVal - minVal || 1;

  const innerW = W - PAD.left - PAD.right;
  const innerH = H - PAD.top - PAD.bottom;

  const xScale = (i) => PAD.left + (i / (values.length - 1)) * innerW;
  const yScale = (v) => PAD.top + innerH - ((v - minVal) / range) * innerH;

  const points = values.map((v, i) => [xScale(i), yScale(v)]);
  const polyline = points.map((p) => p.join(",")).join(" ");

  const areaPath = [
    `M ${points[0][0]},${PAD.top + innerH}`,
    ...points.map((p) => `L ${p[0]},${p[1]}`),
    `L ${points[points.length - 1][0]},${PAD.top + innerH}`,
    "Z",
  ].join(" ");

  // Y-axis: 3 ticks
  const yTicks = [minVal, (minVal + maxVal) / 2, maxVal];
  // X-axis: up to 4 labels
  const step = Math.max(1, Math.floor((prices.length - 1) / 3));
  const xTickIdxs = [];
  for (let i = 0; i < prices.length; i += step) xTickIdxs.push(i);
  if (xTickIdxs[xTickIdxs.length - 1] !== prices.length - 1) xTickIdxs.push(prices.length - 1);

  const gradId = `pg_${Math.random().toString(36).slice(2, 7)}`;

  return (
    <div className="price-chart-card">
      {/* Ticker header */}
      <div className="price-ticker">
        <div className="price-ticker-current">{fmt(latest)}</div>
        <div className="price-ticker-right">
          <div className={`price-ticker-change ${isUp ? "up" : "down"}`}>
            <i className={`ti ti-trending-${isUp ? "up" : "down"}`} />
            {isUp ? "+" : ""}{fmt(Math.abs(change))} ({isUp ? "+" : ""}{changePct}%)
          </div>
          <div className="price-ticker-meta">
            per {prices[prices.length - 1].can_size || 15} pouches · {prices.length} reports
          </div>
        </div>
      </div>

      {/* Chart */}
      <svg viewBox={`0 0 ${W} ${H}`} width="100%" style={{ display: "block", overflow: "visible" }}>
        {/* Horizontal grid */}
        {yTicks.map((v, i) => (
          <line key={i} x1={PAD.left} y1={yScale(v)} x2={W - PAD.right} y2={yScale(v)}
            stroke="#f3f4f6" strokeWidth={1} />
        ))}

        {/* Area */}
        <path d={areaPath} fill={`url(#${gradId})`} />

        {/* Line */}
        <polyline points={polyline} fill="none" stroke={color} strokeWidth={2.5}
          strokeLinejoin="round" strokeLinecap="round" />

        {/* Latest point dot */}
        <circle cx={points[points.length - 1][0]} cy={points[points.length - 1][1]}
          r={4} fill={color} stroke="#fff" strokeWidth={2} />

        {/* Y labels */}
        {yTicks.map((v, i) => (
          <text key={i} x={PAD.left - 6} y={yScale(v) + 4} textAnchor="end"
            fontSize={10} fill="#9ca3af">${v.toFixed(0)}</text>
        ))}

        {/* X labels */}
        {xTickIdxs.map((idx, i) => (
          <text key={idx} x={xScale(idx)} y={H - 4}
            textAnchor={i === 0 ? "start" : i === xTickIdxs.length - 1 ? "end" : "middle"}
            fontSize={10} fill="#9ca3af">{fmtDate(prices[idx].reported_at)}</text>
        ))}

        <defs>
          <linearGradient id={gradId} x1="0" y1="0" x2="0" y2="1">
            <stop offset="0%" stopColor={color} stopOpacity={0.2} />
            <stop offset="100%" stopColor={color} stopOpacity={0} />
          </linearGradient>
        </defs>
      </svg>

      {/* Low / high bar */}
      <div className="price-range-bar">
        <span className="price-range-low">Low: {fmt(Math.min(...values))}</span>
        <div className="price-range-track">
          <div className="price-range-fill" style={{
            left: `${((latest - Math.min(...values)) / (Math.max(...values) - Math.min(...values) || 1)) * 100}%`,
          }} />
        </div>
        <span className="price-range-high">High: {fmt(Math.max(...values))}</span>
      </div>
    </div>
  );
}
