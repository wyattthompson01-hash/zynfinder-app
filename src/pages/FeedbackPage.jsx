import { useState, useEffect } from "react";

const SUPABASE_URL = import.meta.env.VITE_SUPABASE_URL;
const SUPABASE_KEY = import.meta.env.VITE_SUPABASE_ANON_KEY;
const headers = {
  "apikey": SUPABASE_KEY,
  "Authorization": `Bearer ${SUPABASE_KEY}`,
  "Content-Type": "application/json",
  "Prefer": "return=representation",
};

const FEEDBACK_CATEGORIES = [
  { id: "bug", label: "Bug Report", icon: "ti-bug", color: "#ef4444" },
  { id: "feature", label: "Feature Request", icon: "ti-bulb", color: "#f59e0b" },
  { id: "ui", label: "UI / Design", icon: "ti-palette", color: "#8b5cf6" },
  { id: "data", label: "Data / Accuracy", icon: "ti-database", color: "#06b6d4" },
  { id: "other", label: "Other", icon: "ti-message", color: "#9ca3af" },
];

const RATING_LABELS = ["", "Terrible", "Poor", "Okay", "Good", "Excellent"];

// ── Star rating ────────────────────────────────────────────────────────────
function StarRating({ value, onChange, size = 28 }) {
  const [hovered, setHovered] = useState(0);
  return (
    <div className="star-rating">
      {[1, 2, 3, 4, 5].map(n => (
        <button
          key={n}
          type="button"
          className={`star-btn ${(hovered || value) >= n ? "filled" : ""}`}
          style={{ fontSize: size }}
          onMouseEnter={() => setHovered(n)}
          onMouseLeave={() => setHovered(0)}
          onClick={() => onChange(n)}
          aria-label={`${n} star${n !== 1 ? "s" : ""}`}
        >
          <i className={`ti ti-star${(hovered || value) >= n ? "-filled" : ""}`} />
        </button>
      ))}
      {(hovered || value) > 0 && (
        <span className="star-label">{RATING_LABELS[hovered || value]}</span>
      )}
    </div>
  );
}

// ── Recent site feedback ───────────────────────────────────────────────────
function FeedbackList({ items }) {
  if (!items.length) return (
    <div className="fb-empty">
      <i className="ti ti-message-circle" style={{ fontSize: 36 }} />
      <p>No feedback yet. Be the first!</p>
    </div>
  );
  return (
    <div className="fb-list">
      {items.map((item, i) => {
        const cat = FEEDBACK_CATEGORIES.find(c => c.id === item.category) || FEEDBACK_CATEGORIES[4];
        return (
          <div key={i} className="fb-item">
            <div className="fb-item-header">
              <span className="fb-cat-badge" style={{ color: cat.color, background: cat.color + "22" }}>
                <i className={`ti ${cat.icon}`} /> {cat.label}
              </span>
              <span className="fb-item-date">
                {new Date(item.created_at).toLocaleDateString("en-US", { month: "short", day: "numeric" })}
              </span>
            </div>
            <p className="fb-item-msg">{item.message}</p>
            {item.status && item.status !== "open" && (
              <span className={`fb-status ${item.status}`}>
                <i className={`ti ti-${item.status === "resolved" ? "check" : "clock"}`} />
                {item.status}
              </span>
            )}
          </div>
        );
      })}
    </div>
  );
}

// ── Store review list ──────────────────────────────────────────────────────
function ReviewList({ reviews, stores }) {
  if (!reviews.length) return (
    <div className="fb-empty">
      <i className="ti ti-star" style={{ fontSize: 36 }} />
      <p>No reviews yet. Visit a store and share your experience!</p>
    </div>
  );

  const storeMap = Object.fromEntries(stores.map(s => [String(s.id), s]));

  return (
    <div className="fb-list">
      {reviews.map((r, i) => {
        const store = storeMap[String(r.store_id)];
        return (
          <div key={i} className="fb-item review-item">
            <div className="fb-item-header">
              <div className="review-store-info">
                <div className="review-store-name">{store?.name || "Store #" + r.store_id}</div>
                <div className="review-store-addr">{store?.address || ""}</div>
              </div>
              <span className="fb-item-date">
                {new Date(r.created_at).toLocaleDateString("en-US", { month: "short", day: "numeric" })}
              </span>
            </div>
            <div className="review-stars">
              {[1,2,3,4,5].map(n => (
                <i key={n} className={`ti ti-star${r.rating >= n ? "-filled" : ""}`}
                  style={{ color: r.rating >= n ? "#f59e0b" : "#374151", fontSize: 15 }} />
              ))}
              <span className="review-rating-label">{RATING_LABELS[r.rating]}</span>
            </div>
            {r.comment && <p className="fb-item-msg">{r.comment}</p>}
          </div>
        );
      })}
    </div>
  );
}

