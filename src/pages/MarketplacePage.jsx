import { useState, useEffect, useCallback } from "react";

const SUPABASE_URL = import.meta.env.VITE_SUPABASE_URL;
const SUPABASE_KEY = import.meta.env.VITE_SUPABASE_ANON_KEY;

const MOCK_LISTINGS = [
  { id: "l1",  title: "Zyn Cool Mint 6mg — 5 cans",                  brand: "zyn",           flavor: "Cool Mint",       strength: "6mg",   quantity: 5,  price_per_can: 6.50,  total_price: 32.50, condition: "new",  pickup: true,  shipping: true,  location_text: "New York, NY",          lat: 40.7580, lng: -73.9930, created_at: "2026-06-29T14:30:00Z", user_id: "u1a2b3c4", is_active: true },
  { id: "l2",  title: "Nordic Spirit Spearmint 9mg — bulk 10 cans",   brand: "nordic_spirit", flavor: "Spearmint",       strength: "9mg",   quantity: 10, price_per_can: 9.00,  total_price: 90.00, condition: "new",  pickup: false, shipping: true,  location_text: "London, UK",            lat: 51.5200, lng: -0.1357,  created_at: "2026-06-29T10:00:00Z", user_id: "u2b3c4d5", is_active: true },
  { id: "l3",  title: "Velo Citrus Burst 6mg — 3 cans",               brand: "velo",          flavor: "Citrus Burst",    strength: "6mg",   quantity: 3,  price_per_can: 8.25,  total_price: 24.75, condition: "new",  pickup: true,  shipping: false, location_text: "Stockholm, Sweden",     lat: 59.3340, lng: 18.0656,  created_at: "2026-06-28T18:00:00Z", user_id: "u3c4d5e6", is_active: true },
  { id: "l4",  title: "Zyn Spearmint 3mg — 2 cans",                   brand: "zyn",           flavor: "Spearmint",       strength: "3mg",   quantity: 2,  price_per_can: 6.00,  total_price: 12.00, condition: "new",  pickup: true,  shipping: true,  location_text: "Chicago, IL",           lat: 41.8832, lng: -87.6249, created_at: "2026-06-28T12:00:00Z", user_id: "u4d5e6f7", is_active: true },
  { id: "l5",  title: "White Fox Full Charge Menthol 12mg — 4 cans",  brand: "white_fox",     flavor: "Menthol",         strength: "12mg",  quantity: 4,  price_per_can: 10.50, total_price: 42.00, condition: "new",  pickup: false, shipping: true,  location_text: "Oslo, Norway",          lat: 59.9127, lng: 10.7462,  created_at: "2026-06-28T09:00:00Z", user_id: "u5e6f7g8", is_active: true },
  { id: "l6",  title: "Zyn Coffee 6mg — 6 cans (bulk deal)",          brand: "zyn",           flavor: "Coffee",          strength: "6mg",   quantity: 6,  price_per_can: 5.99,  total_price: 35.94, condition: "new",  pickup: true,  shipping: true,  location_text: "Austin, TX",            lat: 30.3083, lng: -97.7181, created_at: "2026-06-27T20:00:00Z", user_id: "u6f7g8h9", is_active: true },
  { id: "l7",  title: "Lyft Mint Strong 12mg — 3 cans",               brand: "lyft",          flavor: "Mint",            strength: "12mg",  quantity: 3,  price_per_can: 11.00, total_price: 33.00, condition: "new",  pickup: true,  shipping: false, location_text: "Copenhagen, Denmark",   lat: 55.6826, lng: 12.5720,  created_at: "2026-06-27T14:00:00Z", user_id: "u7g8h9i0", is_active: true },
  { id: "l8",  title: "On! Citrus 3mg — 1 can (like new)",            brand: "on",            flavor: "Citrus",          strength: "3mg",   quantity: 1,  price_per_can: 4.50,  total_price: 4.50,  condition: "open", pickup: true,  shipping: false, location_text: "Los Angeles, CA",       lat: 34.0904, lng: -118.3866,created_at: "2026-06-27T11:00:00Z", user_id: "u8h9i0j1", is_active: true },
  { id: "l9",  title: "Zyn Cinnamon 6mg — 8 cans",                   brand: "zyn",           flavor: "Cinnamon",        strength: "6mg",   quantity: 8,  price_per_can: 6.25,  total_price: 50.00, condition: "new",  pickup: false, shipping: true,  location_text: "Toronto, ON",           lat: 43.6649, lng: -79.4102, created_at: "2026-06-26T16:00:00Z", user_id: "u9i0j1k2", is_active: true },
  { id: "l10", title: "Nordic Spirit Elderflower 6mg — 2 cans",       brand: "nordic_spirit", flavor: "Elderflower",     strength: "6mg",   quantity: 2,  price_per_can: 9.50,  total_price: 19.00, condition: "new",  pickup: true,  shipping: true,  location_text: "Amsterdam, NL",         lat: 52.3740, lng: 4.8945,   created_at: "2026-06-26T10:00:00Z", user_id: "u0j1k2l3", is_active: true },
  { id: "l11", title: "Velo Berry Frost 6mg — 5 cans",                brand: "velo",          flavor: "Berry Frost",     strength: "6mg",   quantity: 5,  price_per_can: 8.75,  total_price: 43.75, condition: "new",  pickup: true,  shipping: true,  location_text: "Berlin, Germany",       lat: 52.5170, lng: 13.3880,  created_at: "2026-06-25T18:00:00Z", user_id: "u1k2l3m4", is_active: true },
  { id: "l12", title: "Zyn Smooth 3mg — 4 cans",                      brand: "zyn",           flavor: "Smooth",          strength: "3mg",   quantity: 4,  price_per_can: 5.75,  total_price: 23.00, condition: "new",  pickup: true,  shipping: false, location_text: "Miami, FL",             lat: 25.7916, lng: -80.1390, created_at: "2026-06-25T12:00:00Z", user_id: "u2l3m4n5", is_active: true },
  { id: "l13", title: "White Fox Peppered Mint 16mg — 3 cans",        brand: "white_fox",     flavor: "Peppered Mint",   strength: "15mg+", quantity: 3,  price_per_can: 11.99, total_price: 35.97, condition: "new",  pickup: false, shipping: true,  location_text: "Helsinki, Finland",     lat: 60.1680, lng: 24.9335,  created_at: "2026-06-25T08:00:00Z", user_id: "u3m4n5o6", is_active: true },
  { id: "l14", title: "Zyn Wintergreen 6mg — 2 cans",                 brand: "zyn",           flavor: "Wintergreen",     strength: "6mg",   quantity: 2,  price_per_can: 6.99,  total_price: 13.98, condition: "new",  pickup: true,  shipping: true,  location_text: "Seattle, WA",           lat: 47.6038, lng: -122.3351,created_at: "2026-06-24T20:00:00Z", user_id: "u4n5o6p7", is_active: true },
  { id: "l15", title: "Lyft Tropic Breeze 9mg — 4 cans",              brand: "lyft",          flavor: "Tropic Breeze",   strength: "9mg",   quantity: 4,  price_per_can: 10.25, total_price: 41.00, condition: "new",  pickup: true,  shipping: true,  location_text: "Dubai, UAE",            lat: 25.1985, lng: 55.2796,  created_at: "2026-06-24T14:00:00Z", user_id: "u5o6p7q8", is_active: true },
  { id: "l16", title: "On! Coffee 9mg — 1 can",                       brand: "on",            flavor: "Coffee",          strength: "9mg",   quantity: 1,  price_per_can: 5.25,  total_price: 5.25,  condition: "new",  pickup: true,  shipping: false, location_text: "Boston, MA",            lat: 42.3585, lng: -71.0577, created_at: "2026-06-24T10:00:00Z", user_id: "u6p7q8r9", is_active: true },
  { id: "l17", title: "Zyn Mango 6mg — 10 cans (bulk)",               brand: "zyn",           flavor: "Mango",           strength: "6mg",   quantity: 10, price_per_can: 5.50,  total_price: 55.00, condition: "new",  pickup: false, shipping: true,  location_text: "Vancouver, BC",         lat: 49.2830, lng: -123.1239,created_at: "2026-06-23T18:00:00Z", user_id: "u7q8r9s0", is_active: true },
  { id: "l18", title: "Nordic Spirit Watermelon 6mg — 3 cans",        brand: "nordic_spirit", flavor: "Watermelon",      strength: "6mg",   quantity: 3,  price_per_can: 9.25,  total_price: 27.75, condition: "new",  pickup: true,  shipping: true,  location_text: "Dublin, Ireland",       lat: 53.3502, lng: -6.2605,  created_at: "2026-06-23T12:00:00Z", user_id: "u8r9s0t1", is_active: true },
  { id: "l19", title: "Velo Strong Mint 14mg — 2 cans",               brand: "velo",          flavor: "Strong Mint",     strength: "15mg+", quantity: 2,  price_per_can: 9.99,  total_price: 19.98, condition: "new",  pickup: true,  shipping: false, location_text: "Zurich, Switzerland",   lat: 47.3780, lng: 8.5404,   created_at: "2026-06-22T14:00:00Z", user_id: "u9s0t1u2", is_active: true },
  { id: "l20", title: "Zyn Peppermint 9mg — 3 cans",                  brand: "zyn",           flavor: "Peppermint",      strength: "9mg",   quantity: 3,  price_per_can: 7.25,  total_price: 21.75, condition: "new",  pickup: true,  shipping: true,  location_text: "Denver, CO",            lat: 39.7407, lng: -104.9629,created_at: "2026-06-22T10:00:00Z", user_id: "u0t1u2v3", is_active: true },
  { id: "l21", title: "White Fox Double Mint 12mg — 5 cans",          brand: "white_fox",     flavor: "Double Mint",     strength: "12mg",  quantity: 5,  price_per_can: 11.50, total_price: 57.50, condition: "new",  pickup: false, shipping: true,  location_text: "Sydney, Australia",     lat: -33.8715,lng: 151.2069, created_at: "2026-06-21T08:00:00Z", user_id: "u1u2v3w4", is_active: true },
  { id: "l22", title: "On! Mango 3mg — 2 cans",                       brand: "on",            flavor: "Mango",           strength: "3mg",   quantity: 2,  price_per_can: 4.75,  total_price: 9.50,  condition: "new",  pickup: true,  shipping: true,  location_text: "Montreal, QC",          lat: 45.5162, lng: -73.5784, created_at: "2026-06-21T16:00:00Z", user_id: "u2v3w4x5", is_active: true },
  { id: "l23", title: "Zyn Black Cherry 6mg — 4 cans",                brand: "zyn",           flavor: "Black Cherry",    strength: "6mg",   quantity: 4,  price_per_can: 6.75,  total_price: 27.00, condition: "new",  pickup: true,  shipping: true,  location_text: "Singapore",             lat: 1.3040,  lng: 103.8318, created_at: "2026-06-20T12:00:00Z", user_id: "u3w4x5y6", is_active: true },
  { id: "l24", title: "Lyft Lime Strong 12mg — 6 cans",               brand: "lyft",          flavor: "Lime",            strength: "12mg",  quantity: 6,  price_per_can: 10.75, total_price: 64.50, condition: "new",  pickup: false, shipping: true,  location_text: "Oslo, Norway",          lat: 59.9127, lng: 10.7462,  created_at: "2026-06-20T08:00:00Z", user_id: "u4x5y6z7", is_active: true },
];

