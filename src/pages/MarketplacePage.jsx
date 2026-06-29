import { useState, useEffect, useCallback } from "react";

const SUPABASE_URL = import.meta.env.VITE_SUPABASE_URL;
const SUPABASE_KEY = import.meta.env.VITE_SUPABASE_ANON_KEY;

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
    zyn: "#fff7e6 #d97706",
    velo: "#eff6ff #2563eb",
    on: "#f0fdf4 #16a34a",
    nordic_spirit: "#faf5ff #7c3aed",
    white_fox: "#f8fafc #334155",
    lyft: "#fff1f2 #e11d48",
    other: "#f3f4f6 #6b7280",
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
          <img src={listing.photo_url} alt={listing.title} style={{width:'100%',aspectRatio:'16/9',objectFit:'cover',borderRadius:10,marginBottom:10,border:'1px solid #f3f4f6'}}/>
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
                <img src={photoUrl} alt="Listing" style={{width:'100%',maxHeight:180,objectFit:'cover',borderRadius:10,border:'1px solid #e5e7eb'}}/>
                <button onClick={()=>setPhotoUrl(null)} style={{position:'absolute',top:6,right:6,background:'rgba(0,0,0,0.6)',border:'none',color:'#fff',borderRadius:99,width:26,height:26,cursor:'pointer',fontSize:16,display:'flex',alignItems:'center',justifyContent:'center'}}>Ã</button>
              </div>
            ) : (
              <label style={{display:'flex',alignItems:'center',gap:8,cursor:'pointer',padding:'12px 14px',border:'1.5px dashed #d1d5db',borderRadius:10,fontSize:13,color:'#6b7280',marginTop:4,background:'#f9fafb'}}>
                <i className="ti ti-camera" style={{fontSize:18,color:'#9ca3af'}}/>
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
    try {
      let url = `${SUPABASE_URL}/rest/v1/marketplace_listings?is_active=eq.true&order=created_at.desc&limit=100`;
      const res = await fetch(url, {
        headers: { "apikey": SUPABASE_KEY, "Authorization": `Bearer ${SUPABASE_KEY}` },
      });
      if (res.ok) setListings(await res.json());
    } catch { /* ignore */ }
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
          <input className="search-input" placeholder="Search listings…"
            value={search} onChange={e => setSearch(e.target.value)} />
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