// ── Main component ─────────────────────────────────────────────────────────
export default function FeedbackPage({ stores, user, isLoggedIn, onAuthRequired }) {
  const [activeTab, setActiveTab] = useState("feedback");

  // Site feedback state
  const [fbCategory, setFbCategory] = useState("feature");
  const [fbMessage, setFbMessage] = useState("");
  const [fbSubmitting, setFbSubmitting] = useState(false);
  const [fbSuccess, setFbSuccess] = useState(false);
  const [recentFeedback, setRecentFeedback] = useState([]);

  // Store review state
  const [rvStore, setRvStore] = useState("");
  const [rvRating, setRvRating] = useState(0);
  const [rvComment, setRvComment] = useState("");
  const [rvSubmitting, setRvSubmitting] = useState(false);
  const [rvSuccess, setRvSuccess] = useState(false);
  const [recentReviews, setRecentReviews] = useState([]);
  const [storeSearch, setStoreSearch] = useState("");

  const filteredStores = storeSearch.length >= 2
    ? stores.filter(s =>
        s.name.toLowerCase().includes(storeSearch.toLowerCase()) ||
        s.address.toLowerCase().includes(storeSearch.toLowerCase())
      ).slice(0, 6)
    : [];

  useEffect(() => {
    fetchFeedback();
    fetchReviews();
  }, []);

  const fetchFeedback = async () => {
    if (!SUPABASE_URL || !SUPABASE_KEY) return;
    try {
      const res = await fetch(
        `${SUPABASE_URL}/rest/v1/site_feedback?order=created_at.desc&limit=20`,
        { headers }
      );
      const data = await res.json();
      if (Array.isArray(data)) setRecentFeedback(data);
    } catch {}
  };

  const fetchReviews = async () => {
    if (!SUPABASE_URL || !SUPABASE_KEY) return;
    try {
      const res = await fetch(
        `${SUPABASE_URL}/rest/v1/store_reviews?order=created_at.desc&limit=30`,
        { headers }
      );
      const data = await res.json();
      if (Array.isArray(data)) setRecentReviews(data);
    } catch {}
  };

  const submitFeedback = async (e) => {
    e.preventDefault();
    if (!fbMessage.trim()) return;
    setFbSubmitting(true);
    const payload = {
      category: fbCategory,
      message: fbMessage.trim(),
      status: "open",
      user_id: user?.id || null,
    };
    // Optimistic update
    setRecentFeedback(prev => [{ ...payload, created_at: new Date().toISOString() }, ...prev]);
    if (SUPABASE_URL && SUPABASE_KEY) {
      try {
        await fetch(`${SUPABASE_URL}/rest/v1/site_feedback`, {
          method: "POST", headers, body: JSON.stringify(payload),
        });
      } catch {}
    }
    setFbMessage("");
    setFbSubmitting(false);
    setFbSuccess(true);
    setTimeout(() => setFbSuccess(false), 3000);
  };

  const submitReview = async (e) => {
    e.preventDefault();
    if (!rvStore || rvRating === 0) return;
    if (!isLoggedIn) { onAuthRequired?.(); return; }
    setRvSubmitting(true);
    const payload = {
      store_id: parseInt(rvStore),
      rating: rvRating,
      comment: rvComment.trim() || null,
      user_id: user?.id || null,
    };
    setRecentReviews(prev => [{ ...payload, created_at: new Date().toISOString() }, ...prev]);
    if (SUPABASE_URL && SUPABASE_KEY) {
      try {
        await fetch(`${SUPABASE_URL}/rest/v1/store_reviews`, {
          method: "POST", headers, body: JSON.stringify(payload),
        });
      } catch {}
    }
    setRvStore("");
    setRvRating(0);
    setRvComment("");
    setStoreSearch("");
    setRvSubmitting(false);
    setRvSuccess(true);
    setTimeout(() => setRvSuccess(false), 3000);
  };

  const selectedStore = stores.find(s => String(s.id) === String(rvStore));

  return (
    <div className="feedback-page">
      <div className="fb-page-header">
        <h2 className="fb-title">
          <i className="ti ti-message-heart" /> Feedback &amp; Reviews
        </h2>
        <div className="fb-subtitle">Help us improve SnusWorld and share your store experiences</div>
      </div>

      <div className="fb-tabs">
        <button className={`fb-tab ${activeTab === "feedback" ? "active" : ""}`}
          onClick={() => setActiveTab("feedback")}>
          <i className="ti ti-bulb" /> Site Feedback
        </button>
        <button className={`fb-tab ${activeTab === "reviews" ? "active" : ""}`}
          onClick={() => setActiveTab("reviews")}>
          <i className="ti ti-star" /> Store Reviews
        </button>
      </div>

      <div className="fb-content">
        {activeTab === "feedback" ? (
          <div className="fb-two-col">
            {/* ── Submit form ── */}
            <div className="fb-form-panel">
              <h3 className="fb-panel-title">Share your thoughts</h3>
              <p className="fb-panel-sub">Found a bug? Have an idea? We read everything.</p>

              <form onSubmit={submitFeedback} className="fb-form">
                <div className="fb-field">
                  <label className="fb-label">Category</label>
                  <div className="fb-cat-grid">
                    {FEEDBACK_CATEGORIES.map(cat => (
                      <button key={cat.id} type="button"
                        className={`fb-cat-btn ${fbCategory === cat.id ? "active" : ""}`}
                        style={fbCategory === cat.id ? { borderColor: cat.color, color: cat.color } : {}}
                        onClick={() => setFbCategory(cat.id)}>
                        <i className={`ti ${cat.icon}`} />
                        <span>{cat.label}</span>
                      </button>
                    ))}
                  </div>
                </div>

                <div className="fb-field">
                  <label className="fb-label">Message</label>
                  <textarea
                    className="fb-textarea"
                    placeholder="Describe the issue, feature request, or suggestion in detail…"
                    rows={5}
                    value={fbMessage}
                    onChange={e => setFbMessage(e.target.value)}
                    required
                  />
                  <div className="fb-char-count">{fbMessage.length} / 1000</div>
                </div>

                <button type="submit" className="fb-submit-btn" disabled={fbSubmitting || !fbMessage.trim()}>
                  {fbSubmitting ? (
                    <><div className="spinner" style={{ width: 14, height: 14, borderWidth: 2 }} /> Sending…</>
                  ) : fbSuccess ? (
                    <><i className="ti ti-check" /> Sent! Thank you.</>
                  ) : (
                    <><i className="ti ti-send" /> Submit Feedback</>
                  )}
                </button>
              </form>
            </div>

            {/* ── Recent feedback ── */}
            <div className="fb-list-panel">
              <h3 className="fb-panel-title">Recent feedback</h3>
              <FeedbackList items={recentFeedback} />
            </div>
          </div>
        ) : (
          <div className="fb-two-col">
            {/* ── Review form ── */}
            <div className="fb-form-panel">
              <h3 className="fb-panel-title">Rate a store</h3>
              <p className="fb-panel-sub">Share your experience with the community.</p>

              <form onSubmit={submitReview} className="fb-form">
                <div className="fb-field">
                  <label className="fb-label">Store</label>
                  <div className="store-search-wrap">
                    <input
                      className="fb-input"
                      placeholder="Search for a store…"
                      value={storeSearch}
                      onChange={e => { setStoreSearch(e.target.value); if (!e.target.value) setRvStore(""); }}
                    />
                    {filteredStores.length > 0 && !rvStore && (
                      <div className="store-search-dropdown">
                        {filteredStores.map(s => (
                          <button key={s.id} type="button" className="ssd-item"
                            onClick={() => { setRvStore(String(s.id)); setStoreSearch(s.name); }}>
                            <div className="ssd-name">{s.name}</div>
                            <div className="ssd-addr">{s.address}</div>
                          </button>
                        ))}
                      </div>
                    )}
                  </div>
                  {selectedStore && (
                    <div className="selected-store-badge">
                      <i className="ti ti-building-store" /> {selectedStore.name}
                      <button type="button" onClick={() => { setRvStore(""); setStoreSearch(""); }}>
                        <i className="ti ti-x" />
                      </button>
                    </div>
                  )}
                </div>

                <div className="fb-field">
                  <label className="fb-label">Rating</label>
                  <StarRating value={rvRating} onChange={setRvRating} size={32} />
                </div>

                <div className="fb-field">
                  <label className="fb-label">Comment <span className="optional-label">(optional)</span></label>
                  <textarea
                    className="fb-textarea"
                    placeholder="Did they have Zyn? What flavors? Was it easy to find? Any tips?"
                    rows={4}
                    value={rvComment}
                    onChange={e => setRvComment(e.target.value)}
                  />
                </div>

                {!isLoggedIn && (
                  <div className="fb-auth-note">
                    <i className="ti ti-info-circle" />
                    <span>Sign in to submit reviews so the community can trust them.</span>
                    <button type="button" className="fb-signin-link" onClick={onAuthRequired}>Sign in</button>
                  </div>
                )}

                <button type="submit" className="fb-submit-btn"
                  disabled={rvSubmitting || !rvStore || rvRating === 0}>
                  {rvSubmitting ? (
                    <><div className="spinner" style={{ width: 14, height: 14, borderWidth: 2 }} /> Submitting…</>
                  ) : rvSuccess ? (
                    <><i className="ti ti-check" /> Review submitted!</>
                  ) : (
                    <><i className="ti ti-star" /> Submit Review</>
                  )}
                </button>
              </form>
            </div>

            {/* ── Recent reviews ── */}
            <div className="fb-list-panel">
              <h3 className="fb-panel-title">Recent store reviews</h3>
              <ReviewList reviews={recentReviews} stores={stores} />
            </div>
          </div>
        )}
      </div>
    </div>
  );
}