const BRANDS = [
  { id: "all",           label: "All brands" },
  { id: "zyn",           label: "Zyn" },
  { id: "velo",          label: "Velo" },
  { id: "on",            label: "On!" },
  { id: "nordic_spirit", label: "Nordic Spirit" },
  { id: "white_fox",     label: "White Fox" },
  { id: "lyft",          label: "Lyft" },
  { id: "other",         label: "Other" },
];

const STRENGTHS = ["3mg", "6mg", "9mg", "12mg", "15mg+"];

function distKm(a, b) {
  if (!a || !b) return null;
  const R = 6371;
  const dLat = ((b.lat - a.lat) * Math.PI) / 180;
  const dLng = ((b.lng - a.lng) * Math.PI) / 180;
  const x = Math.sin(dLat / 2) ** 2 +
    Math.cos((a.lat * Math.PI) / 180) * Math.cos((b.lat * Math.PI) / 180) * Math.sin(dLng / 2) ** 2;
  return R * 2 * Math.atan2(Math.sqrt(x), Math.sqrt(1 - x));
}

function timeAgo(dateStr) {
  const diff = (Date.now() - new Date(dateStr)) / 1000;
  if (diff < 60) return "just now";
  if (diff < 3600) return `${Math.floor(diff / 60)}m ago`;
  if (diff < 86400) return `${Math.floor(diff / 3600)}h ago`;
  return `${Math.floor(diff / 86400)}d ago`;
}

