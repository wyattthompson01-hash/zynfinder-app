import { useState, useEffect, useRef } from "react";
import { usePrices } from "../hooks/usePrices";

const SUPABASE_URL = import.meta.env.VITE_SUPABASE_URL;
const SUPABASE_KEY = import.meta.env.VITE_SUPABASE_ANON_KEY;

function fmt(p) { return `$${parseFloat(p).toFixed(2)}`; }

function distKm(a, b) {
  if (!a || !b) return null;
  const R = 6371;
  const dLat = ((b.lat - a.lat) * Math.PI) / 180;
  const dLng = ((b.lng - a.lng) * Math.PI) / 180;
  const x = Math.sin(dLat / 2) ** 2 +
    Math.cos((a.lat * Math.PI) / 180) * Math.cos((b.lat * Math.PI) / 180) * Math.sin(dLng / 2) ** 2;
  return R * 2 * Math.atan2(Math.sqrt(x), Math.sqrt(1 - x));
}

// Tiny inline sparkline SVG from price history array
function Sparkline({ prices, width = 80, height = 32 }) {
  if (!prices || prices.length < 2) {
    return <div style={{ width, height, display: "flex", alignItems: "center", justifyContent: "center", opacity: 0.3 }}>
      <i className="ti ti-chart-line" style={{ fontSize: 14 }} />
    </div>;
  }
  const vals = [...prices].slice(-10).map(p => parseFloat(p.price));
  const min = Math.min(...vals);
  const max = Math.max(...vals);
  const range = max - min || 1;
  const pts = vals.map((v, i) => {
    const x = (i / (vals.length - 1)) * width;
    const y = height - ((v - min) / range) * (height - 4) - 2;
    return `${x},${y}`;
  }).join(" ");
  const trend = vals[vals.length - 1] - vals[0];
  const color = trend <= 0 ? "#22c55e" : "#ef4444"; // lower price = green (good!)
  return (
    <svg width={width} height={height} viewBox={`0 0 ${width} ${height}`} fill="none">
      <polyline points={pts} stroke={color} strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" />
      <circle cx={pts.split(" ").pop().split(",")[0]} cy={pts.split(" ").pop().split(",")[1]}
        r="2.5" fill={color} />
    </svg>
  );
}

// Change badge: shows +/- from previous price
function ChangeBadge({ current, prev }) {
  if (!prev) return null;
  const diff = current - prev;
  const pct = ((diff / prev) * 100).toFixed(1);
  const isGood = diff <= 0; // lower price = good
  return (
    <span className={`price-change-badge ${isGood ? "down" : "up"}`}>
      <i className={`ti ${isGood ? "ti-trending-down" : "ti-trending-up"}`} />
      {diff > 0 ? "+" : ""}{fmt(Math.abs(diff))} ({diff > 0 ? "+" : ""}{pct}%)
    </span>
  );
}

// Scrolling ticker bar
function TickerBar({ stores }) {
  const priced = stores.filter(s => s.latest_price);
  const tickerRef = useRef(null);

  if (priced.length === 0) return null;

  const items = [...priced, ...priced]; // duplicate for seamless loop

  return (
    <div className="mkt-ticker-outer">
      <div className="mkt-ticker-label"><i className="ti ti-chart-candle" /> LIVE</div>
      <div className="mkt-ticker-track" ref={tickerRef}>
        <div className="mkt-ticker-inner">
          {items.map((s, i) => (
            <span key={i} className="mkt-ticker-item">
              <span className="ticker-name">{s.name.split(" ").slice(0, 2).join(" ")}</span>
              <span className="ticker-price">{fmt(s.latest_price)}</span>
              <span className="ticker-sep">·</span>
            </span>
          ))}
        </div>
      </div>
    </div>
  );
}

