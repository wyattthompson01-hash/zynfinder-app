import { useState } from "react";

export default function LocationDetail({ store, onBack, onVerify }) {
  const [verifying, setVerifying] = useState(false);
  const [done, setDone] = useState(false);

  const handle = async (confirmed) => {
    setVerifying(true);
    await onVerify(store.id, confirmed);
    setVerifying(false);
    setDone(true);
  };

  const typeIcon = store.type === "gas" ? "ti-gas-station" : store.type === "pharmacy" ? "ti-pill" : "ti-building-store";
  const typeColor = store.type === "gas" ? { bg: "#dbeafe", color: "#1d4ed8" } : store.type === "pharmacy" ? { bg: "#fce7f3", color: "#be185d" } : { bg: "#d1fae5", color: "#065f46" };

  const statusLabel = (s) => {
    if (s === "verified") return "✓ Verified";
    if (s === "pending") return "Needs verification";
    if (s === "gone") return "No longer sells Zyns";
    return "Unconfirmed";
  };

  const lastSeen = store.last_seen || store.lastSeen;
  const reportedAt = store.reported_at || store.reportedAt;

  return (
    <div className="detail-page">
      <div className="detail-container">
        <button className="detail-back" onClick={onBack}>
          <i className="ti ti-arrow-left" /> Back
        </button>

        <div className="detail-hero">
          <div className="detail-type-icon" style={{ background: typeColor.bg }}>
            <i className={`ti ${typeIcon}`} style={{ fontSize: 26, color: typeColor.color }} />
          </div>
          <div className="detail-name">{store.name}</div>
          <div className="detail-addr">
            <i className="ti ti-map-pin" style={{ color: "#9ca3af" }} />
            {store.address}
          </div>
          <span className={`status-badge ${store.status}`} style={{ fontSize: 13, padding: "4px 12px" }}>
            {statusLabel(store.status)}
          </span>

          <div className="detail-stats">
            <div className="stat-box">
              <div className="stat-val" style={{ color: "#059669" }}>{store.confirmations}</div>
              <div className="stat-label">Confirmations</div>
            </div>
            <div className="stat-box">
              <div className="stat-val">{store.reports}</div>
              <div className="stat-label">Total reports</div>
            </div>
            <div className="stat-box">
              <div className="stat-val" style={{ fontSize: 14 }}>
                {lastSeen ? new Date(lastSeen).toLocaleDateString("en-CA", { month: "short", day: "numeric" }) : "—"}
              </div>
              <div className="stat-label">Last confirmed</div>
            </div>
          </div>
        </div>

        {(store.flavors?.length > 0 || store.strength) && (
          <div className="detail-section">
            <div className="detail-section-title">Product details</div>
            {store.flavors?.length > 0 && (
              <div style={{ marginBottom: 10 }}>
                <div style={{ fontSize: 12, fontWeight: 600, color: "#6b7280", marginBottom: 6 }}>Flavors reported</div>
                <div className="flavor-row">
                  {store.flavors.map((f) => <span key={f} className="flavor-tag">{f}</span>)}
                </div>
              </div>
            )}
            {store.strength && store.strength !== "Unsure" && (
              <div>
                <div style={{ fontSize: 12, fontWeight: 600, color: "#6b7280", marginBottom: 6 }}>Strength</div>
                <span className="flavor-tag" style={{ fontSize: 13 }}>{store.strength}</span>
              </div>
            )}
          </div>
        )}

        {store.notes && (
          <div className="detail-section">
            <div className="detail-section-title">Notes</div>
            <p style={{ fontSize: 14, color: "#4b5563", lineHeight: 1.6 }}>{store.notes}</p>
          </div>
        )}

        <div className="detail-section">
          <div className="detail-section-title">Have you been here recently?</div>
          {done ? (
            <div style={{ textAlign: "center", padding: "16px 0", color: "#059669", fontWeight: 600, fontSize: 15 }}>
              <i className="ti ti-circle-check" style={{ fontSize: 28, display: "block", marginBottom: 6 }} />
              Thanks for verifying! +5 points added.
            </div>
          ) : (
            <div className="detail-verify-actions">
              <button className="detail-v-btn yes" onClick={() => handle(true)} disabled={verifying}>
                <i className="ti ti-check" /> Yes, they sell Zyns
              </button>
              <button className="detail-v-btn no" onClick={() => handle(false)} disabled={verifying}>
                <i className="ti ti-x" /> No longer
              </button>
            </div>
          )}
        </div>

        <div style={{ fontSize: 12, color: "#9ca3af", textAlign: "center", marginTop: 8 }}>
          Reported {reportedAt ? new Date(reportedAt).toLocaleDateString("en-CA", { year: "numeric", month: "long", day: "numeric" }) : "recently"}
        </div>
      </div>
    </div>
  );
}