function BrandBadge({ brand }) {
  const colors = {
    zyn: "rgba(217,119,6,0.18) #f59e0b",
    velo: "rgba(37,99,235,0.18) #60a5fa",
    on: "rgba(22,163,74,0.18) #34d399",
    nordic_spirit: "rgba(124,58,237,0.18) #a78bfa",
    white_fox: "rgba(148,163,184,0.15) #cbd5e1",
    lyft: "rgba(225,29,72,0.18) #f87171",
    other: "rgba(107,114,128,0.18) #9ca3af",
  };
  const [bg, color] = (colors[brand] || colors.other).split(" ");
  return (
    <span className="mkt-brand-badge" style={{ background: bg, color }}>
      {BRANDS.find(b => b.id === brand)?.label || brand}
    </span>
  );
}

function ListingCard({ listing, userCoords, onContact }) {
  const dist = distKm(userCoords, listing.lat && listing.lng
    ? { lat: listing.lat, lng: listing.lng } : null);

  return (
    <div className="mkt-card">
      <div className="mkt-card-img">
        <i className="ti ti-package" />
        {listing.condition === "new" && <span className="mkt-new-badge">NEW</span>}
      </div>
      <div className="mkt-card-body">
        <div className="mkt-card-top">
          <BrandBadge brand={listing.brand} />
          {listing.strength && (
            <span className="mkt-strength-badge">{listing.strength}</span>
          )}
        </div>
        {listing.photo_url && (
          <img src={listing.photo_url} alt={listing.title} style={{width:'100%',aspectRatio:'16/9',objectFit:'cover',borderRadius:10,marginBottom:10,border:'1px solid rgba(255,255,255,0.08)'}}/>
        )}
        <div className="mkt-card-name">{listing.title}</div>
        <div className="mkt-card-meta">
          <span>{listing.quantity} can{listing.quantity !== 1 ? "s" : ""}</span>
          {listing.flavor && <span>· {listing.flavor}</span>}
        </div>
        <div className="mkt-card-footer">
          <div className="mkt-card-price">
            ${parseFloat(listing.total_price).toFixed(2)}
            <span className="mkt-per-can">${parseFloat(listing.price_per_can).toFixed(2)}/can</span>
          </div>
          <div className="mkt-card-info">
            {dist !== null && (
              <span className="mkt-dist">
                <i className="ti ti-map-pin" />
                {dist < 1 ? `${Math.round(dist * 1000)}m` : `${dist.toFixed(1)}km`}
              </span>
            )}
            <span className="mkt-time">{timeAgo(listing.created_at)}</span>
          </div>
        </div>
        {listing.location_text && (
          <div className="mkt-location">{listing.location_text}</div>
        )}
        <div className="mkt-shipping-row">
          {listing.pickup && <span className="mkt-tag"><i className="ti ti-walk" />Pickup</span>}
          {listing.shipping && <span className="mkt-tag"><i className="ti ti-truck" />Ships</span>}
        </div>
        <button className="mkt-contact-btn" onClick={() => onContact(listing)}>
          <i className="ti ti-message" /> Contact Seller
        </button>
      </div>
    </div>
  );
}

