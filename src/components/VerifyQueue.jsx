import { useState } from "react";

export default function VerifyQueue({ stores, onVerify, onStoreClick }) {
  const [done, setDone] = useState(new Set());

  const handle = async (storeId, confirmed) => {
    await onVerify(storeId, confirmed);
    setDone((d) => new Set([...d, storeId]));
  };

  const pending = stores.filter((s) => !done.has(s.id));

  return (
    <div className="verify-page">
      <div className="verify-container">
        <div className="form-header">
          <h1 className="form-title">Verify locations</h1>
          <p className="form-sub">Have you visited any of these stores recently? Your confirmations keep the map accurate.</p>
        </div>

        <div className="points-banner">
          <i className="ti ti-star-filled" />
          <div>
            <div className="points-banner-val">+5 points per verification</div>
            <div className="points-banner-label">Help the community and earn points</div>
          </div>
        </div>

        {pending.length === 0 ? (
          <div className="list-empty">
            <i className="ti ti-circle-check" style={{ fontSize: 40, color: "#059669" }} />
            <p style={{ fontWeight: 600, color: "#111827" }}>All caught up!</p>
            <p>No locations need verification right now.</p>
          </div>
        ) : (
          <ul className="verify-list" role="list">
            {pending.map((store) => (
              <li key={store.id} className="verify-card">
                <div className="verify-card-top">
                  <div style={{ flex: 1, cursor: "pointer" }} onClick={() => onStoreClick(store)}>
                    <div className="store-name" style={{ fontSize: 15 }}>{store.name}</div>
                    <div className="store-addr" style={{ marginTop: 3 }}>
                      <i className="ti ti-map-pin" style={{ fontSize: 12, verticalAlign: -1 }} /> {store.address}
                    </div>
                  </div>
                  <span className={`status-badge ${store.status}`}>
                    {store.reports} report{store.reports !== 1 ? "s" : ""}
                  </span>
                </div>
                <div className="verify-meta">
                  Reported {new Date(store.reported_at || store.reportedAt || Date.now()).toLocaleDateString("en-CA")}
                  {store.flavors?.length > 0 && <> · {store.flavors.slice(0, 2).join(", ")}</>}
                  {store.strength && store.strength !== "Unsure" && <> · {store.strength}</>}
                </div>
                <div className="verify-actions">
                  <button className="v-btn yes" onClick={() => handle(store.id, true)}>
                    <i className="ti ti-check" /> Yes, they sell Zyns
                  </button>
                  <button className="v-btn no" onClick={() => handle(store.id, false)}>
                    <i className="ti ti-x" /> No longer
                  </button>
                </div>
              </li>
            ))}
          </ul>
        )}
      </div>
    </div>
  );
}
