import { useState } from "react";
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
  const dist = distKm(userCoords, { lat: store.lat, lng: store.lng });

  return (
    <div className={`price-row-card ${open ? "expanded" : ""}`}>
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
        <div className="price-row-right">
          {latest ? (
            <>
              <div className="price-row-price">{fmt(latest)}</div>
              <div className="price-row-size">/{store.latest_can_size || 15} pk</div>
            </>
          ) : (
            <div className="price-row-none">No price</div>
          )}
          <i className={`ti ${open ? "ti-chevron-up" : "ti-chevron-down"} price-row-chevron`} />
        </div>
      </div>

      {open && (
        <div className="price-row-detail">
          {prices.length > 1 && (
            <div className="price-history-list">
              {[...prices].reverse().slice(0, 5).map((p, i) => (
                <div key={p.id} className="price-history-item">
                  <span>{fmt(p.price)}/{p.can_size || 15}pk</span>
                  <span style={{ color: "#9ca3af" }}>
                    {new Date(p.reported_at).toLocaleDateString("en-CA", { month: "short", day: "numeric" })}
                  </span>
                </div>
              ))}
            </div>
          )}

          <div className="price-report-inline">
            {saved ? (
              <div style={{ color: "#059669", fontSize: 13, display: "flex", alignItems: "center", gap: 6 }}>
                <i className="ti ti-circle-check" /> Saved!
              </div>
            ) : (
              <>
                <div className="price-input-row">
                  <div className="price-input-wrap" style={{ flex: 1 }}>
                    <span className="price-input-prefix">$</span>
                    <input className="field-input price-input" type="number"
                      min="0" max="500" step="0.01" placeholder="22.99"
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
            <i className="ti ti-external-link" /> View store
          </button>
        </div>
      )}
    </div>
  );
}

export default function PricesPage({ stores, userCoords, user, onStoreClick }) {
  const [sort, setSort] = useState("cheapest");
  const [search, setSearch] = useState("");

  const dist = (s) => distKm(userCoords, { lat: s.lat, lng: s.lng }) ?? 9999;

  const filtered = stores
    .filter((s) => s.name.toLowerCase().includes(search.toLowerCase()) || s.address.toLowerCase().includes(search.toLowerCase()))
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

  return (
    <div className="prices-page">
      {/* Market header */}
      <div className="prices-header">
        <div className="prices-title">
          <i className="ti ti-chart-line" /> Zyn Price Tracker
        </div>
        <div className="prices-sub">Community-reported prices near you</div>

        {avgPrice && (
          <div className="prices-stats">
            <div className="price-stat-box">
              <div className="price-stat-val">{fmt(avgPrice)}</div>
              <div className="price-stat-label">Avg price</div>
            </div>
            <div className="price-stat-box">
              <div className="price-stat-val" style={{ color: "#059669" }}>
                {cheapest ? fmt(cheapest.latest_price) : "—"}
              </div>
              <div className="price-stat-label">Lowest</div>
            </div>
            <div className="price-stat-box">
              <div className="price-stat-val">{priced.length}</div>
              <div className="price-stat-label">Locations w/ prices</div>
            </div>
          </div>
        )}
      </div>

      {/* Search + sort */}
      <div className="prices-toolbar">
        <div className="search-wrap" style={{ flex: 1 }}>
          <i className="ti ti-search search-icon" />
          <input className="search-input" placeholder="Search stores…"
            value={search} onChange={(e) => setSearch(e.target.value)} />
        </div>
        <div className="sort-chips" style={{ flexShrink: 0 }}>
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
            <i className="ti ti-chart-line" style={{ fontSize: 32 }} />
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
