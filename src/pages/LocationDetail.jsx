import { useState, useEffect } from "react";
import DirectionsPage from "./DirectionsPage";
import PriceChart from "../components/PriceChart";
import { usePrices } from "../hooks/usePrices";

const CAN_SIZES = [15, 20];

export default function LocationDetail({ store, onBack, onVerify, userCoords, user }) {
  const [verifying, setVerifying] = useState(false);
  const [done, setDone] = useState(false);
  const [showDirections, setShowDirections] = useState(false);
  const [showPriceForm, setShowPriceForm] = useState(false);
  const [priceInput, setPriceInput] = useState("");
  const [canSize, setCanSize] = useState(15);
  const [priceSubmitting, setPriceSubmitting] = useState(false);
  const [priceError, setPriceError] = useState(null);
  const [priceDone, setPriceDone] = useState(false);

  const { prices, loading: pricesLoading, fetchPrices, submitPrice } = usePrices(store.id);

  useEffect(() => {
    fetchPrices();
  }, [fetchPrices]);

  const handleVerify = async (confirmed) => {
    setVerifying(true);
    await onVerify(store.id, confirmed);
    setVerifying(false);
    setDone(true);
  };

  const handlePriceSubmit = async () => {
    const val = parseFloat(priceInput);
    if (isNaN(val) || val <= 0) { setPriceError("Enter a valid price"); return; }
    setPriceSubmitting(true);
    setPriceError(null);
    const result = await submitPrice({ storeId: store.id, price: val, canSize, userId: user?.id });
    setPriceSubmitting(false);
    if (result?.success === false) {
      setPriceError("Failed to save price. Try again.");
    } else {
      setPriceDone(true);
      setShowPriceForm(false);
      setPriceInput("");
    }
  };

  if (showDirections) {
    return <DirectionsPage store={store} userCoords={userCoords} onBack={() => setShowDirections(false)} />;
  }

  const typeIcon = store.type === "gas" ? "ti-gas-station" : store.type === "pharmacy" ? "ti-pill" : "ti-building-store";
  const typeColor = store.type === "gas"
    ? { bg: "#dbeafe", color: "#1d4ed8" }
    : store.type === "pharmacy"
    ? { bg: "#fce7f3", color: "#be185d" }
    : { bg: "#d1fae5", color: "#065f46" };

  const statusLabel = (s) => {
    if (s === "verified") return "✓ Verified";
    if (s === "pending") return "Needs verification";
    if (s === "gone") return "No longer sells Zyns";
    return "Unconfirmed";
  };

  const lastSeen = store.last_seen || store.lastSeen;
  const reportedAt = store.reported_at || store.reportedAt;
  const latestPrice = prices.length > 0 ? prices[prices.length - 1] : null;
  const displayPrice = latestPrice
    ? `$${parseFloat(latestPrice.price).toFixed(2)} / ${latestPrice.can_size || 15} pouches`
    : store.latest_price
    ? `$${parseFloat(store.latest_price).toFixed(2)} / ${store.latest_can_size || 15} pouches`
    : null;

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
          <div style={{ display: "flex", alignItems: "center", gap: 10, flexWrap: "wrap" }}>
            <span className={`status-badge ${store.status}`} style={{ fontSize: 13, padding: "4px 12px" }}>
              {statusLabel(store.status)}
            </span>
            <button className="directions-btn" onClick={() => setShowDirections(true)}>
              <i className="ti ti-navigation" /> Get Directions
            </button>
          </div>

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

        {/* Price section */}
        <div className="detail-section">
          <div className="detail-section-title" style={{ display: "flex", alignItems: "center", justifyContent: "space-between" }}>
            <span>Price</span>
            {!priceDone && !showPriceForm && (
              <button className="report-price-btn" onClick={() => setShowPriceForm(true)}>
                <i className="ti ti-plus" /> Report price
              </button>
            )}
          </div>

          {displayPrice ? (
            <div className="price-current">
              <i className="ti ti-tag" style={{ color: "#059669" }} />
              <span className="price-current-val">{displayPrice}</span>
              <span className="price-current-note">community reported</span>
            </div>
          ) : (
            <div style={{ fontSize: 13, color: "#9ca3af" }}>No price reported yet</div>
          )}

          {showPriceForm && (
            <div className="price-report-form">
              <div className="price-input-row">
                <div className="price-input-wrap" style={{ flex: 1 }}>
                  <span className="price-input-prefix">$</span>
                  <input
                    className={`field-input price-input ${priceError ? "error" : ""}`}
                    type="number"
                    min="0"
                    max="200"
                    step="0.01"
                    placeholder="22.99"
                    value={priceInput}
                    onChange={(e) => { setPriceInput(e.target.value); setPriceError(null); }}
                  />
                </div>
                <div className="radio-group" style={{ flexShrink: 0 }}>
                  {CAN_SIZES.map((s) => (
                    <button
                      key={s}
                      className={`radio-btn ${canSize === s ? "selected" : ""}`}
                      onClick={() => setCanSize(s)}
                      style={{ padding: "6px 10px", fontSize: 12 }}
                    >
                      {s} pk
                    </button>
                  ))}
                </div>
              </div>
              {priceError && <span className="field-error">{priceError}</span>}
              <div style={{ display: "flex", gap: 8, marginTop: 8 }}>
                <button className="submit-btn" style={{ flex: 1, padding: "9px" }} onClick={handlePriceSubmit} disabled={priceSubmitting}>
                  {priceSubmitting ? "Saving…" : "Save price"}
                </button>
                <button
                  onClick={() => { setShowPriceForm(false); setPriceError(null); }}
                  style={{ padding: "9px 14px", border: "1.5px solid #e5e7eb", borderRadius: 10, background: "transparent", cursor: "pointer", fontSize: 13, color: "#6b7280" }}
                >
                  Cancel
                </button>
              </div>
            </div>
          )}

          {priceDone && (
            <div style={{ fontSize: 13, color: "#059669", marginTop: 8, display: "flex", alignItems: "center", gap: 6 }}>
              <i className="ti ti-circle-check" /> Price saved — thank you!
            </div>
          )}

          {/* Price history chart */}
          {!pricesLoading && prices.length > 0 && (
            <div style={{ marginTop: 16 }}>
              <div style={{ fontSize: 12, fontWeight: 600, color: "#6b7280", marginBottom: 8, textTransform: "uppercase", letterSpacing: "0.5px" }}>
                Price history ({prices.length} reports)
              </div>
              <PriceChart prices={prices} />
            </div>
          )}
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
              <button className="detail-v-btn yes" onClick={() => handleVerify(true)} disabled={verifying}>
                <i className="ti ti-check" /> Yes, they sell Zyns
              </button>
              <button className="detail-v-btn no" onClick={() => handleVerify(false)} disabled={verifying}>
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
