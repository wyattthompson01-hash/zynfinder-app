import { useState, useRef } from "react";

const SUPABASE_URL = import.meta.env.VITE_SUPABASE_URL;
const SUPABASE_KEY = import.meta.env.VITE_SUPABASE_ANON_KEY;

const AVATAR_COLORS = [
  "#0066ff", "#059669", "#f59e0b", "#ef4444",
  "#8b5cf6", "#ec4899", "#06b6d4", "#f97316",
];

const BADGES = [
  { id: "pioneer",     label: "Pioneer",          icon: "ti-flag",         desc: "Report your first location",  test: (p) => p.reports_count >= 1,       color: "#f59e0b", bg: "#2a2000" },
  { id: "scout",       label: "Scout",             icon: "ti-map-search",   desc: "Report 5 locations",           test: (p) => p.reports_count >= 5,       color: "#3b82f6", bg: "#001a40" },
  { id: "explorer",    label: "Explorer",          icon: "ti-compass",      desc: "Report 10 locations",          test: (p) => p.reports_count >= 10,      color: "#8b5cf6", bg: "#1a0030" },
  { id: "fact-checker",label: "Fact Checker",      icon: "ti-shield-check", desc: "Verify 5 locations",           test: (p) => p.verifications_count >= 5,  color: "#059669", bg: "#002a18" },
  { id: "veteran",     label: "Verified Veteran",  icon: "ti-certificate",  desc: "Verify 20 locations",          test: (p) => p.verifications_count >= 20, color: "#dc2626", bg: "#2a0000" },
  { id: "century",     label: "Century Club",      icon: "ti-star",         desc: "Earn 100 points",              test: (p) => p.points >= 100,            color: "#d97706", bg: "#2a1800" },
  { id: "legend",      label: "Legend",            icon: "ti-crown",        desc: "Earn 500 points",              test: (p) => p.points >= 500,            color: "#7c3aed", bg: "#1a0030" },
];

function Toggle({ on, onChange }) {
  return (
    <button
      role="switch" aria-checked={on}
      className={`prf-toggle ${on ? "on" : ""}`}
      onClick={() => onChange(!on)}
    >
      <span className="prf-toggle-knob" />
    </button>
  );
}