function PriceRow({ store, userCoords, user, onStoreClick }) {
  const { prices, fetchPrices, submitPrice } = usePrices(store.id);
  const [open, setOpen] = useState(false);
  const [priceInput, setPriceInput] = useState("");
  const [canSize, setCanSize] = useState(15);
  const [saving, setSaving] = useState(false);
  const [saved, setSaved] = useState(false);
  const [err, setErr] = useState(null);

  const handleOpen = () => {
    if (!open) fetchPrices();
    setOpen(!open);
  };

  const handleSubmit = async () => {
    const val = parseFloat(priceInput);
    if (isNaN(val) || val <= 0) { setErr("Enter a valid price"); return; }
    setSaving(true); setErr(null);
    await submitPrice({ storeId: store.id, price: val, canSize, userId: user?.id });
    setSaving(false); setSaved(true);
    setPriceInput(""); fetchPrices();
  };

  const latest = store.latest_price ? parseFloat(store.latest_price) : null;
  const prev = prices.length > 1 ? parseFloat(prices[prices.length - 2]?.price) : null;
  const dist = distKm(userCoords, { lat: store.lat, lng: store.lng });
  const trend = latest && prev ? latest - prev : null;
  const trendIsGood = trend !== null && trend <= 0;

  return (
    <div className={`price-row-card ${open ? "expanded" : ""} ${trend !== null ? (trendIsGood ? "trend-down" : "trend-up") : ""}`}>
      <div className="price-row-main" onClick={handleOpen}>
        <div className="price-row-icon">
          <i className={`ti ${store.type === "gas" ? "ti-gas-station" : store.type === "pharmacy" ? "ti-pill" : "ti-building-store"}`} />
        </div>
        <div className="price-row-info">
          <div className="price-row-name">{store.name}</div>
          <div className="price-row-addr">{store.address}</div>
          {dist !== null && (
            <div className="price-row-dist">{dist < 1 ? `${Math.round(dist * 1000)} m` : `${dist.toFixed(1)} km`}</div>
          )}
        </div>

        {/* Sparkline */}
        <div className="price-row-spark">
          <Sparkline prices={prices.length ? prices : latest ? [{ price: latest }] : []} />
        </div>

        <div className="price-row-right">
          {latest ? (
            <>
              <div className="price-row-price">{fmt(latest)}</div>
              <div className="price-row-size">/{store.latest_can_size || 15}pk</div>
              {prev && (
                <span className={`price-micro-badge ${trendIsGood ? "good" : "bad"}`}>
                  <i className={`ti ${trendIsGood ? "ti-arrow-down" : "ti-arrow-up"}`} />
                  {fmt(Math.abs(latest - prev))}
                </span>
              )}
            </>
          ) : (
            <div className="price-row-none">No data</div>
          )}
          <i className={`ti ${open ? "ti-chevron-up" : "ti-chevron-down"} price-row-chevron`} />
        </div>
      </div>

      {open && (
        <div className="price-row-detail">
          {prices.length > 1 && (
            <>
              <div className="price-row-chart-header">
                <span className="price-chart-title">Price history</span>
                {prev && latest && <ChangeBadge current={latest} prev={prev} />}
              </div>
              <div className="price-history-chart">
                <Sparkline prices={prices} width={260} height={60} />
              </div>
              <div className="price-history-list">
                {[...prices].reverse().slice(0, 5).map((p) => (
                  <div key={p.id} className="price-history-item">
                    <span className="phi-price">{fmt(p.price)}/{p.can_size || 15}pk</span>
                    <span className="phi-date">
                      {new Date(p.reported_at).toLocaleDateString("en-CA", { month: "short", day: "numeric" })}
                    </span>
                  </div>
                ))}
              </div>
            </>
          )}

          <div className="price-report-inline">
            {saved ? (
              <div className="price-saved-msg">
                <i className="ti ti-circle-check" /> Price reported — thanks!
              </div>
            ) : (
              <>
                <div className="price-report-label">Report current price</div>
                <div className="price-input-row">
                  <div className="price-input-wrap" style={{ flex: 1 }}>
                    <span className="price-input-prefix">$</span>
                    <input className="field-input price-input" type="number"
                      min="0" max="999" step="0.01" placeholder="22.99"
                      value={priceInput} onChange={(e) => { setPriceInput(e.target.value); setErr(null); }} />
                  </div>
                  <button className={`radio-btn ${canSize === 15 ? "selected" : ""}`}
                    onClick={() => setCanSize(15)} style={{ padding: "6px 10px", fontSize: 12 }}>15pk</button>
                  <button className={`radio-btn ${canSize === 20 ? "selected" : ""}`}
                    onClick={() => setCanSize(20)} style={{ padding: "6px 10px", fontSize: 12 }}>20pk</button>
                  <button className="submit-btn" style={{ padding: "8px 14px", width: "auto", fontSize: 13 }}
                    onClick={handleSubmit} disabled={saving}>
                    {saving ? "…" : "Add"}
                  </button>
                </div>
                {err && <span className="field-error">{err}</span>}
              </>
            )}
          </div>

          <button className="directions-btn" style={{ marginTop: 8, fontSize: 12 }}
            onClick={() => onStoreClick(store)}>
            <i className="ti ti-external-link" /> View store details
          </button>
        </div>
      )}
    </div>
  );
}

// Market movers: top 3 cheapest stores with prices
function MarketMovers({ stores, onStoreClick }) {
  const priced = stores
    .filter(s => s.latest_price)
    .sort((a, b) => parseFloat(a.latest_price) - parseFloat(b.latest_price))
    .slice(0, 3);

  if (priced.length === 0) return null;

  return (
    <div className="market-movers">
      <div className="movers-title"><i className="ti ti-flame" /> Best Prices Right Now</div>
      <div className="movers-list">
        {priced.map((s, i) => (
          <button key={s.id} className="mover-card" onClick={() => onStoreClick(s)}>
            <div className="mover-rank">#{i + 1}</div>
            <div className="mover-info">
              <div className="mover-name">{s.name.split(" ").slice(0, 3).join(" ")}</div>
              <div className="mover-addr">{s.address?.split(",")[0]}</div>
            </div>
            <div className="mover-price">{fmt(s.latest_price)}</div>
          </button>
        ))}
      </div>
    </div>
  );
}