function CreateListingModal({ user, userCoords, onClose, onCreated }) {
  const [form, setForm] = useState({
    title: "", brand: "zyn", flavor: "", strength: "6mg",
    quantity: 1, price_per_can: "", description: "",
    location_text: "", condition: "new",
    pickup: true, shipping: false,
  });
  const [saving, setSaving] = useState(false);
  const [errors, setErrors] = useState({});
  const [photoUrl, setPhotoUrl] = useState(null);
  const [photoUploading, setPhotoUploading] = useState(false);

  const set = (k, v) => setForm(f => ({ ...f, [k]: v }));

  const validate = () => {
    const e = {};
    if (!form.title.trim()) e.title = "Title required";
    if (!form.price_per_can || parseFloat(form.price_per_can) <= 0) e.price = "Enter a valid price";
    if (!form.quantity || parseInt(form.quantity) < 1) e.quantity = "Enter quantity";
    if (!form.pickup && !form.shipping) e.delivery = "Select pickup or shipping";
    return e;
  };

  const handlePhotoUpload = async (e) => {
    const file = e.target.files[0];
    if (!file) return;
    setPhotoUploading(true);
    try {
      const ext = file.name.split('.').pop() || 'jpg';
      const path = `listing-photos/${user.id}/${Date.now()}.${ext}`;
      const res = await fetch(`${SUPABASE_URL}/storage/v1/object/${path}`, {
        method: 'POST',
        headers: { 'apikey': SUPABASE_KEY, 'Authorization': `Bearer ${SUPABASE_KEY}`, 'Content-Type': file.type || 'image/jpeg' },
        body: file
      });
      if (res.ok) {
        setPhotoUrl(`${SUPABASE_URL}/storage/v1/object/public/${path}`);
      }
    } catch(err) {} finally {
      setPhotoUploading(false);
      e.target.value = '';
    }
  };
  const handleSubmit = async () => {
    const e = validate();
    if (Object.keys(e).length) { setErrors(e); return; }
    setSaving(true);
    const total = parseFloat(form.price_per_can) * parseInt(form.quantity);
    const body = {
      ...form,
      ...(photoUrl ? { photo_url: photoUrl } : {}),
      quantity: parseInt(form.quantity),
      price_per_can: parseFloat(form.price_per_can),
      total_price: total,
      user_id: user.id,
      lat: userCoords?.lat || null,
      lng: userCoords?.lng || null,
    };
    try {
      const res = await fetch(`${SUPABASE_URL}/rest/v1/marketplace_listings`, {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
          "apikey": SUPABASE_KEY,
          "Authorization": `Bearer ${SUPABASE_KEY}`,
          "Prefer": "return=representation",
        },
        body: JSON.stringify(body),
      });
      if (res.ok) { onCreated(); onClose(); }
      else { setErrors({ submit: "Failed to post listing. Try again." }); }
    } catch { setErrors({ submit: "Network error. Try again." }); }
    setSaving(false);
  };

  return (
    <div className="modal-overlay" onClick={(e) => e.target === e.currentTarget && onClose()}>
      <div className="mkt-create-modal">
        <div className="modal-header">
          <h2 className="modal-title">Post a Listing</h2>
          <button className="modal-close" onClick={onClose}><i className="ti ti-x" /></button>
        </div>

        <div className="mkt-create-body">
          {/* Brand */}
          <div className="field">
            <label className="field-label">Brand</label>
            <div className="radio-group">
              {BRANDS.filter(b => b.id !== "all").map(b => (
                <button key={b.id} className={`radio-btn ${form.brand === b.id ? "selected" : ""}`}
                  onClick={() => set("brand", b.id)}>{b.label}</button>
              ))}
            </div>
          </div>

          {/* Title */}
          <div className="field">
            <label className="field-label">Title *</label>
            <input className={`field-input ${errors.title ? "error" : ""}`}
              placeholder="e.g. Zyn Cool Mint 6mg — 3 cans"
              value={form.title} onChange={e => { set("title", e.target.value); setErrors(r => ({...r, title: null})); }} />
            {errors.title && <span className="field-error">{errors.title}</span>}
          </div>

          {/* Flavor + Strength */}
          <div className="field-row">
            <div className="field">
              <label className="field-label">Flavor</label>
              <input className="field-input" placeholder="Cool Mint, Citrus…"
                value={form.flavor} onChange={e => set("flavor", e.target.value)} />
            </div>
            <div className="field">
              <label className="field-label">Strength</label>
              <select className="field-input field-select"
                value={form.strength} onChange={e => set("strength", e.target.value)}>
                {STRENGTHS.map(s => <option key={s} value={s}>{s}</option>)}
              </select>
            </div>
          </div>

          {/* Qty + Price */}
          <div className="field-row">
            <div className="field">
              <label className="field-label">Quantity (cans) *</label>
              <input className={`field-input ${errors.quantity ? "error" : ""}`}
                type="number" min="1" placeholder="1"
                value={form.quantity} onChange={e => { set("quantity", e.target.value); setErrors(r => ({...r, quantity: null})); }} />
              {errors.quantity && <span className="field-error">{errors.quantity}</span>}
            </div>
            <div className="field">
              <label className="field-label">Price per can ($) *</label>
              <input className={`field-input ${errors.price ? "error" : ""}`}
                type="number" min="0" step="0.01" placeholder="8.99"
                value={form.price_per_can} onChange={e => { set("price_per_can", e.target.value); setErrors(r => ({...r, price: null})); }} />
              {errors.price && <span className="field-error">{errors.price}</span>}
            </div>
          </div>

          {/* Total display */}
          {form.quantity && form.price_per_can && (
            <div className="mkt-total-preview">
              <i className="ti ti-calculator" />
              Total: <strong>${(parseFloat(form.price_per_can || 0) * parseInt(form.quantity || 1)).toFixed(2)}</strong>
            </div>
          )}

          {/* Condition */}
          <div className="field">
            <label className="field-label">Condition</label>
            <div className="radio-group">
              {[["new","New / Sealed"],["open","Opened"]].map(([v, l]) => (
                <button key={v} className={`radio-btn ${form.condition === v ? "selected" : ""}`}
                  onClick={() => set("condition", v)}>{l}</button>
              ))}
            </div>
          </div>

          {/* Delivery */}
          <div className="field">
            <label className="field-label">Delivery options *</label>
            <div className="radio-group">
              <button className={`radio-btn ${form.pickup ? "selected" : ""}`}
                onClick={() => { set("pickup", !form.pickup); setErrors(r => ({...r, delivery: null})); }}>
                <i className="ti ti-walk" /> Pickup
              </button>
              <button className={`radio-btn ${form.shipping ? "selected" : ""}`}
                onClick={() => { set("shipping", !form.shipping); setErrors(r => ({...r, delivery: null})); }}>
                <i className="ti ti-truck" /> Ships
              </button>
            </div>
            {errors.delivery && <span className="field-error">{errors.delivery}</span>}
          </div>

          {/* Location */}
          <div className="field">
            <label className="field-label">Location (city or area)</label>
            <input className="field-input" placeholder="e.g. Toronto, ON"
              value={form.location_text} onChange={e => set("location_text", e.target.value)} />
          </div>

          {/* Description */}
          <div className="field">
            <label className="field-label">Description</label>
            <textarea className="field-input" rows={3}
              placeholder="Any extra details, expiry date, etc."
              value={form.description} onChange={e => set("description", e.target.value)} />
          </div>

          {errors.submit && <div className="field-error" style={{ marginBottom: 8 }}>{errors.submit}</div>}

          {/* Photo */}
          <div className="field">
            <label className="field-label">Photo (optional)</label>
            {photoUrl ? (
              <div style={{position:'relative',display:'inline-block',marginTop:4,width:'100%'}}>
                <img src={photoUrl} alt="Listing" style={{width:'100%',maxHeight:180,objectFit:'cover',borderRadius:10,border:'1px solid rgba(255,255,255,0.1)'}}/>
                <button onClick={()=>setPhotoUrl(null)} style={{position:'absolute',top:6,right:6,background:'rgba(0,0,0,0.6)',border:'none',color:'#fff',borderRadius:99,width:26,height:26,cursor:'pointer',fontSize:16,display:'flex',alignItems:'center',justifyContent:'center'}}>Ã</button>
              </div>
            ) : (
              <label style={{display:'flex',alignItems:'center',gap:8,cursor:'pointer',padding:'12px 14px',border:'1.5px dashed #2a2a45',borderRadius:10,fontSize:13,color:'#94a3b8',marginTop:4,background:'#141428'}}>
                <i className="ti ti-camera" style={{fontSize:18,color:'#64748b'}}/>
                {photoUploading ? 'Uploading...' : 'Add a cover photo'}
                <input type="file" accept="image/*" style={{display:'none'}} onChange={handlePhotoUpload} disabled={photoUploading}/>
              </label>
            )}
          </div>

          <button className="submit-btn" onClick={handleSubmit} disabled={saving}>
            {saving ? <span className="btn-spinner" /> : <i className="ti ti-plus" />}
            {saving ? "Posting…" : "Post Listing"}
          </button>
        </div>
      </div>
    </div>
  );
}