export default function ProfilePage({ user, profile, onBack, onSignOut, updateProfile, accessToken }) {
  const initial = (profile?.username || user?.email || "?")[0].toUpperCase();

  // Avatar color — stored in localStorage
  const [avatarColor, setAvatarColor] = useState(
    () => localStorage.getItem("prf_avatar_color") || AVATAR_COLORS[0]
  );
  const [avatarUrl, setAvatarUrl]     = useState(profile?.avatar_url || null);
  const [uploading, setUploading]     = useState(false);
  const fileInputRef = useRef();

  // Editable fields
  const [username, setUsername]       = useState(profile?.username || "");
  const [bio, setBio]                 = useState(
    () => profile?.bio || localStorage.getItem("prf_bio") || ""
  );
  const [editingUsername, setEditingUsername] = useState(false);
  const [editingBio, setEditingBio]           = useState(false);
  const [saving, setSaving]                   = useState(false);
  const [saveMsg, setSaveMsg]                 = useState(null);

  // Settings — localStorage
  const [showOnLeaderboard, setShowOnLeaderboard] = useState(
    () => localStorage.getItem("prf_leaderboard") !== "false"
  );
  const [units, setUnits] = useState(
    () => localStorage.getItem("prf_units") || "km"
  );
  const [notifications, setNotifications] = useState(
    () => localStorage.getItem("prf_notifications") !== "false"
  );

  const pickColor = (c) => {
    setAvatarColor(c);
    localStorage.setItem("prf_avatar_color", c);
  };

  const handleAvatarUpload = async (e) => {
    const file = e.target.files[0];
    if (!file || !SUPABASE_URL || !user?.id) return;
    setUploading(true);
    try {
      const ext = file.name.split(".").pop() || "jpg";
      const path = `avatars/${user.id}/avatar.${ext}`;
      const res = await fetch(`${SUPABASE_URL}/storage/v1/object/${path}`, {
        method: "POST",
        headers: {
          "apikey": SUPABASE_KEY,
          "Authorization": `Bearer ${accessToken || SUPABASE_KEY}`,
          "Content-Type": file.type || "image/jpeg",
          "x-upsert": "true",
        },
        body: file,
      });
      if (res.ok) {
        const url = `${SUPABASE_URL}/storage/v1/object/public/${path}?t=${Date.now()}`;
        setAvatarUrl(url);
        await updateProfile?.({ avatar_url: url });
      }
    } finally {
      setUploading(false);
      e.target.value = "";
    }
  };

  const saveUsername = async () => {
    if (!username.trim() || username.trim() === profile?.username) {
      setEditingUsername(false); return;
    }
    setSaving(true);
    await updateProfile?.({ username: username.trim() });
    setSaving(false);
    setEditingUsername(false);
    flash("Username saved");
  };

  const saveBio = async () => {
    localStorage.setItem("prf_bio", bio);
    await updateProfile?.({ bio });
    setEditingBio(false);
    flash("Bio saved");
  };

  const flash = (msg) => {
    setSaveMsg(msg);
    setTimeout(() => setSaveMsg(null), 2000);
  };

  const setSetting = (key, val, setter) => {
    setter(val);
    localStorage.setItem(key, String(val));
  };

  const earned = profile ? BADGES.filter((b) => b.test(profile)) : [];
  const locked = profile ? BADGES.filter((b) => !b.test(profile)) : BADGES;
  const joinDate = user?.created_at
    ? new Date(user.created_at).toLocaleDateString("en-CA", { year: "numeric", month: "long" })
    : null;

  return (
    <div className="prf-page">
      <div className="prf-inner">

        {/* Back */}
        <button className="detail-back" onClick={onBack}>
          <i className="ti ti-arrow-left" /> Back
        </button>

        {/* ── Hero ── */}
        <div className="prf-hero">
          {/* Avatar */}
          <div className="prf-avatar-wrap">
            <div className="prf-avatar" style={{ background: avatarUrl ? "transparent" : avatarColor }}>
              {avatarUrl
                ? <img src={avatarUrl} alt="avatar" className="prf-avatar-img" />
                : <span className="prf-avatar-initial">{initial}</span>
              }
            </div>
            <button
              className="prf-avatar-edit-btn"
              onClick={() => fileInputRef.current?.click()}
              title="Change photo"
            >
              {uploading ? <div className="spinner" style={{ width: 12, height: 12, borderWidth: 2 }} /> : <i className="ti ti-camera" />}
            </button>
            <input ref={fileInputRef} type="file" accept="image/*" style={{ display: "none" }} onChange={handleAvatarUpload} />
          </div>

          {/* Color picker */}
          <div className="prf-color-row">
            {AVATAR_COLORS.map((c) => (
              <button
                key={c} className={`prf-color-dot ${avatarColor === c && !avatarUrl ? "active" : ""}`}
                style={{ background: c }}
                onClick={() => { pickColor(c); setAvatarUrl(null); }}
                aria-label={`Avatar color ${c}`}
              />
            ))}
          </div>

          {/* Username */}
          <div className="prf-username-row">
            {editingUsername ? (
              <>
                <input
                  className="prf-username-input"
                  value={username}
                  onChange={(e) => setUsername(e.target.value)}
                  onKeyDown={(e) => { if (e.key === "Enter") saveUsername(); if (e.key === "Escape") setEditingUsername(false); }}
                  autoFocus maxLength={30}
                />
                <button className="prf-save-btn" onClick={saveUsername} disabled={saving}>
                  {saving ? "…" : <i className="ti ti-check" />}
                </button>
                <button className="prf-cancel-btn" onClick={() => { setUsername(profile?.username || ""); setEditingUsername(false); }}>
                  <i className="ti ti-x" />
                </button>
              </>
            ) : (
              <>
                <span className="prf-username">{profile?.username || user?.email?.split("@")[0] || "Anonymous"}</span>
                <button className="prf-edit-btn" onClick={() => setEditingUsername(true)} title="Edit username">
                  <i className="ti ti-pencil" />
                </button>
              </>
            )}
          </div>

          {/* Email + join */}
          <div className="prf-email">{user?.email}</div>
          {joinDate && <div className="prf-joined">Member since {joinDate}</div>}

          {/* Bio */}
          <div className="prf-bio-wrap">
            {editingBio ? (
              <>
                <textarea
                  className="prf-bio-input"
                  value={bio}
                  onChange={(e) => setBio(e.target.value)}
                  placeholder="Tell the community about yourself…"
                  rows={3} maxLength={160} autoFocus
                />
                <div className="prf-bio-actions">
                  <span className="prf-bio-count">{bio.length}/160</span>
                  <button className="prf-save-btn" onClick={saveBio}><i className="ti ti-check" /> Save</button>
                  <button className="prf-cancel-btn" onClick={() => setEditingBio(false)}><i className="ti ti-x" /></button>
                </div>
              </>
            ) : (
              <button className="prf-bio" onClick={() => setEditingBio(true)}>
                {bio || <span className="prf-bio-placeholder"><i className="ti ti-pencil" /> Add a bio…</span>}
              </button>
            )}
          </div>

          {saveMsg && <div className="prf-save-msg"><i className="ti ti-circle-check" /> {saveMsg}</div>}
        </div>

        {/* ── Stats ── */}
        <div className="prf-stats">
          <div className="prf-stat">
            <div className="prf-stat-val" style={{ color: "#f59e0b" }}>{profile?.points ?? 0}</div>
            <div className="prf-stat-lbl">Points</div>
          </div>
          <div className="prf-stat-div" />
          <div className="prf-stat">
            <div className="prf-stat-val" style={{ color: "#34d399" }}>{profile?.reports_count ?? 0}</div>
            <div className="prf-stat-lbl">Reports</div>
          </div>
          <div className="prf-stat-div" />
          <div className="prf-stat">
            <div className="prf-stat-val" style={{ color: "#818cf8" }}>{profile?.verifications_count ?? 0}</div>
            <div className="prf-stat-lbl">Verifications</div>
          </div>
        </div>

        {/* ── Settings ── */}
        <div className="prf-section">
          <div className="prf-section-title">Settings</div>

          <div className="prf-setting-row">
            <div className="prf-setting-info">
              <div className="prf-setting-label"><i className="ti ti-trophy" /> Show on leaderboard</div>
              <div className="prf-setting-sub">Let others see your rank</div>
            </div>
            <Toggle on={showOnLeaderboard} onChange={(v) => setSetting("prf_leaderboard", v, setShowOnLeaderboard)} />
          </div>

          <div className="prf-setting-row">
            <div className="prf-setting-info">
              <div className="prf-setting-label"><i className="ti ti-bell" /> Notifications</div>
              <div className="prf-setting-sub">Alerts for verified locations near you</div>
            </div>
            <Toggle on={notifications} onChange={(v) => setSetting("prf_notifications", v, setNotifications)} />
          </div>

          <div className="prf-setting-row">
            <div className="prf-setting-info">
              <div className="prf-setting-label"><i className="ti ti-ruler" /> Distance units</div>
              <div className="prf-setting-sub">How distances are displayed</div>
            </div>
            <div className="prf-unit-toggle">
              <button className={units === "km" ? "active" : ""} onClick={() => setSetting("prf_units", "km", setUnits)}>km</button>
              <button className={units === "mi" ? "active" : ""} onClick={() => setSetting("prf_units", "mi", setUnits)}>mi</button>
            </div>
          </div>
        </div>

        {/* ── Badges ── */}
        {earned.length > 0 && (
          <div className="prf-section">
            <div className="prf-section-title">Badges earned <span className="prf-badge-count">{earned.length}</span></div>
            <div className="prf-badges-grid">
              {earned.map((b) => (
                <div key={b.id} className="prf-badge earned" style={{ "--bc": b.color, "--bb": b.bg }}>
                  <div className="prf-badge-icon"><i className={`ti ${b.icon}`} /></div>
                  <div className="prf-badge-label">{b.label}</div>
                  <div className="prf-badge-desc">{b.desc}</div>
                </div>
              ))}
            </div>
          </div>
        )}

        {locked.length > 0 && (
          <div className="prf-section">
            <div className="prf-section-title" style={{ color: "#555" }}>
              Locked <span className="prf-badge-count" style={{ color: "#444" }}>{locked.length}</span>
            </div>
            <div className="prf-badges-grid">
              {locked.map((b) => (
                <div key={b.id} className="prf-badge locked">
                  <div className="prf-badge-icon locked"><i className="ti ti-lock" /></div>
                  <div className="prf-badge-label" style={{ color: "#555" }}>{b.label}</div>
                  <div className="prf-badge-desc">{b.desc}</div>
                </div>
              ))}
            </div>
          </div>
        )}

        {/* ── Sign out ── */}
        <div className="prf-section prf-danger">
          <button className="prf-signout-btn" onClick={onSignOut}>
            <i className="ti ti-logout" /> Sign out
          </button>
        </div>

      </div>
    </div>
  );
}
