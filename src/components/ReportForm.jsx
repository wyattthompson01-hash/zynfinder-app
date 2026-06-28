import { useState } from "react";

const FLAVORS = ["Cool Mint", "Spearmint", "Citrus", "Wintergreen", "Coffee", "Smooth", "Cinnamon", "Unknown"];
const STRENGTHS = ["3mg", "6mg", "Both", "Unsure"];
const TYPES = [
  { id: "gas", label: "Gas station", icon: "gas-station" },
  { id: "convenience", label: "Convenience store", icon: "building-store" },
  { id: "pharmacy", label: "Pharmacy", icon: "pill" },
  { id: "other", label: "Other", icon: "dots" },
];

export default function ReportForm({ userCoords, onSubmit }) {
  const [form, setForm] = useState({ name: "", address: "", type: "gas", flavors: [], strength: "Unsure", notes: "" });
  const [submitting, setSubmitting] = useState(false);
  const [ageConfirmed, setAgeConfirmed] = useState(false);
  const [errors, setErrors] = useState({});

  const toggleFlavor = (f) =>
    setForm((prev) => ({
      ...prev,
      flavors: prev.flavors.includes(f) ? prev.flavors.filter((x) => x !== f) : [...prev.flavors, f],
    }));

  const validate = () => {
    const e = {};
    if (!form.name.trim()) e.name = "Store name is required";
    if (!form.address.trim()) e.address = "Address is required";
    if (!ageConfirmed) e.age = "You must confirm your age";
    return e;
  };

  const handleSubmit = async () => {
    const e = validate();
    if (Object.keys(e).length) { setErrors(e); return; }
    setSubmitting(true);
    try {
      await onSubmit({ ...form, lat: userCoords?.lat ?? null, lng: userCoords?.lng ?? null, reportedAt: new Date().toISOString() });
    } finally {
      setSubmitting(false);
    }
  };

  return (
    <div className="form-page">
      <div className="form-container">
        <div className="form-header">
          <h1 className="form-title">Report a location</h1>
          <p className="form-sub">Help the community find Zyns near them. You'll earn <strong>+10 points</strong> for each submission.</p>
        </div>

        <div className="form-card">
          <div className="form-card-title">Store information</div>
          <div className="field">
            <label className="field-label">Store name *</label>
            <input className={`field-input ${errors.name ? "error" : ""}`} placeholder="e.g. Petro-Canada, Mac's, Circle K…" value={form.name} onChange={(e) => setForm({ ...form, name: e.target.value })} />
            {errors.name && <span className="field-error">{errors.name}</span>}
          </div>
          <div className="field">
            <label className="field-label">Full address *</label>
            <input className={`field-input ${errors.address ? "error" : ""}`} placeholder="e.g. 123 Yonge St, Toronto, ON" value={form.address} onChange={(e) => setForm({ ...form, address: e.target.value })} />
            {errors.address && <span className="field-error">{errors.address}</span>}
            <span style={{ fontSize: 12, color: "#9ca3af", marginTop: 4, display: "block" }}>Include street, city, and province for best results</span>
          </div>
          <div className="field">
            <label className="field-label">Store type</label>
            <div className="radio-group">
              {TYPES.map((t) => (
                <button key={t.id} className={`radio-btn ${form.type === t.id ? "selected" : ""}`} onClick={() => setForm({ ...form, type: t.id })}>
                  <i className={`ti ti-${t.icon}`} /> {t.label}
                </button>
              ))}
            </div>
          </div>
        </div>

        <div className="form-card">
          <div className="form-card-title">Product details (optional)</div>
          <div className="field">
            <label className="field-label">Flavors you saw available</label>
            <div className="flavor-grid">
              {FLAVORS.map((f) => (
                <button key={f} className={`flavor-chip ${form.flavors.includes(f) ? "selected" : ""}`} onClick={() => toggleFlavor(f)}>{f}</button>
              ))}
            </div>
          </div>
          <div className="field">
            <label className="field-label">Strength available</label>
            <div className="radio-group">
              {STRENGTHS.map((s) => (
                <button key={s} className={`radio-btn ${form.strength === s ? "selected" : ""}`} onClick={() => setForm({ ...form, strength: s })}>{s}</button>
              ))}
            </div>
          </div>
          <div className="field">
            <label className="field-label">Notes for other users</label>
            <textarea className="field-input" rows={3} placeholder="e.g. Ask at the counter, behind the register, limited stock on weekends…" value={form.notes} onChange={(e) => setForm({ ...form, notes: e.target.value })} />
          </div>
        </div>

        <div className={`age-check ${errors.age ? "error" : ""}`}>
          <input type="checkbox" id="age-confirm" checked={ageConfirmed} onChange={(e) => setAgeConfirmed(e.target.checked)} />
          <label htmlFor="age-confirm" style={{ cursor: "pointer" }}>
            I confirm I am 19 years of age or older (18+ in Alberta, Manitoba, and Quebec)
          </label>
        </div>
        {errors.age && <span className="field-error" style={{ marginBottom: 12, display: "block" }}>{errors.age}</span>}

        <button className="submit-btn" onClick={handleSubmit} disabled={submitting}>
          {submitting ? <><div className="btn-spinner" /> Submitting…</> : <><i className="ti ti-send" /> Submit location (+10 pts)</>}
        </button>
      </div>
    </div>
  );
}