function ContactModal({ listing, onClose }) {
  return (
    <div className="modal-overlay" onClick={(e) => e.target === e.currentTarget && onClose()}>
      <div className="mkt-contact-modal">
        <div className="modal-header">
          <h2 className="modal-title">Contact Seller</h2>
          <button className="modal-close" onClick={onClose}><i className="ti ti-x" /></button>
        </div>
        <div style={{ padding: "20px" }}>
          <div className="mkt-listing-preview">
            <div className="mkt-card-name">{listing.title}</div>
            <div className="mkt-card-price" style={{ marginTop: 4 }}>
              ${parseFloat(listing.total_price).toFixed(2)}
            </div>
          </div>
          <div className="mkt-contact-info">
            <i className="ti ti-info-circle" />
            To message this seller, reply via the SnusWorld community forum or include your contact details when posting.
          </div>
          <div style={{ marginTop: 12, fontSize: 13, color: "var(--gray-500)" }}>
            Seller ID: <code style={{ fontSize: 12 }}>{listing.user_id?.slice(0, 8)}…</code>
          </div>
          <button className="submit-btn" style={{ marginTop: 16 }} onClick={onClose}>
            Got it
          </button>
        </div>
      </div>
    </div>
  );
}

export default function MarketplacePage({ userCoords, user, isLoggedIn, onAuthRequired }) {
  const [listings, setListings] = useState([]);
  const [loading, setLoading] = useState(true);
  const [brandFilter, setBrandFilter] = useState("all");
  const [sort, setSort] = useState("recent");
  const [search, setSearch] = useState("");
  const [showCreate, setShowCreate] = useState(false);
  const [contactListing, setContactListing] = useState(null);

  const fetchListings = useCallback(async () => {
    setLoading(true);
    if (!SUPABASE_URL || !SUPABASE_KEY) {
      setListings(MOCK_LISTINGS);
      setLoading(false);
      return;
    }
    try {
      const res = await fetch(
        `${SUPABASE_URL}/rest/v1/marketplace_listings?is_active=eq.true&order=created_at.desc&limit=100`,
        { headers: { "apikey": SUPABASE_KEY, "Authorization": `Bearer ${SUPABASE_KEY}` } }
      );
      if (res.ok) {
        const data = await res.json();
        setListings(Array.isArray(data) && data.length > 0 ? data : MOCK_LISTINGS);
      } else {
        setListings(MOCK_LISTINGS);
      }
    } catch {
      setListings(MOCK_LISTINGS);
    }
    setLoading(false);
  }, []);

  useEffect(() => { fetchListings(); }, [fetchListings]);

  const handleCreateClick = () => {
    if (!isLoggedIn) { onAuthRequired(); return; }
    setShowCreate(true);
  };

  const dist = (l) => distKm(userCoords, l.lat && l.lng ? { lat: l.lat, lng: l.lng } : null) ?? 9999;

  const filtered = listings
    .filter(l => brandFilter === "all" || l.brand === brandFilter)
    .filter(l => !search ||
      l.title.toLowerCase().includes(search.toLowerCase()) ||
      (l.flavor || "").toLowerCase().includes(search.toLowerCase()))
    .sort((a, b) => {
      if (sort === "cheapest") return parseFloat(a.price_per_can) - parseFloat(b.price_per_can);
      if (sort === "nearest") return dist(a) - dist(b);
      return new Date(b.created_at) - new Date(a.created_at);
    });

  // Stats
  const avgPrice = listings.length
    ? (listings.reduce((s, l) => s + parseFloat(l.price_per_can), 0) / listings.length).toFixed(2)
    : null;
  const cheapest = listings.length
    ? Math.min(...listings.map(l => parseFloat(l.price_per_can))).toFixed(2)
    : null;

  return (
    <div className="mkt-page">
      {/* Header banner */}
      <div className="mkt-header">
        <div className="mkt-header-inner">
          <div>
            <div className="mkt-title">
              <i className="ti ti-shopping-bag" /> SnusWorld Shop
            </div>
            <div className="mkt-sub">
              Community marketplace · Buy &amp; sell nicotine pouches
            </div>
          </div>
          <button className="mkt-post-btn" onClick={handleCreateClick}>
            <i className="ti ti-plus" /> Post Listing
          </button>
        </div>

        {listings.length > 0 && (
          <div className="mkt-stats">
            <div className="mkt-stat">
              <div className="mkt-stat-val">{listings.length}</div>
              <div className="mkt-stat-label">Active listings</div>
            </div>
            {avgPrice && (
              <div className="mkt-stat">
                <div className="mkt-stat-val">${avgPrice}</div>
                <div className="mkt-stat-label">Avg price/can</div>
              </div>
            )}
            {cheapest && (
              <div className="mkt-stat">
                <div className="mkt-stat-val" style={{ color: "#34d399" }}>${cheapest}</div>
                <div className="mkt-stat-label">Lowest/can</div>
              </div>
            )}
          </div>
        )}
      </div>

      {/* Brand filter */}
      <div className="mkt-brand-bar">
        {BRANDS.map(b => (
          <button key={b.id}
            className={`filter-chip ${brandFilter === b.id ? "active" : ""}`}
            onClick={() => setBrandFilter(b.id)}>{b.label}</button>
        ))}
      </div>

      {/* Toolbar */}
      <div className="mkt-toolbar">
        <div className="search-wrap" style={{ flex: 1 }}>
          <i className="ti ti-search search-icon" />
          <input className={`search-input${search ? " search-has-clear" : ""}`}
            placeholder="Search listings…"
            value={search} onChange={e => setSearch(e.target.value)} />
          {search && (
            <button className="search-clear" onClick={() => setSearch("")} aria-label="Clear search">
              <i className="ti ti-x" />
            </button>
          )}
        </div>
        <div className="sort-chips">
          {[
            { id: "recent",   label: "Recent",   icon: "ti-clock" },
            { id: "cheapest", label: "Cheapest",  icon: "ti-arrow-down" },
            { id: "nearest",  label: "Nearest",   icon: "ti-navigation" },
          ].map(s => (
            <button key={s.id} className={`sort-chip ${sort === s.id ? "active" : ""}`}
              onClick={() => setSort(s.id)}>
              <i className={`ti ${s.icon}`} />{s.label}
            </button>
          ))}
        </div>
      </div>

      {/* Grid */}
      <div className="mkt-grid-wrap">
        {loading ? (
          <div className="list-loading"><div className="spinner" /><p>Loading listings…</p></div>
        ) : filtered.length === 0 ? (
          <div className="mkt-empty">
            <i className="ti ti-shopping-bag" style={{ fontSize: 40 }} />
            <p>No listings yet</p>
            <p style={{ fontSize: 13, color: "var(--gray-400)" }}>
              Be the first to sell on SnusWorld
            </p>
            <button className="submit-btn" style={{ width: "auto", padding: "10px 24px" }}
              onClick={handleCreateClick}>
              <i className="ti ti-plus" /> Post a Listing
            </button>
          </div>
        ) : (
          <div className="mkt-grid">
            {filtered.map(l => (
              <ListingCard key={l.id} listing={l} userCoords={userCoords}
                onContact={setContactListing} />
            ))}
          </div>
        )}
      </div>

      {showCreate && (
        <CreateListingModal user={user} userCoords={userCoords}
          onClose={() => setShowCreate(false)}
          onCreated={() => { fetchListings(); }} />
      )}
      {contactListing && (
        <ContactModal listing={contactListing} onClose={() => setContactListing(null)} />
      )}
    </div>
  );
}