export default function PricesPage({ stores, userCoords, user, onStoreClick }) {
  const [sort, setSort] = useState("cheapest");
  const [search, setSearch] = useState("");
  const [showMovers, setShowMovers] = useState(true);

  const dist = (s) => distKm(userCoords, { lat: s.lat, lng: s.lng }) ?? 9999;

  const filtered = stores
    .filter((s) => s.name.toLowerCase().includes(search.toLowerCase()) || s.address?.toLowerCase().includes(search.toLowerCase()))
    .sort((a, b) => {
      if (sort === "cheapest") {
        const pa = a.latest_price ? parseFloat(a.latest_price) : 9999;
        const pb = b.latest_price ? parseFloat(b.latest_price) : 9999;
        return pa - pb;
      }
      if (sort === "nearest") return dist(a) - dist(b);
      if (sort === "recent") return new Date(b.reported_at || 0) - new Date(a.reported_at || 0);
      return 0;
    });

  const priced = stores.filter((s) => s.latest_price);
  const avgPrice = priced.length
    ? (priced.reduce((s, x) => s + parseFloat(x.latest_price), 0) / priced.length).toFixed(2)
    : null;
  const cheapest = priced.length
    ? priced.reduce((a, b) => parseFloat(a.latest_price) < parseFloat(b.latest_price) ? a : b)
    : null;
  const pricedCount = priced.length;

  return (
    <div className="prices-page">
      {/* Ticker bar */}
      <TickerBar stores={stores} />

      {/* Market header */}
      <div className="prices-header">
        <div className="prices-header-inner">
          <div>
            <div className="prices-title">
              <i className="ti ti-chart-candle" /> Snus Market
            </div>
            <div className="prices-sub">Community-reported prices · Global</div>
          </div>
          <div className="prices-index">
            {avgPrice ? (
              <>
                <div className="prices-index-val">{fmt(avgPrice)}</div>
                <div className="prices-index-label">Global Avg</div>
              </>
            ) : (
              <div className="prices-index-label">No price data yet</div>
            )}
          </div>
        </div>

        {avgPrice && (
          <div className="prices-stats">
            <div className="price-stat-box">
              <div className="price-stat-val">{fmt(avgPrice)}</div>
              <div className="price-stat-label">Market avg</div>
            </div>
            <div className="price-stat-box">
              <div className="price-stat-val good">{cheapest ? fmt(cheapest.latest_price) : "—"}</div>
              <div className="price-stat-label">Lowest listed</div>
            </div>
            <div className="price-stat-box">
              <div className="price-stat-val">{pricedCount}</div>
              <div className="price-stat-label">Stores tracked</div>
            </div>
            <div className="price-stat-box">
              <div className="price-stat-val">{stores.length}</div>
              <div className="price-stat-label">Total locations</div>
            </div>
          </div>
        )}
      </div>

      {/* Market movers */}
      {showMovers && (
        <MarketMovers stores={stores} onStoreClick={onStoreClick} />
      )}

      {/* Search + sort */}
      <div className="prices-toolbar">
        <div className="search-wrap" style={{ flex: 1 }}>
          <i className="ti ti-search search-icon" />
          <input className="search-input" placeholder="Search stores…"
            value={search} onChange={(e) => setSearch(e.target.value)} />
        </div>
        <div className="sort-chips">
          {[
            { id: "cheapest", label: "Cheapest", icon: "ti-arrow-down" },
            { id: "nearest",  label: "Nearest",  icon: "ti-navigation" },
            { id: "recent",   label: "Recent",   icon: "ti-clock" },
          ].map((s) => (
            <button key={s.id} className={`sort-chip ${sort === s.id ? "active" : ""}`}
              onClick={() => setSort(s.id)}>
              <i className={`ti ${s.icon}`} />{s.label}
            </button>
          ))}
        </div>
      </div>

      {/* Store list */}
      <div className="prices-list">
        {filtered.length === 0 ? (
          <div className="list-empty">
            <i className="ti ti-chart-candle" style={{ fontSize: 32 }} />
            <p>No stores found</p>
          </div>
        ) : (
          filtered.map((store) => (
            <PriceRow key={store.id} store={store} userCoords={userCoords}
              user={user} onStoreClick={onStoreClick} />
          ))
        )}
      </div>
    </div>
  );
}
