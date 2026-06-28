// Simple SVG line chart for price history — no external dependencies

const W = 320;
const H = 120;
const PAD = { top: 12, right: 12, bottom: 28, left: 44 };

function formatDate(iso) {
  return new Date(iso).toLocaleDateString("en-CA", { month: "short", day: "numeric" });
}

function formatPrice(p) {
  return `$${parseFloat(p).toFixed(2)}`;
}

export default function PriceChart({ prices }) {
  if (!prices || prices.length < 2) {
    return (
      <div className="price-chart-empty">
        <i className="ti ti-chart-line" style={{ fontSize: 24, color: "#d1d5db" }} />
        <span>Not enough data for a chart yet</span>
      </div>
    );
  }

  const values = prices.map((p) => parseFloat(p.price));
  const minVal = Math.min(...values);
  const maxVal = Math.max(...values);
  const range = maxVal - minVal || 1;

  const innerW = W - PAD.left - PAD.right;
  const innerH = H - PAD.top - PAD.bottom;

  const xScale = (i) => PAD.left + (i / (prices.length - 1)) * innerW;
  const yScale = (v) => PAD.top + innerH - ((v - minVal) / range) * innerH;

  const points = prices.map((p, i) => [xScale(i), yScale(parseFloat(p.price))]);
  const polyline = points.map((p) => p.join(",")).join(" ");

  // Area fill path
  const areaPath = [
    `M ${points[0][0]},${PAD.top + innerH}`,
    ...points.map((p) => `L ${p[0]},${p[1]}`),
    `L ${points[points.length - 1][0]},${PAD.top + innerH}`,
    "Z",
  ].join(" ");

  // Y-axis ticks (3)
  const yTicks = [minVal, minVal + range / 2, maxVal];

  // X-axis ticks: first, middle, last
  const xTickIdxs = [0, Math.floor((prices.length - 1) / 2), prices.length - 1];

  const latest = values[values.length - 1];
  const prev = values[values.length - 2];
  const trend = latest > prev ? "up" : latest < prev ? "down" : "flat";

  return (
    <div className="price-chart-wrap">
      <svg viewBox={`0 0 ${W} ${H}`} width="100%" style={{ display: "block", overflow: "visible" }}>
        {/* Grid lines */}
        {yTicks.map((v, i) => (
          <line
            key={i}
            x1={PAD.left} y1={yScale(v)}
            x2={W - PAD.right} y2={yScale(v)}
            stroke="#f3f4f6" strokeWidth={1}
          />
        ))}

        {/* Area fill */}
        <path d={areaPath} fill="url(#priceGrad)" opacity={0.6} />

        {/* Line */}
        <polyline points={polyline} fill="none" stroke="#059669" strokeWidth={2} strokeLinejoin="round" strokeLinecap="round" />

        {/* Dots */}
        {points.map((p, i) => (
          <circle key={i} cx={p[0]} cy={p[1]} r={3} fill="#059669" stroke="#fff" strokeWidth={1.5} />
        ))}

        {/* Y-axis labels */}
        {yTicks.map((v, i) => (
          <text key={i} x={PAD.left - 6} y={yScale(v) + 4} textAnchor="end" fontSize={10} fill="#9ca3af">
            ${v.toFixed(0)}
          </text>
        ))}

        {/* X-axis labels */}
        {xTickIdxs.map((idx) => (
          <text
            key={idx}
            x={xScale(idx)}
            y={H - 4}
            textAnchor={idx === 0 ? "start" : idx === prices.length - 1 ? "end" : "middle"}
            fontSize={10}
            fill="#9ca3af"
          >
            {formatDate(prices[idx].reported_at)}
          </text>
        ))}

        {/* Gradient */}
        <defs>
          <linearGradient id="priceGrad" x1="0" y1="0" x2="0" y2="1">
            <stop offset="0%" stopColor="#059669" stopOpacity={0.25} />
            <stop offset="100%" stopColor="#059669" stopOpacity={0} />
          </linearGradient>
        </defs>
      </svg>

      <div className="price-chart-footer">
        <span className="price-chart-latest">
          Latest: <strong>{formatPrice(latest)}</strong>
        </span>
        {trend !== "flat" && (
          <span className={`price-trend ${trend}`}>
            <i className={`ti ti-trending-${trend}`} />
            {formatPrice(Math.abs(latest - prev))} vs prev
          </span>
        )}
      </div>
    </div>
  );
}
